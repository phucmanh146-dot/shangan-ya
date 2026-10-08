"""Regression checks for planning correctness and external-response boundaries."""
import copy
import json
import os
import tempfile
import unittest
from unittest.mock import patch

_temp = tempfile.TemporaryDirectory()
os.environ['SHANGAN_AGENT_DATA'] = _temp.name
import learning_agent as agent
from agent_schedule import schedule


def tasks():
    return [{'id': 'T1', 'title': '了解问题', 'minutes': 60, 'dependsOn': [], 'status': 'todo', 'priority': 1,
             'deliverable': '问题清单', 'acceptance': '列出三项', 'firstStep': '写下用户目标', 'sourceIds': ['S1']},
            {'id': 'T2', 'title': '制作原型', 'minutes': 90, 'dependsOn': ['T1'], 'status': 'todo', 'priority': 1,
             'deliverable': '原型', 'acceptance': '走通流程', 'firstStep': '画输入页', 'sourceIds': ['S1']}]


SETTINGS = {'startDate': '2026-10-08', 'deadline': '2026-10-12', 'dailyMinutes': 60}


class PlanningTests(unittest.TestCase):
    def test_capacity_and_dependency_order(self):
        result = schedule(tasks(), SETTINGS)
        self.assertFalse(result['conflicts'])
        self.assertTrue(all(d['used'] <= d['capacity'] for d in result['days']))
        self.assertEqual(result['tasks'][1]['sessions'][0]['date'], '2026-10-09')

    def test_unavailable_day_and_partial_task(self):
        result = schedule(tasks(), dict(SETTINGS, unavailableDates=['2026-10-08'], deadline='2026-10-09'))
        self.assertEqual(result['tasks'][0]['sessions'][0]['date'], '2026-10-09')
        self.assertEqual(result['unscheduledMinutes'], 90)
        self.assertEqual(result['days'][0]['used'], 0)

    def test_same_day_predecessor_first(self):
        items = tasks()[::-1]
        result = schedule(items, dict(SETTINGS, dailyMinutes=180))
        self.assertEqual([s['taskId'] for s in result['days'][0]['sessions']], ['T1', 'T2'])

    def test_cycle_rejected(self):
        items = tasks(); items[0]['dependsOn'] = ['T2']
        with self.assertRaisesRegex(ValueError, '循环'):
            schedule(items, SETTINGS)

    def test_missing_dependency_rejected(self):
        items = tasks(); items[1]['dependsOn'] = ['missing']
        with self.assertRaisesRegex(ValueError, '不存在'):
            schedule(items, SETTINGS)

    def test_urgent_child_prioritizes_prerequisite(self):
        items = tasks()
        items[1]['deadline'] = '2026-10-09'; items[1]['minutes'] = 60
        items.insert(0, {'id': 'X', 'title': '稍后工作', 'minutes': 120, 'dependsOn': []})
        result = schedule(items, SETTINGS)
        self.assertEqual(result['days'][0]['sessions'][0]['taskId'], 'T1')
        self.assertFalse(result['conflicts'])

    def test_completed_work_not_rescheduled(self):
        items = tasks(); items[0].update(status='done', sessions=[{'date':'2026-10-01','minutes':60}], evidence='链接')
        result = schedule(items, SETTINGS)
        self.assertEqual(result['tasks'][0], items[0])
        self.assertEqual(result['totalMinutes'], 90)

    def test_invalid_dates_and_negative_budgets(self):
        for patch_ in ({'deadline':'2026-10-07'}, {'dailyMinutes':-1}, {'dayBudgets':{'2026-10-08':-2}}):
            with self.assertRaises(ValueError):
                schedule(tasks(), dict(SETTINGS, **patch_))


class PersistenceTests(unittest.TestCase):
    def setUp(self):
        import uuid
        self.route = agent.save_route(dict(schedule(tasks(), SETTINGS), id=uuid.uuid4().hex, title='测试路线'), 'initial')

    def test_preview_does_not_write_and_apply_is_versioned(self):
        data={'routeId': self.route['id'], 'version':1, 'requestId':'new',
              'settings':{'unavailableDates':['2026-10-08']}, 'newTask':{'title':'临时面试','minutes':60,'deadline':'2026-10-09'}}
        preview=agent.replan(data)
        self.assertEqual(len(agent.route(self.route['id'])['tasks']),2)
        saved=agent.replan(data, save=True)
        self.assertEqual(saved['version'],2)
        self.assertEqual(len(saved['tasks']),3)
        self.assertTrue(preview['lastChange']['changes'])
        with self.assertRaisesRegex(ValueError, '更新'):
            agent.replan(data, save=True)
        undone=agent.undo({'routeId':self.route['id'],'version':2})
        self.assertEqual(len(undone['tasks']),2)
        self.assertEqual(undone['version'],3)

    def test_completion_checks_predecessor_and_preserves_evidence(self):
        data={'routeId':self.route['id'],'version':1,'taskId':'T2','evidence':'结果'}
        with self.assertRaisesRegex(ValueError, '前置'):
            agent.complete_task(data)
        data['taskId']='T1'; done=agent.complete_task(data)
        self.assertEqual(done['tasks'][0]['evidence'],'结果')
        self.assertEqual(agent.route(done['id'])['tasks'][0]['status'],'done')

    def test_no_fake_citations(self):
        ev=agent.Evidence('test'); ev.rows=[{'id':'S1','text':'真实正文'}]
        answer={'tasks':tasks()}
        answer['tasks'][0]['sourceIds']=['S99']
        with self.assertRaisesRegex(ValueError, '来源'):
            agent.validate_answer(answer,ev)

    def test_no_fabricated_video_frames(self):
        with self.assertRaisesRegex(ValueError, '画面'):
            agent.prepare_input({'goal':'分析画面','settings':SETTINGS,'frames':[{'image':'data:image/jpeg;base64,xxxx','timestamp':0}]})

    def test_private_url_rejected(self):
        with self.assertRaises(agent.rescue.RescueError):
            agent.prepare_input({'goal':'查找资料','settings':SETTINGS,'urls':['http://127.0.0.1:8901/private']})

    def test_tool_loop_reads_then_saves(self):
        # External network and LLM are intentionally mocked in this protocol test.
        outputs=[json.dumps({'action':'read','sourceId':'S1'}),json.dumps({'action':'finish','tasks':tasks(),'title':'测试'})]
        with patch.object(agent.rescue,'validate_url',return_value=None), \
             patch.object(agent,'read_url',return_value={'text':'工具调用与验收练习','readStatus':'fulltext','method':'test'}), \
             patch.object(agent.rescue,'search_web',return_value={'results':[],'provider':'mock'}), \
             patch.object(agent.rescue,'public_config',return_value={'configured':True}), \
             patch.object(agent.rescue,'config_snapshot',return_value={'model':'mock-model'}), \
             patch.object(agent.rescue,'complete',side_effect=outputs):
            result=agent.run_agent('mock-test',{'goal':'学习 Agent','settings':SETTINGS})
        self.assertEqual(result['version'],1)
        self.assertEqual(result['model'],'mock-model')
        self.assertEqual(agent.route(result['id'])['title'],'测试')


if __name__ == '__main__':
    unittest.main()

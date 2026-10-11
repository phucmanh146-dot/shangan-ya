"""Contract tests with controlled model replies; these do not claim live AI success."""
import importlib
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import types
import unittest
from unittest.mock import patch

TEMP = tempfile.TemporaryDirectory()
os.environ['SHANGAN_GROWTH_DATA'] = TEMP.name
sys.path.insert(0, str(Path(__file__).parent))

class RescueError(Exception):
    pass

rescue = types.ModuleType('rescue_service')
rescue.RescueError = RescueError
rescue.config_snapshot = lambda: {'model': 'test-fixture'}
rescue.complete = lambda *args: None
rescue.search_web = lambda *args: None
sys.modules['rescue_service'] = rescue
import growth_pipeline as flow

DIAG = {'summary': '根据提供资料整理行动。', 'keyPoints': ['资料中的关键点'], 'gaps': [], 'unknowns': []}
TASK = {'name': '整理一页需求', 'minutes': 25, 'firstStep': '打开笔记并写下目标',
        'deliverable': '一页需求笔记', 'check': '包含目标和验收要求', 'sourceIds': ['source-1'], 'owner': '待分配'}

def await_run(account, identifier):
    for _ in range(150):
        state = flow.get_run(account, identifier)
        if state['status'] not in ('running', 'queued'):
            return state
        time.sleep(.02)
    raise AssertionError('run did not finish')


class PipelineTests(unittest.TestCase):
    def setUp(self):
        with flow.connect() as db:
            db.execute('DELETE FROM runs')
            db.execute('DELETE FROM projects')
        self.project = flow.save_project({'account': 'qa', 'title': '我的成长项目', 'dailyMinutes': 60})

    def start(self, **extra):
        return flow.start({'account': 'qa', 'projectId': self.project['id'],
                           'materials': [{'title': '任务要求', 'text': '根据访谈资料制作一页需求笔记。'}], **extra})['id']

    def test_context_and_task_provenance(self):
        with patch.object(rescue, 'complete', side_effect=[json.dumps(DIAG), json.dumps({'tasks': [TASK]})]) as model:
            result = await_run('qa', self.start())
        self.assertEqual(result['status'], 'succeeded')
        self.assertEqual(result['drafts'][0]['sourceIds'], ['source-1'])
        planning = json.loads(model.call_args_list[1].args[0][1]['content'])
        self.assertEqual(planning['diagnosis']['summary'], DIAG['summary'])
        self.assertEqual(planning['project']['id'], self.project['id'])
        self.assertNotIn('input', result)

    def test_failed_plan_retries_without_repeating_diagnosis(self):
        invalid = dict(TASK, sourceIds=['made-up-source'])
        with patch.object(rescue, 'complete', side_effect=[json.dumps(DIAG), json.dumps({'tasks': [invalid]})]):
            identifier = self.start()
            failed = await_run('qa', identifier)
        self.assertEqual(failed['status'], 'failed')
        self.assertNotIn('drafts', failed)
        with patch.object(rescue, 'complete', return_value=json.dumps({'tasks': [TASK]})) as model:
            flow.retry({'account': 'qa', 'id': identifier})
            completed = await_run('qa', identifier)
        self.assertEqual(completed['status'], 'succeeded')
        self.assertEqual(model.call_count, 1)
        self.assertEqual(completed['sources'], failed['sources'])

    def test_empty_diagnosis_is_not_reused(self):
        with patch.object(rescue, 'complete', return_value='{"summary":""}'):
            identifier = self.start()
            failed = await_run('qa', identifier)
        self.assertEqual(failed['status'], 'failed')
        self.assertNotIn('diagnosis', failed)
        with patch.object(rescue, 'complete', side_effect=[json.dumps(DIAG), json.dumps({'tasks': []})]) as model:
            flow.retry({'account': 'qa', 'id': identifier})
            self.assertEqual(await_run('qa', identifier)['status'], 'succeeded')
        self.assertEqual(model.call_count, 2)

    def test_account_isolation_and_optimistic_update(self):
        self.assertEqual(flow.state('another')['projects'], [])
        with self.assertRaises(ValueError):
            flow.get_project(flow.account('another'), self.project['id'])
        updated = flow.save_project(dict(self.project, account='qa', title='更新的目标'))
        self.assertEqual(updated['version'], 2)
        with self.assertRaises(ValueError):
            flow.save_project(dict(self.project, account='qa'))

    def test_invalid_inputs_do_not_start_jobs(self):
        for extra in ({'materials': ['bad']}, {'frames': [None]}, {'categories': 'bad'},
                      {'materials': [{'text': 'a' * 30000}] * 3}):
            with self.assertRaises(ValueError):
                self.start(**extra)
        self.assertEqual(flow.state('qa')['runs'], [])

    def test_daily_budget_is_enforced(self):
        with patch.object(rescue, 'complete', side_effect=[json.dumps(DIAG), json.dumps({'tasks': [dict(TASK, minutes=100)]})]):
            self.assertEqual(await_run('qa', self.start())['status'], 'failed')

if __name__ == '__main__':
    try:
        result = unittest.main(exit=False).result
    finally:
        flow.POOL.shutdown(wait=True)
        TEMP.cleanup()
    sys.exit(0 if result.wasSuccessful() else 1)

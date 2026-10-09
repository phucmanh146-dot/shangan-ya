"""Captain-owned P1 handoff, durable versions and evidence review.
A/B implementations plug into run_handoff; demo fixtures never imply live AI.
"""
from contextlib import contextmanager, closing
import copy
import json
import uuid
from datetime import datetime
import learning_agent as agent

@contextmanager
def connection():
    with closing(agent.connection()) as c:
        with c:
            yield c

class Conflict(ValueError):
    pass

def required(obj, key, kind=str):
    value = obj.get(key)
    if not isinstance(value, kind) or (kind is str and not value.strip()):
        raise ValueError(f'{key} 缺失或格式错误')
    return value

def integer(obj, key, minimum=0):
    value = obj.get(key)
    if type(value) is not int or value < minimum:
        raise ValueError(f'{key} 必须为不小于 {minimum} 的整数')
    return value

def unique(rows, key):
    values = [required(x, key) for x in rows]
    if len(set(values)) != len(values):
        raise ValueError(f'{key} 重复')
    return set(values)

def strings(obj, key, nonempty=False):
    value = required(obj, key, list)
    if (nonempty and not value) or any(not isinstance(x, str) or not x.strip() for x in value):
        raise ValueError(f'{key} 必须是有效文字列表')
    return value

def init(c):
    c.executescript('''CREATE TABLE IF NOT EXISTS team_projects(id TEXT PRIMARY KEY,version INTEGER,body TEXT);
    CREATE TABLE IF NOT EXISTS team_history(project_id TEXT,version INTEGER,body TEXT,action TEXT,created TEXT,PRIMARY KEY(project_id,version));''')

def view(project):
    value = copy.deepcopy(project)
    value['plan_stale'] = bool(value['plan'] and value['plan']['based_on_diagnosis_version'] != value['diagnosis']['diagnosis_version'])
    return value

def state(identifier=None):
    with connection() as c:
        init(c)
        if identifier:
            row = c.execute('SELECT body FROM team_projects WHERE id=?', (identifier,)).fetchone()
            if not row:
                raise ValueError('项目不存在')
            value = view(json.loads(row['body']))
            value['history'] = [dict(x) for x in c.execute('SELECT version,action,created FROM team_history WHERE project_id=? ORDER BY version DESC', (identifier,))]
            return value
        return {'projects': [view(json.loads(x['body'])) for x in c.execute('SELECT body FROM team_projects ORDER BY rowid DESC LIMIT 100')]}

def commit(project, expected, action):
    with agent.WRITE_LOCK, connection() as c:
        init(c)
        c.execute('BEGIN IMMEDIATE')
        row = c.execute('SELECT version FROM team_projects WHERE id=?', (project['project_id'],)).fetchone()
        current = row['version'] if row else 0
        if current != expected:
            raise Conflict('项目已更新，请刷新后重试；旧版本未覆盖新状态')
        project = copy.deepcopy(project)
        project.pop('history', None)
        project.pop('plan_stale', None)
        project['version'] = current + 1
        project['updated_at'] = agent.now()
        body = agent.dump(project)
        c.execute('INSERT OR REPLACE INTO team_projects VALUES(?,?,?)', (project['project_id'], current+1, body))
        c.execute('INSERT INTO team_history VALUES(?,?,?,?,?)', (project['project_id'], current+1, body, action, agent.now()))
    return view(project)

def current(data):
    p = state(required(data, 'project_id'))
    if integer(data, 'expected_version') != p['version']:
        raise Conflict('项目已更新，请刷新后重试')
    return p

def create(data):
    mode = data.get('mode', 'demo')
    if mode not in ('demo', 'live'):
        raise ValueError('mode 必须为 demo 或 live')
    return commit({'schema_version':'0.1', 'project_id':uuid.uuid4().hex, 'goal':required(data,'goal'),
                   'mode':mode, 'timezone':'Asia/Shanghai', 'diagnosis':None, 'plan':None,
                   'proposal':None, 'feedback':[], 'live_verified':False}, 0, '创建项目')

def validate_diagnosis(d):
    integer(d, 'diagnosis_version', 1)
    for key in ('requirements','sources','artifact_status','member_profiles','gaps','resource_candidates','unknowns'):
        required(d,key,list)
    sources = unique(d['sources'], 'source_id')
    for source in d['sources']:
        if source.get('kind') not in ('official','user_material','reference','suggestion'):
            raise ValueError('来源 kind 必须说明官方、用户材料、参考或建议')
        required(source,'title')
    members = unique(d['member_profiles'],'member_id')
    unique(d['gaps'],'gap_id')
    for gap in d['gaps']:
        for key in ('current_evidence','target_result','gap_type','priority_reason','verification_status'):
            required(gap,key)
        strings(gap,'required_capabilities')
        if not set(strings(gap,'related_member_ids')).issubset(members):
            raise ValueError('差距引用了不存在的成员')
        if not set(strings(gap,'source_refs')).issubset(sources):
            raise ValueError('差距引用了不存在的来源')
        if not gap['source_refs'] and gap['verification_status'] == 'verified':
            raise ValueError('没有来源的差距不能标为已核验')

def diagnosis(data):
    p = current(data)
    d = copy.deepcopy(required(data,'diagnosis',dict))
    validate_diagnosis(d)
    if p['diagnosis'] and d['diagnosis_version'] <= p['diagnosis']['diagnosis_version']:
        raise Conflict('诊断版本必须递增')
    p['diagnosis'], p['proposal'] = d, None
    return commit(p,p['version'],'接收 A 的诊断；原计划保留并检查是否过期')

def validate_plan(plan, d):
    integer(plan,'plan_version',1)
    if integer(plan,'based_on_diagnosis_version',1) != d['diagnosis_version']:
        raise Conflict('计划依据的诊断已过期，请 B 更新')
    for key in ('tasks','learning_paths','time_blocks','dependencies','unscheduled','assumptions'):
        required(plan,key,list)
    ids = unique(plan['tasks'],'task_id')
    gaps = {x['gap_id'] for x in d['gaps']}
    members = {x['member_id'] for x in d['member_profiles']}
    sources = {x['source_id'] for x in d['sources']}
    deps = {}
    for t in plan['tasks']:
        for key in ('title','deliverable','deadline'):
            required(t,key)
        strings(t,'steps',True); strings(t,'acceptance_criteria',True)
        for key, allowed, needed in (('gap_ids',gaps,True),('owner_ids',members,True),('source_refs',sources,False),('depends_on',ids,False)):
            if not set(strings(t,key,needed)).issubset(allowed):
                raise ValueError(f'{key} 引用了不存在的对象')
        nums = required(t,'estimate_minutes_range',list)
        if len(nums)!=2 or any(type(n) is not int or n<1 for n in nums) or nums[0]>nums[1]:
            raise ValueError('估时必须是有效分钟范围')
        if t.get('status') not in ('candidate','scheduled','in_progress','pending_review','completed','blocked'):
            raise ValueError('任务状态无效')
        deps[t['task_id']] = t['depends_on']
    visited = set()
    def visit(key, path):
        if key in visited:
            return
        if key in path:
            raise ValueError('任务依赖存在循环')
        for dep in deps[key]:
            visit(dep,path|{key})
        visited.add(key)
    for key in ids:
        visit(key,set())
    slots = []
    for block in plan['time_blocks']:
        if required(block,'task_id') not in ids:
            raise ValueError('时段引用不存在的任务')
        owner = required(block,'member_id')
        task = next(t for t in plan['tasks'] if t['task_id']==block['task_id'])
        if owner not in task['owner_ids']:
            raise ValueError('时段成员不是任务负责人')
        try:
            start,end = (datetime.fromisoformat(required(block,k)) for k in ('start','end'))
        except ValueError:
            raise ValueError('时段必须为带时区的 ISO 日期时间')
        if not start.tzinfo or not end.tzinfo or end<=start:
            raise ValueError('时段时区或起止顺序无效')
        if any(who==owner and start<b and end>a for who,a,b in slots):
            raise ValueError('同一成员时段重叠')
        slots.append((owner,start,end))

def protected(old, new):
    previous = {t['task_id']:t for t in (old or {}).get('tasks',[])}
    latest = {t['task_id']:t for t in new['tasks']}
    for key,t in previous.items():
        if t['status']!='candidate' or t.get('locked'):
            if latest.get(key)!=t:
                raise ValueError('重排不得覆盖已开始、已完成、待验收或锁定任务：'+key)
    for t in new['tasks']:
        if t['task_id'] not in previous and t['status'] not in ('candidate','scheduled'):
            raise ValueError('新任务不能伪造执行或完成状态')
        if t['task_id'] in previous and previous[t['task_id']]['status']=='candidate' and t['status'] not in ('candidate','scheduled'):
            raise ValueError('排程不能代替执行和验收')
    for block in (old or {}).get('time_blocks',[]):
        if block.get('locked') and block not in new['time_blocks']:
            raise ValueError('锁定时段不能被重排覆盖')

def propose(data):
    p = current(data)
    if not p['diagnosis']:
        raise ValueError('先接收 A 的诊断')
    plan = copy.deepcopy(required(data,'plan',dict))
    validate_plan(plan,p['diagnosis'])
    if p['plan'] and plan['plan_version']<=p['plan']['plan_version']:
        raise Conflict('计划版本必须递增')
    protected(p['plan'],plan)
    old = {t['task_id']:t for t in (p['plan'] or {}).get('tasks',[])}
    new = {t['task_id']:t for t in plan['tasks']}
    p['proposal'] = {'id':uuid.uuid4().hex,'plan':plan,'reason':required(data,'reason'),
                     'diff':{'added':sorted(new.keys()-old.keys()),'removed':sorted(old.keys()-new.keys()),
                             'changed':[k for k in new.keys()&old.keys() if new[k]!=old[k]],
                             'time_blocks_before':(p['plan'] or {}).get('time_blocks',[]),'time_blocks_after':plan['time_blocks']}}
    return commit(p,p['version'],'保存 B 的计划预览，等待用户采用')

def apply(data):
    p = current(data)
    proposal = p['proposal']
    if not proposal or data.get('proposal_id')!=proposal['id']:
        raise Conflict('预览已失效，请重新生成')
    validate_plan(proposal['plan'],p['diagnosis'])
    protected(p['plan'],proposal['plan'])
    p['undo_plan'] = copy.deepcopy(p['plan'])
    p['undo_at_version'] = p['version'] + 1
    p['plan'],p['proposal'] = proposal['plan'],None
    return commit(p,p['version'],'用户采用计划')

def feedback(data):
    p = current(data)
    if not p['plan'] or p['plan_stale']:
        raise Conflict('没有有效计划，请先更新并采用计划')
    if integer(data,'expected_plan_version',1)!=p['plan']['plan_version']:
        raise Conflict('计划已更新，请刷新')
    t = next((t for t in p['plan']['tasks'] if t['task_id']==data.get('task_id')),None)
    if not t:
        raise ValueError('任务不存在')
    action = required(data,'action')
    note = required(data,'note')
    record = {'task_id':t['task_id'],'action':action,'note':note,'created':agent.now(),
              'expected_plan_version':p['plan']['plan_version'], 'diagnosis_version':p['diagnosis']['diagnosis_version']}
    if action in ('start','resume'):
        if t['status'] not in ('candidate','scheduled','blocked'):
            raise ValueError('当前状态不能开始')
        if any(x['task_id'] in t['depends_on'] and x['status']!='completed' for x in p['plan']['tasks']):
            raise ValueError('前置任务尚未验收完成')
        t['status']='in_progress'
    elif action=='submit':
        if t['status']!='in_progress':
            raise ValueError('请先开始任务')
        record['artifact_id']=required(data,'artifact_id')
        record['artifact_version']=integer(data,'artifact_version',1)
        record['actual_minutes']=integer(data,'actual_minutes')
        record['evidence']=required(data,'evidence')
        t['submission']=copy.deepcopy(record)
        t['status']='pending_review'
    elif action in ('approve','reject'):
        if t['status']!='pending_review' or not t.get('submission'):
            raise ValueError('请先提交成果证据，再验收')
        record['reviewer_id']=required(data,'reviewer_id')
        record['artifact_id']=t['submission']['artifact_id']
        record['artifact_version']=t['submission']['artifact_version']
        if record['reviewer_id'] not in {m['member_id'] for m in p['diagnosis']['member_profiles']}:
            raise ValueError('验收成员不在项目中')
        record['evidence']=t['submission']['evidence']
        t['status']='completed' if action=='approve' else 'in_progress'
        t['review']=copy.deepcopy(record)
    elif action=='block':
        if t['status'] not in ('candidate','scheduled','in_progress'):
            raise ValueError('当前状态不能标记卡住')
        t['status']='blocked'; record['blocker']=note
    elif action=='change':
        record['unexpected_event']=data.get('unexpected_event',note)
        record['availability_change']=data.get('availability_change',{})
    elif action=='lock':
        t['locked']=True
    else:
        raise ValueError('未知反馈动作')
    p['feedback'].append(record)
    p['proposal']=None
    return commit(p,p['version'],'执行反馈：'+action)

def run_handoff(data, researcher, planner):
    """Trusted server-side callables; B receives the validated persisted A package.
    No dynamic imports, arbitrary endpoint execution or live claim from user input.
    """
    p=current(data)
    d=researcher(copy.deepcopy(p))
    p=diagnosis({'project_id':p['project_id'],'expected_version':p['version'],'diagnosis':d})
    plan=planner(copy.deepcopy(p['diagnosis']),copy.deepcopy(p))
    return propose({'project_id':p['project_id'],'expected_version':p['version'],'plan':plan,'reason':'A → B 程序交接；待用户采用'})

def demo(data):
    p=current(data)
    if p['mode']!='demo' or p['diagnosis']:
        raise ValueError('仅空的 Demo 项目可运行示例；真实项目请接入队友接口')
    def researcher(context):
        return {'diagnosis_version':1,'requirements':[context['goal']], 'sources':[{'source_id':'input','kind':'user_material','title':'本次目标'}],
                'artifact_status':[],'member_profiles':[{'member_id':'captain','name':'队长'},{'member_id':'A','name':'诊断研究'},{'member_id':'B','name':'行动排程'}],
                'gaps':[{'gap_id':'G1','current_evidence':'Demo：尚未提供试用记录','target_result':'一份可复核的流程记录','gap_type':'evidence',
                         'related_member_ids':['captain'],'required_capabilities':['记录与验收'],'source_refs':['input'],'priority_reason':'先验证交接','verification_status':'demo_fixture'}],
                'resource_candidates':[],'unknowns':['Demo 没有调用真实模型或搜索；实际差距待 A 判断']}
    def planner(d, context):
        return {'plan_version':1,'based_on_diagnosis_version':d['diagnosis_version'],
                'tasks':[{'task_id':'T1','title':'验证一次三人交接','gap_ids':[d['gaps'][0]['gap_id']],'owner_ids':['captain'],
                          'steps':['核对诊断与来源','记录一次操作结果','提交证据并请成员验收'],'deliverable':'操作记录',
                          'acceptance_criteria':['记录目标、步骤、结果和卡点'],'estimate_minutes_range':[5,15],
                          'depends_on':[],'deadline':'待成员确认','source_refs':['input'],'status':'candidate'}],
                'learning_paths':[],'time_blocks':[],'dependencies':[],'unscheduled':['T1：尚未提供可用时段'],
                'assumptions':['人工构造的 Demo 任务，未进行智能排期']}
    return run_handoff(data,researcher,planner)


def period_replan(data):
    p = current(data)
    if not p['plan'] or p['plan_stale']:
        raise Conflict('请先采用基于最新诊断的计划')
    if integer(data,'expected_plan_version',1) != p['plan']['plan_version']:
        raise Conflict('计划版本已变化，请刷新')
    from period_planner import compute
    constraints = copy.deepcopy(required(data,'constraints',dict))
    plan = compute(p,constraints)
    return propose({**data,'plan':plan,'reason':required(data,'reason')})


def undo_plan(data):
    p = current(data)
    if not p.get('undo_plan') or p.get('undo_at_version') != p['version']:
        raise Conflict('没有可直接撤销的安排，或采用后已有新进度；请重新预览调整，避免覆盖成果')
    previous = copy.deepcopy(p['undo_plan'])
    previous['plan_version'] = p['plan']['plan_version'] + 1
    validate_plan(previous,p['diagnosis'])
    p['plan'],p['proposal'],p['undo_plan'] = previous,None,None
    return commit(p,p['version'],'撤销上次计划采用；保留版本历史')

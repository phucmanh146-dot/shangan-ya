"""Server-side AI gateway for task analysis and semantic memo extraction.

Keys are read only from process environment and are never returned to clients.
"""
import base64, json, os, urllib.request, urllib.error

class GatewayError(Exception):
    def __init__(self, message, status=503):
        super().__init__(message); self.status=status

def status():
    key=os.environ.get("OPENAI_API_KEY","").strip()
    return {"configured":bool(key),"provider":"OpenAI Responses API","model":os.environ.get("SHANGANYA_AI_MODEL","gpt-4.1-mini"),"keyExposed":False,"verified":False,"note":"configured only means a server key exists; verified becomes true only after a successful health check"}

def _responses(payload):
    key=os.environ.get("OPENAI_API_KEY","").strip()
    if not key: raise GatewayError("AI 服务尚未配置：请在 Railway 服务变量中设置 OPENAI_API_KEY；密钥不会写入网页或仓库。",503)
    body=json.dumps(payload,ensure_ascii=False).encode("utf-8")
    req=urllib.request.Request("https://api.openai.com/v1/responses",data=body,headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"},method="POST")
    try:
        with urllib.request.urlopen(req,timeout=90) as res: data=json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail=e.read().decode("utf-8","replace")[:500]
        raise GatewayError("模型请求失败（HTTP "+str(e.code)+"）："+detail,e.code if 400<=e.code<600 else 502)
    except Exception as e: raise GatewayError("模型连接失败："+str(e)[:250],502)
    text=data.get("output_text","")
    if not text:
        parts=[]
        for item in data.get("output",[]):
            for c in item.get("content",[]):
                if c.get("type")=="output_text": parts.append(c.get("text",""))
        text="\n".join(parts)
    if not text: raise GatewayError("模型返回成功，但没有可用文本。",502)
    return text

def handle(path,data):
    if path=="/api/ai/status":
        s=status()
        if not s["configured"]: return s
        try:
            text=_responses({"model":s["model"],"input":"Reply with exactly: OK","max_output_tokens":8})
            s["verified"]=text.strip().upper()=="OK"
            s["note"]="真实模型请求已成功验证" if s["verified"] else "模型已返回，但健康检查文本不匹配"
        except GatewayError as e:
            s["error"]=str(e); s["note"]="模型健康检查失败"
        return s
    if path=="/api/ai/respond":
        task=data.get("task") or {}
        if not isinstance(task,dict): raise GatewayError("task 必须是对象",400)
        sources=data.get("sources") or []
        if not isinstance(sources,list) or len(sources)>30: raise GatewayError("sources 必须是最多30条的数组",400)
        if any(not isinstance(x,dict) for x in sources): raise GatewayError("资料格式无效",400)
        context={"task":task,"verified_sources":sources,"checkpoint":data.get("checkpoint"),"history":data.get("history"),"user_question":str(data.get("question",""))[:12000]}
        prompt="你是上岸鸭工作台的任务解卡助手。只使用输入中提供的事实，不编造完成情况。若资料正文缺失，明确列为证据缺口。请用中文输出：证据及来源、当前卡点、硬依赖与软依赖、可并行任务、最小下一步、具体产出、验收标准、估时区间和置信度、建议休息/缓冲。精力低或卡壳时优先保存断点，不鼓励无限死磕。\n输入 JSON：\n"+json.dumps(context,ensure_ascii=False)[:45000]
        text=_responses({"model":os.environ.get("SHANGANYA_AI_MODEL","gpt-4.1-mini"),"input":prompt,"max_output_tokens":2200})
        return {"ok":True,"text":text,"provider":"OpenAI Responses API","sourceIds":[str(x.get("sourceId","")) for x in sources if x.get("sourceId")],"keyExposed":False}
    if path=="/api/memo/parse":
        text=str(data.get("text",""))[:30000]
        image=data.get("image")
        content=[{"type":"input_text","text":"把这份备忘录整理成任务草稿。必须区分项目、任务、硬依赖、软依赖、等待任务、心理锁定、截止时间、并行任务和不确定项。输出 JSON，字段为 projects, tasks, dependencies, waiting, psychological_blockers, deadlines, parallel_tasks, uncertainties。不得直接声称已创建任务，不得编造日期、本人经历或完成状态。文本如下：\n"+text}]
        if isinstance(image,str) and image.startswith("data:image/") and len(image)<=12000000:
            content.append({"type":"input_image","image_url":image,"detail":"high"})
        schema={"type":"object","additionalProperties":False,"properties":{"projects":{"type":"array","items":{"type":"object","additionalProperties":False,"properties":{"name":{"type":"string"},"goal":{"type":"string"},"blocker":{"type":"string"}},"required":["name","goal","blocker"]}},"tasks":{"type":"array","items":{"type":"object","additionalProperties":False,"properties":{"title":{"type":"string"},"project":{"type":"string"},"priority":{"type":"string","enum":["high","medium","low","uncertain"]},"due_date":{"type":"string"},"status":{"type":"string","enum":["todo","waiting","blocked","uncertain"]},"evidence":{"type":"string"},"uncertainty":{"type":"string"}},"required":["title","project","priority","due_date","status","evidence","uncertainty"]}},"dependencies":{"type":"array","items":{"type":"object","additionalProperties":False,"properties":{"from_task":{"type":"string"},"to_task":{"type":"string"},"type":{"type":"string","enum":["hard","soft","assumed"]},"reason":{"type":"string"}},"required":["from_task","to_task","type","reason"]}},"waiting":{"type":"array","items":{"type":"string"}},"psychological_blockers":{"type":"array","items":{"type":"string"}},"deadlines":{"type":"array","items":{"type":"string"}},"parallel_tasks":{"type":"array","items":{"type":"string"}},"uncertainties":{"type":"array","items":{"type":"string"}}},"required":["projects","tasks","dependencies","waiting","psychological_blockers","deadlines","parallel_tasks","uncertainties"]}
        raw=_responses({"model":os.environ.get("SHANGANYA_AI_MODEL","gpt-4.1-mini"),"input":[{"role":"user","content":content}],"text":{"format":{"type":"json_schema","name":"memo_task_draft","strict":True,"schema":schema}},"max_output_tokens":3500})
        try: parsed=json.loads(raw)
        except Exception: raise GatewayError("AI 返回的备忘录结构不是有效 JSON；原始结果未写入任务。",502)
        return {"ok":True,"draft":parsed,"created":False,"requiresConfirmation":True,"keyExposed":False}
    raise GatewayError("未知 AI 接口",404)

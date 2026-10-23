import sys,json,hashlib,zipfile
from pathlib import Path
import xml.etree.ElementTree as ET
root=Path("D:/shanganya-full-public-20261017")
sys.path.insert(0,str(root))
import source_workflow as s, agent_runtime as a
doc=next(p for p in Path("D:/").glob("*.docx") if p.name.startswith("\u4e0a\u5cb8\u9e2d\u7ade\u54c1\u62c6\u89e3"))
ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with zipfile.ZipFile(doc) as z:
    tree=ET.fromstring(z.read("word/document.xml"))
text="\n".join("".join(p.itertext()) for p in []) if False else "\n".join("".join(t.text or "" for t in p.findall(".//w:t",ns)) for p in tree.findall(".//w:p",ns))
prepared=s.prepare({"document":{"title":doc.name,"text":text,"path":str(doc)}})
checks={"real_document":str(doc),"sha256":hashlib.sha256(doc.read_bytes()).hexdigest(),"chars":len(text),"sections":len(prepared["sections"]),"coverage_exact":"".join(x["text"] for x in prepared["sections"])==text,"offsets_exact":all(text[x["start"]:x["end"]]==x["text"] for x in prepared["sections"])}
try:
    s.prepare({"text":""})
    checks["empty_source_rejected"]=False
except Exception as e:
    checks["empty_source_rejected"]=True
try:
    a.run_agent({"question":"Audit model availability"})
    checks["model_status"]="unexpected_success"
except Exception as e:
    checks["model_status"]=str(e)
(root/"docs"/"competitor-source-extracted-20261023.txt").write_text(text,encoding="utf-8")
(root/"docs"/"real-source-audit-20261023.json").write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(checks,ensure_ascii=True))

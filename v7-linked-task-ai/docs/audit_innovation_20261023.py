"""Run against isolated temporary SQLite storage. No model calls."""
import sys, tempfile, pathlib, json
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import agent_runtime as a
with tempfile.TemporaryDirectory() as d:
    a.DB_PATH = pathlib.Path(d) / "audit.sqlite3"
    t = a.create_task({"title":"Innovation audit","goal":"Checkpoint recovery","accountId":"audit"})
    a.checkpoint({"taskId":t["id"],"accountId":"audit","state":{"fileVersion":"V1","location":"paragraph3","acceptance":"traceable source"},"nextStep":"list one evidence item in five minutes","sessionId":"s1"})
    r = a.recover({"taskId":t["id"],"accountId":"audit","sessionId":"s2"})
    results = [
        {"test":"checkpoint_cross_session","passed":r["task"]["state"]["location"]=="paragraph3" and "s2" in r["task"]["context"]["sessionIds"]},
        {"test":"account_isolation","passed":a.get_task(t["id"],"other") is None},
    ]
    c = a.complete_task({"taskId":t["id"],"accountId":"audit","result":"No V2 or review"})
    results.append({"test":"completion_evidence_gate","passed":c["completed"]["status"]!="completed","actual":c["completed"]["status"]})
    for result in results: print(json.dumps(result))
    import gc
    gc.collect()  # sqlite context managers commit but do not close connections
sys.exit(0 if all(r["passed"] for r in results) else 1)

import os,json,time
start=time.time()
skip={"node_modules",".git",".venv","site-packages","Windows","$RECYCLE.BIN","__pycache__"}
needles=["\u6e58\u79c0","\u6e58\u7ee3","\u7ade\u54c1\u62c6\u89e3"]
hits=[]
for root in ["D:/","C:/Users/jiang/Documents","C:/Users/jiang/Downloads"]:
    for base,dirs,files in os.walk(root):
        dirs[:]=[d for d in dirs if d not in skip and not d.startswith(".venv")]
        for f in files:
            if any(n in f for n in needles):
                p=os.path.join(base,f)
                hits.append(p)
                print(json.dumps({"found":p},ensure_ascii=True),flush=True)
        if time.time()-start>90: break
print(json.dumps({"done":True,"count":len(hits),"seconds":round(time.time()-start,2)}),flush=True)

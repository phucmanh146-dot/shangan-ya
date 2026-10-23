import time,json
from pathlib import Path
from pywinauto import Desktop
import pyperclip
URL="https://tcnb3a3fuvtb.feishu.cn/wiki/YD6HwHCS5iXlgmkpLOoccnvon7b?from=from_copylink"
orig=pyperclip.paste()
out=Path(r"D:\shanganya-full-public-20261017\_feishu_desktop_probe.txt")
try:
    wins=Desktop(backend="uia").windows()
    candidates=[]
    for w in wins:
        try:
            title=w.window_text()
            if "Microsoft Edge" in title or "Google Chrome" in title:
                candidates.append((w,title))
        except: pass
    target=next((w for w,t in candidates if "Microsoft Edge" in t and "OpenAI" in t),None)
    if target is None: target=next((w for w,t in candidates if "Microsoft Edge" in t),None)
    if target is None: target=next((w for w,t in candidates if "Google Chrome" in t),None)
    if target is None: raise RuntimeError("没有找到可操作的浏览器窗口")
    target.set_focus(); time.sleep(.5)
    target.type_keys("^l",set_foreground=True); time.sleep(.3)
    pyperclip.copy(URL); target.type_keys("^v",set_foreground=True); target.type_keys("{ENTER}",set_foreground=True)
    time.sleep(14); target.type_keys("^a",set_foreground=True); time.sleep(.3); target.type_keys("^c",set_foreground=True); time.sleep(1)
    txt=pyperclip.paste() or ""
    out.write_text(txt,encoding="utf-8")
    print(json.dumps({"browser_title":target.window_text(),"chars":len(txt),"head":txt[:800],"tail":txt[-300:]},ensure_ascii=True))
finally:
    if isinstance(orig,str): pyperclip.copy(orig)

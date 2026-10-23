import time,json,pyautogui as pg,pyperclip,win32gui,win32con
from pywinauto import Desktop
from pathlib import Path
h=132818
prior=pyperclip.paste()
try:
 win32gui.ShowWindow(h,win32con.SW_RESTORE)
 Desktop(backend='win32').window(handle=h).set_focus()
 time.sleep(0.3)
 # Click in document body (not an editable field)
 pg.click(1030,470)
 time.sleep(0.3)
 pg.hotkey('ctrl','a');time.sleep(0.5);pg.hotkey('ctrl','c');time.sleep(1.2)
 s=pyperclip.paste() or ''
 Path(r"D:\shanganya-full-public-20261017\_feishu_desktop_probe.txt").write_text(s,encoding='utf-8')
 print(json.dumps({'chars':len(s),'has_original':('上岸鸭技术改进' in s),'header':s[:2000]},ensure_ascii=True))
finally:
 if isinstance(prior,str):pyperclip.copy(prior)

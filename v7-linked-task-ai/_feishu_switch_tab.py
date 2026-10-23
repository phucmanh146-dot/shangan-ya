import time,json,win32gui,win32con,pyautogui as pg,pyperclip
from pywinauto import Desktop
from pathlib import Path
h=132818
prev=pyperclip.paste()
try:
  win32gui.ShowWindow(h,win32con.SW_RESTORE)
  Desktop(backend='win32').window(handle=h).set_focus()
  time.sleep(0.8)
  pg.hotkey('ctrl','shift','tab')
  time.sleep(2)
  title=win32gui.GetWindowText(h)
  pg.screenshot().save(r"D:\shanganya-full-public-20261017\_feishu_tab_selected.png")
  # Avoid selecting all inside an editable Feishu doc: just inspect tab first.
  print(json.dumps({'title':title,'selected_feishu':('飞书' in title or '上岸鸭技术改进' in title)},ensure_ascii=True))
finally:
  if isinstance(prev,str):pyperclip.copy(prev)

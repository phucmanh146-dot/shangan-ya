"""Read user-shared WeChat window frames; never captures a desktop itself."""
import re
import secrets
import threading
import time
from contextlib import contextmanager

from rescue_service import RescueError
from sy_wechat_search import automation, clean
from growth_ocr import read_frame

PENDING = {}
LAST = {}
LOCK = threading.Lock()
HEADERS = {'群聊': 'groups', '聊天记录': 'messages', '联系人': 'contacts',
           '公众号': 'public', '功能': 'other', '小程序': 'other'}


def compact(value):
    return re.sub(r'\s+', '', str(value or '')).casefold()


def rows(doc):
    result = []
    for line in doc.get('lines', []):
        words = line.get('words') or []
        if not words: continue
        left = min(float(w['x']) for w in words)
        top = min(float(w['y']) for w in words)
        right = max(float(w['x']) + float(w['width']) for w in words)
        bottom = max(float(w['y']) + float(w['height']) for w in words)
        value = str(line.get('text') or '').strip()
        # Windows OCR inserts spaces between some Chinese characters.
        value = re.sub(r'(?<=[\u3400-\u9fff])\s+(?=[\u3400-\u9fff])', '', value)
        if value: result.append({'text': value, 'x': left, 'y': top, 'width': right-left, 'height': bottom-top})
    return sorted(result, key=lambda r: (r['y'], r['x']))


def search_anchor(doc, previous=''):
    labels = {'搜索', 'search'}
    if previous: labels.add(compact(previous))
    width, height = doc['width'], doc['height']
    candidates = [r for r in rows(doc) if compact(r['text']) in labels
        and .035 * width < r['x'] < .40 * width and r['y'] < .13 * height
        and r['width'] < .32 * width]
    if len(candidates) != 1:
        raise RescueError('画面里无法唯一确认微信左上角的搜索框。请回到聊天列表、清空搜索框，再点击窗口搜索。', 'WECHAT_SCREEN_SEARCH_UNCLEAR', 409)
    return candidates[0]


def parse_results(doc, keyword):
    source = rows(doc)
    key = compact(keyword)
    if not any(key in compact(r['text']) and r['y'] < .15*doc['height'] and r['x'] < .5*doc['width'] for r in source):
        raise RescueError('共享画面的顶部没有识别到本次关键词，未把其他聊天内容当作搜索结果。', 'WECHAT_SCREEN_QUERY_CHANGED', 409)
    groups, messages, conversations = [], [], []
    scope, column = None, None
    for row in source:
        label = compact(row['text']).rstrip(':：')
        header = re.sub(r'[（(]\d+[)）]$', '', label)
        if header in HEADERS and row['x'] < .55*doc['width']:
            scope, column = HEADERS[header], row['x']
            continue
        if column is None or not column-40 <= row['x'] <= min(doc['width']*.65, column+520): continue
        if scope == 'groups' and key in compact(row['text']):
            if not any(g['name'] == row['text'] for g in groups):
                groups.append({'name': row['text'], 'matchedBy': '共享窗口文字识别，待核对'})
        if scope == 'messages':
            if re.search(r'\d+条(?:相关)?(?:聊天)?记录', compact(row['text'])):
                if row['text'] not in conversations: conversations.append(row['text'])
            elif key in compact(row['text']) and row['text'] not in [m['text'] for m in messages]:
                messages.append({'text': row['text']})
    empty = any(compact(r['text']) in ('无搜索结果', '未找到相关结果', '没有找到相关结果') for r in source)
    if not groups and not messages and not conversations and not empty:
        raise RescueError('已识别共享画面，但尚未读到带有群聊或聊天记录分类的匹配结果。请展开微信搜索结果后点“刷新结果”。', 'WECHAT_SCREEN_RESULTS_UNCLEAR', 422)
    text = ('来源：用户共享的微信窗口；关键词：'+keyword+'\n画面文字识别，可能有错字；仅当前可见匹配消息。\n\n'+'\n\n'.join(m['text'] for m in messages)) if messages else ''
    return {'groups': groups[:30], 'messages': messages[:50], 'conversations': conversations[:30],
            'groupCount': min(len(groups), 30), 'count': min(len(messages), 50), 'text': text[:30000],
            'keyword': keyword, 'source': 'wechat-window-ocr', 'empty': empty,
            'note': '来自你共享的微信窗口，文字识别可能有错字；只覆盖当前可见结果，请核对群名和消息。'}


def check_shared(data):
    if data.get('displaySurface') != 'window':
        raise RescueError('请选择单独的微信窗口共享，本入口不接受整个屏幕或浏览器标签页。', 'WECHAT_WINDOW_REQUIRED', 400)


def window_bounds(hwnd):
    import ctypes
    from ctypes import wintypes
    rect = wintypes.RECT()
    if ctypes.windll.dwmapi.DwmGetWindowAttribute(hwnd, 9, ctypes.byref(rect), ctypes.sizeof(rect)):
        ctypes.windll.user32.GetWindowRect(hwnd, ctypes.byref(rect))
    return (rect.left, rect.top, rect.right-rect.left, rect.bottom-rect.top)


@contextmanager
def physical_pixels():
    import ctypes
    previous = None
    try:
        setter = ctypes.windll.user32.SetThreadDpiAwarenessContext
        setter.restype = ctypes.c_void_p
        previous = setter(ctypes.c_void_p(-4))
    except (OSError, AttributeError): pass
    try:
        yield
    finally:
        if previous: setter(ctypes.c_void_p(previous))


def matching_window(doc, label):
    import ctypes
    from ctypes import wintypes
    import psutil
    import pygetwindow
    # Chromium may expose a window handle, not a human-readable window title.
    handle = re.fullmatch(r'window:(\d+):\d+', str(label))
    named = re.search(r'微信|WeChat|Weixin', str(label), re.I)
    if not handle and not named:
        raise RescueError('浏览器未提供可核对的微信窗口标识。请在微信输入关键词，再点“读取当前搜索画面”。', 'WECHAT_WINDOW_LABEL_UNAVAILABLE', 409)
    choices = []
    for window in pygetwindow.getAllWindows():
        if window.title not in ('微信', 'WeChat', 'Weixin') or window.isMinimized: continue
        if handle and int(handle[1]) != window._hWnd: continue
        pid = wintypes.DWORD()
        ctypes.windll.user32.GetWindowThreadProcessId(window._hWnd, ctypes.byref(pid))
        try:
            if psutil.Process(pid.value).name().lower() not in ('wechat.exe', 'weixin.exe'): continue
        except (psutil.NoSuchProcess, psutil.AccessDenied): continue
        bounds = window_bounds(window._hWnd)
        _, _, width, height = bounds
        if width < 500 or height < 400: continue
        sx, sy = doc['width']/width, doc['height']/height
        if .25 <= sx <= 3 and abs(sx-sy)/max(sx,sy) < .012:
            choices.append((window._hWnd, bounds))
    if len(choices) != 1:
        raise RescueError('无法把共享画面与唯一的微信主窗口对应，请只保留一个微信聊天主窗口，并重新选择它。', 'WECHAT_WINDOW_AMBIGUOUS', 409)
    return choices[0]


def start_search(data):
    from growth_wechat import CANCEL, check_cancelled
    check_shared(data)
    keyword = clean(data.get('keyword', ''))
    with automation(), physical_pixels():
        CANCEL.clear()
        doc = read_frame(data.get('image'))
        check_cancelled()
        hwnd, bounds = matching_window(doc, data.get('windowLabel', ''))
        previous = LAST.get(hwnd, {})
        previous_word = previous.get('keyword', '') if time.monotonic()-previous.get('time', 0) < 300 else ''
        anchor = search_anchor(doc, previous_word)
        from pywinauto import Desktop
        from pywinauto.keyboard import send_keys
        import ctypes
        import pyautogui
        window = Desktop(backend='uia').window(handle=hwnd).wrapper_object()
        # WeChat's public web search is not a chat-history search control.
        for control in window.descendants(control_type='Edit'):
            if control.is_visible() and (control.element_info.class_name == 'OmniboxViewViews'
                    or control.element_info.automation_id == 'weixin-search-input'):
                raise RescueError('当前共享的是微信内置网页或搜一搜。请返回微信聊天主界面，再选择该窗口。', 'WECHAT_CHAT_WINDOW_REQUIRED', 409)
        window.set_focus()
        check_cancelled()
        if ctypes.windll.user32.GetForegroundWindow() != hwnd or window_bounds(hwnd) != bounds:
            raise RescueError('微信窗口位置或焦点发生变化，请重新搜索。', 'WECHAT_WINDOW_CHANGED', 409)
        left, top, width, height = bounds
        x = left+(anchor['x']+anchor['width']/2)*width/doc['width']
        y = top+(anchor['y']+anchor['height']/2)*height/doc['height']
        # Coordinates come only from the user-supplied frame's recognized search label.
        pyautogui.click(x, y)
        check_cancelled()
        if ctypes.windll.user32.GetForegroundWindow() != hwnd:
            raise RescueError('输入前微信焦点已变化，本次停止。', 'WECHAT_WINDOW_CHANGED', 409)
        send_keys('^a')
        escaped = ''.join('{'+c+'}' if c in '{}+^%~()' else c for c in keyword)
        send_keys(escaped, with_spaces=True, pause=.01, vk_packet=True)
        # Never press Enter or interact with the message composer.
        check_cancelled()
        identifier = secrets.token_urlsafe(24)
        with LOCK:
            PENDING.clear()
            PENDING[identifier] = {'keyword': keyword, 'hwnd': hwnd, 'until': time.monotonic()+90}
            LAST[hwnd] = {'keyword': keyword, 'time': time.monotonic()}
        return {'ok': True, 'searchId': identifier, 'keyword': keyword}


def finish_search(data):
    from growth_wechat import check_cancelled
    check_shared(data)
    if data.get('manual') is True:
        keyword = clean(data.get('keyword', ''))
        # Read-only fallback: no click, focus change, or keyboard input.
        return parse_results(read_frame(data.get('image')), keyword)
    with LOCK:
        job = PENDING.get(str(data.get('searchId', '')))
    if not job or time.monotonic() > job['until']:
        raise RescueError('这次窗口查找已过期，请重新点击搜索。', 'WECHAT_SCREEN_EXPIRED', 409)
    check_cancelled()
    doc = read_frame(data.get('image'))
    check_cancelled()
    with physical_pixels():
        hwnd, _ = matching_window(doc, data.get('windowLabel', ''))
    if hwnd != job['hwnd']:
        raise RescueError('共享窗口已变化，本次停止读取。', 'WECHAT_WINDOW_CHANGED', 409)
    return parse_results(doc, job['keyword'])


def cancel():
    with LOCK:
        PENDING.clear()

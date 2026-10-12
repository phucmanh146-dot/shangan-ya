"""Read a keyword from the logged-in WeChat client's native search controls."""
import time
from rescue_service import RescueError
from sy_wechat_search import automation, clean, fill, name

SEARCH_NAMES = {'搜索', 'Search', '搜索联系人、群聊和聊天记录', '搜索联系人和聊天记录'}
SCOPES = {'聊天记录', '聊天记录搜索结果', '搜索结果', '消息', 'Chat history', 'Search results', 'Messages'}


def native(node):
    """An embedded web page must never be mistaken for the chat search box."""
    for _ in range(20):
        if node is None: break
        info = node.element_info
        if info.control_type == 'Document' or info.class_name.startswith(('Chrome', 'Omnibox')):
            return False
        node = node.parent()
    return True


def search_boxes(window):
    return [e for e in window.descendants(control_type='Edit')
            if e.is_visible() and name(e) in SEARCH_NAMES and native(e)]


def connect_window():
    import ctypes
    from ctypes import wintypes
    import psutil
    import pygetwindow
    from pywinauto import Desktop
    clients, login = [], []
    for raw in pygetwindow.getAllWindows():
        if raw.title not in ('微信', 'WeChat', 'Weixin'): continue
        pid = wintypes.DWORD()
        ctypes.windll.user32.GetWindowThreadProcessId(raw._hWnd, ctypes.byref(pid))
        try:
            if psutil.Process(pid.value).name().lower() not in ('weixin.exe', 'wechat.exe'): continue
            window = Desktop(backend='uia').window(handle=raw._hWnd).wrapper_object()
            if raw.isMinimized: window.restore()
            buttons = [name(b) for b in window.descendants(control_type='Button') if native(b)]
            if 'LoginWindow' in window.element_info.class_name or any(b in ('进入微信', '扫码登录', 'Log in') for b in buttons):
                login.append(window)
            elif len(search_boxes(window)) == 1:
                clients.append(window)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    if len(clients) != 1:
        if login:
            try: login[0].set_focus()
            except Exception: pass
            raise RescueError('微信停在登录页面，请先点击“进入微信”完成登录，再点“打开微信并读取关键词”。', 'WECHAT_LOGIN_REQUIRED', 409)
        message = '没有找到可读取的微信聊天主窗口。请打开并登录电脑版微信；如果已登录，此版本可能未开放搜索控件。'
        raise RescueError(message, 'WECHAT_SEARCH_UNAVAILABLE', 409)
    window = clients[0]
    try: window.set_focus()
    except Exception:
        raise RescueError('已找到微信，但无法打开到前台。请点开微信后重试。', 'WECHAT_FOCUS', 409) from None
    return window


def matched_messages(window, keyword):
    texts = []
    for node in window.descendants(control_type='ListItem'):
        if not node.is_visible() or not native(node): continue
        label = name(node)
        if keyword.casefold() not in label.casefold(): continue
        parent, scoped = node.parent(), False
        for _ in range(5):
            if parent is None: break
            if name(parent) in SCOPES: scoped = True; break
            parent = parent.parent()
        if scoped and label not in texts: texts.append(label[:5000])
        if len(texts) == 50: break
    return texts


def search_messages(keyword):
    keyword = clean(keyword)
    with automation():
        window = connect_window()
        fill(search_boxes(window)[0], keyword)
        # Results arrive asynchronously. Read only identified search result lists.
        texts = []
        for _ in range(8):
            time.sleep(.3)
            texts = matched_messages(window, keyword)
            if texts: break
        if not texts:
            tabs = [e for e in window.descendants() if e.is_visible() and native(e)
                    and e.element_info.control_type in ('TabItem', 'Button')
                    and name(e) in ('聊天记录', 'Chat history')]
            if len(tabs) == 1:
                tabs[0].click_input()
                for _ in range(6):
                    time.sleep(.3)
                    texts = matched_messages(window, keyword)
                    if texts: break
        if not texts:
            raise RescueError('微信已打开并搜索该关键词，但没有读到可确认的匹配消息。请核对微信搜索结果，或复制需要的正文到工作台。', 'NO_READABLE_MESSAGES', 422)
        return {'text': ('来源：电脑版微信；关键词：' + keyword + '\n仅包含当前可读取的匹配消息，不代表全部聊天历史。\n\n' + '\n\n'.join(texts))[:30000],
                'count': len(texts), 'keyword': keyword, 'source': 'wechat-accessibility', 'scope': '当前可读取的关键词搜索结果'}

"""Per-browser-session HeyGen video generation. API keys are held in worker memory only."""
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

_API_KEY = ""
_AVATAR_ID = ""
_VOICE_ID = ""

class HeyGenError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status

def _call(path, method="GET", body=None, key=None, timeout=35):
    token = (key if key is not None else _API_KEY).strip()
    if not token:
        raise HeyGenError("尚未配置 HeyGen API Key。请在数字人视频面板中填写并测试。", 409)
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = Request("https://api.heygen.com" + path, data=data, method=method,
                  headers={"X-Api-Key": token, "Accept": "application/json",
                           "Content-Type": "application/json", "User-Agent": "Shanganya-Workbench/1.0"})
    try:
        with urlopen(req, timeout=timeout) as response:
            raw = response.read(3 * 1024 * 1024)
    except HTTPError as exc:
        raw = exc.read(12000)
        try:
            payload = json.loads(raw.decode("utf-8", "replace"))
            detail = payload.get("message") or payload.get("error") or payload.get("msg") or str(payload)
        except Exception:
            detail = raw.decode("utf-8", "replace")[:400] or str(exc)
        code = 401 if exc.code in (401, 403) else 402 if exc.code == 402 else 429 if exc.code == 429 else 404 if exc.code == 404 else 502
        if exc.code in (401, 403): detail = "HeyGen API Key 无效或已失效，请重新测试。"
        elif exc.code == 402: detail = "HeyGen 账户额度不足或需要升级，请检查 HeyGen 账户。"
        elif exc.code == 429: detail = "HeyGen 请求频率受限，请稍后重试。"
        raise HeyGenError("HeyGen API 请求失败：" + str(detail)[:350], code)
    except (URLError, TimeoutError, OSError) as exc:
        raise HeyGenError("暂时无法连接 HeyGen API：" + str(exc)[:200], 502)
    try:
        result = json.loads(raw.decode("utf-8", "replace"))
    except Exception:
        raise HeyGenError("HeyGen 返回了无法解析的响应。", 502)
    if not isinstance(result, dict):
        raise HeyGenError("HeyGen 返回格式异常。", 502)
    if result.get("error") and not result.get("data"):
        raise HeyGenError(str(result.get("error"))[:350], 502)
    return result

def _data(result):
    value = result.get("data", result)
    return value if isinstance(value, dict) else {}

def get_status():
    return {"ok": True, "configured": bool(_API_KEY), "avatarId": _AVATAR_ID,
            "voiceId": _VOICE_ID, "keyStorage": "worker-memory-only"}

def _avatars():
    data = _data(_call("/v2/avatars"))
    items = list(data.get("avatars") or []) + list(data.get("talking_photos") or [])
    out, seen = [], set()
    for item in items:
        if not isinstance(item, dict): continue
        ident = str(item.get("avatar_id") or item.get("id") or "").strip()
        if not ident or ident in seen: continue
        seen.add(ident)
        out.append({"id": ident, "name": str(item.get("avatar_name") or item.get("name") or ident)[:100],
                    "defaultVoiceId": str(item.get("default_voice_id") or ""),
                    "previewImageUrl": str(item.get("preview_image_url") or "")})
    return out[:200]

def _voices():
    data = _data(_call("/v2/voices"))
    items = data.get("voices") or []
    out, seen = [], set()
    for item in items:
        if not isinstance(item, dict): continue
        ident = str(item.get("voice_id") or item.get("id") or "").strip()
        if not ident or ident in seen: continue
        seen.add(ident)
        out.append({"id": ident, "name": str(item.get("name") or item.get("voice_name") or ident)[:100],
                    "language": str(item.get("language") or item.get("language_code") or "")[:40],
                    "gender": str(item.get("gender") or "")[:20]})
    return out[:300]

def get(path):
    if path == "/api/heygen/status":
        return get_status()
    if path == "/api/heygen/avatars":
        return {"ok": True, "avatars": _avatars()}
    if path == "/api/heygen/voices":
        return {"ok": True, "voices": _voices()}
    raise HeyGenError("未知的 HeyGen 接口。", 404)

def post(path, payload):
    global _API_KEY, _AVATAR_ID, _VOICE_ID
    if path == "/api/heygen/config":
        key = str(payload.get("apiKey") or "").strip() or _API_KEY
        if not key or len(key) > 8192:
            raise HeyGenError("请填写有效的 HeyGen API Key。", 400)
        data = _data(_call("/v2/avatars", key=key, timeout=35))
        _API_KEY = key
        _AVATAR_ID = str(payload.get("avatarId") or _AVATAR_ID).strip()[:300]
        _VOICE_ID = str(payload.get("voiceId") or _VOICE_ID).strip()[:300]
        count = len(data.get("avatars") or []) + len(data.get("talking_photos") or [])
        return {"ok": True, "configured": True, "avatarCount": count,
                "avatarId": _AVATAR_ID, "voiceId": _VOICE_ID,
                "note": "HeyGen API 已真实连通；Key 仅保存在当前访客后台进程内存中。"}
    if path == "/api/heygen/disconnect":
        _API_KEY = ""; _AVATAR_ID = ""; _VOICE_ID = ""
        return {"ok": True, "configured": False}
    if path == "/api/heygen/generate":
        if not _API_KEY:
            raise HeyGenError("请先测试并连接 HeyGen API Key。", 409)
        script = str(payload.get("script") or "").strip()
        if not script: raise HeyGenError("视频口播稿不能为空。", 400)
        if len(script) > 6000: raise HeyGenError("口播稿最多 6000 字，请精简后再生成。", 413)
        avatar = str(payload.get("avatarId") or _AVATAR_ID).strip()[:300]
        voice = str(payload.get("voiceId") or _VOICE_ID).strip()[:300]
        if not avatar or not voice:
            raise HeyGenError("请先从真实 API 列表选择数字人和声音。", 400)
        title = re.sub(r"[\r\n\t]+", " ", str(payload.get("title") or "上岸鸭 AI 结果讲解"))[:120]
        request = {"title": title, "dimension": {"width": 1920, "height": 1080},
                   "video_inputs": [{"character": {"type": "avatar", "avatar_id": avatar, "avatar_style": "normal"},
                                     "voice": {"type": "text", "input_text": script, "voice_id": voice}}]}
        result = _call("/v2/video/generate", method="POST", body=request, timeout=45)
        data = _data(result)
        video_id = str(data.get("video_id") or result.get("video_id") or "").strip()
        if not video_id: raise HeyGenError("HeyGen 未返回 video_id；未能确认生成任务已创建。", 502)
        _AVATAR_ID, _VOICE_ID = avatar, voice
        return {"ok": True, "videoId": video_id, "status": "pending",
                "note": "HeyGen 已接受生成请求；渲染可能需要数分钟，可能产生费用。"}
    if path == "/api/heygen/status":
        video_id = str(payload.get("videoId") or "").strip()
        if not _API_KEY: raise HeyGenError("当前会话未配置 HeyGen API Key。", 409)
        if not video_id or len(video_id) > 300 or not re.fullmatch(r"[A-Za-z0-9_-]+", video_id):
            raise HeyGenError("video_id 无效。", 400)
        query = urlencode({"video_id": video_id})
        try:
            result = _call("/v1/video_status.get?" + query, timeout=30)
        except HeyGenError as exc:
            if exc.status == 404:
                return {"ok": True, "videoId": video_id, "status": "processing", "videoUrl": "",
                        "note": "HeyGen 尚未完成索引，稍后继续查询。"}
            raise
        data = _data(result)
        state = str(data.get("status") or result.get("status") or "processing").lower()
        return {"ok": True, "videoId": video_id, "status": state,
                "videoUrl": str(data.get("video_url") or result.get("video_url") or ""),
                "thumbnailUrl": str(data.get("thumbnail_url") or result.get("thumbnail_url") or ""),
                "duration": data.get("duration") or result.get("duration")}
    raise HeyGenError("未知的 HeyGen 接口。", 404)

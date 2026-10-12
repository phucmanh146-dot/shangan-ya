"""Run beside the existing local_server.py; never exposes the PC to the Internet."""
import argparse
import importlib.util
import json
import secrets
from urllib.parse import parse_qs, urlparse, unquote

import local_server as legacy
import rescue_service as rescue
import growth_pipeline as flow

TOKEN = secrets.token_urlsafe(32)
MODEL_FILE = flow.DATA / 'model-selection.json'


def initialize_model():
    # Keep provider secrets in the user's existing CC Switch store, on this PC.
    try:
        selected = json.loads(MODEL_FILE.read_text(encoding='utf-8'))['id']
        legacy.connect_ccswitch(selected, verify=False)
    except (OSError, ValueError, KeyError, rescue.RescueError):
        pass


initialize_model()


class Handler(legacy.Handler):
    def source_file(self):
        path = unquote(urlparse(self.path).path).lower().replace('\\', '/')
        return (any(p.startswith('.') for p in path.split('/') if p)
                or path.endswith(('.py', '.pyc', '.cmd', '.ps1', '.env', '.log', '.zip', '.json', '.db', '.sqlite3')))

    def do_HEAD(self):
        if not self.growth_allowed() or self.source_file():
            self.send_response(403)
            self.end_headers()
            return
        return super().do_HEAD()

    def growth_allowed(self):
        port = self.server.server_port
        hosts = {'127.0.0.1:' + str(port), 'localhost:' + str(port)}
        return self.headers.get('Host') in hosts and self.headers.get('Origin') in (
            None, 'http://127.0.0.1:' + str(port), 'http://localhost:' + str(port))

    def list_directory(self, path):
        return self.send_json({'error': '目录不可通过浏览器浏览。'}, 403)

    def do_GET(self):
        if self.source_file():
            return self.send_json({'error': '文件不可通过浏览器读取'}, 403)
        parsed = urlparse(self.path)
        if not parsed.path.startswith('/api/growth/'):
            return super().do_GET()
        if not self.growth_allowed():
            return self.send_json({'error': '来源不允许'}, 403)
        params = parse_qs(parsed.query)
        account = params.get('account', [''])[0]
        try:
            if parsed.path == '/api/growth/session':
                return self.send_json({'token': TOKEN})
            if parsed.path == '/api/growth/health':
                return self.send_json({'ok': True, 'version': 'growth-1', 'ai': rescue.public_config(),
                    'providers': legacy.ccswitch_catalog()['providers'],
                    'capabilities': {'pdf': bool(importlib.util.find_spec('pypdf')), 'docx': True,
                                     'wechat': bool(importlib.util.find_spec('pywinauto')),
                                     'videoFrames': True, 'videoAudio': False},
                    'storage': '此电脑持久保存资料与处理进度；原清单仍在原浏览器空间。'})
            if parsed.path == '/api/growth/state':
                return self.send_json(flow.state(account))
            if parsed.path == '/api/growth/run':
                return self.send_json(flow.get_run(account, params.get('id', [''])[0]))
            return self.send_json({'error': '接口不存在'}, 404)
        except ValueError as exc:
            return self.send_json({'error': str(exc)}, 400)

    def do_POST(self):
        path = urlparse(self.path).path
        if not path.startswith('/api/growth/'):
            return super().do_POST()
        if not self.growth_allowed() or not secrets.compare_digest(self.headers.get('X-Growth-Token', ''), TOKEN):
            return self.send_json({'error': '连接验证已过期，请关闭资料窗口后重开。'}, 403)
        if not self.headers.get('Content-Type', '').startswith('application/json'):
            return self.send_json({'error': '需要 JSON 请求'}, 415)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 1 <= size <= 8_000_000:
                return self.send_json({'error': '请求超过 8 MB，请减少图片数量或压缩资料。'}, 413)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('请求格式不正确。')
            if path == '/api/growth/project':
                return self.send_json(flow.save_project(data))
            if path == '/api/growth/run':
                return self.send_json(flow.start(data), 202)
            if path == '/api/growth/retry':
                return self.send_json(flow.retry(data), 202)
            if path == '/api/growth/model':
                identifier = str(data.get('id', ''))
                result = legacy.connect_ccswitch(identifier, verify=True)
                temp = MODEL_FILE.with_suffix('.tmp')
                temp.write_text(json.dumps({'id': identifier}), encoding='utf-8')
                temp.replace(MODEL_FILE)
                return self.send_json(result)
            if path == '/api/growth/search-test':
                return self.send_json(rescue.search_web('Python official tutorial', 3))
            if path in ('/api/growth/wechat-groups', '/api/growth/wechat-messages'):
                from sy_wechat_search import search_groups, read_messages
                result = search_groups(data.get('query', '')) if path.endswith('groups') else read_messages(data.get('id'), data.get('keyword'))
                return self.send_json(result)
            return self.send_json({'error': '接口不存在'}, 404)
        except rescue.RescueError as exc:
            return self.send_json({'error': str(exc), 'code': exc.code, **exc.extra}, exc.status)
        except (ValueError, TypeError, KeyError, UnicodeError) as exc:
            return self.send_json({'error': str(exc)}, 400)
        except Exception as exc:
            return self.send_json({'error': '此步未完成（' + type(exc).__name__ + '）。已有内容保留。'}, 502)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8877)
    args = parser.parse_args()
    server = legacy.LocalServer(('127.0.0.1', args.port), Handler)
    flow.recover_interrupted()
    print(f'上岸鸭资料行动： http://127.0.0.1:{args.port}/index.html', flush=True)
    server.serve_forever()

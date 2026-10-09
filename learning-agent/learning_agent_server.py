"""Run standalone or alongside the existing 上岸鸭 V9 files on loopback."""
import argparse
import json
import os
import mimetypes
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import learning_agent as agent
import rescue_service as rescue

ROOT = Path(__file__).resolve().parent
try:
    from v9_server import V9Handler as LegacyHandler
except ImportError:
    LegacyHandler = SimpleHTTPRequestHandler
    try:
        from local_integrations import initialize
        initialize()
    except ImportError:
        pass


class Handler(LegacyHandler):
    def __init__(self, *args, **kwargs):
        if LegacyHandler is SimpleHTTPRequestHandler:
            kwargs['directory'] = str(ROOT)
        super().__init__(*args, **kwargs)

    def agent_allowed(self):
        host = self.headers.get('Host', '')
        hosts = {'127.0.0.1:' + str(self.server.server_port), 'localhost:' + str(self.server.server_port)}
        origin = self.headers.get('Origin')
        return host in hosts and (origin is None or origin in {'http://' + h for h in hosts})

    def send_json(self, obj, status=200):
        raw = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        try:
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        super().end_headers()

    def do_GET(self):
        if not self.agent_allowed():
            return self.send_json({'error': '来源不允许'}, 403)
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            if path == '/api/agent/health':
                import shutil, importlib.util
                return self.send_json({'ok': True, 'version': 'learning-agent-1', 'ai': rescue.public_config(),
                                       'search':{'provider':'Tavily' if os.getenv('TAVILY_API_KEY') else 'public-fallback',
                                                 'verified':False, 'note':'有配置不代表检索已成功；请查看每次执行记录。'},
                                       'capabilities': {'liveSearch': True, 'sourceReading': True, 'persistedRoutes': True,
                                                        'replan': True, 'videoRenderer': bool(shutil.which('ffmpeg') and importlib.util.find_spec('PIL'))}})
            if path == '/api/agent/state':
                return self.send_json(agent.state())
            if path == '/api/agent/run':
                return self.send_json(agent.get_run(parse_qs(parsed.query).get('id', [''])[0]))
            if path.startswith('/api/agent/video/'):
                name = path.rsplit('/', 1)[-1]
                if not re.fullmatch(r'[0-9a-f]{32}-v\d+\.mp4', name):
                    raise ValueError('视频地址无效')
                target = agent.DATA / 'videos' / name
                if not target.is_file():
                    return self.send_json({'error': '视频不存在'}, 404)
                raw = target.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', 'video/mp4')
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
                return
            if path == '/api/ai-config':
                return self.send_json(rescue.public_config())
            if path in ('/', '/learning-agent'):
                self.path = '/learning-agent.html'
            if path.startswith('/api/agent/'):
                return self.send_json({'error': '接口不存在'}, 404)
            if LegacyHandler is SimpleHTTPRequestHandler:
                if self.path.split('?')[0] not in ('/planner.html', '/planner.js', '/learning-agent.html', '/learning-agent.js', '/learning-agent.css', '/learning-agent-entry.js'):
                    return self.send_json({'error': '文件不可读取'}, 404)
            return super().do_GET()
        except ValueError as exc:
            return self.send_json({'error': str(exc)}, 400)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        ours = path.startswith('/api/agent/') or path in ('/api/ai-config', '/api/ai-test', '/api/ai-local-gateway')
        if not ours and LegacyHandler is not SimpleHTTPRequestHandler:
            return super().do_POST()
        if not self.agent_allowed():
            return self.send_json({'error': '来源不允许'}, 403)
        if not self.headers.get('Content-Type', '').startswith('application/json'):
            return self.send_json({'error': '需要 JSON 请求'}, 415)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 1 <= size <= 4_000_000:
                return self.send_json({'error': '请求超过 4 MB 上限'}, 413)
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError('请求必须为 JSON 对象')
            if path == '/api/agent/planner/generate':
                import action_planner
                return self.send_json(action_planner.generate(data['diagnosis'], data.get('context', {})))
            if path == '/api/agent/planner/replan':
                import action_planner
                return self.send_json(action_planner.replan(data['diagnosis'], data['plan'], data['settings'], data['expected_plan_version']))
            if path == '/api/agent/run':
                return self.send_json(agent.submit(data), 202)
            if path == '/api/agent/replan':
                return self.send_json(agent.replan(data, save=data.get('apply') is True))
            if path == '/api/agent/complete':
                return self.send_json(agent.complete_task(data))
            if path == '/api/agent/day':
                return self.send_json(agent.daily_plan(data))
            if path == '/api/agent/action':
                return self.send_json(agent.complete_action(data))
            if path == '/api/agent/undo':
                return self.send_json(agent.undo(data))
            if path == '/api/agent/tutorial':
                from agent_video import render
                return self.send_json(render(str(data.get('routeId', ''))))
            if path == '/api/ai-config':
                return self.send_json(rescue.set_config(data))
            if path == '/api/ai-test':
                return self.send_json(rescue.test_connection())
            if path == '/api/ai-local-gateway':
                from local_integrations import connect_local_gateway
                value = connect_local_gateway()
                if value is None:
                    raise ValueError('本机模型网关暂时不可用，请在 AI 连接中设置服务')
                return self.send_json(value)
            return self.send_json({'error': '接口不存在'}, 404)
        except rescue.RescueError as exc:
            return self.send_json({'error': str(exc), 'code': exc.code, **exc.extra}, exc.status)
        except (ValueError, TypeError, KeyError, UnicodeError) as exc:
            return self.send_json({'error': str(exc)}, 400)
        except Exception as exc:
            return self.send_json({'error': '请求未完成：' + type(exc).__name__}, 502)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8901)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'上岸鸭学习导航 Agent: http://127.0.0.1:{args.port}/learning-agent.html', flush=True)
    server.serve_forever()

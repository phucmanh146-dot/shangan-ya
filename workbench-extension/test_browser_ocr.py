"""Local Windows browser verification using only synthetic image/stream fixtures.
No desktop capture, permission approval, real chat search, or model request.
"""
import io
import json
import re
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

image = Image.new('RGB', (900, 600), 'white')
font = ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc', 48)
ImageDraw.Draw(image).text((50, 80), 'RAG 学习资料\n先核对来源，再整理任务', fill='black', font=font, spacing=35)
buffer = io.BytesIO(); image.save(buffer, 'PNG')
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True, timeout=25000)
    try:
        page = browser.new_page()
        errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:8877/index.html')
        page.wait_for_function('window.SY && window.SYGrowth')
        page.evaluate("SY.enterApp('OCR验证空间','qa-ocr-fixture'); SYGrowth.open({text:'原始笔记'});")
        page.wait_for_function("document.querySelector('.growth-dialog [data-status]').textContent.includes('已连接')")
        dialog = page.locator('.growth-dialog')
        dialog.locator('input[type=file]').set_input_files({'name': 'synthetic-ocr.png', 'mimeType': 'image/png', 'buffer': buffer.getvalue()})
        dialog.locator('[data-ocr]').wait_for()
        dialog.locator('[data-ocr]').click()
        dialog.get_by_text('核对画面文字', exact=True).wait_for(timeout=35000)
        material = dialog.locator('[data-materials]').text_content()
        assert 'RAG学习资料' in re.sub(r'\s+', '', material)
        checks.append('actual-local-ocr-on-synthetic-image'); print('OCR image passed', flush=True)
        dialog.get_by_text('追加到正文', exact=True).click()
        body = dialog.locator('[name=text]').input_value()
        assert body.startswith('原始笔记') and 'RAG学习资料' in re.sub(r'\s+', '', body)
        checks.append('ocr-to-body-preserves-original-text')
        page.evaluate('SYGrowth.close()')
        page.locator('#syRemoteEntry').click()
        panel = page.frame_locator('iframe[title="本机远程桌面"]')
        panel.locator('#shareWechat').wait_for(timeout=15000)
        frame = next(f for f in page.frames if f.url.startswith('http://127.0.0.1:8878/'))
        assert frame.evaluate("typeof navigator.mediaDevices.getDisplayMedia === 'function' && document.featurePolicy.allowsFeature('display-capture')")
        assert panel.locator('#searchShared').is_disabled()
        checks.append('share-entry-and-iframe-permission-policy')
        # Synthetic canvas stream tests UI flow without accessing any desktop.
        frame.evaluate('''() => {
          const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600;
          const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0,0,900,600);
          ctx.fillStyle = 'black'; ctx.font = '40px sans-serif'; ctx.fillText('RAG fixture',80,80);
          const stream = canvas.captureStream(5), track = stream.getVideoTracks()[0];
          Object.defineProperty(track, 'label', {value:'window:123:0'});
          track.getSettings = () => ({displaySurface:'window'});
          navigator.mediaDevices.getDisplayMedia = async () => stream;
          window.ocrFixtureStream = stream;
        }''')
        page.route('**/wechat-screen-start', lambda route: route.fulfill(json={'ok': True, 'searchId': 'fixture-only'}))
        page.route('**/wechat-screen-read', lambda route: route.fulfill(json={'groups': [{'name': 'RAG测试群'}], 'messages': [{'text': 'RAG测试消息'}], 'conversations': [], 'keyword':'RAG', 'text':'RAG测试消息', 'note':'仅测试夹具'}))
        panel.locator('#shareWechat').click()
        panel.locator('#keyword').fill('RAG')
        panel.locator('#searchShared').click()
        panel.get_by_text('RAG测试群', exact=True).wait_for(timeout=10000)
        assert 'RAG测试消息' in panel.locator('#results').inner_text()
        panel.locator('#stopShared').click()
        assert frame.evaluate("ocrFixtureStream.getTracks().every(t => t.readyState === 'ended')")
        assert panel.locator('#searchShared').is_disabled()
        checks.append('mock-shared-keyword-list-and-stop-tracks')
        assert errors == [], errors
        print(json.dumps({'ok': True, 'checks': checks, 'realWeChatVerified': False}, ensure_ascii=True))
    finally:
        browser.close()

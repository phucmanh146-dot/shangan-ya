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
        # All share input and WeChat list replies below are synthetic fixtures.
        pending_events = []
        page.route('**/wechat-float-start', lambda route: route.fulfill(json={'id':'fixture-float','ok':True}))
        page.route('**/wechat-float-poll', lambda route: route.fulfill(json={'events':[pending_events.pop(0)] if pending_events else []}))
        page.route('**/wechat-float-stop', lambda route: route.fulfill(json={'ok':True}))
        frame.evaluate('''() => {
          const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 600;
          const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0,0,900,600);
          ctx.fillStyle = 'black'; ctx.font = '40px sans-serif'; ctx.fillText('RAG fixture',80,100);
          ctx.fillText('OUTSIDE SENTINEL',80,480);
          const stream = canvas.captureStream(5), track = stream.getVideoTracks()[0];
          Object.defineProperty(track, 'label', {value:'window:123:0'});
          track.getSettings = () => ({displaySurface:'window'});
          navigator.mediaDevices.getDisplayMedia = async () => stream;
          window.ocrFixtureStream = stream;
        }''')
        panel.locator('#shareWechat').click()
        page.wait_for_function("document.querySelector('dialog[data-minimized=true]')")
        assert frame.evaluate("ocrFixtureStream.getVideoTracks()[0].readyState === 'live'")
        page.get_by_text('返回消息列表',exact=True).click()
        checks.append('collapse-keeps-sharing-live')
        panel.locator('#cropShared').click()
        canvas=panel.locator('#sharedCropCanvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
        page.mouse.move(box['x']+40*box['width']/900,box['y']+40*box['height']/600)
        page.mouse.down();page.mouse.move(box['x']+600*box['width']/900,box['y']+200*box['height']/600);page.mouse.up()
        panel.locator('#confirmSharedCrop').click()
        panel.locator('input[data-message-index="0"]').wait_for(timeout=35000)
        crop_text=panel.locator('#results').inner_text()
        assert 'RAG' in crop_text and 'OUTSIDE' not in crop_text
        assert panel.locator('#importChosen').is_disabled()
        checks.append('crop-only-visible-selection-with-no-default-import')
        pending_events.append({'type':'stop'})
        frame.wait_for_function("ocrFixtureStream.getTracks().every(t=>t.readyState==='ended')",timeout=8000)
        checks.append('native-stop-event-ends-share')
        page.route('**/wechat-group-list',lambda route:route.fulfill(json={'groups':[{'id':'group-fixture','name':'测试学习群'}],'messages':[],'conversations':[]}))
        requests=[]
        def group_messages(route):
            requests.append(route.request.post_data_json)
            route.fulfill(json={'groups':[],'messages':[{'text':'RAG 第一条资料','group':'测试学习群'},{'text':'RAG 第二条不选','group':'测试学习群'}],'conversations':[]})
        page.route('**/wechat-group-messages',group_messages)
        panel.locator('#groupQuery').fill('学习');panel.locator('#keyword').fill('RAG');panel.locator('#search').click()
        panel.get_by_text('选择此群',exact=True).click()
        panel.locator('input[data-message-index="1"]').wait_for()
        assert requests==[{'id':'group-fixture','keyword':'RAG','session':None}]
        panel.locator('input[data-message-index="0"]').check()
        panel.locator('#importChosen').click()
        page.locator('.growth-dialog [name=text]').wait_for()
        imported=page.locator('.growth-dialog [name=text]').input_value()
        assert '第一条资料' in imported and '第二条不选' not in imported
        checks.append('select-group-then-import-only-checked-message')
        assert errors == [], errors
        print(json.dumps({'ok': True, 'checks': checks, 'realWeChatVerified': False}, ensure_ascii=True))
    finally:
        browser.close()

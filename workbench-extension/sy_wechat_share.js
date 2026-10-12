/* Only receives a window that the user selects in the browser permission picker. */
(() => {
  'use strict';
  let stream = null, job = '', busy = false, epoch = 0;
  const preview = $('sharedPreview'), state = $('shareState');
  const say = text => { state.textContent = text; };
  function buttons() {
    $('shareWechat').disabled = busy;
    $('searchShared').disabled = !stream || busy || searching;
    $('refreshShared').disabled = !stream || !job || busy || searching;
    $('readShared').disabled = !stream || busy || searching;
    $('stopShared').disabled = !stream;
    $('search').disabled = busy || searching;
  }
  function stopSharing() {
    epoch++; job = ''; busy = false;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null; preview.srcObject = null; preview.hidden = true;
    buttons(); say('共享已停止。');
  }
  $('shareWechat').onclick = async () => {
    stopSharing();
    if (!navigator.mediaDevices?.getDisplayMedia) return say('当前浏览器不支持窗口共享，请使用电脑上的 Chrome 或 Edge。');
    const current = epoch;
    try {
      // This must be called directly by the user's click; no auto-selection flags.
      const selected = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window' }, audio: false, selfBrowserSurface: 'exclude', monitorTypeSurfaces: 'exclude' });
      if (epoch !== current) { selected.getTracks().forEach(t => t.stop()); return; }
      const track = selected.getVideoTracks()[0];
      if (track.getSettings().displaySurface !== 'window') {
        selected.getTracks().forEach(t => t.stop());
        return say('请选择单独的微信窗口。本入口不读取整个屏幕或其他应用。');
      }
      stream = selected; preview.srcObject = stream; preview.hidden = false;
      track.addEventListener('ended', () => { if (epoch === current) { stopSharing(); cancelSearch(); } });
      await preview.play();
      if (epoch !== current) return;
      say('窗口已共享。请确认预览是微信聊天主界面，然后输入关键词并点击“窗口搜索并生成列表”。');
      buttons();
    } catch (e) {
      if (epoch !== current) return;
      stopSharing();
      say(e.name === 'NotAllowedError' ? '尚未获得窗口共享许可。请点击“选择微信窗口”，在浏览器弹窗中选择微信并点共享。' : '窗口共享未开始：' + e.message);
    }
  };
  function snapshot() {
    const track = stream?.getVideoTracks()[0];
    if (!track || track.readyState !== 'live' || !preview.videoWidth) throw Error('共享画面已停止或还未加载。');
    const canvas = document.createElement('canvas'), scale = Math.min(1, 2400/preview.videoWidth, 1800/preview.videoHeight);
    canvas.width = Math.round(preview.videoWidth*scale); canvas.height = Math.round(preview.videoHeight*scale);
    canvas.getContext('2d').drawImage(preview, 0, 0, canvas.width, canvas.height);
    return { image: canvas.toDataURL('image/png'), displaySurface: track.getSettings().displaySurface, windowLabel: track.label };
  }
  async function readResults(current) {
    const result = await api('/wechat-screen-read', { ...snapshot(), searchId: job });
    if (current !== epoch) return;
    renderResults(result); say('已生成当前画面的关键词结果列表。需要更多内容时，在微信展开或滚动后点“刷新结果”。');
  }
  $('searchShared').onclick = async () => {
    if (busy || searching) return say('请等当前查找结束后再使用窗口搜索。');
    const keyword = $('keyword').value.trim();
    if (!keyword) return say('先在上方输入微信关键词。');
    const current = epoch; busy = true; job = ''; buttons(); $('results').replaceChildren();
    try {
      say('正在识别微信左上角搜索框…');
      const started = await api('/wechat-screen-start', { ...snapshot(), keyword });
      if (current !== epoch) return;
      job = started.searchId; say('已在微信搜索“'+keyword+'”，正在读取结果…');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (current === epoch) await readResults(current);
    } catch (e) { if (current === epoch) say(e.message); }
    finally { if (current === epoch) { busy = false; buttons(); } }
  };
  $('refreshShared').onclick = async () => {
    if (busy || searching) return;
    const current = epoch; busy = true; buttons();
    try { await readResults(current); } catch(e) { if (current === epoch) say(e.message); }
    finally { if (current === epoch) { busy = false; buttons(); } }
  };
  $('readShared').onclick = async () => {
    if (busy || searching) return;
    const keyword = $('keyword').value.trim(); if (!keyword) return say('先填写与微信搜索框一致的关键词。');
    const current = epoch; busy = true; buttons();
    try {
      say('正在读取当前共享画面…');
      const result = await api('/wechat-screen-read', { ...snapshot(), keyword, manual: true });
      if (current === epoch) { renderResults(result); say('已读取当前搜索画面。'); }
    } catch (e) { if (current === epoch) say(e.message); }
    finally { if (current === epoch) { busy = false; buttons(); } }
  };
  $('stopShared').onclick = () => { stopSharing(); cancelSearch(); };
  window.addEventListener('pagehide', stopSharing);
  window.addEventListener('sy-native-search-state', buttons);
  window.SYSharedWechatBusy = () => busy;
  window.addEventListener('message', e => { if (e.source === parent && allowedParents.includes(e.origin) && e.data === 'sy-remote-stop') stopSharing(); });
})();

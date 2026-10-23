(function(){
'use strict';
const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(path,data,timeout=45000){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const response=await fetch(path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store',signal:ctrl.signal});const result=await response.json().catch(()=>({error:'接口未返回有效 JSON'}));if(!response.ok||result.error)throw Error(result.error||('HTTP '+response.status));return result;}finally{clearTimeout(timer);}
}
function plainScript(text){
 let value=String(text||'').replace(/\u0060{3}[\s\S]*?\u0060{3}/g,'代码片段已省略，请对照原回答查看。').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/\S+/g,'').replace(/^#{1,6}\s*/gm,'').replace(/^\s*[-*•]\s+/gm,'').replace(/^\s*\d+[.)、]\s+/gm,'').replace(/[*_>#]/g,'').replace(/\u0060/g,'').replace(/\n{3,}/g,'\n\n').trim();
 return value.slice(0,5800);
}
function createButton(text){const b=E('button','p2-heygen-create','🎬 HeyGen 数字人视频');b.type='button';b.addEventListener('click',()=>open(text));return b;}
async function open(answer){
 const dialog=E('dialog','p2-heygen-dialog'),shell=E('div','p2-heygen-shell'),head=E('div','p2-heygen-head');
 head.append(E('div','p2-heygen-title','HeyGen · AI 回答数字人讲解'));
 const close=E('button','p2-heygen-close','关闭');close.type='button';close.onclick=()=>dialog.close();head.append(close);
 const hint=E('p','p2-heygen-hint','使用 HeyGen 生成带数字人和配音的 MP4。需配置你自己的 HeyGen API Key；提交生成可能产生费用。Key 只保存在当前访客后台进程内存中，不写入聊天记录或浏览器本地存储。');
 const keyLabel=E('label','p2-heygen-label','HeyGen API Key');
 const key=document.createElement('input');key.type='password';key.autocomplete='off';key.spellcheck=false;key.placeholder='粘贴 HeyGen API Key（只在本次会话使用）';keyLabel.append(key);
 const avatarLabel=E('label','p2-heygen-label','数字人 Avatar');
 const avatar=document.createElement('select');avatar.append(new Option('先测试 API 读取数字人',''));avatarLabel.append(avatar);
 const voiceLabel=E('label','p2-heygen-label','声音 Voice');
 const voice=document.createElement('select');voice.append(new Option('先测试 API 读取声音',''));voiceLabel.append(voice);
 const scriptLabel=E('label','p2-heygen-label','口播稿（可编辑）');
 const script=document.createElement('textarea');script.rows=8;script.maxLength=6000;script.value=plainScript(answer);scriptLabel.append(script);
 const state=E('p','p2-heygen-state','检查 API 连接状态中…');
 const preview=document.createElement('video');preview.className='p2-heygen-preview';preview.controls=true;preview.playsInline=true;preview.hidden=true;
 const download=E('a','p2-heygen-download','打开 / 下载 MP4');download.hidden=true;download.target='_blank';download.rel='noopener noreferrer';
 const actions=E('div','p2-heygen-actions'),test=E('button','p2-heygen-secondary','测试 API 并读取选项'),generate=E('button','p2-heygen-primary','生成数字人视频');
 test.type='button';generate.type='button';actions.append(test,generate);
 shell.append(head,hint,keyLabel,avatarLabel,voiceLabel,scriptLabel,state,preview,download,actions);dialog.append(shell);document.body.append(dialog);dialog.showModal();
 let configured=false,avatars=[],voices=[],busy=false;
 function fill(select,items,selected,placeholder){select.replaceChildren(new Option(placeholder,''));items.forEach(item=>select.append(new Option(item.name+(item.language?' · '+item.language:''),item.id)));if(selected&&Array.from(select.options).some(o=>o.value===selected))select.value=selected;}
 async function loadOptions(saved){
  const [a,v]=await Promise.all([api('/api/heygen/avatars'),api('/api/heygen/voices')]);
  avatars=a.avatars||[];voices=v.voices||[];
  fill(avatar,avatars,saved?.avatarId||'',avatars.length?'选择数字人':'没有可用数字人');
  fill(voice,voices,saved?.voiceId||'',voices.length?'选择声音':'没有可用声音');
  if(avatar.value){const found=avatars.find(x=>x.id===avatar.value);if(found?.defaultVoiceId&&!voice.value&&Array.from(voice.options).some(o=>o.value===found.defaultVoiceId))voice.value=found.defaultVoiceId;}
 }
 async function testConnection(){
  if(busy)return;busy=true;test.disabled=true;state.textContent='正在验证 HeyGen API Key 并读取可用数字人…';
  try{
   const saved=await api('/api/heygen/config',{apiKey:key.value.trim(),avatarId:avatar.value,voiceId:voice.value},45000);configured=true;key.value='';
   await loadOptions(saved);state.textContent='连接成功：真实 API 已返回 '+avatars.length+' 个数字人、'+voices.length+' 个声音。Key 只保存在本会话服务进程内存中。';
  }catch(error){state.textContent='连接失败：'+error.message;configured=false;}
  finally{busy=false;test.disabled=false;}
 }
 test.addEventListener('click',testConnection);
 avatar.addEventListener('change',()=>{const item=avatars.find(x=>x.id===avatar.value);if(item?.defaultVoiceId&&Array.from(voice.options).some(o=>o.value===item.defaultVoiceId))voice.value=item.defaultVoiceId;});
 generate.addEventListener('click',async()=>{
  if(busy)return;
  if(!configured||key.value.trim()){await testConnection();if(!configured)return;}
  if(!avatar.value||!voice.value){state.textContent='请选择数字人和声音后再生成。';return;}
  if(!script.value.trim()){state.textContent='请填写口播稿。';return;}
  if(!confirm('将把口播稿发送给 HeyGen，并可能消耗账户额度。确认生成数字人视频吗？'))return;
  busy=true;generate.disabled=true;test.disabled=true;preview.hidden=true;download.hidden=true;
  try{
   const job=await api('/api/heygen/generate',{script:script.value.trim(),avatarId:avatar.value,voiceId:voice.value,title:'上岸鸭 AI 回答讲解'},60000);
   state.textContent='HeyGen 已接受任务，正在渲染视频（通常需要数分钟）…任务 ID：'+job.videoId;
   let done=false;
   for(let i=0;i<45;i++){
    await wait(i===0?15000:20000);
    const result=await api('/api/heygen/status',{videoId:job.videoId},40000);
    if(result.status==='completed'&&result.videoUrl){preview.src=result.videoUrl;preview.hidden=false;download.href=result.videoUrl;download.download='上岸鸭-HeyGen讲解-'+new Date().toISOString().slice(0,10)+'.mp4';download.hidden=false;state.textContent='数字人视频生成完成。请预览并核对内容；视频链接可能会过期。';done=true;break;}
    if(result.status==='failed'){throw Error('HeyGen 渲染失败。请检查口播稿、数字人权限与账户额度。');}
    state.textContent='HeyGen 正在渲染：'+result.status+'（已等待约 '+Math.round((i+1)*20/60)+' 分钟）…';
   }
   if(!done)state.textContent='等待超过约 15 分钟，服务仍未返回成片。任务 ID：'+job.videoId+'。可以稍后重试状态查询或到 HeyGen 后台查看。';
  }catch(error){state.textContent='生成失败：'+error.message;}
  finally{busy=false;generate.disabled=false;test.disabled=false;}
 });
 api('/api/heygen/status').then(async saved=>{
  configured=!!saved.configured;
  if(configured){await loadOptions(saved);state.textContent='HeyGen 已在当前会话连接。你可以选择数字人和声音后生成。';}
  else state.textContent='尚未连接 HeyGen。请填入 API Key，点击“测试 API 并读取选项”。';
 }).catch(()=>{state.textContent='无法读取 HeyGen 连接状态；请先填写 API Key 并测试。'});
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
}
window.P2HeyGenVideo={createButton,version:'1.0-20261023'};
})();
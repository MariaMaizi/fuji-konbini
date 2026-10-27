(async function(){
 'use strict';
 const $=id=>document.getElementById(id),v=$('film'),seek=$('seek'),status=$('status');
 let scrubbing=false,resume=false,objectURL;
 const clock=n=>Number.isFinite(n)?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'—';
 const update=()=>{const duration=v.duration;if(Number.isFinite(duration)){seek.max=String(duration);if(!scrubbing)seek.value=String(v.currentTime);$('time').textContent=clock(v.currentTime)+' / '+clock(duration);seek.setAttribute('aria-valuetext',clock(v.currentTime)+' / '+clock(duration));}};
 const to=t=>{if(Number.isFinite(v.duration)){v.currentTime=Math.max(0,Math.min(v.duration,t));update();}};
 $('play').onclick=()=>v.paused?v.play().catch(()=>{status.textContent='请再次点击播放。';}):v.pause();
 $('back').onclick=()=>to(v.currentTime-10);$('forward').onclick=()=>to(v.currentTime+10);
 v.addEventListener('timeupdate',update);v.addEventListener('durationchange',update);
 v.addEventListener('play',()=>{$('play').textContent='暂停 / Pause';});v.addEventListener('pause',()=>{$('play').textContent='播放 / Play';});
 v.addEventListener('loadedmetadata',()=>{for(const id of ['play','back','forward','seek'])$(id).disabled=false;update();status.textContent='视频已就绪。可自由拖动、点击进度条，或用方向键微调。';});
 v.addEventListener('seeking',()=>{status.textContent='正在跳转到 '+clock(v.currentTime)+'…';});
 v.addEventListener('seeked',()=>{status.textContent='已跳转到 '+clock(v.currentTime)+'，可继续自由拖动。';update();});
 seek.addEventListener('pointerdown',()=>{scrubbing=true;resume=!v.paused;v.pause();});
 seek.addEventListener('input',()=>{to(Number(seek.value));});
 function finish(){if(!scrubbing)return;scrubbing=false;to(Number(seek.value));if(resume)v.play().catch(()=>{});resume=false;}
 seek.addEventListener('change',finish);seek.addEventListener('pointerup',finish);seek.addEventListener('pointercancel',finish);
 window.addEventListener('pointerup',finish);
 window.addEventListener('pagehide',()=>{if(objectURL)URL.revokeObjectURL(objectURL);});
 try{
  const r=await fetch('picnic-session.json?v=1');if(!r.ok)throw Error('Session information unavailable');const info=await r.json();
  info.turns.forEach((turn,i)=>{const section=document.createElement('section'),title=document.createElement('h2'),q=document.createElement('p'),answer=document.createElement('pre');title.textContent='第 '+(i+1)+' 轮 / Turn '+(i+1);q.textContent='用户：'+turn.question;answer.textContent=turn.answer;section.append(title,q,answer);$('transcript').append(section);});
  $('evidence').textContent='预设演示 · '+info.turns.length+' 轮问答 · 录制期间模型调用 '+info.modelRequestCount+' 次 · 营养数值来自项目虚拟资料';
  $('download').href=info.video;$('download').download=info.video;
  // A complete local Blob lets the media element seek freely even when a
  // surrounding preview proxy does not relay HTTP byte-range requests.
  const response=await fetch(info.video);if(!response.ok)throw Error('Video unavailable');
  const type=response.headers.get('content-type')||'';if(type.includes('text/html'))throw Error('Video authentication required');
  const reader=response.body.getReader(),parts=[];let bytes=0;const total=Number(response.headers.get('content-length'));
  while(true){const part=await reader.read();if(part.done)break;parts.push(part.value);bytes+=part.value.length;status.textContent='正在准备可拖动的视频… '+(bytes/1048576).toFixed(1)+' MB'+(total?' / '+(total/1048576).toFixed(1)+' MB':'');}
  if(!bytes)throw Error('Empty video');objectURL=URL.createObjectURL(new Blob(parts,{type:'video/mp4'}));v.src=objectURL;v.load();
 }catch(error){status.textContent='视频暂未准备好，请刷新页面，或使用右上角“下载 MP4”在播放器中打开。';console.error('[video-player]',error.message);}
})();

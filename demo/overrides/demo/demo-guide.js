(function(){
 'use strict';
 const host=document.createElement('section');host.id='demo-cover';host.setAttribute('aria-label','Demo introduction');
 host.innerHTML=`<div class="demo-cover-copy"><p class="demo-kicker">富士山のふもと · FUJI KONBINI</p><h1>A little stop.<br>A curious conversation.</h1><p class="demo-author">by MariaMaizi</p><p class="demo-lead">结合用餐时间、营养取舍与出行安排，<br>把一句需求，变成更有理由的一餐。</p><p class="demo-facts">603 catalog entries · First-person exploration</p><p class="demo-disclosure">交互预览：对话为预设示例，非实时 AI。<br>Interactive preview: scripted examples, not live AI.<br>商品资料含项目虚拟设定，无真实支付。</p><button id="demo-start" disabled>Loading the store…</button><p id="demo-load-state" role="status">正在准备 3D 场景 / Preparing the 3D store</p><a id="demo-watch" href="demo/watch.html" hidden>观看野餐演示 / Watch the guided picnic</a></div>`;
 document.body.append(host);
 const tools=document.createElement('details');tools.id='demo-tools';tools.innerHTML=`<summary>Try a question · 8 场景问答</summary><p class="demo-question-help">野餐三轮：用餐时间 → 水果与冷藏 → 酸奶取舍。<br>Prepared Q&A · No model API calls</p><div class="demo-examples" role="group" aria-label="Example scenario / 示例场景"></div><button type="button" id="demo-question" aria-label="Ask the example question / 发送示例问题"><span class="demo-question-kicker">ASK THIS / 试着问一句 →</span><span id="demo-question-text"></span></button><small>商品卡 → Find → Add → Basket</small><details class="demo-about"><summary>About this demo / 技术说明</summary><p>交互网页：预设中日英问答；野餐三步按11:30示例情境演示，前端保存步骤并计算所选商品的虚拟营养合计，不调用模型 API，也不是长期记忆。<br>603 条商品目录通过 ID 关联 Three.js 节点；Find / A* 寻路和购物篮由前端代码执行。<br>本片是明确标注的预设问答录屏，不是实时模型会话；Find 和 Add 由用户点击执行。<br>商品资料含项目虚拟设定，非实测包装值，不作个人营养或过敏适用保证。<br><a href="https://www.fda.gov/food/buy-store-serve-safe-food/handling-food-safely-while-eating-outdoors" target="_blank" rel="noopener">FDA 户外食品保存原则</a> · <a href="https://www.myplate.gov/web/eat-healthy/dairy" target="_blank" rel="noopener">USDA 乳制品资料</a></p></details>`;
 tools.hidden=true;document.body.append(tools);
 const relocate=()=>{const panel=document.getElementById('clerk-panel'),body=document.getElementById('clerk-body');if(document.body.classList.contains('clerk-open')&&panel&&body)panel.insertBefore(tools,body);else document.body.append(tools);};
 new MutationObserver(relocate).observe(document.body,{attributes:true,attributeFilter:['class']});
 const chooseLang=()=>{const v=document.getElementById('clerk-language')?.value;return ['zh','ja','en'].includes(v)?v:/^zh/i.test(navigator.language)?'zh':/^ja/i.test(navigator.language)?'ja':'en';};
 let selectedCase='picnic';
 const paintQuestion=()=>{
  document.getElementById('demo-question-text').textContent=FujiDemo.cases[selectedCase][chooseLang()][0];
  tools.querySelectorAll('[data-demo-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demoCase===selectedCase)));
 };
 for(const [key,sample] of Object.entries(FujiDemo.cases)){
  const b=document.createElement('button');b.type='button';b.dataset.demoCase=key;b.setAttribute('aria-controls','demo-question');
  const title=document.createElement('span'),subtitle=document.createElement('small');title.textContent=sample.label[0];subtitle.textContent=sample.label[1];b.append(title,subtitle);
  b.onclick=()=>{selectedCase=key;paintQuestion();};tools.querySelector('.demo-examples').append(b);
 }
 document.getElementById('demo-question').onclick=()=>{
  const sample=FujiDemo.cases[selectedCase];Fuji.clerk.open();document.getElementById('clerk-chat-tab').click();
  const weather=sample.context==='rain'?'rain':sample.context==='night'?'night':'sunny';
  document.querySelector('[data-scene-weather="'+weather+'"]').click();
  const input=document.getElementById('clerk-input');input.value=sample[chooseLang()][0];document.getElementById('clerk-form').requestSubmit();tools.open=false;
 };
 document.addEventListener('change',event=>{if(event.target.id==='clerk-language')paintQuestion();});
 document.addEventListener('submit',event=>{
  if(event.target.id!=='clerk-form')return;
  const match=FujiDemo.classify(document.getElementById('clerk-input').value);
  if(match.key){selectedCase=match.key;paintQuestion();tools.open=false;}
 },true);
 paintQuestion();
 document.getElementById('demo-start').onclick=()=>{host.hidden=true;tools.hidden=false;tools.open=true;document.getElementById('enter-store').click();};
 const ready=setInterval(()=>{
  const p=document.querySelector('#loading p');if(p)document.getElementById('demo-load-state').textContent=p.textContent;
  if(window.Fuji?.clerk&&!document.getElementById('loading')){
   clearInterval(ready);document.getElementById('demo-start').disabled=false;document.getElementById('demo-start').textContent='开始体验 / Enter the store';document.getElementById('demo-load-state').textContent='Ready · 首次加载完成';
  }
 },350);
 fetch('demo/video-ready.json').then(r=>r.ok?r.json():null).then(d=>{if(d?.ready)document.getElementById('demo-watch').hidden=false;}).catch(()=>{});
})();

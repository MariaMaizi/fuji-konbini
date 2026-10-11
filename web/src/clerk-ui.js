(function(){
 'use strict';
 window.Fuji=window.Fuji||{};
 const E=window.FujiClerkEngine, $=id=>document.getElementById(id);
 const mountain='<svg viewBox="0 0 70 42" aria-hidden="true"><path d="M2 36 25 17 32 8 38 9 46 20 68 36M24 18l7 5 5-7 7 8 4-3M13 31l10-4M45 30l13 4"/></svg>';
 const basketIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 9 2 12h12l2-12M2 9h20M8 9l4-7 4 7M9 12v6m6-6v6"/></svg>';
 const weatherIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 0 1 18 0H3Zm9 0v7a2 2 0 0 0 4 0M12 1v2"/></svg>';
 function art(kind){
  const shapes={oden:'<path d="M25 49h70l-8 48H33Z" fill="#bb864d"/><ellipse cx="60" cy="49" rx="36" ry="12" fill="#825636"/><circle cx="44" cy="45" r="12" fill="#e9bc70"/><circle cx="67" cy="44" r="14" fill="#e9dab0"/><path d="m71 51 13-37" stroke="#b79158" stroke-width="5"/><circle cx="83" cy="40" r="9" fill="#b07b39"/>',coffee:'<path d="M33 31h54l-7 65H40Z" fill="#f8f1de"/><path d="M29 28q31-10 62 0v9H29Z" fill="#405942"/><path d="M36 56h48v20H36Z" fill="#5e7352"/><path d="m49 67 11-9 12 9" stroke="#fff7e6" fill="none" stroke-width="2"/>',sandwich:'<path d="m29 86 16-65 51 66Z" fill="#eee4c7" stroke="#c5b99e" stroke-width="2"/><path d="m34 77 13-46 39 48Z" fill="#fff7df"/><path d="m39 69 12-8 15 10 8-6 11 15" fill="#e6bb4a"/><path d="M37 78h51v9H35Z" fill="#83a05a"/>',noodle:'<path d="M26 31h68L85 97H35Z" fill="#fcf4d6"/><ellipse cx="60" cy="30" rx="36" ry="9" fill="#dbd4ad"/><path d="M32 48h56v31H32Z" fill="#ad493c"/><path d="M46 58h28v4H46zm4 9h20v3H50" fill="#fff7de"/>',icecream:'<path d="M29 47h62l-9 48H38Z" fill="#704834"/><ellipse cx="60" cy="45" rx="34" ry="10" fill="#d0b46f"/><ellipse cx="60" cy="42" rx="29" ry="6" fill="#f7e5b4"/><ellipse cx="60" cy="70" rx="20" ry="12" fill="#ecdfc3"/>',sweets:'<path d="m28 40 65 3-6 50-59-3Z" fill="#d39d9d"/><path d="m30 39 2-10h58l3 14" fill="#b77679"/><circle cx="57" cy="65" r="18" fill="#fff0d6"/><circle cx="52" cy="64" r="7" fill="#c66254"/><circle cx="64" cy="66" r="7" fill="#b09546"/>',snacks:'<path d="m28 25 66 5-5 70-64-4Z" fill="#d9b768"/><path d="m28 28 64 5M28 91l60 5" stroke="#aa8235" stroke-width="5"/><ellipse cx="60" cy="62" rx="22" ry="18" fill="#f7e6b2"/><path d="m44 66 11-17 9 10 11-4-9 21Z" fill="#9c6740"/>'};
  return '<svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="101" rx="33" ry="5" fill="#544326" opacity=".12"/>'+(shapes[kind]||shapes.snacks)+'</svg>';
 }
 Fuji.installClerkUI=function(ctx){
  const lang=/^zh/i.test(navigator.language)?'zh':/^ja/i.test(navigator.language)?'ja':'en';
  const state=E.createState(lang);state.context={sunny:'afternoon',rain:'rain',night:'night'}[ctx.getMode()]||'afternoon';let selected=E.choose(state),basket=[],world=ctx.world,nav=ctx.navigation,toastTimer,hasOpened=false;
  try{const saved=JSON.parse(sessionStorage.getItem('fuji-basket-v22')||'[]');if(Array.isArray(saved))basket=saved.map(id=>({oden:'oden:daikon',coffee:'coffee:hot-coffee',sandwich:'chilled:1_01',ramen:'pantry:2_02',seafood:'pantry:2_01',icecream:'ice_hd:vanilla',sweets:'snacks:NEW_07',snacks:'snacks:NEW_17'}[id]||id)).filter(id=>E.products.some(p=>p.id===id)).slice(0,30);}catch{}
  const client=window.FujiClerkAPI.createClient();let sessionId='',aiProducts=null,aiTitle='',busy=false,connection={configured:false},modeLabel='Checking chat connection…';const history=[];
  const host=document.createElement('div');host.id='clerk-experience';
  host.innerHTML=`<div class="fuji-brand"><div class="fuji-name">${mountain}<div><h1 lang="ja">富士山のふもと</h1><p>A LITTLE STOP BY FUJI</p></div></div><button class="fuji-weather" id="fuji-weather" aria-expanded="false" aria-controls="weather-picker" title="Scene weather / 場面の天気">${weatherIcon}<span id="fuji-weather-text">雨の日 · Rainy afternoon</span></button><div class="weather-picker" id="weather-picker" hidden><button data-scene-weather="sunny">晴れ / Sunny</button><button data-scene-weather="rain">雨 / Rain</button><button data-scene-weather="night">Night</button></div></div>
  <div class="fuji-guidance" id="fuji-guidance" role="status"></div>
  <button class="clerk-launcher" id="clerk-launcher" aria-label="Ask the clerk" aria-controls="clerk-panel" aria-expanded="false"><img src="assets/clerk/welcome.png" alt=""><span>Ask the clerk</span></button>
  <aside class="clerk-panel" id="clerk-panel" aria-labelledby="clerk-title" hidden><header class="clerk-header"><img class="clerk-portrait" src="assets/clerk/welcome.png" alt="Smiling store clerk waving hello"><div class="clerk-heading"><h2 id="clerk-title" lang="en">Chat with the clerk</h2><small>Here for your little break</small></div><div class="clerk-tools"><button id="clerk-minimize" aria-label="Minimize chat">−</button><button id="clerk-close" aria-label="Close chat">×</button></div></header>
  <div class="clerk-body" id="clerk-body"><div class="clerk-messages" id="clerk-messages" role="log" aria-live="polite" aria-relevant="additions"></div><details class="clerk-diagnostics" id="clerk-diagnostics" hidden open><summary id="clerk-diagnostic-summary">Request details</summary><pre id="clerk-diagnostic-text"></pre></details><div class="clerk-chips" aria-label="Choose a moment"><button data-context="morning">Morning</button><button data-context="afternoon">Afternoon</button><button data-context="rain" aria-pressed="true">Rain</button><button data-context="night">Night</button></div><div class="clerk-chips" aria-label="Meal size"><button data-size="light" aria-pressed="true">A light bite</button><button data-size="full" aria-pressed="false">A full meal</button></div><section class="clerk-card" id="clerk-card" aria-label="Recommended pairing"><h3 id="pair-title"></h3><div class="clerk-products" id="clerk-products"></div><p class="clerk-card-reason" id="pair-reason"></p><div class="clerk-card-actions"><button class="clerk-action primary" id="find-pair">⌖ Find in store</button><button class="clerk-action" id="swap-pair">↻ Swap an item</button><button class="clerk-action add" id="add-pair">＋ Add pairing to basket</button></div></section></div>
  <form class="clerk-composer" id="clerk-form"><label for="clerk-input">YOUR MESSAGE</label><div class="clerk-input-row"><input id="clerk-input" placeholder="Tell me about your day…" maxlength="500" autocomplete="off"><button class="clerk-send" type="submit" aria-label="Send message">➤</button></div><div class="clerk-meta"><select id="clerk-language" aria-label="Conversation language"><option value="auto">Auto language</option><option value="zh">Chinese</option><option value="en">English</option><option value="ja">Japanese</option></select><span class="clerk-mode" id="clerk-mode" role="status"></span></div></form></aside>
  <div class="fuji-controls"><span class="desktop-hint"><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Move</span><span id="fuji-control-mode">Drag to look · Scroll to zoom</span></div><button class="fuji-basket" id="fuji-basket" aria-expanded="false" aria-controls="basket-panel">${basketIcon}<span>My basket · <b id="basket-count">0</b></span></button>
  <section class="basket-panel" id="basket-panel" aria-labelledby="basket-title" hidden><header><h2 id="basket-title">My basket</h2><button class="icon-button" id="basket-close" aria-label="Close basket">×</button></header><ul id="basket-items"></ul><p class="empty-note" id="basket-empty">Your little discoveries will appear here.</p><p class="receipt-note">A little pause, just for you.</p><button class="clerk-action" id="save-receipt">Save today's receipt</button></section><div class="clerk-toast" id="clerk-toast" role="status" aria-live="polite"></div>`;
  document.getElementById('app').appendChild(host);
  function t(key){return E.copy[state.lang][key];}
  function toast(message){$('clerk-toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('clerk-toast').textContent='',4500);}
  function stopWalking(){nav.keys.clear();nav.velocity.set(0,0);nav.path=[];nav.doorHold=false;if(document.pointerLockElement)document.exitPointerLock();}
  function open(){hasOpened=true;stopWalking();$('clerk-panel').hidden=false;$('clerk-launcher').hidden=true;document.body.classList.add('clerk-open');$('clerk-launcher').setAttribute('aria-expanded','true');}
  function close(){ $('clerk-panel').hidden=true;$('clerk-launcher').hidden=false;document.body.classList.remove('clerk-open');$('clerk-launcher').setAttribute('aria-expanded','false');$('clerk-launcher').focus();}
  function message(text,role='assistant',remember=true){if(remember){history.push({role,content:text});while(history.length>8)history.shift();}const p=document.createElement('p');p.className='clerk-message '+role;p.textContent=text;$('clerk-messages').appendChild(p);while($('clerk-messages').children.length>30)$('clerk-messages').firstChild.remove();$('clerk-messages').scrollTop=$('clerk-messages').scrollHeight;return p;}
  function card(reveal=false){
   const preferencesLabel=$('clerk-preferences-label');if(preferencesLabel)preferencesLabel.textContent='Preferences · '+{morning:'Morning',afternoon:'Afternoon',rain:'Rain',night:'Night'}[state.context]+' · '+(state.size==='full'?'A full meal':'A light bite');
   selected=aiProducts===null?E.choose(state):aiProducts;const title=state.paused?'Let’s check the details':aiTitle||E.copy.en.titles[state.context][1];$('pair-title').textContent=title;$('pair-reason').textContent=selected.length?'':state.paused?'Your dietary requirement is remembered. Browse is still available; product suitability is not verified.':aiProducts!==null?'Tell me what you feel like, or choose a moment.':E.copy.en.empty;$('clerk-mode').textContent=modeLabel;
   $('clerk-products').replaceChildren();$('clerk-products').style.gridTemplateColumns=`repeat(${Math.max(1,selected.length)},minmax(0,1fr))`;
   if(Fuji.renderProductCards)Fuji.renderProductCards(selected,locate,addProduct);else selected.forEach(p=>{const b=document.createElement('button');b.className='clerk-product';b.type='button';b.setAttribute('aria-label','Find '+p.en);b.innerHTML='<span class="product-art">'+art(p.art)+'</span><strong>'+p.en+'</strong>';b.onclick=()=>locate(p);$('clerk-products').appendChild(b);});
   $('find-pair').disabled=$('add-pair').disabled=!selected.length;
   document.querySelectorAll('[data-context]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.context===state.context)));document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===state.size)));
   if(reveal)requestAnimationFrame(()=>$('clerk-card').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  }
  const marker=new THREE.Group();marker.name='CLERK_DESTINATION_MARKER';const ring=new THREE.Mesh(new THREE.TorusGeometry(.13,.025,8,24),new THREE.MeshBasicMaterial({color:0xc3d597,depthTest:false}));ring.rotation.x=-Math.PI/2;marker.add(ring);const cone=new THREE.Mesh(new THREE.ConeGeometry(.06,.13,12),ring.material);cone.rotation.z=Math.PI;cone.position.y=.14;marker.add(cone);marker.visible=false;ctx.scene.add(marker);
  function locate(p){
   const o=world.root.getObjectByName(p.node);if(!o){toast(E.copy.en.unavailable);return;}
   stopWalking();const target=p.center?new THREE.Vector3(...p.center):o.getWorldPosition(new THREE.Vector3());marker.position.copy(target);marker.position.y+=.18;target.y=Math.max(.9,target.y);marker.visible=true;
   if(nav.mode!=='walk'){nav.cancelCamera();nav.flight=null;nav.mode='walk';ctx.controls.enabled=false;nav.camera.position.set(5.25,nav.eye,.7);ctx.camera.fov=67;ctx.camera.updateProjectionMatrix();nav.syncAngles();nav.updateUI();}
   const dest={x:p.stand[0],z:p.stand[1]};
   nav.destinationLook=target;const routed=nav.routeNear(dest);$('basket-panel').hidden=true;$('fuji-basket').setAttribute('aria-expanded','false');close();$('fuji-guidance').textContent=(p.displayEn||p.en);toast(routed?E.copy.en.found:'The shelf is marked. Move to the aisle and try again.');
  }
  function addProduct(p){
   if(p.unavailable)return;
   if(basket.length>=30){toast('Your basket holds up to 30 items.');return;}
   basket.push(p.id);basketRender();toast((p.displayEn||p.en)+' added to basket.');
  }
  function basketRender(){
   $('basket-count').textContent=basket.length;$('basket-items').replaceChildren();$('basket-empty').hidden=basket.length>0;$('save-receipt').disabled=!basket.length;
   const counts=new Map();basket.forEach(id=>counts.set(id,(counts.get(id)||0)+1));for(const [id,count]of counts){const p=E.products.find(p=>p.id===id);const li=document.createElement('li'),label=document.createElement('span'),b=document.createElement('button');label.textContent=(p.displayEn||p.en)+' × '+count;b.textContent='Remove';b.setAttribute('aria-label','Remove one '+p.en);b.onclick=()=>{basket.splice(basket.indexOf(id),1);basketRender();};li.append(label,b);$('basket-items').appendChild(li);}
   try{sessionStorage.setItem('fuji-basket-v22',JSON.stringify(basket));}catch{}
  }
  $('clerk-launcher').onclick=open;$('clerk-minimize').onclick=$('clerk-close').onclick=close;
  function setBusy(value){busy=value;$('clerk-form').setAttribute('aria-busy',String(value));$('clerk-input').disabled=value;host.querySelectorAll('.clerk-send,[data-context],[data-size],#swap-pair,#clerk-language').forEach(b=>b.disabled=value);$('clerk-mode').textContent=value?'The clerk is thinking…':modeLabel;}
  function providerName(provider=connection.provider){return provider==='bailian'?'Bailian':provider==='zhipu'?'Zhipu':provider==='openai'?'OpenAI':'AI';}
  function clearAI(){aiProducts=null;aiTitle='';modeLabel=connection.configured?'Local pairing · '+providerName()+' available':'Local demo · '+providerName()+' key needed';}
  async function refreshConnection(){connection=await client.status();modeLabel=connection.error?'Chat server unavailable':connection.configured?providerName()+' configured · Send a message to connect':'Local demo · '+providerName()+' key needed';if(!busy)$('clerk-mode').textContent=modeLabel;}
  async function converse(text){
   if(busy)return;const previous=history.slice(),currentProductIds=selected.map(p=>p.id);message(text,'user');
   const forced=$('clerk-language').value;state.lang=forced==='auto'?E.language(text,state.lang):forced;
   setBusy(true);$('clerk-diagnostics').hidden=true;
   const started=Date.now();let received=false;
   const waiting={zh:'正在思考…',ja:'考えています…',en:'Thinking…'};
   const writing={zh:'正在回复…',ja:'返答しています…',en:'Replying…'};
   const draft=message(waiting[state.lang]||waiting.en,'assistant',false);draft.classList.add('streaming');
   const timer=setInterval(()=>{const elapsed=((Date.now()-started)/1000).toFixed(0);$('clerk-mode').textContent=(received?(writing[state.lang]||writing.en):(waiting[state.lang]||waiting.en))+' · '+elapsed+'s';if(!received)draft.textContent=(waiting[state.lang]||waiting.en)+' '+elapsed+'s';},1000);

   try{
    connection=await client.status();if(connection.error)throw Error(connection.error);if(!connection.configured)throw Error('not_configured');
    const r=await client.reply({message:text,history:previous,language:forced,sessionId,state:{context:state.context,size:state.size,exclude:state.exclude,paused:state.paused},currentProductIds},E.products,{onText(text){received=true;draft.textContent=text;$('clerk-messages').scrollTop=$('clerk-messages').scrollHeight;}});
    if(r.sessionId)sessionId=r.sessionId;
    $('clerk-card').hidden=false;state.context=r.context;state.size=r.size;state.paused=r.sessionId?r.dietaryCaution:state.paused||r.dietaryCaution;aiProducts=r.products;aiTitle=r.cardTitle;modeLabel=r.source==='decision'?'Food Agent · '+(r.foodEvaluation?.decision?.action==='clarify'?'Needs confirmation':'Catalog evidence missing'):r.source==='catalog'?(r.allergenItems?'Catalog allergen reference':r.priceItems?'Catalog price calculation':'Catalog information'):'AI reply · '+providerName(r.provider)+' · '+r.model;
    if(r.replyMode==='direct')modeLabel='Model direct · '+providerName(r.provider)+' · '+r.model;
    if(r.informationScope==='project_virtual_store')modeLabel+=' · Virtual store data';
    $('clerk-mode').dataset.source=r.source==='catalog'?'catalog':'llm';$('clerk-mode').title=r.diagnostics?JSON.stringify(r.diagnostics):'Reply received';draft.remove();console.info('[clerk-api] '+r.source+' reply',r.diagnostics||{provider:r.provider,model:r.model});message(r.message);card();if(!r.products.length)$('clerk-card').hidden=true;
   }catch(error){
    if(error.sessionId)sessionId=error.sessionId;
    draft.remove();error.diagnostics={elapsedMs:Date.now()-started,...error.diagnostics};
    console.error('[clerk-api] Request failed',{error:error.message,diagnostics:error.diagnostics||null});
    $('clerk-mode').dataset.source='error';$('clerk-mode').title=JSON.stringify({error:error.message,...error.diagnostics});
    aiProducts=[];aiTitle='';selected=[];modeLabel='Request failed · '+providerName();card();$('clerk-card').hidden=true;
    const reason={
     not_configured:['还没配置模型密钥。','API key is not configured.','APIキーが未設定です。'],
     authentication_failed:['模型密钥验证失败。','API key was rejected.','APIキーの認証に失敗しました。'],
     provider_usage_limit:['模型额度已用尽，或免费额度用完即停已生效。','Model quota is exhausted or the free-tier stop is active.','モデルの利用枠が尽きたか、無料枠の停止設定が有効です。'],
     upstream_timeout:['模型回复超时。','The model response timed out.','モデルの応答がタイムアウトしました。'],
     request_timeout:['等待回复超时。','The response timed out.','応答待ちがタイムアウトしました。'],
     invalid_model_response:['模型回复格式不完整，暂时无法显示完整回答。','The model reply format was invalid.','モデルの回答形式を読み取れませんでした。'],
     unknown_product:['模型推荐包含无法对应店内目录的商品。','The recommendation contained an unrecognized product.','提案された商品を店内の商品情報と照合できませんでした。'],
     dietary_pause:['模型推荐与已保留的饮食要求冲突。','The recommendation conflicted with your dietary requirements.','提案が食事条件と一致しませんでした。'],
     preference_mismatch:['模型推荐与已保留的偏好冲突。','The recommendation conflicted with your preferences.','提案がご希望と一致しませんでした。']
    };
    const langIndex=state.lang==='ja'?2:state.lang==='zh'?0:1;
    const textReason=(reason[error.message]||['这次未能取得完整有效的模型回复。','A complete valid model reply could not be received.','今回はモデルの回答を受け取れませんでした。'])[langIndex];
    const retryNotice=['可以重新发送；本次没有生成备用搭配。','You can send again. No substitute pairing was generated.','もう一度送信できます。代わりの商品提案は作成していません。'][langIndex];
    const failure=message(textReason+' '+retryNotice,'assistant',false);failure.setAttribute('role','alert');
    const retry=document.createElement('button');retry.type='button';retry.className='clerk-action';retry.textContent=['重新填写这条消息','Use this message again','同じメッセージを入力'][langIndex];
    retry.onclick=()=>{$('clerk-input').value=text;$('clerk-input').focus();};failure.appendChild(retry);
    const diagnostic=error.diagnostics||{};
    $('clerk-diagnostic-summary').textContent='Request failed · '+(diagnostic.upstreamStatus?'Model HTTP '+diagnostic.upstreamStatus:error.message);
    $('clerk-diagnostic-text').textContent=FujiClerkAPI.diagnosticText(error);$('clerk-diagnostics').hidden=false;$('clerk-diagnostics').open=true;
   }finally{clearInterval(timer);draft.remove();setBusy(false);$('clerk-body').scrollTop=0;}
  }
  $('clerk-form').onsubmit=e=>{e.preventDefault();const text=$('clerk-input').value.trim();if(!text||busy)return;$('clerk-input').value='';converse(text);};
  $('clerk-input').onfocus=stopWalking;$('clerk-language').onchange=()=>{const v=$('clerk-language').value;if(v!=='auto')state.lang=v;card();};
  host.querySelectorAll('[data-context]').forEach(b=>b.onclick=()=>{E.selectContext(state,b.dataset.context);clearAI();ctx.setWeather(state.context==='night'?'night':state.context==='rain'?'rain':'sunny');if(connection.configured){converse(({zh:'请根据这个情境推荐搭配：',ja:'この場面に合う組み合わせをお願いします：',en:'Please suggest a pairing for this moment: '}[state.lang]||'Please suggest a pairing for ')+state.context);return;}message(t(state.paused?'restriction':state.context));card();});
  host.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{state.size=b.dataset.size;clearAI();if(connection.configured){converse(state.size==='full'?({zh:'我想吃饱一点，保留之前的偏好。',ja:'希望はそのままで、しっかり食べたいです。',en:'A full meal please, keeping my preferences.'}[state.lang]||'A full meal please.'):({zh:'少一点，垫垫肚子就好，保留之前的偏好。',ja:'希望はそのままで、少なめにお願いします。',en:'A light bite please, keeping my preferences.'}[state.lang]||'A light bite please.'));return;}message(t(state.paused?'restriction':state.size));card();});
  $('swap-pair').onclick=()=>{if(connection.configured){converse({zh:'请换一种搭配，保留我刚才的偏好。',ja:'先ほどの希望に合わせて、別の組み合わせをお願いします。',en:'Please suggest a different pairing, keeping my preferences.'}[state.lang]||'Please suggest a different pairing.');return;}clearAI();state.variant++;message(t(state.paused?'restriction':'swap'));card(true);};$('find-pair').onclick=()=>selected[0]&&locate(selected[0]);$('add-pair').onclick=()=>{if(basket.length+selected.length>30){toast('Your basket holds up to 30 items.');return;}basket.push(...selected.map(p=>p.id));basketRender();toast(E.copy.en.added);};
  $('fuji-basket').onclick=()=>{stopWalking();const show=$('basket-panel').hidden;$('basket-panel').hidden=!show;$('fuji-basket').setAttribute('aria-expanded',String(show));};$('basket-close').onclick=()=>{$('basket-panel').hidden=true;$('fuji-basket').setAttribute('aria-expanded','false');$('fuji-basket').focus();};
  $('save-receipt').onclick=()=>{const content=['富士山のふもと / A little stop by Fuji',new Date().toLocaleDateString(),E.copy.en.titles[state.context][1],'',...basket.map(id=>{const p=E.products.find(p=>p.id===id);return (p.displayEn||p.en);}),'','A little pause, just for you.','Virtual basket · No payment'].join('\n');const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='fuji-today-receipt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('fuji-weather').onclick=()=>{const expanded=$('weather-picker').hidden;$('weather-picker').hidden=!expanded;$('fuji-weather').setAttribute('aria-expanded',String(expanded));};host.querySelectorAll('[data-scene-weather]').forEach(b=>b.onclick=()=>{ctx.setWeather(b.dataset.sceneWeather);$('weather-picker').hidden=true;$('fuji-weather').setAttribute('aria-expanded','false');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!$('basket-panel').hidden)$('basket-close').click();else if(!$('clerk-panel').hidden)close();}});
  const labels={'exterior-mode':'外観 / Outside','walk-outside':'Walk outside','enter-store':'入店 / Enter store','exit-store':'Exit store','look-around':'Mouse look'};for(const [id,label]of Object.entries(labels))$(id).textContent=label;
  message(t('welcome'));card();basketRender();refreshConnection();
  let lastMode='',lastWeather='';
  const api={state,open,close,locate,marker,getBasket:()=>basket.slice(),update(){const weather=ctx.getMode();if(weather!==lastWeather){lastWeather=weather;$('fuji-weather-text').textContent={sunny:'晴れの日 · Sunny afternoon',rain:'雨の日 · Rainy afternoon',night:'夜のひと息 · A quiet evening'}[weather];}if(nav.mode!==lastMode){lastMode=nav.mode;$('fuji-control-mode').textContent=nav.mode==='walk'?'Drag / Mouse · Look':'Drag · Orbit / Scroll · Zoom';}const p=nav.camera.position;if(nav.mode==='walk'&&!hasOpened&&p.z<1.45&&p.z> -5.2&&Math.abs(p.x)<6.9)open();}};
  Fuji.clerk=api;if(Fuji.enhanceClerkCatalog)Fuji.enhanceClerkCatalog(api,ctx,{stopWalking,addProduct});if(new URLSearchParams(location.search).get('show')==='clerk')open();return api;
 };
})();






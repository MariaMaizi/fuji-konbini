/* Original miniature characters. Separate scene layer; existing store assets stay intact. */
(function(){
 const T=THREE;
 const palette={skin:0xf1c9a8,hair:0x4b3027,ink:0x302722,cream:0xf4ebd9,green:0x425f4c,rust:0xa95f48,navy:0x424d59,leather:0xa8783f,sole:0xd2c0a3,blush:0xd99683,gold:0xc69c5e};
 const mats=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:k==='hair'?.62:.86})]));
 function mesh(parent,name,g,m,x,y,z,s){const o=new T.Mesh(g,mats[m]||m);o.name=name;o.position.set(x,y,z);if(s)o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 const ball=new T.SphereGeometry(1,24,16);
 const ell=(p,n,m,x,y,z,s)=>mesh(p,n,ball,m,x,y,z,s);
 function tube(p,n,m,points,r=.006){return mesh(p,n,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v))),16,r,6,false),m,0,0,0);}
 function round(p,n,m,x,y,z,w,h,d){const shape=new T.Shape(),r=Math.min(w,h)*.18;
  shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const g=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:3,steps:1,curveSegments:6});g.translate(0,0,-d/2);return mesh(p,n,g,m,x,y,z);
 }
 function body(p,name,m,profile){const points=profile.map(([r,y])=>new T.Vector2(r,y));const o=mesh(p,name,new T.LatheGeometry(points,32),m,0,0,0);o.scale.z=.64;return o;}
 Fuji.makeCharacter=function(style='girl'){
  const root=new T.Group();root.name='FUJI_CHARACTER_'+style.toUpperCase();const pivots={};const clerk=style==='clerk',girl=style==='girl',coat=clerk?'cream':girl?'rust':'green';
  body(root,'shirt','cream',[[.12,.58],[.17,.73],[.19,.9],[.125,1.0],[.07,1.015]]);
  body(root,'outerwear',coat,[[.17,.58],[.175,.7],[.195,.90],[.16,.96],[.078,1.015]]);
  round(root,'shirt-front','cream',0,.805,.13,.13,.34,.018);
  for(const x of [-1,1]){const collar=round(root,'collar','cream',x*.064,.964,.115,.095,.10,.012);collar.rotation.z=x*.40;
   const arm=new T.Group();arm.name=x<0?'ARM_LEFT':'ARM_RIGHT';arm.position.set(x*.205,.925,0);root.add(arm);pivots[x<0?'leftArm':'rightArm']=arm;arm.rotation.z=x*.12;
   ell(arm,'sleeve',coat,0,-.16,0,[.073,.21,.082]);ell(arm,'hand','skin',0,-.365,.012,[.054,.07,.052]);
   const leg=new T.Group();leg.name=x<0?'LEG_LEFT':'LEG_RIGHT';leg.position.set(x*.095,.51,0);root.add(leg);pivots[x<0?'leftLeg':'rightLeg']=leg;
   mesh(leg,girl?'leg':'trouser',new T.CylinderGeometry(.069,.059,.35,20),girl?'skin':'navy',0,-.17,0);
   mesh(leg,'sock',new T.CylinderGeometry(.06,.057,.08,20),'cream',0,-.367,.0);
   round(leg,'shoe','hair',0,-.425,.044,.133,.09,.22);round(leg,'shoe-sole','sole',0,-.468,.044,.137,.025,.224);
   tube(leg,'shoe-seam','leather',[[x*.046,-.399,.08],[0,-.393,.13],[-x*.046,-.399,.08]],.004);
  }
  if(girl){
   const g=new T.CylinderGeometry(.16,.265,.32,32,1,true);const a=g.attributes.position;for(let i=0;i<a.count;i++){const angle=Math.atan2(a.getZ(i),a.getX(i)),f=1+.035*Math.cos(angle*16);a.setXYZ(i,a.getX(i)*f,a.getY(i),a.getZ(i)*f);}g.computeVertexNormals();mesh(root,'pleated-midi-skirt',g,'navy',0,.49,0);
   for(const y of [.66,.74,.82,.9])ell(root,'cardigan-button','gold',.046,y,.153,[.011,.011,.007]);
   round(root,'backpack','leather',0,.77,-.15,.265,.29,.115);round(root,'backpack-flap','leather',0,.865,-.219,.252,.09,.021);ell(root,'backpack-clasp','gold',0,.82,-.237,[.016,.021,.006]);
   for(const x of [-.105,.105])tube(root,'backpack-strap','leather',[[x,.65,-.13],[x,.92,-.10],[x,.975,.02],[x,.72,.12]],.012);
  }else if(!clerk){
   for(const x of [-.105,.105])round(root,'overshirt-pocket','green',x,.865,.133,.072,.085,.014);
   for(const y of [.65,.74,.83,.91])ell(root,'overshirt-button','gold',.034,y,.151,[.009,.009,.006]);
   tube(root,'crossbody-strap','leather',[[-.15,.98,.09],[0,.81,.17],[.18,.63,.08],[.13,.7,-.14],[-.14,.95,-.09]],.016);
   round(root,'satchel','leather',.175,.615,.07,.15,.18,.115);round(root,'satchel-flap','leather',.175,.67,.137,.15,.055,.017);
  }
  if(clerk){body(root,'green-apron-skirt','green',[[.21,.43],[.19,.64],[.17,.78]]);round(root,'apron-bib','green',0,.84,.146,.255,.25,.022);
   for(const x of [-.1,.1])tube(root,'apron-strap','green',[[x,.8,.162],[x,1.003,.082],[x,.92,-.11]],.018);
   round(root,'apron-pocket','green',0,.64,.146,.16,.095,.017);round(root,'name-badge','cream',.07,.904,.169,.073,.035,.009);
  }
  ell(root,'neck','skin',0,1.024,0,[.067,.065,.067]);
  const head=new T.Group();head.name='HEAD';root.add(head);pivots.head=head;
  ell(head,'face','skin',0,1.245,.015,[.235,.246,.205]);
  ell(head,'back-hair','hair',0,1.268,-.105,[.245,.243,.147]);
  mesh(head,'hair-crown',new T.SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI*.54),'hair',0,1.284,-.017,[.25,.24,.225]);
  for(const x of [-1,1]){
   ell(head,'ear','skin',x*.229,1.217,.003,[.031,.054,.036]);
   ell(head,'eye','ink',x*.081,1.247,.202,[.023,.029,.012]);ell(head,'eye-glint','cream',x*.081-.006,1.257,.214,[.006,.008,.004]);
   ell(head,'cheek','blush',x*.143,1.185,.183,[.032,.014,.005]);
   tube(head,'brow','hair',[[x*.05,1.30,.197],[x*.078,1.311,.198],[x*.105,1.302,.187]],.007);
  }
  ell(head,'nose','skin',0,1.20,.222,[.022,.019,.014]);tube(head,'smile','hair',[[-.035,1.148,.197],[0,1.137,.207],[.035,1.148,.197]],.005);
  for(let i=0;i<5;i++){const o=ell(head,'swept-fringe','hair',-.145+i*.062,1.395-Math.sin(i*.65)*.033,.133,[.057,.105,.057]);o.rotation.z=-.48;}
  if(girl){ell(head,'ponytail-tie','leather',0,1.12,-.252,[.065,.043,.025]);for(let i=0;i<3;i++)ell(head,'low-ponytail','hair',Math.sin(i)*.019,1.05-i*.075,-.247-i*.012,[.098-i*.016,.09,.076-i*.01]);}
  if(clerk)for(const x of [-1,1]){const o=ell(head,'bob-side','hair',x*.209,1.18,-.011,[.07,.16,.16]);o.rotation.z=x*-.12;}
  else if(!girl)for(let i=0;i<3;i++){const o=ell(head,'short-hair-lock','hair',-.12+i*.085,1.464,.005,[.09,.046,.115]);o.rotation.z=.2;}
  root.userData.pivots=pivots;return root;
 };
 Fuji.installCharacters=function(ctx){
  const nav=ctx.navigation,view=ctx.camera,walker=view.clone(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;nav.camera=walker;
  const layer=new T.Group();layer.name='CHARACTERS_V24_ROOT';ctx.scene.add(layer);
  const girl=Fuji.makeCharacter('girl'),boy=Fuji.makeCharacter('boy'),clerk=Fuji.makeCharacter('clerk');layer.add(girl,boy,clerk);
  clerk.position.set(-6.65,.03,-.75);clerk.rotation.y=Math.PI/2;clerk.scale.setScalar(1.12);
  let style='girl',perspective='third',phase=0,lastMode=nav.mode;try{style=localStorage.getItem('fuji-character')==='boy'?'boy':'girl';perspective=localStorage.getItem('fuji-view')==='first'?'first':'third';}catch{}
  const panel=document.createElement('section');panel.className='character-settings';panel.id='character-settings';panel.hidden=true;panel.setAttribute('aria-labelledby','character-title');
  panel.innerHTML='<header><h2 id="character-title">旅のじぶん / Your character</h2><button id="character-close" aria-label="Close character settings">×</button></header><fieldset><legend>キャラクター / Character</legend><div class="character-options"><button data-character="girl"><span class="outfit-dot outfit-girl"></span>女性 / Female<small>Cardigan · pleated skirt</small></button><button data-character="boy"><span class="outfit-dot outfit-boy"></span>男性 / Male<small>Overshirt · crossbody bag</small></button></div></fieldset><fieldset><legend>視点 / View</legend><div class="character-options"><button data-perspective="third">三人称 / Third person</button><button data-perspective="first">一人称 / First person</button></div></fieldset><p>WASD · Move &nbsp; Drag · Look<br>好きなスタイルで、ひと休み。<br>Make yourself at home.</p>';
  const launch=document.createElement('button');launch.id='character-toggle';launch.className='character-toggle';launch.textContent='旅のじぶん / Character';launch.setAttribute('aria-controls',panel.id);launch.setAttribute('aria-expanded','false');document.getElementById('app').append(launch,panel);
  const talk=document.createElement('button');talk.id='clerk-nearby';talk.className='clerk-nearby';talk.textContent='店員に話す / Talk to the clerk';talk.hidden=true;document.getElementById('app').append(talk);talk.onclick=()=>Fuji.clerk?.open();
  function pause(){nav.keys.clear();nav.velocity.set(0,0);nav.path=[];nav.dragging=false;if(document.pointerLockElement)document.exitPointerLock();}
  function show(open){panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));if(open){pause();Fuji.clerk?.close();document.getElementById('character-close').focus();}else launch.focus();}
  launch.onclick=()=>show(panel.hidden);document.getElementById('character-close').onclick=()=>show(false);
  function refresh(){panel.querySelectorAll('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.character===style)));panel.querySelectorAll('[data-perspective]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.perspective===perspective)));try{localStorage.setItem('fuji-character',style);localStorage.setItem('fuji-view',perspective);}catch{}}
  panel.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{style=b.dataset.character;refresh();});panel.querySelectorAll('[data-perspective]').forEach(b=>b.onclick=()=>{perspective=b.dataset.perspective;refresh();});refresh();
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.stopImmediatePropagation();show(false);}} ,true);
  const previous=walker.position.clone(),target=new T.Vector3(),boom=new T.Vector3(),desired=new T.Vector3();let heading=nav.yaw+Math.PI;
  girl.rotation.y=boy.rotation.y=heading;
  const api={layer,walker,get style(){return style;},get perspective(){return perspective;},update(dt){
   const walking=nav.mode==='walk';if(nav.mode==='exterior'){walker.position.copy(view.position);walker.quaternion.copy(view.quaternion);walker.fov=view.fov;}
   if(nav.mode!=='walk'&&view.view?.enabled)view.clearViewOffset();
   if(nav.mode==='transition'){view.position.copy(walker.position);view.quaternion.copy(walker.quaternion);view.fov=walker.fov;view.updateProjectionMatrix();}
   if(lastMode!==nav.mode){previous.copy(walker.position);lastMode=nav.mode;}
   const dx=walker.position.x-previous.x,dz=walker.position.z-previous.z,distance=Math.hypot(dx,dz),moving=walking&&distance>.00015;
   if(moving)heading=Math.atan2(dx,dz);previous.copy(walker.position);phase+=moving?distance*13:0;
   girl.visible=walking&&perspective==='third'&&style==='girl';boy.visible=walking&&perspective==='third'&&style==='boy';
   const avatar=style==='girl'?girl:boy;avatar.position.set(walker.position.x,.025,walker.position.z);avatar.rotation.y+=Math.atan2(Math.sin(heading-avatar.rotation.y),Math.cos(heading-avatar.rotation.y))*(1-Math.exp(-dt*12));
   const p=avatar.userData.pivots,step=moving&&!reducedMotion?Math.sin(phase)*.38:0,blend=1-Math.exp(-dt*12);
   p.leftLeg.rotation.x=T.MathUtils.lerp(p.leftLeg.rotation.x,step,blend);p.rightLeg.rotation.x=T.MathUtils.lerp(p.rightLeg.rotation.x,-step,blend);p.leftArm.rotation.x=T.MathUtils.lerp(p.leftArm.rotation.x,-step*.65,blend);p.rightArm.rotation.x=T.MathUtils.lerp(p.rightArm.rotation.x,step*.65,blend);
   const near=walking&&Math.hypot(walker.position.x-clerk.position.x,walker.position.z-clerk.position.z)<3.3;
   clerk.userData.pivots.head.rotation.y=near?T.MathUtils.clamp(Math.atan2(walker.position.x-clerk.position.x,walker.position.z-clerk.position.z)-clerk.rotation.y,-.45,.45):0;
   talk.hidden=!near||document.body.classList.contains('clerk-open')||!panel.hidden;
   if(!walking)return;
   if(perspective==='first'){view.position.copy(walker.position);view.quaternion.copy(walker.quaternion);}
   else{
    target.set(walker.position.x,1.05,walker.position.z);
    const pitch=T.MathUtils.clamp(nav.pitch,-.65,.4),length=2.15;boom.set(Math.sin(nav.yaw)*Math.cos(pitch)*length,.65-Math.sin(pitch)*length,Math.cos(nav.yaw)*Math.cos(pitch)*length);
    let safe=1;for(let f=.10;f<=1;f+=.025){const x=target.x+boom.x*f,z=target.z+boom.z*f;if(nav.blocked(x,z)){safe=Math.max(.08,f-.05);break;}}
    if(safe<.60){
     // Narrow aisles use an unobstructed close-up instead of filling the view with hair.
     view.position.copy(walker.position);view.quaternion.copy(walker.quaternion);avatar.visible=false;
    }else{desired.copy(target).addScaledVector(boom,safe);view.position.copy(desired);view.lookAt(target);}
   }
   const panelOpen=document.body.classList.contains('clerk-open'),width=ctx.renderer.domElement.clientWidth,height=ctx.renderer.domElement.clientHeight;
   const offset=perspective==='third'&&panelOpen&&width>760?document.getElementById('clerk-panel').offsetWidth/2:0;
   if(offset)view.setViewOffset(width,height,offset,0,width,height);else if(view.view?.enabled)view.clearViewOffset();
   view.fov=67;view.updateProjectionMatrix();
  }};ctx.characters=api;return api;
 };
})();

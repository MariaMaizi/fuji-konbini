/* Existing store cashier. Customer movement uses the navigation camera directly. */
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
 Fuji.makeStoreClerk=function(){
  const root=new T.Group();root.name='FUJI_CHARACTER_CLERK';const pivots={};const coat='cream';
  body(root,'shirt','cream',[[.12,.58],[.17,.73],[.19,.9],[.125,1.0],[.07,1.015]]);
  body(root,'outerwear',coat,[[.17,.58],[.175,.7],[.195,.90],[.16,.96],[.078,1.015]]);
  round(root,'shirt-front','cream',0,.805,.13,.13,.34,.018);
  for(const x of [-1,1]){const collar=round(root,'collar','cream',x*.064,.964,.115,.095,.10,.012);collar.rotation.z=x*.40;
   const arm=new T.Group();arm.name=x<0?'ARM_LEFT':'ARM_RIGHT';arm.position.set(x*.205,.925,0);root.add(arm);pivots[x<0?'leftArm':'rightArm']=arm;arm.rotation.z=x*.12;
   ell(arm,'sleeve',coat,0,-.16,0,[.073,.21,.082]);ell(arm,'hand','skin',0,-.365,.012,[.054,.07,.052]);
   const leg=new T.Group();leg.name=x<0?'LEG_LEFT':'LEG_RIGHT';leg.position.set(x*.095,.51,0);root.add(leg);pivots[x<0?'leftLeg':'rightLeg']=leg;
   mesh(leg,'trouser',new T.CylinderGeometry(.069,.059,.35,20),'navy',0,-.17,0);
   mesh(leg,'sock',new T.CylinderGeometry(.06,.057,.08,20),'cream',0,-.367,.0);
   round(leg,'shoe','hair',0,-.425,.044,.133,.09,.22);round(leg,'shoe-sole','sole',0,-.468,.044,.137,.025,.224);
   tube(leg,'shoe-seam','leather',[[x*.046,-.399,.08],[0,-.393,.13],[-x*.046,-.399,.08]],.004);
  }
  {body(root,'green-apron-skirt','green',[[.21,.43],[.19,.64],[.17,.78]]);round(root,'apron-bib','green',0,.84,.146,.255,.25,.022);
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
  for(const x of [-1,1]){const o=ell(head,'bob-side','hair',x*.209,1.18,-.011,[.07,.16,.16]);o.rotation.z=x*-.12;}
  root.userData.pivots=pivots;return root;
 };
 Fuji.installStoreClerk=function(ctx){
  const nav=ctx.navigation;
  const layer=new T.Group();layer.name='STORE_CLERK_ROOT';ctx.scene.add(layer);
  const clerk=Fuji.makeStoreClerk();layer.add(clerk);
  clerk.position.set(-6.65,.03,-.75);clerk.rotation.y=Math.PI/2;clerk.scale.setScalar(1.12);
  // Discard obsolete customer/view preferences; navigation owns the single camera.
  try{localStorage.removeItem('fuji-character');localStorage.removeItem('fuji-view');}catch{}
  const talk=document.createElement('button');talk.id='clerk-nearby';talk.className='clerk-nearby';
  talk.textContent='店員に話す / Talk to the clerk';talk.hidden=true;
  document.getElementById('app').append(talk);talk.onclick=()=>Fuji.clerk?.open();
  const api={layer,clerk,update(){
   const camera=nav.camera,near=nav.mode==='walk'&&Math.hypot(camera.position.x-clerk.position.x,camera.position.z-clerk.position.z)<3.3;
   clerk.userData.pivots.head.rotation.y=near?T.MathUtils.clamp(Math.atan2(camera.position.x-clerk.position.x,camera.position.z-clerk.position.z)-clerk.rotation.y,-.45,.45):0;
   talk.hidden=!near||document.body.classList.contains('clerk-open');
  }};
  ctx.storeClerk=api;return api;
 };
})();

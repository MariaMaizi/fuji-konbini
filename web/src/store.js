/* A single, physically continuous shop. Dimensions are artistic, not official plans. */
Fuji.buildStore = function(scene,k) {
  const store=k.group(scene,'STORE'), exterior=k.group(store,'STORE_EXTERIOR'), room=k.group(store,'STORE_INTERIOR');
  const white=k.material(0xe2dfd5,.1), metal=k.material(0x626c70,.04,{metalness:.3,roughness:.4});
  const black=k.material(0x20292c,.07), wood=k.material(0xc6a476,.26,{map:k.surface('wood')});
  const green=k.material(0x164b35,.2), light=k.material(0xfff0ce,1.7), cool=k.material(0xdcf5ff,1.3);
  const brick=k.material(0xffffff,0,{map:k.surface('brick'),roughness:.9});
  const glass=new THREE.MeshPhysicalMaterial({color:0xcbdfe0,metalness:.05,roughness:.14,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide,clearcoat:1,clearcoatRoughness:.18,reflectivity:.3});
  const glows=[], lamps=[], doors=[];
  const b=(p,n,s,v,m=white,cast=false)=>k.box(p,n,s,v,m,cast);
  const coll=(name,x,z,w,d)=>k.collider(name,x,z,w,d);
  const frame=(parent,name,x,y,z,w,h,mat=metal)=>{
    b(parent,name+'_TOP',[w,.055,.075],[x,y+h/2,z],mat);
    b(parent,name+'_BOTTOM',[w,.055,.075],[x,y-h/2,z],mat);
    [-1,1].forEach(s=>b(parent,name+'_JAMB',[.055,h,.075],[x+s*w/2,y,z],mat));
  };
  const floorTexture=k.surface('tile');floorTexture.wrapS=floorTexture.wrapT=THREE.RepeatWrapping;floorTexture.repeat.set(18,9);
  b(room,'STORE_FLOOR',[14.6,.16,7.5],[0,-.015,-1.7],k.material(0xffffff,.24,{map:floorTexture,roughness:.6}));
  b(room,'STORE_CEILING',[14.4,.1,7.3],[0,2.86,-1.7],white);
  b(exterior,'STORE_ROOF',[14.95,.24,7.85],[0,3.08,-1.7],k.material(0x5c6363),true);
  b(exterior,'ROOF_PARAPET_FRONT',[15.1,.24,.15],[0,3.3,2.2],white,true);
  b(exterior,'ROOF_PARAPET_BACK',[15.1,.24,.15],[0,3.3,-5.55],white,true);
  [-7.4,7.4].forEach(x=>b(exterior,'ROOF_SIDE_EDGE',[.16,.25,7.8],[x,3.3,-1.7],white,true));
  // Full shell, with one rear viewing window over a low sill.
  [-7.2,7.2].forEach((x,i)=>{b(exterior,i?'STORE_RIGHT':'STORE_LEFT',[.22,2.9,7.5],[x,1.5,-1.7],white,true);coll(i?'RIGHT_WALL':'LEFT_WALL',x,-1.7,.24,7.5);});
  b(exterior,'STORE_BACK_SOLID',[10.9,2.9,.22],[-1.85,1.5,-5.35],white,true);
  b(exterior,'STORE_BACK_WINDOW_SILL',[3.5,.72,.22],[5.25,.4,-5.35],white);
  b(exterior,'STORE_BACK_WINDOW_HEADER',[3.5,.5,.22],[5.25,2.7,-5.35],white);
  b(exterior,'STORE_BACK_WINDOW',[3.4,1.68,.025],[5.2,1.61,-5.35],glass);
  frame(exterior,'REAR_WINDOW_FRAME',5.2,1.61,-5.35,3.4,1.68);
  coll('BACK_WALL',0,-5.35,14.6,.24);
  b(exterior,'STORE_FRONT_BRICK_LEFT',[2.15,2.76,.22],[-6.23,1.43,2.05],brick,true);
  b(exterior,'STORE_FRONT_BRICK_RIGHT',[.75,2.76,.22],[6.86,1.43,2.05],brick,true);
  coll('FRONT_LEFT',-1.38,2.05,11.7,.18);coll('FRONT_RIGHT',6.82,2.05,.95,.18);
  // Real open frame bars: no opaque rectangle behind any glazing.
  [[-3.96,2.27],[-1.62,2.27],[.72,2.27],[3.02,2.18]].forEach(([x,w],i)=>{
    b(exterior,'STORE_WINDOWS_'+i,[w,2.34,.018],[x,1.36,2.075],glass);
    frame(exterior,'WINDOW_FRAME_'+i,x,1.36,2.1,w,2.34);
    b(exterior,'WINDOW_TRANSOM',[w,.038,.06],[x,1.98,2.12],metal);
    b(exterior,'WINDOW_SAFETY_BAND',[w,.095,.007],[x,.86,2.094],k.material(0xf0ead6,.18,{transparent:true,opacity:.65}));
  });
  // 1.9 m clear doorway, both leaves slide into pockets next to the opening.
  const doorX=5.25,frontZ=2.08;
  [-1,1].forEach((s,i)=>{
    const d=k.group(exterior,i?'STORE_DOOR_RIGHT':'STORE_DOOR_LEFT',doorX+s*.47,0,frontZ+.05);
    b(d,'DOOR_GLASS',[.92,2.3,.018],[0,1.27,0],glass);frame(d,'DOOR_FRAME',0,1.27,0,.94,2.3);
    b(d,'DOOR_SAFETY_BAND',[.88,.08,.02],[0,.92,.03],white);
    k.label(d,'DOOR_NOTICE',i?'入口':'自動ドア',.32,.13,[0,1.48,.045],'#f6f4e7','#295942',.15);
    doors.push({object:d,closed:doorX+s*.47,sign:s});
  });
  b(exterior,'DOOR_TRACK',[2.05,.13,.22],[doorX,2.49,frontZ],metal);
  b(exterior,'DOOR_SENSOR',[.23,.085,.1],[doorX,2.41,2.23],black);
  b(exterior,'DOOR_THRESHOLD',[1.95,.045,.28],[doorX,.076,frontZ],metal);
  b(exterior,'STORE_FASCIA',[12.75,.67,.24],[.45,2.85,2.19],white,true);
  [[3.03,.09,0xec7927],[2.85,.14,0x087540],[2.65,.095,0xc62e31]].forEach(([y,h,c])=>{
    const m=k.material(c,.35);glows.push(m);b(exterior,'FASCIA_BRAND_STRIPE',[12.63,h,.02],[.45,y,2.323],m);
  });
  const logo=k.label(exterior,'7_ELEVEN_LOGO','7\nELEVEN',1,.65,[2.4,2.85,2.34],'#fffef6','#167643',.7);
  // Red seven and orange cap, while the green wordmark stays in its own band.
  const ltx=k.texture((c,W,H)=>{c.fillStyle='#fffef6';c.fillRect(0,0,W,H);c.textAlign='center';c.font='900 165px Arial';c.fillStyle='#d6322f';c.fillText('7',W/2,158);c.fillStyle='#e97f26';c.fillRect(191,17,117,18);c.fillStyle='#146e43';c.font='bold 54px Arial';c.fillText('ELEVEN',W/2,217);},512,256);
  logo.material.map=ltx;logo.material.emissiveMap=ltx;glows.push(logo.material);
  b(exterior,'STORE_EAVE',[13,.12,.55],[.45,2.48,2.23],white,true);
  b(exterior,'EAVE_LINEAR_LIGHT',[12.5,.018,.08],[.4,2.407,2.29],light);
  [-6.95,7].forEach(x=>{k.cylinder(exterior,'RAIN_DOWNPIPE',.055,2.75,[x,1.42,-5.49],metal);});
  b(exterior,'REAR_STAFF_DOOR',[.9,2.15,.06],[-5.45,1.15,-5.49],k.material(0x868e88));
  for(let x=-6.8;x<3.5;x+=1.25)b(exterior,'REAR_PANEL_JOINT',[.014,2.62,.01],[x,1.5,-5.468],metal);
  [-7.318,7.318].forEach(x=>{for(let z=-4.7;z<1.9;z+=1.1)b(exterior,'SIDE_PANEL_JOINT',[.008,2.65,.012],[x,1.5,z],metal);});
  b(exterior,'BACK_RAIN_GUTTER',[14.5,.1,.13],[0,2.93,-5.5],metal);
  k.label(exterior,'STAFF_SIGN','STAFF',.45,.15,[-5.45,1.75,-5.525],'#e5e5dc','#333a37',0,Math.PI);
  // Ceiling fixtures, green service canopy, ventilation, camera and detector.
  b(room,'COUNTER_GREEN_SOFFIT',[2.65,.14,4.1],[-5.7,2.74,-1.15],green);
  [-4.1,-1.35,1.4,4.25].forEach((x,i)=>{
    [-3.7,-1.4,.9].forEach((z,j)=>{b(room,'CEILING_LINEAR_HOUSING',[.11,.055,1.65],[x,2.775,z],metal);b(room,'CEILING_LINEAR_LIGHT',[.075,.018,1.6],[x,2.739,z],light);});
  });
  [-2,3.4].forEach(x=>{b(room,'CEILING_AC',[.75,.06,.75],[x,2.758,-1.5],white);for(let j=0;j<7;j++)b(room,'AC_VENT',[.52,.01,.022],[x,2.72,-1.72+j*.072],metal);});
  k.cylinder(room,'SMOKE_DETECTOR',.08,.04,[.25,2.74,.6],white);
  k.shape(room,'SECURITY_CAMERA',new THREE.SphereGeometry(.09,12,8),[6.8,2.66,1.65],black);
  [[-4.8,-1.6],[0,-2],[4.8,-1.6]].forEach(([x,z],i)=>{const l=new THREE.PointLight(0xffead1,1.9,9,1.5);l.name='INTERIOR_LIGHT_'+i;l.position.set(x,2.45,z);room.add(l);lamps.push(l);});

  const shelves=k.group(room,'RETAIL_SHELVES');
  function shelf(x,index) {
    const g=k.group(shelves,'SHELF_0'+index,x,0,-1.35);coll(g.name,x,-1.35,.75,3.0);
    b(g,'BASE',[.76,.18,3],[0,.18,0],white,true);b(g,'CENTRAL_BACK',[.07,1.35,2.9],[0,.93,0],white,true);
    [-1.43,0,1.43].forEach(z=>b(g,'UPRIGHT',[.075,1.55,.07],[0,.87,z],metal));
    for(let l=0;l<4;l++)for(const s of [-1,1]) {
      const y=.32+l*.355;
      b(g,'SHELF_BOARD',[.36,.04,2.96],[s*.2,y,0],white,true);
      b(g,'PRICE_STRIP',[.025,.065,2.9],[s*.39,y-.005,0],k.material(l%2?0x237a49:0xf4e8be,.35));
      for(let row=0;row<12;row++)for(let depth=0;depth<2;depth++){
        const type=l===0?'cup':l===3?'box':(row+index)%3===0?'can':'box';
        k.product(g,type,(Math.floor(row/3)+l+index)%8,[s*(.14+depth*.17),y+.03,-1.28+row*.232],.9,s>0?Math.PI/2:-Math.PI/2);
      }
    }
    // Front endcap with actual tray geometry and packed foods.
    for(let l=0;l<3;l++){
      b(g,'ENDCAP',[.73,.04,.3],[0,.38+l*.37,1.52],white);
      for(let p=0;p<3;p++)k.product(g,l===0?'meal':index===1?(l===1?'rice':'sandwich'):index===2?'bread':'box',(p+index)%8,[-.24+p*.24,.41+l*.37,1.48],.9);
    }
    k.label(g,'AISLE_CATEGORY',['おにぎり / Meals','Snacks / Biscuits','Daily goods'][index-1],.74,.19,[0,1.75,1.51],'#1d6648','#ffffff',.35);
  }
  [-2.6,.05,2.7].forEach((x,i)=>shelf(x,i+1));

  const fridge=k.group(room,'FRIDGE_WALL');
  for(let i=0;i<6;i++) {
    const x=-2.75+i*.92,z=-4.88;
    b(fridge,'FRIDGE_BACK',[.92,2.28,.12],[x,1.28,z-.28],white);
    b(fridge,'FRIDGE_FOOT',[.91,.19,.65],[x,.2,z],white,true);
    b(fridge,'FRIDGE_TOP',[.91,.15,.66],[x,2.39,z],white,true);
    b(fridge,'FRIDGE_DOOR_GLASS',[.83,2.06,.016],[x,1.3,z+.36],glass);
    frame(fridge,'FRIDGE_DOOR_'+i,x,1.3,z+.39,.89,2.16,black);
    b(fridge,'FRIDGE_HANDLE',[.028,.52,.04],[x+.32,1.25,z+.44],metal);
    b(fridge,'FRIDGE_LED',[.016,2.02,.023],[x-.39,1.29,z+.25],cool);
    for(let l=0;l<5;l++){
      const y=.35+l*.39;b(fridge,'FRIDGE_SHELF',[.82,.035,.54],[x,y,z],white);
      b(fridge,'FRIDGE_PRICE_RAIL',[.81,.045,.02],[x,y,z+.29],white);
      for(let p=0;p<5;p++)for(let d=0;d<2;d++) k.product(fridge,['bottle','bottleB','can','box','bottleC','can'][(i+l)%6],(i+l)%8,[x-.31+p*.155,y+.023,z-.1+d*.22],1);
    }
  }
  coll('FRIDGE_WALL',-.45,-4.88,5.62,.78);
  k.label(fridge,'DRINKS_LIGHTBOX','飲料   •   Cold drinks',5.7,.26,[-.44,2.61,-4.53],'#f4f7f3','#216140',.65);

  const counter=k.group(room,'COUNTER',-5.7,0,-.85);
  coll('COUNTER',-5.7,-.85,1.1,2.85);
  b(counter,'COUNTER_BASE',[1.05,.92,2.8],[0,.55,0],wood,true);
  b(counter,'COUNTER_TOP',[1.16,.09,2.96],[0,1.055,0],white,true);
  for(let z=-1.15;z<1.4;z+=.56)b(counter,'COUNTER_DOOR_SEAM',[.012,.78,.012],[.533,.57,z],metal);
  b(counter,'POS_STAND',[.2,.2,.23],[.05,1.2,.75],black);
  const pos=b(counter,'POS_TERMINAL',[.055,.36,.46],[.07,1.43,.75],black);pos.rotation.z=-.2;
  k.label(counter,'POS_SCREEN','7-ELEVEN\n¥ 1,280',.38,.27,[.117,1.44,.75],'#d1e9e6','#265446',.6,Math.PI/2);
  const reader=b(counter,'CARD_READER',[.18,.08,.23],[.43,1.16,.27],black);reader.rotation.z=-.15;
  k.label(counter,'CARD_DISPLAY','PAY',.13,.07,[.48,1.205,.27],'#8aafa0','#ffffff',.5,Math.PI/2);
  b(counter,'RECEIPT_PRINTER',[.22,.18,.25],[-.15,1.2,.22],black);
  b(counter,'RECEIPT_PAPER',[.14,.007,.14],[-.15,1.295,.28],white);
  for(let i=0;i<5;i++)b(counter,'PAPER_BAG_STACK',[.24,.012,.3],[-.27,1.105+i*.013,1.15],wood);
  b(counter,'BAG_DISPENSER',[.035,.22,.33],[.545,.9,1.15],white);
  k.beam(counter,'SCANNER_HANDLE',[.35,1.12,-.05],[.38,1.25,-.05],.025,black);
  b(counter,'BARCODE_SCANNER',[.09,.065,.13],[.38,1.27,-.05],black);
  k.label(counter,'PAYMENT_PROMOTION','7-ELEVEN\n毎日、おいしい。',.58,.44,[.542,.67,-.5],'#f5f0df','#237747',.3,Math.PI/2);
  for(let l=0;l<3;l++){
    b(counter,'CANDY_TRAY',[.2,.035,.75],[.64,.35+l*.21,.87],white);
    for(let j=0;j<5;j++) k.product(counter,'box',j,[.66,.37+l*.21,.56+j*.14],.52,Math.PI/2);
  }
  k.label(counter,'COUNTER_MENU','Coffee  ¥150\nHot snacks  ¥180',.8,.48,[-.27,2.26,0],'#174735','#fff2cc',.7,Math.PI/2);

  const coffee=k.group(room,'COFFEE_AREA',-5.62,0,-4.28);coll('COFFEE_AREA',-5.62,-4.28,2.25,1.04);
  b(coffee,'COFFEE_CABINET',[2.26,.94,.83],[0,.54,0],wood,true);b(coffee,'WORKTOP',[2.36,.075,.91],[0,1.06,0],white);
  b(coffee,'COFFEE_MACHINE',[.55,.68,.48],[-.48,1.44,-.04],black);
  b(coffee,'COFFEE_MACHINE_FACE',[.47,.42,.035],[-.48,1.51,.215],metal);
  k.label(coffee,'COFFEE_SCREEN','COFFEE\nHOT  /  ICE',.34,.18,[-.48,1.59,.238],'#183e35','#f6f0d2',.8);
  [-.12,.12].forEach(x=>{k.cylinder(coffee,'COFFEE_SPOUT',.018,.08,[-.48+x,1.27,.22],metal);k.cylinder(coffee,'COFFEE_CUP',.045,.11,[-.48+x,1.15,.22],white,.052);});
  k.cylinder(coffee,'BEAN_HOPPER',.15,.19,[-.48,1.87,-.04],k.material(0x3d2920,.1),.12);
  for(let j=0;j<4;j++)k.cylinder(coffee,'STACKED_CUPS',.06,.19+j*.025,[.1+j*.18,1.2,.03],white,.075);
  b(coffee,'SUGAR_STATION',[.42,.12,.23],[.64,1.16,.27],wood);
  for(let j=0;j<6;j++)b(coffee,'SUGAR_PACKET',[.05,.08,.01],[.48+j*.055,1.24,.25],white);
  for(let j=0;j<5;j++)k.cylinder(coffee,'CUP_LID',.073,.009,[.12,1.12+j*.012,.27],black);
  b(coffee,'STIRRER_HOLDER',[.11,.12,.12],[.86,1.17,.05],white);
  for(let j=0;j<7;j++)b(coffee,'WOOD_STIRRER',[.008,.2,.005],[.82+(j%3)*.025,1.28,.025+Math.floor(j/3)*.026],wood);
  b(coffee,'COFFEE_WASTE_OPENING',[.17,.009,.11],[.53,1.103,-.21],black);
  k.label(coffee,'COFFEE_MENU_BOARD','コーヒー\nFreshly brewed',1.5,.38,[0,2.22,-.42],'#184b36','#fff4df',.6);

  const hot=k.group(counter,'HOT_FOOD_AREA',0,1.12,-.79);
  b(hot,'HOT_CASE_BASE',[.87,.08,.76],[0,0,0],metal);
  b(hot,'HOT_CASE_BACK',[.85,.64,.06],[-.015,.36,-.35],black);
  b(hot,'HOT_CASE_GLASS',[.88,.64,.015],[0,.36,.35],glass);
  b(hot,'HOT_CASE_TOP',[.9,.055,.78],[0,.72,0],black);
  [-.43,.43].forEach(x=>b(hot,'HOT_CASE_SIDE',[.016,.63,.72],[x,.35,0],glass));
  for(let l=0;l<2;l++){
    b(hot,'HOT_FOOD_TRAY',[.79,.02,.58],[0,.14+l*.3,0],metal);
    for(let j=0;j<5;j++){const food=k.shape(hot,'HOT_SNACK',new THREE.SphereGeometry(.07,10,7),[-.28+j*.14,.2+l*.3,.03],k.material(0xb97a2d,.35));food.scale.set(1,.65,1.4);}
  }
  b(hot,'WARMER_LIGHT',[.74,.02,.045],[0,.68,.25],light);

  const rest=k.group(room,'REST_AREA');
  b(rest,'WINDOW_COUNTER',[.5,.065,2.3],[6.64,.83,-2.48],wood,true);coll('REST_COUNTER',6.64,-2.48,.5,2.3);
  [-3.13,-1.83].forEach((z,i)=>{
    k.cylinder(rest,'STOOL_SEAT',.23,.07,[6.13,.53,z],wood);
    for(const x of [-.14,.14])for(const dz of [-.14,.14])k.beam(rest,'STOOL_LEG',[6.13+x,.5,z+dz],[6.13+x*1.3,.08,z+dz*1.3],.02,metal);
    coll('STOOL_'+i,6.13,z,.48,.48);
  });
  b(rest,'OUTLET',[.02,.09,.16],[7.065,1.04,-2.4],white);
  for(let i=0;i<2;i++){
    const z=-.7+i*.39;b(rest,'SORTING_BIN',[.38,.58,.33],[6.76,.35,z],white);
    b(rest,'BIN_OPENING',[.2,.014,.16],[6.76,.65,z],black);
    k.label(rest,'SORTING_LABEL',i?'PET':'PAPER',.25,.12,[6.555,.42,z],'#e7ebe0',i?'#235b7d':'#236944',.1,-Math.PI/2);
  }
  coll('SORTING_BINS',6.76,-.5,.4,.76);
  const freezer=k.group(room,'FREEZER',5.2,0,-4.72);coll('FREEZER',5.2,-4.72,1.25,.7);
  b(freezer,'FREEZER_BODY',[1.22,.72,.68],[0,.43,0],white,true);
  b(freezer,'FREEZER_LID',[1.1,.025,.56],[0,.805,0],glass);
  b(freezer,'FREEZER_LED',[1.02,.018,.025],[0,.76,.27],cool);
  for(let j=0;j<7;j++)k.product(freezer,'box',j,[-.47+j*.15,.74,0],.6);
  k.label(freezer,'FREEZER_LABEL','ICE CREAM',.8,.18,[0,.47,.35],'#e4eeeb','#285d70',.4);
  const atm=k.group(room,'ATM',6.7,0,.57);coll('ATM',6.7,.57,.65,.63);
  b(atm,'ATM_BODY',[.62,1.34,.55],[0,.74,0],k.material(0xede8db,.18),true);
  b(atm,'ATM_RED_HEADER',[.64,.25,.56],[0,1.52,0],k.material(0xb83233,.3));
  k.label(atm,'ATM_SCREEN','ATM\nSERVICE',.42,.35,[0,1.15,.282],'#345d61','#ffffff',.65);
  b(atm,'ATM_KEYPAD',[.36,.04,.18],[0,.86,.34],black);b(atm,'ATM_CASH_SLOT',[.31,.025,.03],[0,.64,.285],black);
  const mags=k.group(room,'MAGAZINE_DAILY_GOODS',-4.15,0,.65);coll('MAGAZINES',-4.15,.65,.43,.85);
  b(mags,'MAGAZINE_RACK',[.38,.85,.83],[0,.5,0],wood);
  for(let j=0;j<6;j++){const cover=k.label(mags,'MAGAZINE_COVER',['TRAVEL','FUJI','LIFE'][j%3],.24,.31,[.21,.56+(j%2)*.32,-.28+Math.floor(j/2)*.27],['#d17855','#4b7e83','#d6b862'][j%3],'#ffffff',.3,Math.PI/2);cover.rotation.z=-.12;}
  // Rear service equipment and exterior safety details.
  for(let i=0;i<2;i++){
    const x=-2.6+i*1.5;b(exterior,'EXTERIOR_AC_UNIT',[1.1,.72,.5],[x,.48,-5.82],white,true);
    const fan=k.cylinder(exterior,'CONDENSER_FAN',.24,.035,[x,.5,-6.09],metal);fan.rotation.x=Math.PI/2;
    for(let j=0;j<7;j++)b(exterior,'AC_GRILLE',[.85,.015,.016],[x,.23+j*.08,-6.12],black);
  }
  k.flush();store.userData.action='store';
  return {group:store,glass,glows,lamps,doors,doorX,frontZ,room,doorOpen:0};
};

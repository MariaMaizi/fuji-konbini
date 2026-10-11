/* Displaced radial terrain, generic vehicles, and secondary streetscape details. */
Fuji.buildMountain=function(scene,k){
  // Keep the same apparent front-view size, but leave the entire shop orbit clear.
  // This is an artistic distance compression, not a geographic reconstruction.
  const g=k.group(scene,'FUJI',-1.2,-.3,-72);g.scale.setScalar(1.8);
  const N=192,R=96,p=[],col=[],idx=[];const rock=new THREE.Color(),snow=new THREE.Color(0xcbd7df);
  for(let r=0;r<=R;r++)for(let s=0;s<=N;s++){
    const t=r/R,a=s/N*Math.PI*2;
    const twist=.026*Math.sin(t*18+a*4)+.012*Math.sin(t*41+a*7);
    const ridge=Math.sin((a+twist)*31+t*5)+.47*Math.sin((a+twist)*67-t*8)+.22*Math.sin(a*119+t*13);
    const radius=1.35+20.5*Math.pow(1-t,1.13);
    const bump=ridge*.095*Math.sin(t*Math.PI)*(.3+t);
    const x=Math.cos(a)*(radius+bump)*(1+.045*Math.sin(a*3));
    const z=Math.sin(a)*(radius+bump)*.52;
    const y=t*16.5+.09*Math.sin(a*5)*t*t+.08*Math.sin(a*3+1)*t;
    p.push(x,y,z);
    const grain=.14*Math.sin(a*173+t*137)*Math.sin(a*89-t*81);
    const gully=.5+.24*Math.sin((a+twist)*31+t*5)+.16*Math.sin((a+twist)*67-t*8)+.1*Math.sin(a*119+t*13)+grain;
    const edge=.53+.09*Math.sin(a*7)+.06*Math.sin(a*13+1);
    const mask=THREE.MathUtils.smoothstep(t+gully*.15,edge+.06,edge+.15)*THREE.MathUtils.smoothstep(gully,.36,.61);
    const cover=Math.max(mask,THREE.MathUtils.smoothstep(t,.92,.992)*.75);
    rock.setHSL(.586,.3,.24+(.5+.5*ridge/1.7)*.1+t*.04);rock.lerp(snow,cover);rock.convertSRGBToLinear();
    col.push(rock.r,rock.g,rock.b);
  }
  for(let r=0;r<R;r++)for(let s=0;s<N;s++){const a=r*(N+1)+s,b=a+1,c=a+N+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
  const m=new THREE.MeshStandardMaterial({roughness:.94,side:THREE.DoubleSide});
  // Fragment-level snow avoids visible grid steps at the snow boundary.
  m.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 mountainPosition;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nmountainPosition=position;');
    shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\n#ifdef USE_FOG\nfogDepth *= 0.57;\n#endif');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 mountainPosition;
      float mountainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float mountainNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mountainHash(i),mountainHash(i+vec2(1,0)),f.x),mix(mountainHash(i+vec2(0,1)),mountainHash(i+vec2(1,1)),f.x),f.y);}
      float mountainFbm(vec2 p){return mountainNoise(p)*.55+mountainNoise(p*2.03)*.27+mountainNoise(p*4.07)*.13+mountainNoise(p*8.13)*.05;}
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float angle=atan(mountainPosition.z/.52,mountainPosition.x);
      float altitude=mountainPosition.y/16.5;
      float bend=mountainFbm(vec2(angle*8.0,altitude*14.0));
      float channels=mountainFbm(vec2(angle*85.0+bend*2.7,altitude*19.0))*.48+mountainFbm(vec2(angle*21.0+bend*1.3,altitude*7.0))*.52;
      float edge=.47+mountainFbm(vec2(angle*7.0,altitude*3.0))*.18;
      float snowMask=smoothstep(edge,edge+.24,altitude)*smoothstep(.32,.57,channels);
      snowMask=max(snowMask,smoothstep(.9,.99,altitude)*.72);
      float stoneGrain=mountainFbm(vec2(angle*12.0,altitude*9.0))*.83+mountainFbm(vec2(angle*120.0,altitude*180.0))*.17;
      vec3 rockTone=mix(vec3(.035,.065,.105),vec3(.075,.12,.16),stoneGrain);
      vec3 snowTone=mix(vec3(.49,.61,.7),vec3(.79,.84,.85),stoneGrain);
      diffuseColor.rgb *= mix(rockTone,snowTone,snowMask);
    `);
  };
  const mountain=k.shape(g,'FUJI_BODY',geo,[0,0,0],m);mountain.userData.action='fuji';
  const crater=k.shape(g,'FUJI_CRATER',new THREE.CircleGeometry(1.05,48),[0,16.31,0],k.material(0x3f4d58));crater.rotation.x=-Math.PI/2;crater.scale.y=.53;
  const terrain=k.shape(scene,'MOUNTAIN_TERRAIN',new THREE.CircleGeometry(39,64),[-1.2,-.32,-72],k.material(0x5b6861));terrain.rotation.x=-Math.PI/2;terrain.scale.y=.52;
  g.userData.material=m;g.userData.snowMaterial={color:new THREE.Color()};
  return g;
};

Fuji.buildVehicles=function(scene,k){
  const metal=k.material(0x88949c,0,{roughness:.24,metalness:.7}),rubber=k.material(0x161b1d),glass=k.material(0x1b3544,0,{roughness:.15,metalness:.3});
  const colors=[0x52768a,0x3c4c5c,0xb8aaa0];
  function profileMesh(parent,name,sections,material) {
    // Each cross-section is a rounded shoulder profile; geometry has tapered hood, cabin and hatch.
    const verts=[],index=[],count=8;
    sections.forEach(([z,w,lo,hi])=>{const pts=[[-w*.86,lo],[-w,lo+.1],[-w,hi-.09],[-w*.82,hi],[w*.82,hi],[w,hi-.09],[w,lo+.1],[w*.86,lo]];pts.forEach(([x,y])=>verts.push(x,y,z));});
    for(let n=0;n<sections.length-1;n++)for(let i=0;i<count;i++){const a=n*count+i,b=n*count+(i+1)%count,c=a+count,d=b+count;index.push(a,b,c,b,d,c);}
    for(let i=1;i<7;i++){index.push(0,i+1,i);const n=(sections.length-1)*8;index.push(n,n+i,n+i+1);}
    for(let i=0;i<index.length;i+=3){const n=index[i+1];index[i+1]=index[i+2];index[i+2]=n;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(index);g.computeVertexNormals();
    return k.shape(parent,name,g,[0,0,0],material,true);
  }
  [-4.65,0,4.7].forEach((x,i)=>{
    const car=k.group(scene,'CAR_0'+(i+1),x,-.14,i===1?4.68:4.85),body=k.material(colors[i],0,{roughness:.27,metalness:.32});
    const L=i===2?1.48:i===1?1.52:1.35,H=i===2?1.47:1.32;
    profileMesh(car,'BODY',[[-L,.62,.27,.62],[-L+.25,.75,.28,.76],[.25,.77,.26,.78],[L-.2,.72,.3,.77],[L,.63,.33,.64]],body);
    profileMesh(car,'CABIN',[[-.92,.6,.72,.8],[-.48,.59,.73,H],[.65,.59,.74,H+.01],[L-.26,.61,.72,.99]],body);
    const front=k.box(car,'WINDSHIELD',[1.01,.58,.022],[0,(H+.82)/2,-.705],glass);front.rotation.x=-.62;
    const rear=k.box(car,'REAR_WINDOW',[1.06,.43,.025],[0,H-.2,L-.37],glass);rear.rotation.x=.49;
    [-1,1].forEach(s=>{
      k.box(car,'SIDE_WINDOWS',[.018,.43,1.01],[s*.605,H-.225,.15],glass);
      k.box(car,'B_PILLAR',[.035,.46,.065],[s*.625,H-.23,.16],rubber);
      for(let d=0;d<2;d++)k.box(car,'DOOR_HANDLE',[.04,.035,.15],[s*.762,.73,-.3+d*.65],metal);
      for(const z of [-.92,.94]){
        const tire=k.cylinder(car,'TIRE',.29,.17,[s*.75,.31,z],rubber);tire.rotation.z=Math.PI/2;
        const rim=k.cylinder(car,'RIM',.18,.178,[s*.752,.31,z],metal);rim.rotation.z=Math.PI/2;
        const hub=k.cylinder(car,'HUB',.055,.185,[s*.757,.31,z],rubber);hub.rotation.z=Math.PI/2;
        const arch=k.shape(car,'WHEEL_ARCH',new THREE.TorusGeometry(.31,.035,6,24,Math.PI),[s*.77,.31,z],rubber);arch.rotation.y=Math.PI/2;
      }
      k.beam(car,'MIRROR_ARM',[s*.64,1,-.57],[s*.84,1,-.57],.027,rubber);
      k.box(car,'MIRROR_HOUSING',[.17,.115,.23],[s*.86,1,-.57],body);
      k.box(car,'MIRROR_GLASS',[.15,.095,.013],[s*.86,1,-.445],metal);
      const head=k.box(car,'HEADLIGHT',[.35,.13,.025],[s*.43,.62,-L-.008],k.material(0xeaf1de,.35));head.rotation.y=s*.16;
      k.box(car,'TAIL_LIGHT',[.19,i===2?.38:.16,.035],[s*.58,.71,L-.018],k.material(0xc62923,.2));
      k.box(car,'SILL_TRIM',[.035,.075,1.45],[s*.77,.35,0],rubber);
    });
    k.box(car,'FRONT_GRILLE',[.58,.135,.024],[0,.48,-L-.012],rubber);
    for(let l=0;l<3;l++)k.box(car,'GRILLE_BAR',[.52,.015,.015],[0,.43+l*.045,-L-.026],metal);
    k.box(car,'REAR_BUMPER',[1.25,.095,.07],[0,.38,L],rubber);
    k.label(car,'LICENSE_PLATE','富士 580\n・7 11',.39,.19,[0,.59,L+.017],i===1?'#edece0':'#e4c34d','#294037',0);
    k.beam(car,'REAR_WIPER',[-.25,H-.31,L-.255],[.25,H-.26,L-.32],.008,rubber);
    k.collider('CAR_'+i,x,i===1?4.68:4.85,1.8,L*2+.15);
  });
};

Fuji.detailEnvironment=function(scene,k,parkingMaterial){
  const dark=k.material(0x323b40),metal=k.material(0x707a7b,0,{metalness:.35});
  const tex=k.surface('asphalt');tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(24,12);parkingMaterial.map=tex;parkingMaterial.bumpMap=tex;parkingMaterial.bumpScale=.012;parkingMaterial.needsUpdate=true;
  for(const o of [...scene.children])if(/^WHEEL_STOP_/.test(o.name))o.position.z=3.1;
  // Keep original pole placement and add cable clamps, ribbed insulators and lower communications.
  for(let i=1;i<=3;i++){
    const p=scene.getObjectByName('UTILITY_POLE_0'+i);if(!p)continue;
    k.collider('POLE_'+i,p.position.x,i===3?-7.2:p.position.z,.4,.4);
    const height=i===1?7.8:i===2?4.9:4.4;
    for(let y=.7;y<height-.5;y+=.55){const ring=k.shape(p,'CABLE_CLAMP',new THREE.TorusGeometry(.17,.016,5,16),[0,y,0],metal);ring.rotation.x=Math.PI/2;}
    for(let level=0;level<2;level++){
      const y=height-1.6-level*.75;k.box(p,'LOWER_CROSS_ARM',[1.8,.07,.07],[0,y,0],metal);
      [-.73,.73].forEach(x=>{k.cylinder(p,'INSULATOR_CORE',.055,.3,[x,y+.15,0],metal);for(let j=0;j<4;j++)k.cylinder(p,'PORCELAIN_DISC',.085,.035,[x,y+.03+j*.06,0],k.material(0xb8b6a0));});
    }
    k.beam(p,'CABLE_RISER',[.2,.3,.1],[.2,height-1,.1],.022,dark);
    for(let j=0;j<3;j++){
      const loop=k.shape(p,'CABLE_SERVICE_LOOP',new THREE.TorusGeometry(.18+j*.025,.012,5,24),[.23,height-2.8-j*.06,.17],dark);loop.rotation.y=.3;
    }
  }
  for(let j=0;j<3;j++){
    const a=new THREE.Vector3(-7.8,3.4-j*.2,-3.6),b=new THREE.Vector3(7.1,5.9-j*.2,-2.15);
    const c=a.clone().lerp(b,.5);c.y-=.9;
    k.shape(scene,'COMMUNICATION_WIRE_'+j,new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a,c,b),40,.012,5,false),[0,0,0],dark);
  }
  const pole3=scene.getObjectByName('UTILITY_POLE_03');if(pole3)pole3.position.z=-7.2;
  // Old middle props overlapped the new building depth; move them behind its back wall.
  ['YELLOW_SIGN','YELLOW_SIGN_TEXT','SIGN_POST'].forEach(n=>{const o=scene.getObjectByName(n);if(o){o.position.z-=4.1;o.position.x-=2.05;}});
  for(const o of [...scene.children])if(/^POWER_LINE_|^POWER_DROP_/.test(o.name))scene.remove(o);
  for(let j=0;j<3;j++){
    const dx=(j-1)*.8,points=[new THREE.Vector3(-7.8+dx,4.65,-3.6),new THREE.Vector3(3.25+dx*.5,4.15,-7.2),new THREE.Vector3(7.1+dx,7.5,-2.15)];
    for(let s=0;s<2;s++){
      const a=points[s],b=points[s+1],c=a.clone().lerp(b,.5);c.y-=.62;
      k.shape(scene,'UTILITY_MAIN_WIRE',new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a,c,b),30,.014,5,false),[0,0,0],dark);
    }
  }
  for(const o of [...scene.children])if(/^BUSH_/.test(o.name))o.position.z=-6.35;
  ['TREE_06'].forEach(n=>{const o=scene.getObjectByName(n);if(o)o.position.z=-6.5;});
  const old=scene.getObjectByName('UP_GARAGE_TEXT');if(old){old.material.map=k.texture((c,W,H)=>{c.fillStyle='#e2c367';c.fillRect(0,0,W,H);c.fillStyle='#263d47';c.textAlign='center';c.font='bold 57px Arial';c.fillText('FUJI AUTO',W/2,190);c.font='40px Yu Gothic';c.fillText('カーサービス',W/2,300);});old.material.needsUpdate=true;}
  // Modest buildings establish the rear street; store remains dominant.
  [[-9.6,-6.3,2.3,3.5,2.8],[9.6,-6.8,2.4,3.9,3.1]].forEach(([x,z,w,h,d],i)=>{
    const g=k.group(scene,'BACKGROUND_BUILDING_'+i,x,0,z),wall=k.material(i?0x919e98:0xb9b9ad);
    k.box(g,'WALLS',[w,h,d],[0,h/2,0],wall,true);k.box(g,'ROOF',[w+.18,.14,d+.18],[0,h+.05,0],dark,true);
    for(let row=0;row<2;row++)for(let col=0;col<2;col++){
      k.box(g,'WINDOW',[.59,.75,.035],[-.57+col*1.1,1.06+row*1.65,d/2+.02],k.material(0x415968,0,{metalness:.1}));
      k.box(g,'WINDOW_SILL',[.7,.065,.13],[-.57+col*1.1,.66+row*1.65,d/2+.08],wall);
    }
  });
  // Leafless winter branches, separate from the retained clipped bushes.
  [[9.7,-2.3],[-9.7,-1.3]].forEach(([x,z],i)=>{
    const g=k.group(scene,'WINTER_TREE_'+i,x,0,z),bark=k.material(0x665348);
    k.beam(g,'TRUNK',[0,0,0],[.07,3.2,0],.085,bark);
    for(let j=0;j<9;j++){
      const a=j*2.39,start=[.04,1.35+j*.15,0],end=[Math.cos(a)*(.6+(j%3)*.13),2.6+j*.1,Math.sin(a)*.55];
      k.beam(g,'BRANCH',start,end,.025,bark);k.beam(g,'TWIG',end,[end[0]*1.18,end[1]+.55,end[2]*1.22],.012,bark);
    }
  });
  for(let i=0;i<6;i++)k.box(scene,'PEDESTRIAN_MARKING',[1.55,.012,.16],[7.05,-.12,3.2+i*.44],k.material(0xe4e2d7));
  [-7.6,7.65].forEach(x=>{k.cylinder(scene,'BOLLARD',.075,.72,[x,.25,2.65],k.material(0xd1c397));k.collider('BOLLARD',x,2.65,.2,.2);});
  [-2.1,1.3].forEach(x=>k.collider('SAFETY_RAIL',x,2.78,2.4,.09));
  [-2.6,-1.1].forEach(x=>k.collider('REAR_AC',x,-5.82,1.1,.5));
  k.collider('VENDING_MACHINE',6.1,2.7,.95,.62);
  // Plant deck behind the building joins the distant mountain terrain.
  const ground=new THREE.Shape();ground.moveTo(-12,-5);ground.lineTo(12,-5);ground.lineTo(49,-95);ground.lineTo(-49,-95);ground.closePath();
  const groundMesh=k.shape(scene,'REAR_GROUND',new THREE.ShapeGeometry(ground),[0,-.325,0],k.material(0x777d6b));
  // Shape XY is mapped to world XZ; connect the original deck to the distant foothills.
  groundMesh.rotation.x=Math.PI/2;groundMesh.material.side=THREE.DoubleSide;
};

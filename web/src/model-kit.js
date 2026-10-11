/* Shared procedural materials and instanced geometry. Three.js r128. */
window.Fuji = window.Fuji || {};
Fuji.Kit = class {
  constructor(renderer) {
    this.renderer = renderer; this.batches = new Map(); this.colliders = [];
    this.unit = new THREE.BoxGeometry(1,1,1); this.dummy = new THREE.Object3D();
    this.materials = new Map(); this.products = new Map();
  }
  material(color, emission = 0, extra = {}) {
    const key = JSON.stringify([color,emission,extra]);
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness:.65, emissive:color, emissiveIntensity:emission, ...extra
    }));
    return this.materials.get(key);
  }
  group(parent,name,x=0,y=0,z=0) {
    const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;
  }
  box(parent,name,size,pos,material,cast=false) {
    const m = new THREE.Mesh(this.unit,material);m.name=name;m.scale.set(...size);m.position.set(...pos);
    m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
  }
  shape(parent,name,geometry,pos,material,cast=false) {
    const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...pos);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;
  }
  cylinder(parent,name,r,h,pos,material,top=r) {
    return this.shape(parent,name,new THREE.CylinderGeometry(top,r,h,16),pos,material);
  }
  beam(parent,name,a,b,r,material) {
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);
    const m=this.cylinder(parent,name,r,d.length(),av.add(bv).multiplyScalar(.5).toArray(),material);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;
  }
  collider(name,x,z,w,d) { this.colliders.push({name,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2}); }
  texture(draw,w=512,h=512) {
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());return t;
  }
  label(parent,name,text,w,h,pos,bg='#f3f1e9',fg='#214538',glow=.28,rotation=0) {
    const tx=this.texture((c,W,H)=>{
      c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';
      const lines=text.split('\n');c.font=`700 ${Math.min(H/(lines.length+1),W/Math.max(...lines.map(l=>l.length))*.95)}px "Yu Gothic",Arial`;
      lines.forEach((l,i)=>c.fillText(l,W/2,H*(i+.5)/lines.length));
    },512,256);
    const material=new THREE.MeshStandardMaterial({map:tx,emissiveMap:tx,emissive:0xffffff,emissiveIntensity:glow,roughness:.7,side:THREE.DoubleSide});
    const m=this.shape(parent,name,new THREE.PlaneGeometry(w,h),pos,material);m.rotation.y=rotation;return m;
  }
  surface(kind) {
    return this.texture((c,W,H)=>{
      c.fillStyle=kind==='tile'?'#d3d2c9':kind==='brick'?'#966b53':kind==='wood'?'#c7a67a':'#41484d';c.fillRect(0,0,W,H);
      let seed=131;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<12000;i++){const v=rnd();c.fillStyle=`rgba(${v>.5?'255,255,255':'0,0,0'},${kind==='asphalt'?.1:.025})`;c.fillRect(rnd()*W,rnd()*H,1+rnd()*2,kind==='wood'?20+rnd()*90:2);}
      if(kind==='tile'){c.strokeStyle='#afafa8';c.lineWidth=2;c.strokeRect(1,1,W-2,H-2);}
      if(kind==='brick'){c.strokeStyle='#b69c83';c.lineWidth=3;for(let y=0;y<H;y+=64){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();for(let x=((y/64)%2)*64;x<W;x+=128){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+64);c.stroke();}}}
    });
  }
  batch(parent,name,geometry,material,pos,scale=[1,1,1],yaw=0) {
    const key=parent.uuid+name;
    if(!this.batches.has(key))this.batches.set(key,{parent,name,geometry,material,items:[]});
    this.batches.get(key).items.push({pos,scale,yaw});
  }
  product(parent,type,variant,pos,scale=1,yaw=0) {
    const key=type+'_'+variant;
    if(!this.products.has(key)) {
      const colors=['#c74332','#27594a','#d9a83d','#3c6e91','#e8dfbf','#654335','#8a537b','#467f53'];
      const names=['CRISP','TEA','CITRUS','WATER','MILK','COFFEE','BERRY','GREEN'];
      const tx=this.texture((c,W,H)=>{
        c.fillStyle=colors[variant%8];c.fillRect(0,0,W,H);c.fillStyle='#eee9d7';c.fillRect(0,H*.23,W,H*.45);
        c.fillStyle=colors[variant%8];c.font='bold 33px Arial';c.textAlign='center';c.fillText(names[variant%8],W/2,H*.42);
        c.font='14px Arial';c.fillText('FUJI SELECT',W/2,H*.54);c.beginPath();c.arc(W/2,H*.77,21,0,Math.PI*2);c.fillStyle='#efc972';c.fill();
        c.fillStyle='#faf7ed';c.fillRect(0,6,W,6);c.fillRect(0,H-12,W,4);c.fillStyle='#242a26';for(let j=0;j<24;j++)c.fillRect(16+j*2,H*.87,1+(j%2),18);
      },256,256);
      let g;
      if(type==='bottle')g=new THREE.LatheGeometry([[0,0],[.061,0],[.068,.028],[.066,.19],[.048,.24],[.026,.255],[.026,.29],[0,.29]].map(p=>new THREE.Vector2(...p)),12);
      else if(type==='bottleB')g=new THREE.LatheGeometry([[0,0],[.063,0],[.065,.06],[.05,.18],[.027,.205],[.027,.255],[0,.255]].map(p=>new THREE.Vector2(...p)),12);
      else if(type==='bottleC')g=new THREE.LatheGeometry([[0,0],[.072,0],[.075,.12],[.06,.21],[.028,.25],[.028,.31],[0,.31]].map(p=>new THREE.Vector2(...p)),12);
      else if(type==='can') {g=new THREE.CylinderGeometry(.065,.065,.19,14);g.translate(0,.095,0);}
      else if(type==='cup') {g=new THREE.CylinderGeometry(.095,.067,.18,14);g.translate(0,.09,0);}
      else if(type==='rice'||type==='sandwich'){const s=new THREE.Shape();s.moveTo(-.09,0);s.lineTo(.09,0);s.lineTo(type==='rice'?0:-.09,.17);s.closePath();g=new THREE.ExtrudeGeometry(s,{depth:type==='rice'?.06:.1,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:1,steps:1});}
      else if(type==='bread'){g=new THREE.SphereGeometry(.1,12,8);g.scale(1.4,.55,.85);g.translate(0,.055,0);}
      else {g=new THREE.BoxGeometry(type==='meal'?.27:.17,type==='meal'?.065:.23,type==='meal'?.2:.09);g.translate(0,type==='meal'?.033:.115,0);}
      const m=new THREE.MeshStandardMaterial({map:tx,roughness:.65,emissive:0xffffff,emissiveMap:tx,emissiveIntensity:.33});
      this.products.set(key,{g,m});
    }
    const p=this.products.get(key);this.batch(parent,'PACKAGING_'+key,p.g,p.m,pos,[scale,scale,scale],yaw);
    if(type.startsWith('bottle')){
      if(!this.capGeometry)this.capGeometry=new THREE.CylinderGeometry(.028,.029,.025,12);
      const h=type==='bottleB'?.255:type==='bottleC'?.31:.29;
      this.batch(parent,'BOTTLE_CAP_'+(variant%2),this.capGeometry,this.material(variant%2?0x24573b:0xeae9e2,.1),[pos[0],pos[1]+h*scale,pos[2]],[scale,scale,scale],yaw);
    }
  }
  flush() {
    this.batches.forEach(b=>{
      const m=new THREE.InstancedMesh(b.geometry,b.material,b.items.length);m.name=b.name;m.frustumCulled=false;
      b.items.forEach((p,i)=>{this.dummy.position.set(...p.pos);this.dummy.scale.set(...p.scale);this.dummy.rotation.set(0,p.yaw,0);this.dummy.updateMatrix();m.setMatrixAt(i,this.dummy.matrix);});
      m.instanceMatrix.needsUpdate=true;m.receiveShadow=true;b.parent.add(m);
    });this.batches.clear();
  }
  compact(root) {
    const sets=new Map();
    root.traverse(o=>{
      if(!o.isMesh||o.isInstancedMesh||o.geometry!==this.unit||!o.parent||/^(STORE_|ROOF_|COUNTER_BASE|COUNTER_TOP|ATM_BODY|BODY|CABIN)/.test(o.name))return;
      const key=o.parent.uuid+o.material.uuid+o.castShadow;
      if(!sets.has(key))sets.set(key,[]);sets.get(key).push(o);
    });
    for(const list of sets.values()){
      if(list.length<5)continue;
      const first=list[0],m=new THREE.InstancedMesh(this.unit,first.material,list.length);
      m.name='STRUCTURE_INSTANCES';m.userData.sourceNames=list.map(o=>o.name);m.castShadow=first.castShadow;m.receiveShadow=true;m.frustumCulled=false;
      list.forEach((o,i)=>{o.updateMatrix();m.setMatrixAt(i,o.matrix);});first.parent.add(m);list.forEach(o=>o.removeFromParent?o.removeFromParent():o.parent.remove(o));m.instanceMatrix.needsUpdate=true;
    }
  }
};

/* First-person movement uses a circular player collider and swept substeps. */
Fuji.Navigation=class {
  constructor(camera,orbit,canvas,store,kit,cancelCamera,resetOrbit){
    Object.assign(this,{camera,orbit,canvas,store,kit,cancelCamera,resetOrbit});
    this.mode='exterior';this.radius=.19;this.eye=1.74;this.keys=new Set();this.velocity=new THREE.Vector2();
    this.yaw=0;this.pitch=0;this.path=[];this.flight=null;this.doorHold=false;this.dragging=false;
    this.hint=document.getElementById('navigation-hint');this.status=document.getElementById('mode-status');
    document.getElementById('enter-store').onclick=()=>this.enterStore();
    document.getElementById('exit-store').onclick=()=>this.exitStore();
    document.getElementById('exterior-mode').onclick=()=>this.exterior();
    document.getElementById('walk-outside').onclick=()=>this.walkOutside();
    document.getElementById('look-around').onclick=()=>this.lock();
    window.addEventListener('keydown',e=>{if(this.mode!=='walk'||e.target.closest('input,textarea,select,[contenteditable=true],#clerk-panel')||document.querySelector('#basket-panel:not([hidden])'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){this.keys.add(e.code);e.preventDefault();}if(e.code==='Escape'){this.path=[];this.keys.clear();if(document.pointerLockElement)document.exitPointerLock();}});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));
    window.addEventListener('blur',()=>{this.keys.clear();this.velocity.set(0,0);});
    document.addEventListener('pointerlockchange',()=>{this.keys.clear();this.updateUI();});
    document.addEventListener('pointerlockerror',()=>{this.hint.textContent='拖动查看方向 · WASD 行走 · Esc 释放鼠标';});
    document.addEventListener('mousemove',e=>{if(this.mode==='walk'&&document.pointerLockElement===canvas)this.look(e.movementX,e.movementY);});
    canvas.addEventListener('pointerdown',e=>{if(this.mode==='walk'){this.dragging=true;this.previous={x:e.clientX,y:e.clientY};this.path=[];}});
    canvas.addEventListener('pointermove',e=>{if(this.mode==='walk'&&this.dragging&&!document.pointerLockElement){this.look(e.clientX-this.previous.x,e.clientY-this.previous.y);this.previous={x:e.clientX,y:e.clientY};}});
    window.addEventListener('pointerup',()=>this.dragging=false);
    document.querySelectorAll('[data-move]').forEach(b=>{
      const key=b.dataset.move;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.keys.add(key);this.path=[];});
      ['pointerup','pointercancel','lostpointercapture'].forEach(event=>b.addEventListener(event,()=>this.keys.delete(key)));
    });this.updateUI();
  }
  lock(){if(this.mode==='walk'&&this.canvas.requestPointerLock){const p=this.canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}}
  look(dx,dy){this.lookTween=null;this.yaw-=dx*.0023;this.pitch=THREE.MathUtils.clamp(this.pitch-dy*.0023,-1.25,1.25);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
  syncAngles(){const e=new THREE.Euler().setFromQuaternion(this.camera.quaternion,'YXZ');this.pitch=e.x;this.yaw=e.y;}
  blocked(x,z,includeDoor=true){
    const r=this.radius;
    if(x < -10.8+r || x>10.8-r || z < -6.7+r || z>7.5-r)return true;
    for(const c of this.kit.colliders){const cx=THREE.MathUtils.clamp(x,c.minX,c.maxX),cz=THREE.MathUtils.clamp(z,c.minZ,c.maxZ);if((x-cx)**2+(z-cz)**2<r*r)return true;}
    if(includeDoor&&this.store.doorOpen<.82&&Math.abs(z-this.store.frontZ)<r+.045&&Math.abs(x-this.store.doorX)<1.02)return true;
    return false;
  }
  move(dx,dz){
    const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055));let moved=false;
    for(let i=0;i<n;i++){
      const p=this.camera.position;
      if(!this.blocked(p.x+dx/n,p.z)){p.x+=dx/n;moved=true;}
      if(!this.blocked(p.x,p.z+dz/n)){p.z+=dz/n;moved=true;}
    }this.camera.position.y=this.eye;return moved;
  }
  routeNear(target,radius=1.2){
    // Use the same grid as routeTo so rounding never puts a goal inside a shelf.
    const step=.2,origin={x:-10.6,z:-6.4},candidates=[];
    for(let ix=Math.ceil((target.x-radius-origin.x)/step);ix<=Math.floor((target.x+radius-origin.x)/step);ix++)
      for(let iz=Math.ceil((target.z-radius-origin.z)/step);iz<=Math.floor((target.z+radius-origin.z)/step);iz++){
        const x=origin.x+ix*step,z=origin.z+iz*step,d=Math.hypot(x-target.x,z-target.z);
        if(d<=radius&&!this.blocked(x,z,false))candidates.push({x,z,d});
      }
    candidates.sort((a,b)=>a.d-b.d);
    for(const point of candidates.slice(0,20))if(this.routeTo(point))return true;
    return false;
  }
  routeTo(target){
    // Grid A*: used only for the optional guided enter/exit buttons, never for WASD.
    const step=.2,origin={x:-10.6,z:-6.4},width=107,height=69;
    const cell=(x,z)=>({x:Math.round((x-origin.x)/step),z:Math.round((z-origin.z)/step)});
    const world=(x,z)=>({x:origin.x+x*step,z:origin.z+z*step});
    const start=cell(this.camera.position.x,this.camera.position.z),end=cell(target.x,target.z);
    const key=p=>p.z*width+p.x,goal=key(end),open=[{...start,cost:0,f:0}],scores=new Map([[key(start),0]]),parents=new Map(),closed=new Set();
    let found=false;
    while(open.length&&closed.size<9000){
      let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
      const cur=open.splice(best,1)[0],ck=key(cur);if(closed.has(ck))continue;if(ck===goal){found=true;break;}closed.add(ck);
      for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const n={x:cur.x+dx,z:cur.z+dz};if(n.x<0||n.z<0||n.x>=width||n.z>=height)continue;
        const nk=key(n),w=world(n.x,n.z);if(closed.has(nk)||this.blocked(w.x,w.z,false))continue;
        const cost=cur.cost+1;if(cost>=(scores.get(nk)??Infinity))continue;
        scores.set(nk,cost);parents.set(nk,ck);open.push({...n,cost,f:cost+Math.abs(n.x-end.x)+Math.abs(n.z-end.z)});
      }
    }
    if(!found){this.hint.textContent='请用 WASD 移至通道，再点击离开';return false;}
    const path=[];let cur=goal;while(cur!==key(start)){path.push(world(cur%width,Math.floor(cur/width)));cur=parents.get(cur);if(cur===undefined)return false;}
    this.path=path.reverse();this.path.push(target);this.doorHold=true;return true;
  }
  startFlight(points,onComplete,lookTarget=new THREE.Vector3(5.2,this.eye,-2)){
    this.cancelCamera();this.orbit.enabled=false;this.mode='transition';this.keys.clear();this.velocity.set(0,0);
    if(document.pointerLockElement)document.exitPointerLock();
    this.lookTween=null;
    this.flight={points:[this.camera.position.clone(),...points],index:0,time:0,onComplete,lookTarget,startFov:this.camera.fov,startQuaternion:this.camera.quaternion.clone()};this.updateUI();
  }
  enterStore(){
    if(this.mode==='walk'){this.routeTo({x:5.2,z:.8});return;}
    if(this.mode==='transition')return;
    this.startFlight([new THREE.Vector3(5.25,3.8,8),new THREE.Vector3(5.25,this.eye,7.2)],()=>{
      this.mode='walk';this.camera.fov=67;this.camera.updateProjectionMatrix();this.syncAngles();this.routeTo({x:5.2,z:.8});this.updateUI();
    });
  }
  walkOutside(){
    if(this.mode!=='exterior')return;
    this.startFlight([new THREE.Vector3(7.9,3.8,7.2),new THREE.Vector3(7.9,this.eye,6.7)],()=>{
      this.mode='walk';this.camera.fov=67;this.camera.updateProjectionMatrix();this.syncAngles();this.updateUI();
    },new THREE.Vector3(4,this.eye,1));
  }
  exitStore(){if(this.mode==='walk')this.routeTo({x:7.5,z:3.15});}
  exterior(){
    this.flight=null;this.lookTween=null;this.path=[];this.doorHold=false;this.mode='exterior';this.keys.clear();this.velocity.set(0,0);
    if(document.pointerLockElement)document.exitPointerLock();this.orbit.enabled=true;this.camera.fov=this.camera.aspect<1?65:35.5;this.camera.updateProjectionMatrix();this.updateUI();this.resetOrbit();
  }
  updateUI(){
    const walk=this.mode==='walk';document.body.classList.toggle('walk-mode',walk);document.body.classList.toggle('transition-mode',this.mode==='transition');
    document.getElementById('enter-store').disabled=this.mode==='transition';
    this.status.textContent=walk?'步行浏览':this.mode==='transition'?'正在前往入口':'室外环绕';
    this.hint.textContent=walk?'WASD 行走 · 拖动或锁定鼠标转头 · Esc 释放':'拖动 360° 环绕 · 滚轮缩放 · 点击正门进入';
    document.getElementById('look-around').textContent=document.pointerLockElement?'Esc · Release mouse':'Mouse look';
  }
  updateDoor(dt){
    const p=this.camera.position,near=Math.abs(p.x-this.store.doorX)<1.7&&Math.abs(p.z-this.store.frontZ)<2.0&&p.y<2.8;
    const want=near||this.doorHold;this.store.doorOpen=THREE.MathUtils.lerp(this.store.doorOpen,want?1:0,1-Math.exp(-dt*4.3));
    this.store.doors.forEach(d=>d.object.position.x=d.closed+d.sign*.96*this.store.doorOpen);
    if(this.mode==='exterior'&&near&&p.z>2.1&&this.store.doorOpen>.85){this.cancelCamera();this.orbit.enabled=false;this.mode='walk';p.y=this.eye;this.camera.fov=67;this.camera.updateProjectionMatrix();this.syncAngles();this.updateUI();}
  }
  update(dt){
    this.updateDoor(dt);
    if(this.flight){
      const f=this.flight;f.time+=dt;const raw=Math.min(1,f.time/1.05),t=raw*raw*(3-2*raw);
      this.camera.position.lerpVectors(f.points[f.index],f.points[f.index+1],t);
      this.camera.lookAt(f.lookTarget);
      const targetQuaternion=this.camera.quaternion.clone();
      this.camera.quaternion.copy(f.startQuaternion).slerp(targetQuaternion,t);
      const progress=(f.index+t)/(f.points.length-1);
      this.camera.fov=THREE.MathUtils.lerp(f.startFov,67,progress);this.camera.updateProjectionMatrix();
      if(raw===1){f.index++;f.time=0;f.startQuaternion.copy(this.camera.quaternion);if(f.index===f.points.length-1){this.flight=null;f.onComplete();}}
      return;
    }
    if(this.mode!=='walk')return;
    if(this.keys.size){this.path=[];this.lookTween=null;}
    if(this.lookTween){
      const a=this.lookTween;a.time+=dt;const t=Math.min(1,a.time/.8);
      this.camera.quaternion.slerpQuaternions(a.from,a.to,t*t*(3-2*t));this.syncAngles();if(t===1)this.lookTween=null;
    }
    if(this.path.length){
      const p=this.path[0],dx=p.x-this.camera.position.x,dz=p.z-this.camera.position.z,dist=Math.hypot(dx,dz);
      if(dist<.055)this.path.shift();else this.move(dx/dist*Math.min(dist,dt*1.05),dz/dist*Math.min(dist,dt*1.05));
      if(!this.path.length){
        this.doorHold=false;const from=this.camera.quaternion.clone();this.camera.lookAt(this.destinationLook||new THREE.Vector3(-.4,1.4,-2));this.destinationLook=null;
        this.lookTween={from,to:this.camera.quaternion.clone(),time:0};this.camera.quaternion.copy(from);this.syncAngles();this.updateUI();
      }
    }else{
      this.doorHold=false;
      const z=Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'));
      const x=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));
      const input=new THREE.Vector2(x,z);if(input.length()>1)input.normalize();input.multiplyScalar(1.25);
      this.velocity.lerp(input,1-Math.exp(-dt*(input.length()?7:10)));
      const dx=(Math.cos(this.yaw)*this.velocity.x+Math.sin(this.yaw)*this.velocity.y)*dt;
      const dz=(-Math.sin(this.yaw)*this.velocity.x+Math.cos(this.yaw)*this.velocity.y)*dt;this.move(dx,dz);
    }
  }
};

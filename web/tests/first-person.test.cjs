'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const THREE=require('../vendor/three.min.js');
function setup(){
 const nodes=new Map(),removed=[],opened={count:0},state={chatOpen:false};
 const document={createElement:()=>({hidden:false}),getElementById:()=>({append(node){nodes.set(node.id,node);}}),body:{classList:{contains:()=>state.chatOpen}}};
 const Fuji={clerk:{open(){opened.count++;}}};
 const scope={THREE,Fuji,document,localStorage:{removeItem:key=>removed.push(key),getItem(){throw Error('Obsolete viewpoint preferences must not be read.');}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/store-clerk.js'),'utf8'),scope);
 const camera=new THREE.PerspectiveCamera(67,1,.035,160);camera.position.set(4.1,1.74,.75);
 const ctx={scene:new THREE.Scene(),camera,navigation:{camera,mode:'walk'}};
 const api=Fuji.installStoreClerk(ctx);
 return {ctx,api,nodes,removed,opened,state};
}
test('only the cashier is installed; navigation and rendering share one camera',()=>{
 const {ctx,api,nodes,removed}=setup();
 assert.equal(ctx.navigation.camera,ctx.camera);
 assert.equal(api.layer.children.length,1);
 assert.equal(api.clerk.name,'FUJI_CHARACTER_CLERK');
 assert.deepEqual([...nodes.keys()],['clerk-nearby']);
 assert.deepEqual(removed,['fuji-character','fuji-view']);
});
test('cashier updates cannot pull the walking view into a follow camera',()=>{
 const {ctx,api}=setup();ctx.camera.position.set(-3.9,1.74,-.75);ctx.camera.rotation.set(.1,.7,0,'YXZ');
 const position=ctx.camera.position.clone(),rotation=ctx.camera.quaternion.clone();
 api.update(.1);
 assert.ok(ctx.camera.position.equals(position));assert.ok(ctx.camera.quaternion.equals(rotation));
 assert.equal(ctx.camera.view,null);assert.equal(ctx.camera.fov,67);
});
test('nearby cashier entry works in walking mode and hides while chat is open',()=>{
 const {ctx,api,nodes,opened,state}=setup();const talk=nodes.get('clerk-nearby');
 api.update();assert.equal(talk.hidden,true);
 ctx.camera.position.set(-3.9,1.74,-.75);api.update();assert.equal(talk.hidden,false);
 talk.onclick();assert.equal(opened.count,1);
 state.chatOpen=true;api.update();assert.equal(talk.hidden,true);
 state.chatOpen=false;ctx.navigation.mode='exterior';api.update();assert.equal(talk.hidden,true);
});

/* Independent Blender MCP-verified fried-food asset; preserve coffee v11 and oden. */
window.Fuji=window.Fuji||{};
Fuji.installFriedStation=async function(root,layout){
  const old=root.getObjectByName('CHECKOUT_V10_FRIED_STATION');
  if(!old)throw Error('Previous fried-food station missing');
  const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/fried-station-v12.glb?v=12-final',resolve,undefined,reject));
  if(!asset.scene.getObjectByName('FRIED_V12_ROOT'))throw Error('Fried-food asset root missing');
  old.parent.remove(old);root.add(asset.scene);root.updateMatrixWorld(true);
  layout.colliders=layout.colliders.filter(c=>c.name!=='HOT_SERVICE');
  layout.colliders.push({name:'HOT_SERVICE',minX:-5.693,maxX:-4.99,minZ:-3.34,maxZ:-2.34});
  layout.fried={version:'fried-v12',source:'models/fried-station-v12.glb',longitudinal:1,depth:.70};
  root.userData.fried=layout.fried;
};

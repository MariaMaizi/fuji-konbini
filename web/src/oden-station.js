/* Reference-built oden v13, verified in live Blender MCP. */
window.Fuji=window.Fuji||{};
Fuji.installOdenStation=async function(root,layout){
  const old=root.getObjectByName('CHECKOUT_V10_ODEN_STATION');
  if(!old)throw Error('Previous oden station missing');
  const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/oden-v16-clean-posts.glb?v=16',resolve,undefined,reject));
  if(!asset.scene.getObjectByName('ODEN_V13_ROOT'))throw Error('Oden asset root missing');
  old.parent.remove(old);root.add(asset.scene);root.updateMatrixWorld(true);
  // The original category flag intersects the new menu; coffee v11 has its own sign.
  const legacy=root.getObjectByName('SIGN_COFFEE_BAR');if(legacy)legacy.parent.remove(legacy);
  layout.colliders=layout.colliders.filter(c=>c.name!=='ODEN_SERVICE');
  layout.colliders.push({name:'ODEN_SERVICE',minX:-5.690,maxX:-4.987,minZ:-4.33,maxZ:-3.39});
  layout.oden={version:'oden-v16-clean-posts',source:'models/oden-v16-clean-posts.glb',removedRearPosts:2,longitudinal:.94,depth:.70,worktop:1.0525,signTop:2.21};
  root.userData.oden=layout.oden;
};

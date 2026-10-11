/* Additive, Blender-authored coffee replacement; the checkout-v10 asset is preserved. */
window.Fuji=window.Fuji||{};
Fuji.installCoffeeStation=async function(root,layout){
  const old=root.getObjectByName('CHECKOUT_V10_CAFE_STATION');
  if(!old)throw Error('Cannot locate previous coffee station for replacement');
  const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/coffee-v14-supported.glb?v=14',resolve,undefined,reject));
  const coffee=asset.scene.getObjectByName('COFFEE_V11_ROOT');
  if(!coffee)throw Error('Coffee asset root is missing');
  old.parent.remove(old);
  root.add(asset.scene);
  root.updateMatrixWorld(true);
  layout.colliders=layout.colliders.filter(c=>c.name!=='COFFEE_AREA');
  layout.colliders.push({name:'COFFEE_AREA',minX:-5.58,maxX:-3.38,minZ:-5.21,maxZ:-4.47});
  layout.coffee={version:'coffee-v14-supported',source:'models/coffee-v14-supported.glb',width:2.2,position:[-4.48,0,-4.84]};
  root.userData.coffee=layout.coffee;
};

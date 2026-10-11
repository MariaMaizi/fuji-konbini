/* Only the retained v22 floor. Rejected pendant/sign/timber/plant decoration was removed in v27. */
window.Fuji=window.Fuji||{};
Fuji.installAmbience=async function(root,layout,scene){
 const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/floor-v27.glb?v=27.1',resolve,undefined,reject));
 const decor=asset.scene.getObjectByName('AMBIENCE_V22_ROOT');
 if(!decor||!root.getObjectByName('SWEETS_V21_ROOT'))throw Error('Ambience requires the complete sweets-v21 scene');
 root.add(asset.scene);
 root.updateMatrixWorld(true);
 layout.ambience={version:'cleanup-v27',additive:true,floorTiles:288,pendants:0,artwork:0,plants:0,timber:0,originalGeometryPreserved:true};
 root.userData.ambience=layout.ambience;
};

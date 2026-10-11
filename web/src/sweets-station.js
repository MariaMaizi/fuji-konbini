/* Sweets v21 stocks only the formerly empty east face of the unchanged v16 rack. */
window.Fuji=window.Fuji||{};
Fuji.installSweetsStation=async function(root,layout){
 const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/sweets-v21.glb?v=21.2',resolve,undefined,reject));
 const station=asset.scene.getObjectByName('SWEETS_V21_ROOT');
 if(!station||!root.getObjectByName('SNACKS_V16_ROOT'))throw Error('Sweets fixture or overlay missing');
 const entries=new Set(),layers={1:0,2:0,3:0,4:0};let packages=0;
 station.traverse(o=>{const d=o.userData;if(d.reference_image&&d.reference_item){entries.add(`${d.reference_image}:${d.reference_item}`);packages++;layers[d.display_layer]++;}});
 if(entries.size!==64||packages!==388)throw Error('Sweets reference coverage incomplete');
 root.add(asset.scene);root.updateMatrixWorld(true);
 layout.sweets={version:'sweets-v21',referenceEntries:64,packages,layers,originalFixturePreserved:true,side:'east'};
 if(layout.snacks){layout.snacks.emptySide=null;layout.snacks.eastFace='sweets-v21';}
 root.userData.sweets=layout.sweets;
};

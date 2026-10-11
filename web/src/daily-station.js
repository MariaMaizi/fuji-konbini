/* Daily goods v19: preserves the shared gondola and the noodle face. */
window.Fuji=window.Fuji||{};
Fuji.installDailyStation=async function(root,layout){
 const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/daily-v19.glb?v=19.2',resolve,undefined,reject));
 const station=asset.scene.getObjectByName('DAILY_V19_ROOT');if(!station)throw Error('Daily goods v19 root missing');
 const entries=new Set(),layers={1:0,2:0,3:0,4:0};let packages=0,hanging=0;
 station.traverse(o=>{const d=o.userData;if(d.reference_image&&d.reference_item){entries.add(`${d.reference_image}:${d.reference_item}`);packages++;layers[d.display_layer]++;if(d.display_method==='peg_hook')hanging++;}});
 if(entries.size!==78||packages!==245||hanging!==27)throw Error('Daily reference coverage incomplete');
 for(const name of JSON.parse(station.userData.replaced_nodes)){const old=root.getObjectByName(name);if(old)old.parent.remove(old);}
 root.add(asset.scene);root.updateMatrixWorld(true);
 layout.daily={version:'daily-v19',referenceEntries:78,packages,layers,hangingToothbrushPacks:hanging,noodleFacePreserved:!!root.getObjectByName('INSTANT_AISLE_-1')};
 root.userData.daily=layout.daily;
};

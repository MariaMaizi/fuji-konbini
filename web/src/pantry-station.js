/* Pantry v20: only replace the legacy assortment, never the shared shelf. */
window.Fuji=window.Fuji||{};
Fuji.installPantryStation=async function(root,layout){
 const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/pantry-v20.glb?v=20.2',resolve,undefined,reject));
 const station=asset.scene.getObjectByName('PANTRY_V20_ROOT');if(!station)throw Error('Pantry root missing');
 const entries=new Set(),layers={1:0,2:0,3:0,4:0};let packages=0;
 station.traverse(o=>{const d=o.userData;if(d.reference_image&&d.reference_item){entries.add(`${d.reference_image}:${d.reference_item}`);packages++;layers[d.display_layer]++;}});
 if(entries.size!==48||packages!==275)throw Error('Pantry reference coverage incomplete');
 for(const name of JSON.parse(station.userData.replaced_nodes)){const old=root.getObjectByName(name);if(old)old.parent.remove(old);}
 root.add(asset.scene);root.updateMatrixWorld(true);
 layout.pantry={version:'pantry-v20',referenceEntries:entries.size,packages,layers,originalShelfPreserved:!!root.getObjectByName('SHELF_03')};
 root.userData.pantry=layout.pantry;
};

/* Five-shelf refrigerated case authored in Blender; 100 reference entries. */
window.Fuji=window.Fuji||{};
Fuji.installChilledStation=async function(root,layout){
 const asset=await new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/chilled-v18.glb?v=18.4',resolve,undefined,reject));
 const station=asset.scene.getObjectByName('CHILL_V18_ROOT');if(!station)throw Error('Chilled cabinet root missing');
 const entries=new Set(),layers={1:0,2:0,3:0,4:0,5:0};let packages=0;
 station.traverse(o=>{const d=o.userData;if(d.reference_sheet&&d.reference_item){entries.add(`${d.reference_sheet}:${d.reference_item}`);packages++;layers[d.display_layer]++;}});
 if(entries.size!==100||packages!==135)throw Error('Chilled product catalog incomplete');
 const old=root.getObjectByName('CHILLED_READY_MEALS_ZONE');if(old)old.parent.remove(old);
 root.add(asset.scene);root.updateMatrixWorld(true);
 layout.colliders=layout.colliders.filter(c=>c.name!=='CHILLED_MEALS');
 layout.colliders.push({name:'CHILLED_MEALS',minX:6.211,maxX:6.826,minZ:-3.20,maxZ:-1.40});
 layout.chilled={version:'chilled-v18',referenceEntries:entries.size,packages,layers,source:'models/chilled-v18.glb'};
 root.userData.chilled=layout.chilled;
};

window.Fuji=window.Fuji||{};
Fuji.installSnacksStation=async function(root,layout){
 const [asset,oldNames]=await Promise.all([
  new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/snacks-v16.glb?v=16',resolve,undefined,reject)),
  fetch('models/replaced-nodes.json?v=snacks14').then(r=>{if(!r.ok)throw Error('Snacks replacement manifest missing');return r.json();})
 ]);
 const snacks=asset.scene.getObjectByName('SNACKS_V16_ROOT');if(!snacks)throw Error('Snacks v16 root missing');
 const skus=new Set(),retained=new Set(),types=new Set();let packages=0;
 snacks.traverse(o=>{const d=o.userData;if(d.new_sku){skus.add(d.new_sku);types.add(d.package_type);packages++;}if(d.retained_sku){retained.add(d.retained_sku);packages++;}});
 if(skus.size!==64||retained.size!==12)throw Error('Snacks catalog incomplete: '+skus.size+' new / '+retained.size+' retained');
 const empty=snacks.getObjectByName('SNACKS_V16_EMPTY_EAST');let emptyStock=0;empty.traverse(o=>{if(o.userData.sku||o.userData.new_sku)emptyStock++;});if(emptyStock)throw Error('Reserved shelf face must be empty');
 for(const name of oldNames){const o=root.getObjectByName(name);if(o)o.parent.remove(o);}
 root.add(asset.scene);root.updateMatrixWorld(true);
 layout.snacks={version:'snacks-v16',newSkus:skus.size,retainedSkus:retained.size,uniqueSkus:skus.size+retained.size,packages,packageTypes:[...types],emptySide:'east',fixture:'SHELF_02 matching noodle/bakery',source:'models/snacks-v16.glb'};
 root.userData.snacks=layout.snacks;
 // Same fixture geometry and footprint as SHELF_02; existing aisle collision remains.
};

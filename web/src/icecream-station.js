/* Reference-built two-level freezer. Original products are retained as UV artwork. */
window.Fuji=window.Fuji||{};
Fuji.installIcecreamStation=async function(root,layout){
 const [asset,oldNames]=await Promise.all([
  new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/icecream-v17.glb?v=17.2',resolve,undefined,reject)),
  fetch('models/icecream-replaced-nodes.json?v=15').then(r=>{if(!r.ok)throw Error('Icecream replacement manifest missing');return r.json();})
 ]);
 const station=asset.scene.getObjectByName('ICE_V15_ROOT');if(!station)throw Error('Icecream root missing');
 const skus=new Set(),hd=new Set(),smoothies=new Set(),baskets=new Map();let packages=0;
 station.traverse(o=>{
  const d=o.userData;
  if(Number.isInteger(d.basket)&&d.ice_sku){skus.add(d.ice_sku);packages++;if(!baskets.has(d.basket))baskets.set(d.basket,new Set());baskets.get(d.basket).add(d.ice_sku);}
  if(d.hd_flavor)hd.add(d.hd_flavor);
  if(d.smoothie_flavor)smoothies.add(d.smoothie_flavor);
 });
 if(skus.size!==32||hd.size!==20||smoothies.size!==10||baskets.size!==12)throw Error('Icecream product catalog incomplete');
 if([...baskets.values()].some(s=>s.size<2||s.size>3))throw Error('Icecream basket grouping invalid');
 for(const name of oldNames){const o=root.getObjectByName(name);if(o)o.parent.remove(o);}
 root.add(asset.scene);root.updateMatrixWorld(true);
 // Blender XYZ -> browser X,-Z,Y; collision follows the wider replacement cabinet.
 layout.colliders=layout.colliders.filter(c=>c.name!=='FREEZER');
 layout.colliders.push({name:'FREEZER',minX:4.4475,maxX:5.96,minZ:-5.1065,maxZ:-4.293});
 layout.icecream={version:'icecream-v17',uniqueSkus:skus.size,packages,baskets:baskets.size,hdFlavors:[...hd],smoothieFlavors:[...smoothies],source:'models/icecream-v17.glb'};
 root.userData.icecream=layout.icecream;
};

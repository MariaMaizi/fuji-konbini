/* Blender-authored static world. Pinned Three.js r128; no procedural duplicates. */
window.Fuji = window.Fuji || {};
Fuji.loadBlenderScene = async function(scene,renderer,onProgress) {
  const [gltf,layout]=await Promise.all([
    new Promise((resolve,reject)=>new THREE.GLTFLoader().load('models/fuji-checkout-v10.glb?v=5cbc0b02',resolve,onProgress,reject)),
    fetch('models/checkout-layout-v10.json?v=checkout-v10').then(r=>{if(!r.ok)throw Error('Missing checkout-layout-v10.json');return r.json();})
  ]);
  const root=gltf.scene;root.name='BLENDER_WORLD';scene.add(root);root.updateMatrixWorld(true);
  await Fuji.installCoffeeStation(root,layout);
  await Fuji.installFriedStation(root,layout);
  await Fuji.installOdenStation(root,layout);
  await Fuji.installSnacksStation(root,layout);
  await Fuji.installIcecreamStation(root,layout);
  await Fuji.installChilledStation(root,layout);
  await Fuji.installDailyStation(root,layout);
  await Fuji.installPantryStation(root,layout);
  await Fuji.installSweetsStation(root,layout);
  await Fuji.installAmbience(root,layout,scene);
  const find=name=>{const o=root.getObjectByName(name);if(!o)throw Error('Blender node missing: '+name);return o;};
  const store=find('STORE'),fuji=find('FUJI');store.userData.action='store';fuji.userData.action='fuji';
  const kit=new Fuji.Kit(renderer);kit.colliders=layout.colliders;
  const materials=new Set(),signs=[],wet=[],glassMaterials=[];
  root.traverse(o=>{
    if(!o.isMesh)return;
    for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
    let p=o,isProduct=false;while(p){if(p.userData.no_shadow||/PRODUCTS_CATEGORIZED|CHILLED_READY_MEALS|VENDING_MACHINE_DETAIL/.test(p.name))isProduct=true;p=p.parent;}
    o.castShadow=!isProduct&&!/WINDOW|GLASS|LIGHT|LABEL|PRICE|PACKAG|FOLIAGE/.test(o.name);
    o.receiveShadow=true;
  });
  // Paper and glossy variants retain separate PBR materials but share the same
  // decoded atlas when the glTF image, sampler and UV transform are identical.
  const drinkMaps=new Map();
  const materialDefs=new Map((gltf.parser.json.materials||[]).map(m=>[m.name,m]));
  for(const m of materials){
    const def=materialDefs.get(m.name),ti=def&&def.pbrMetallicRoughness&&def.pbrMetallicRoughness.baseColorTexture;
    if(/^(DRINK_|INSTANT_V[67]_|BAKERY_V8_|CHECKOUT_V(?:9|10)_)/.test(m.name)&&m.map&&ti){
      const t=gltf.parser.json.textures[ti.index];
      const key=JSON.stringify([t.source,t.sampler,ti.texCoord||0,ti.extensions||null,m.map.encoding,m.map.flipY]);
      if(drinkMaps.has(key))m.map=drinkMaps.get(key);else drinkMaps.set(key,m.map);
    }
    if(m.map)m.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    if(m.transparent){m.depthWrite=false;m.side=THREE.DoubleSide;if(/STORE_BACK_WINDOW|ClearFilm/.test(m.name))glassMaterials.push(m);}
    if(/FASCIA_BRAND_STRIPE|7_ELEVEN_LOGO|VENDING_DISPLAY_LIGHT/.test(m.name))signs.push(m);
    if(m.name==='GROUND_ASPHALT')wet.push(m);
    if(/VENDING_DISPLAY_LIGHT/.test(m.name))m.emissiveIntensity=1.05;
    // The r128 loader predates emissive_strength; restore selected luminous surfaces.
    if(/CEILING_LINEAR_LIGHT|EAVE_LINEAR_LIGHT|FRIDGE_LED|WARMER_LIGHT/.test(m.name))m.emissiveIntensity=1.2;
    if(/CAR_Glass/.test(m.name)){m.side=THREE.DoubleSide;m.envMapIntensity=.4;}
  }
  const glass=find('STORE_WINDOWS_0').material;
  glass.transparent=true;glass.opacity=.115;glass.depthWrite=false;glass.side=THREE.DoubleSide;
  const mountain=find('FUJI_BODY').material;fuji.userData.material=mountain;
  // Preserve the previous mountain's atmospheric depth, not its old runtime geometry.
  mountain.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#ifdef USE_FOG
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth * 0.3249 );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
  #endif`);};
  const lamps=[];[[-4.8,-1.6],[0,-2],[4.8,-1.6]].forEach(([x,z],i)=>{
    const l=new THREE.PointLight(0xffead1,.75,9,1.5);l.position.set(x,2.45,z);l.name='INTERIOR_LIGHT_'+i;scene.add(l);lamps.push(l);
  });
  const streetLights=[];[[-8.8,3.3,1.1],[8.8,3.3,1.1],[8.05,1.55,2.1]].forEach((v,i)=>{
    const l=new THREE.PointLight(i===2?0xc4e6ff:0xffe6b5,0,i===2?3:5.5,2);l.position.set(...v);scene.add(l);streetLights.push(l);
  });
  const doors=[['STORE_DOOR_LEFT',-1],['STORE_DOOR_RIGHT',1]].map(([name,sign])=>{
    const object=find(name);return {object,sign,closed:object.position.x};
  });
  const puddles=[];root.traverse(o=>{if(o.isMesh&&/^RAIN_PUDDLE/.test(o.name)){o.material.depthWrite=false;puddles.push(o);}});
  const originalMeshCount=[];root.traverse(o=>{if(o.isMesh)originalMeshCount.push(o);});
  // Merge static primitives by shared material + semantic root. Blender remains fully
  // editable; only the in-memory draw representation is batched. Sliding door nodes
  // and mountain retain their exact hierarchy and transforms.
  const batches=new Map(),proxies=[];
  const semantic=[store,find('VENDING_MACHINE_DETAIL'),find('MIDGROUND_NEIGHBORHOOD'),find('PARKING_FOUR_BAYS'),...['CAR_01','CAR_02','CAR_03'].map(find)];
  for(const o of originalMeshCount){
    let ancestor=o,skip=false,batchRoot=root;
    while(ancestor&&ancestor!==root){
      if(doors.some(d=>d.object===ancestor)||ancestor===fuji||/^RAIN_PUDDLE/.test(ancestor.name))skip=true;
      if(semantic.includes(ancestor))batchRoot=ancestor;
      ancestor=ancestor.parent;
    }
    if(skip)continue;
    const source=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
    if(!source.attributes.normal)source.computeVertexNormals();
    const count=source.attributes.position.count;
    const groups=Array.isArray(o.material)?source.groups:[{start:0,count,materialIndex:0}];
    for(const range of groups){
      const material=Array.isArray(o.material)?o.material[range.materialIndex]:o.material;
      const key=[batchRoot.uuid,material.uuid,o.castShadow?1:0].join('/');
      if(!batches.has(key))batches.set(key,{root:batchRoot,material,cast:o.castShadow,geometries:[]});
      const g=new THREE.BufferGeometry();
      for(const attrName of ['position','normal','uv']){
        const input=source.getAttribute(attrName),stride=attrName==='uv'?2:3;
        const data=new Float32Array(range.count*stride);
        if(input)for(let i=0;i<range.count;i++)for(let j=0;j<stride;j++)data[i*stride+j]=input.array[(range.start+i)*input.itemSize+j];
        g.setAttribute(attrName,new THREE.BufferAttribute(data,stride));
      }
      g.applyMatrix4(new THREE.Matrix4().copy(batchRoot.matrixWorld).invert().multiply(o.matrixWorld));
      batches.get(key).geometries.push(g);
    }
    source.dispose();proxies.push(o);
  }
  for(const b of batches.values()){
    const geometry=THREE.BufferGeometryUtils.mergeBufferGeometries(b.geometries,false);
    if(!geometry)throw Error('Static batch failed: '+b.material.name);
    const m=new THREE.Mesh(geometry,b.material);m.name='BATCH_'+b.root.name+'_'+b.material.name;m.castShadow=b.cast;m.receiveShadow=true;b.root.add(m);
    b.geometries.forEach(g=>g.dispose());
  }
  // Keep semantic nodes as non-rendering anchors for inspection and future edits.
  for(const o of proxies){const anchor=new THREE.Object3D();anchor.name=o.name;anchor.userData={...o.userData,batched:true};anchor.position.copy(o.position);anchor.quaternion.copy(o.quaternion);anchor.scale.copy(o.scale);o.parent.add(anchor);o.parent.remove(o);}
  const reflectionTarget=new THREE.WebGLCubeRenderTarget(128),reflectionCamera=new THREE.CubeCamera(.1,160,reflectionTarget);
  reflectionCamera.position.set(0,1.8,2.8);store.visible=false;reflectionCamera.update(renderer,scene);store.visible=true;
  glass.envMap=reflectionTarget.texture;glass.envMapIntensity=.14;glass.needsUpdate=true;
  for(const m of materials)if(/CAR_Glass/.test(m.name)){m.envMap=reflectionTarget.texture;m.needsUpdate=true;}
  // Count embedded image sources, not duplicated Three texture wrappers used by paper/PET materials.
  const drinkImageSources=new Set();
  for(const m of gltf.parser.json.materials||[]){
    const t=m.pbrMetallicRoughness&&m.pbrMetallicRoughness.baseColorTexture;
    if(m.name&&m.name.startsWith('DRINK_')&&t)drinkImageSources.add(gltf.parser.json.textures[t.index].source);
  }
  root.userData.assetReport={source:'Blender 4.5 LTS',asset:'models/fuji-checkout-v10.glb',originalMeshes:originalMeshCount.length,batches:batches.size,embeddedDrinkAtlasCount:drinkImageSources.size,layout};
  return {root,kit,store:{group:store,glass,glows:signs,lamps,doors,doorX:5.25,frontZ:2.08,room:find('STORE_INTERIOR'),doorOpen:0},fuji,parkingMaterial:[...materials].find(m=>m.name==='GROUND_ASPHALT'),signs,streetLights,puddles,wet,glassMaterials};
};

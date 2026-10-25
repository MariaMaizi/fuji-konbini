/* FUJI KONBINI — procedural Three.js miniature diorama */
(function () {
  'use strict';

  const canvas = document.getElementById('scene');
  const loading = document.getElementById('loading');
  const objectLabel = document.getElementById('object-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let scene, camera, renderer, controls, clock;
  let kit, detailedStore, navigation;
  let clerkUI;
  let sunLight, hemiLight, moonLight;
  let storeGroup, fujiGroup, rainSystem, starSystem, cloudGroup;
  let parkingMaterial, storeGlowMaterial, signGlowMaterials = [], streetLights = [], interiorLights = [];
  let puddles = [];
  let introActive = !reduceMotion;
  let introElapsed = 0;
  let cameraTween = null;
  let hoverTarget = null;
  let pointerDown = null;
  const interactive = [];
  const pointer = new THREE.Vector2(99, 99);
  const raycaster = new THREE.Raycaster();
  const currentWeather = { mode: 'sunny', progress: 1 };
  const weatherState = {};

  const C = {
    sky: 0xb8ccec,
    skyRain: 0x788b9b,
    skyNight: 0x071426,
    ink: 0x26343f,
    base: 0xe8e1d5,
    asphalt: 0x35434c,
    asphaltWet: 0x202d35,
    snow: 0xeaf2f5,
    mountain: 0x466d8b,
    mountainNight: 0x1c354c,
    white: 0xf3efe6,
    green: 0x1c7b45,
    orange: 0xe4772d,
    red: 0xd63e32,
    warm: 0xffd884,
    glass: 0x9db6be,
    brick: 0x9f5f4c
  };

  const defaultView = {
    position: new THREE.Vector3(.4, 4.8, 28.8),
    target: new THREE.Vector3(-.35, 4.45, -3)
  };

  const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness === undefined ? 0.78 : opts.roughness,
    metalness: opts.metalness || 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity === undefined ? 1 : opts.opacity,
    emissive: opts.emissive || 0x000000,
    emissiveIntensity: opts.emissiveIntensity || 0,
    side: opts.side || THREE.FrontSide,
    depthWrite: opts.depthWrite === undefined ? true : opts.depthWrite,
    flatShading: !!opts.flatShading
  });

  function mesh(geometry, material, name, cast = true, receive = true) {
    const result = new THREE.Mesh(geometry, material);
    result.name = name || '';
    result.castShadow = cast;
    result.receiveShadow = receive;
    return result;
  }

  function box(w, h, d, material, name, cast = true, receive = true) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, name, cast, receive);
  }

  function cylinder(rt, rb, h, seg, material, name) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material, name);
  }

  function roundedShape(w, h, r) {
    const s = new THREE.Shape();
    const rr = Math.min(r, w / 2, h / 2);
    s.moveTo(rr, 0); s.lineTo(w - rr, 0); s.quadraticCurveTo(w, 0, w, rr);
    s.lineTo(w, h - rr); s.quadraticCurveTo(w, h, w - rr, h);
    s.lineTo(rr, h); s.quadraticCurveTo(0, h, 0, h - rr);
    s.lineTo(0, rr); s.quadraticCurveTo(0, 0, rr, 0);
    return s;
  }

  function roundedBox(w, h, d, radius, material, name, bevel = 0.06) {
    const g = new THREE.ExtrudeGeometry(roundedShape(w, h, radius), {
      depth: d,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 4
    });
    g.translate(-w / 2, -h / 2, -d / 2);
    g.computeVertexNormals();
    return mesh(g, material, name);
  }

  function makeTextTexture(lines, options = {}) {
    const width = options.width || 512;
    const height = options.height || 256;
    const cvs = document.createElement('canvas');
    cvs.width = width; cvs.height = height;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = options.background || '#f4edcf';
    ctx.fillRect(0, 0, width, height);
    if (options.border) {
      ctx.strokeStyle = options.border;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, width - 10, height - 10);
    }
    const lineList = Array.isArray(lines) ? lines : [lines];
    const fontSize = options.fontSize || Math.floor(height / (lineList.length + .65));
    ctx.textAlign = options.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${options.weight || 800} ${fontSize}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.fillStyle = options.color || '#202a31';
    lineList.forEach((line, i) => {
      const x = options.align === 'left' ? 28 : width / 2;
      const y = height * (i + 1) / (lineList.length + 1);
      ctx.fillText(line, x, y);
    });
    const texture = new THREE.CanvasTexture(cvs);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    return texture;
  }

  function makeLogoTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 320; cvs.height = 220;
    const ctx = cvs.getContext('2d');
    ctx.fillStyle = '#f6f3e9'; ctx.fillRect(0, 0, 320, 220);
    ctx.fillStyle = '#e54735';
    ctx.font = '900 150px Arial Black, Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('7', 160, 90);
    ctx.fillStyle = '#167a45';
    ctx.font = '800 46px Arial';
    ctx.fillText('ELEVEN', 160, 176);
    const tx = new THREE.CanvasTexture(cvs);
    tx.encoding = THREE.sRGBEncoding;
    return tx;
  }

  function addPlaneLabel(parent, texture, w, h, position, name, emissive = false) {
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: .6,
      emissive: emissive ? 0xffffff : 0x000000,
      emissiveMap: emissive ? texture : null,
      emissiveIntensity: emissive ? .08 : 0
    });
    if (emissive) signGlowMaterials.push(material);
    const label = mesh(new THREE.PlaneGeometry(w, h), material, name, false, false);
    label.position.copy(position);
    parent.add(label);
    return label;
  }

  async function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.sky);
    scene.fog = new THREE.FogExp2(C.sky, 0.006);
    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.physicallyCorrectLights = false;

    setupCamera();
    setupLights();
    setupControls();
    const world=await Fuji.loadBlenderScene(scene,renderer,event=>{
      const p=loading.querySelector('p');if(p)p.textContent=event.total?`加载 Blender 场景 · ${Math.round(event.loaded/event.total*100)}%`:'加载 Blender 场景';
    });
    kit=world.kit;detailedStore=world.store;storeGroup=detailedStore.group;fujiGroup=world.fuji;
    storeGlowMaterial=detailedStore.glass;parkingMaterial=world.parkingMaterial;
    signGlowMaterials=world.signs;streetLights=world.streetLights;interiorLights=detailedStore.lamps;puddles=world.puddles;
    cloudGroup=new THREE.Group();cloudGroup.visible=false;scene.add(cloudGroup);
    interactive.push(storeGroup,fujiGroup);
    navigation = new Fuji.Navigation(camera, controls, canvas, detailedStore, kit,
      () => { introActive=false; cameraTween=null; },
      () => tweenCamera(defaultView.position, defaultView.target, 1.4));
    createRain();
    createStars();
    setupUI();
    setupRaycaster();
    const requestedWeather = new URLSearchParams(window.location.search).get('weather');
    if (presets[requestedWeather]) {
      setWeather(requestedWeather);
      Object.assign(weatherState, presets[requestedWeather]);
      currentWeather.progress = 1;
    }
    onResize();
    // Full-store deep link: normal walking controls, starting at the updated rack.
    if(new URLSearchParams(location.search).get('show')==='sweets'){
      navigation.cancelCamera();navigation.mode='walk';navigation.path=[];
      controls.enabled=false;camera.position.set(-.90,navigation.eye,-1.35);
      camera.lookAt(-2.45,.98,-1.35);camera.fov=91;camera.updateProjectionMatrix();
      navigation.syncAngles();navigation.updateUI();
    }
    const experience={scene,camera,renderer,controls,navigation,store:detailedStore,kit,setWeather,resetCamera,focusStore,weatherState,world,getMode:()=>currentWeather.mode};
    if(new URLSearchParams(location.search).get('show')==='clerk'){
      navigation.cancelCamera();navigation.mode='walk';navigation.path=[];controls.enabled=false;
      camera.position.set(4.1,navigation.eye,.75);camera.lookAt(-5.25,1.45,-3.35);camera.fov=74;camera.updateProjectionMatrix();navigation.syncAngles();navigation.updateUI();
    }
    if(Fuji.loadProductCatalog)await Fuji.loadProductCatalog(world);
    if(Fuji.installStoreClerk)Fuji.installStoreClerk(experience);
    if(Fuji.installClerkUI)clerkUI=Fuji.installClerkUI(experience);
    navigation.storeClerk=experience.storeClerk;
    if(new URLSearchParams(location.search).has('test')) window.__fuji=experience;

    requestAnimationFrame(() => {
      loading.classList.add('is-hidden');
      animate();
    });
    window.setTimeout(() => loading.remove(), 900);
  }

  function setupCamera() {
    camera = new THREE.PerspectiveCamera(35.5, window.innerWidth / window.innerHeight, .035, 160);
    camera.position.copy(defaultView.position).multiplyScalar(1.12);
    camera.lookAt(defaultView.target);
  }

  function setupLights() {
    hemiLight = new THREE.HemisphereLight(0xd9e7ff, 0x978672, .54);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xffe0bd, .88);
    sunLight.position.set(-8, 15, 11);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 18;
    sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.camera.near = .5;
    sunLight.shadow.camera.far = 45;
    sunLight.shadow.bias = -.00025;
    sunLight.shadow.normalBias = .025;
    scene.add(sunLight);

    moonLight = new THREE.DirectionalLight(0x8fb5e8, 0);
    moonLight.position.set(8, 13, 7);
    scene.add(moonLight);
  }

  function setupControls() {
    controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 42;
    controls.minPolarAngle = .22;
    controls.maxPolarAngle = 1.58;
    controls.target.copy(defaultView.target);
    controls.addEventListener('start', () => { introActive = false; cameraTween = null; });
  }

  function buildDiorama() {
    const baseMat = mat(C.base, { roughness: .86 });
    const base = roundedBox(24, .72, 17.5, .65, baseMat, 'DIORAMA_BASE', .1);
    base.position.y = -.68;
    base.receiveShadow = true;
    scene.add(base);

    const lower = roundedBox(22.9, .45, 16.4, .55, mat(0x5c5651), 'DIORAMA_UNDERSIDE', .06);
    lower.position.y = -1.08;
    scene.add(lower);

    parkingMaterial = mat(C.asphalt, { roughness: .84 });
    const parking = box(22.5, .16, 9.7, parkingMaterial, 'GROUND_ASPHALT', false, true);
    parking.position.set(0, -.22, 3.1);
    scene.add(parking);

    const backGround = box(22.5, .14, 6.2, mat(0x7f876c), 'GROUND_REAR', false, true);
    backGround.position.set(0, -.23, -4.75);
    scene.add(backGround);

    buildParking();
    kit = new Fuji.Kit(renderer);
    fujiGroup = Fuji.buildMountain(scene,kit);
    interactive.push(fujiGroup);
    detailedStore = Fuji.buildStore(scene,kit);
    storeGroup = detailedStore.group;
    storeGlowMaterial = detailedStore.glass;
    signGlowMaterials.push(...detailedStore.glows);
    interiorLights.push(...detailedStore.lamps);
    interactive.push(storeGroup);
    buildStoreProps();
    Fuji.buildVehicles(scene,kit);
    buildStreetDetails();
    buildTrees();
    buildClouds();
    cloudGroup.visible=false;
    Fuji.detailEnvironment(scene,kit,parkingMaterial);
    const converted=new Set();
    scene.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
      if(converted.has(m))continue;converted.add(m);if(m.color)m.color.convertSRGBToLinear();
      if(m.emissive)m.emissive.convertSRGBToLinear();
    }});
    kit.compact(scene);
    const reflectionTarget=new THREE.WebGLCubeRenderTarget(128);
    const reflectionCamera=new THREE.CubeCamera(.1,130,reflectionTarget);
    reflectionCamera.position.set(0,1.8,2.8);
    storeGroup.visible=false;reflectionCamera.update(renderer,scene);storeGroup.visible=true;
    detailedStore.glass.envMap=reflectionTarget.texture;
    detailedStore.glass.envMapIntensity=.14;
  }

  function buildParking() {
    const white = mat(0xe7e8e3, { roughness: .9 });
    [-6.7, -2.25, 2.25, 6.7].forEach((x, i) => {
      const line = box(.13, .025, 5.3, white, `PARKING_LINE_${i + 1}`, false, false);
      line.position.set(x, -.11, 4.25);
      scene.add(line);
    });
    const stopMat = mat(0xd8d6ce, { roughness: .9 });
    [-4.5, 0, 4.5].forEach((x, i) => {
      const stopper = roundedBox(1.42, .27, .28, .1, stopMat, `WHEEL_STOP_${i + 1}`, .025);
      stopper.position.set(x, .02, 1.65);
      scene.add(stopper);
    });
    const curb = box(22.4, .25, .36, mat(0xcecbc2), 'FRONT_CURB');
    curb.position.set(0, -.02, 7.78);
    scene.add(curb);
    for (let i = 0; i < 12; i++) {
      const drain = box(.48, .028, .19, mat(0x1c282e), `DRAIN_${i}`, false, false);
      drain.position.set(-5.8 + i * 1.05, .112, 7.77);
      scene.add(drain);
    }
    puddles = [
      createPuddle(-7.7, 6.2, 2.4, .6, -.17),
      createPuddle(2.5, 5.25, 1.55, .45, .1),
      createPuddle(7.25, 3.6, 1.8, .5, -.08)
    ];
  }

  function createPuddle(x, z, sx, sy, rotation) {
    const m = new THREE.MeshStandardMaterial({ color: 0x566c79, roughness: .18, metalness: .08, transparent: true, opacity: 0 });
    const p = mesh(new THREE.CircleGeometry(1, 18), m, 'RAIN_PUDDLE', false, false);
    p.scale.set(sx, sy, 1); p.rotation.x = -Math.PI / 2; p.rotation.z = rotation;
    p.position.set(x, -.09, z); scene.add(p); return p;
  }


  function buildStoreProps() {
    const metal = mat(0x8a999b, { roughness: .55, metalness: .15 });
    const bin = cylinder(.23, .25, .78, 12, mat(0xc7c7bd), 'TRASH_BIN');
    bin.position.set(-5.0, .4, 2.58); storeGroup.add(bin);
    const binTop = cylinder(.26, .26, .08, 12, mat(0x5c6c6d), 'TRASH_BIN_TOP');
    binTop.position.set(-5.0, .82, 2.58); storeGroup.add(binTop);

    const ac = box(1.15, .74, .45, mat(0xd8d9d2), 'AIR_CONDITIONER');
    ac.position.set(6.85, .7, -.55); storeGroup.add(ac);
    const fan = cylinder(.23, .23, .03, 16, metal, 'AC_FAN');
    fan.rotation.x = Math.PI / 2; fan.position.set(6.85, .7, -.79); storeGroup.add(fan);

    const vending = roundedBox(.92, 1.75, .55, .08, mat(0xf3f1e8, { emissive: 0xbadbf2, emissiveIntensity: .04 }), 'VENDING_MACHINE', .03);
    vending.position.set(6.1, .86, 2.7); storeGroup.add(vending);
    const vendingFace = box(.72, .72, .03, mat(0x91bfd8, { emissive: 0x79bddd, emissiveIntensity: .18 }), 'VENDING_GLOW', false, false);
    vendingFace.position.set(6.1, 1.2, 3.0); storeGroup.add(vendingFace); signGlowMaterials.push(vendingFace.material);
    for (let i = 0; i < 8; i++) {
      const can = box(.1, .18, .025, mat([0xe55544,0x62a274,0xefc550,0x6f94bd][i%4]), `VENDING_CAN_${i}`, false, false);
      can.position.set(5.82 + (i%4)*.18, 1.38-Math.floor(i/4)*.25, 3.02); storeGroup.add(can);
    }

    [-3.3, -.2, 3.0].forEach((x, i) => {
      const stand = cylinder(.035, .035, .95, 8, metal, `FLAG_POLE_${i}`);
      stand.position.set(x, .48, 2.9); storeGroup.add(stand);
      const tex = makeTextTexture(['おでん', 'OPEN', 'パン'][i], { width: 180, height: 420, background: i === 1 ? '#f0e7cf' : '#d94d3e', color: i === 1 ? '#2f6548' : '#fff', fontSize: 50 });
      const flag = addPlaneLabel(storeGroup, tex, .52, 1.18, new THREE.Vector3(x + .29, .88, 2.91), `STORE_FLAG_${i}`);
      flag.rotation.y = -.08;
    });

    const railMat = mat(0x708489, { roughness: .52, metalness: .18 });
    [-2.1, 1.3].forEach((x, i) => {
      const top = cylinder(.035, .035, 2.4, 8, railMat, `GUARD_RAIL_${i}`);
      top.rotation.z = Math.PI / 2; top.position.set(x, .58, 2.78); storeGroup.add(top);
      [-1.05, 1.05].forEach(dx => {
        const leg = cylinder(.035, .035, .58, 8, railMat, 'GUARD_LEG');
        leg.position.set(x + dx, .3, 2.78); storeGroup.add(leg);
      });
    });
  }


  function buildStreetDetails() {
    buildUtilityPole(7.1, -2.15, 7.8, 'UTILITY_POLE_01', true);
    buildUtilityPole(-7.8, -3.6, 4.9, 'UTILITY_POLE_02', false);
    buildUtilityPole(3.25, -5.0, 4.4, 'UTILITY_POLE_03', false);
    buildWires();

    const signPost = cylinder(.08, .1, 3.3, 10, mat(0x646f71), 'SIGN_POST');
    signPost.position.set(3.85, 1.45, -1.85); scene.add(signPost);
    const sign = box(2.25, 2.05, .14, mat(0xe4c75f), 'YELLOW_SIGN');
    sign.position.set(3.85, 3.4, -1.78); scene.add(sign);
    addPlaneLabel(scene, makeTextTexture(['カー用品', 'バイク用品', '売る'], { width: 480, height: 430, background: '#ead36f', color: '#20252a', fontSize: 74 }), 2.08, 1.88, new THREE.Vector3(3.85, 3.4, -1.69), 'YELLOW_SIGN_TEXT');

    const tallPost = cylinder(.1, .12, 4.8, 10, mat(0x596366), 'TALL_SIGN_POST');
    tallPost.position.set(-7.1, 2.15, -2.45); scene.add(tallPost);
    const tallSign = box(2.9, 2.55, .18, mat(0xe4c364), 'UP_GARAGE_SIGN');
    tallSign.position.set(-7.1, 4.7, -2.38); scene.add(tallSign);
    addPlaneLabel(scene, makeTextTexture(['UP GARAGE', 'カー＆バイク用品'], { width: 600, height: 520, background: '#e7c86d', color: '#253844', fontSize: 75 }), 2.72, 2.36, new THREE.Vector3(-7.1, 4.7, -2.27), 'UP_GARAGE_TEXT');

    [-8.7, 8.75].forEach((x, i) => buildStreetLamp(x, .3 + i * .1));
  }

  function buildUtilityPole(x, z, height, name, detailed) {
    const group = new THREE.Group(); group.name = name; group.position.set(x, 0, z); scene.add(group);
    const poleMat = mat(0x525c60, { roughness: .66, metalness: .08 });
    const pole = cylinder(.15, .22, height, 12, poleMat, `${name}_SHAFT`);
    pole.position.y = height / 2; group.add(pole);
    const arm = cylinder(.085, .085, detailed ? 2.85 : 2.2, 8, poleMat, `${name}_CROSSARM`);
    arm.rotation.z = Math.PI / 2; arm.position.y = height - .55; group.add(arm);
    [-.9, 0, .9].forEach((dx, i) => {
      if (!detailed && Math.abs(dx) > .8) return;
      const ins = cylinder(.07, .085, .28, 8, mat(0xd0d2c8), `${name}_INSULATOR_${i}`);
      ins.position.set(dx, height - .3, 0); group.add(ins);
    });
    if (detailed) {
      const transformer = cylinder(.38, .38, 1.0, 12, mat(0x6c7371), `${name}_TRANSFORMER`);
      transformer.position.set(-.38, height - 2.1, 0); group.add(transformer);
      const boxUnit = box(.55, .75, .34, mat(0x6c7475), `${name}_BOX`);
      boxUnit.position.set(.15, height - 3.3, .2); group.add(boxUnit);
      const sideArm = cylinder(.06, .06, 1.8, 8, poleMat, `${name}_SIDE_ARM`);
      sideArm.rotation.x = Math.PI / 2; sideArm.position.set(0, height - 1.05, -.65); group.add(sideArm);
    }
  }

  function makeWire(points, name) {
    const curve = new THREE.CatmullRomCurve3(points);
    const wire = mesh(new THREE.TubeGeometry(curve, 28, .025, 5, false), mat(0x30383a), name, false, false);
    scene.add(wire);
  }

  function buildWires() {
    [-.8, .1, .8].forEach((dx, i) => {
      makeWire([
        new THREE.Vector3(-7.8 + dx * .7, 4.65, -3.6),
        new THREE.Vector3(-2.6 + dx * .3, 3.9 - i * .08, -4.7),
        new THREE.Vector3(3.25 + dx * .55, 4.15, -5.0),
        new THREE.Vector3(7.1 + dx, 7.25, -2.15)
      ], `POWER_LINE_${i + 1}`);
    });
    [-.85, .85].forEach((dx, i) => {
      makeWire([
        new THREE.Vector3(7.1 + dx, 7.5, -2.15),
        new THREE.Vector3(7.7 + dx * .4, 6.25, .2),
        new THREE.Vector3(8.4 + dx * .25, 5.7, 3.0)
      ], `POWER_DROP_${i + 1}`);
    });
  }

  function buildStreetLamp(x, z) {
    const g = new THREE.Group(); g.name = `STREET_LIGHT_${streetLights.length + 1}`; g.position.set(x, 0, z); scene.add(g);
    const post = cylinder(.06, .08, 3.0, 8, mat(0x556164), 'LAMP_POST'); post.position.y = 1.5; g.add(post);
    const headMat = mat(0xe3e7dc, { emissive: 0xffd68a, emissiveIntensity: .05 }); signGlowMaterials.push(headMat);
    const head = box(.6, .17, .28, headMat, 'LAMP_HEAD'); head.position.set(.18, 3.06, 0); g.add(head);
    const light = new THREE.PointLight(0xffd28b, 0, 5.5, 2); light.position.set(.18, 2.9, .1); g.add(light); streetLights.push(light);
  }

  function buildTrees() {
    const placements = [[-9,-3.4,1.0],[8.9,-4.7,.9],[-8.8,-6,.85],[6.7,-6,.75],[9.4,-1.1,.65],[-5.6,-4.9,.55]];
    placements.forEach((p, i) => {
      const group = new THREE.Group(); group.name = `TREE_${i + 1}`; group.position.set(p[0], 0, p[1]); group.scale.setScalar(p[2]); scene.add(group);
      const trunk = cylinder(.13, .18, 1.15, 7, mat(0x735847), 'TREE_TRUNK'); trunk.position.y = .55; group.add(trunk);
      const leafMat = mat(i % 2 ? 0x49684f : 0x58765a, { roughness: 1, flatShading: true });
      [[0,1.2,0,.75],[-.42,1.48,.04,.58],[.4,1.52,-.05,.62],[0,1.92,0,.64]].forEach((v,j) => {
        const crown = mesh(new THREE.IcosahedronGeometry(v[3], 1), leafMat, `TREE_CROWN_${j}`); crown.position.set(v[0],v[1],v[2]); group.add(crown);
      });
    });
    for (let i = 0; i < 9; i++) {
      const bush = mesh(new THREE.IcosahedronGeometry(.42 + (i%3)*.08, 1), mat(i%2?0x53765a:0x64805e,{flatShading:true}), `BUSH_${i}`);
      bush.scale.y = .75; bush.position.set(-6.1 + i*1.28, .22, -2.8 - (i%2)*.25); scene.add(bush);
    }
  }

  function buildClouds() {
    cloudGroup = new THREE.Group(); cloudGroup.name = 'SUNNY_CLOUDS'; scene.add(cloudGroup);
    [[-7,10,-8,.9],[5.5,11,-10,.75],[9,8.7,-7,.55]].forEach((p,i) => {
      const g = new THREE.Group(); g.position.set(p[0],p[1],p[2]); g.scale.setScalar(p[3]); cloudGroup.add(g);
      const cm = mat(0xf5f3ee,{roughness:1,transparent:true,opacity:.62});
      [[0,0,0,1.1],[1,.05,0,.8],[-1,.02,0,.7],[.25,.45,0,.78]].forEach((v,j)=>{
        const c=mesh(new THREE.IcosahedronGeometry(v[3],1),cm,`CLOUD_${i}_${j}`,false,false); c.scale.y=.55;c.position.set(v[0],v[1],v[2]);g.add(c);
      });
    });
  }

  function createRain() {
    const drops = 1050;
    const positions = new Float32Array(drops * 2 * 3);
    const speeds = new Float32Array(drops);
    for (let i = 0; i < drops; i++) {
      const x = (Math.random() - .5) * 25;
      const y = Math.random() * 18;
      const z = (Math.random() - .5) * 17;
      const len = .28 + Math.random() * .38;
      positions[i*6] = x; positions[i*6+1] = y; positions[i*6+2] = z;
      positions[i*6+3] = x + .085; positions[i*6+4] = y - len; positions[i*6+5] = z;
      speeds[i] = 9 + Math.random() * 8;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const m = new THREE.LineBasicMaterial({ color: 0xcfe6f1, transparent: true, opacity: .52, depthWrite: false });
    rainSystem = new THREE.LineSegments(g, m); rainSystem.name = 'RAIN'; rainSystem.visible = false; rainSystem.userData.speeds = speeds; scene.add(rainSystem);
  }

  function createStars() {
    const count = 320; const positions = new Float32Array(count * 3);
    for (let i=0;i<count;i++) {
      const a=Math.random()*Math.PI*2, radius=24+Math.random()*15;
      positions[i*3]=Math.cos(a)*radius; positions[i*3+1]=7+Math.random()*17; positions[i*3+2]=-8-Math.random()*10;
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const m=new THREE.PointsMaterial({color:0xf5ead1,size:.09,transparent:true,opacity:0,depthWrite:false});
    starSystem=new THREE.Points(g,m);starSystem.name='STARS';starSystem.visible=false;scene.add(starSystem);
  }

  function setupUI() {
    document.querySelectorAll('.weather-button').forEach(button => {
      button.addEventListener('click', () => setWeather(button.dataset.weather));
    });
    document.getElementById('reset-view').addEventListener('click', resetCamera);
    window.addEventListener('resize', onResize);
  }

  function setupRaycaster() {
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', e => { pointerDown = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointerup', e => {
      if(navigation.mode !== 'exterior')return;
      if (!pointerDown) return;
      const dist = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
      if (dist < 5 && hoverTarget) {
        if (hoverTarget === 'store') focusStore();
        if (hoverTarget === 'door') navigation.enterStore();
        if (hoverTarget === 'fuji') focusFuji();
      }
      pointerDown = null;
    });
    canvas.addEventListener('pointerleave', () => { pointer.set(99,99); setHover(null); });
    canvas.tabIndex = 0;
  }

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    objectLabel.style.left = `${e.clientX}px`;
    objectLabel.style.top = `${e.clientY}px`;
  }

  function updateRaycast() {
    if(navigation.mode!=='exterior'){setHover(null);return;}
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(interactive, true);
    let action = null;
    for (const hit of hits) {
      let node = hit.object;
      while (node && !node.userData.action) node = node.parent;
      if (node && node.userData.action) { action = node.userData.action; if(action==='store' && Math.abs(hits[0].point.x-5.25)<1.1 && hits[0].point.z>1.9)action='door'; break; }
    }
    setHover(action);
  }

  function setHover(action) {
    if (hoverTarget === action) return;
    hoverTarget = action;
    canvas.style.cursor = action ? 'pointer' : 'grab';
    objectLabel.textContent = action === 'store' ? '7-ELEVEN · 点击靠近' : action === 'fuji' ? '富士山 · 点击仰望' : action==='door'?'自动门 · 点击进入':'';
    objectLabel.classList.toggle('is-visible', !!action);
    // Interaction labels are intentionally subtle; glazing never becomes emissive.
  }

  function setWeather(mode) {
    if (currentWeather.mode === mode && currentWeather.progress >= .99) return;
    currentWeather.mode = mode;
    currentWeather.progress = 0;
    currentWeather.start = {...weatherState};
    document.body.classList.toggle('weather-night', mode === 'night');
    document.querySelectorAll('.weather-button').forEach(button => {
      const active = button.dataset.weather === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    rainSystem.visible = mode === 'rain' || rainSystem.material.opacity > .01;
    starSystem.visible = mode === 'night' || starSystem.material.opacity > .01;
  }

  const presets = {
    sunny: { sky: C.sky, fog: C.sky, density: .006, sun: .88, hemi: .54, moon: 0, exposure: 1.08, ground: C.asphalt, rough: .84, shopGlow: .2, interior: .18, signGlow: .09, lamp: 0, rain: 0, stars: 0, cloud: .62, mountain: C.mountain, snow: C.snow, puddle: 0 },
    rain: { sky: C.skyRain, fog: 0x748693, density: .022, sun: .36, hemi: .52, moon: 0, exposure: 1.02, ground: C.asphaltWet, rough: .25, shopGlow: .92, interior: 1.15, signGlow: .5, lamp: .5, rain: .56, stars: 0, cloud: .16, mountain: 0x3e5c70, snow: 0xc7d5db, puddle: .46 },
    night: { sky: C.skyNight, fog: 0x0b1a2b, density: .014, sun: .025, hemi: .2, moon: .72, exposure: .94, ground: 0x17242d, rough: .48, shopGlow: 1.9, interior: 2.4, signGlow: 1.28, lamp: 2.7, rain: 0, stars: .92, cloud: .05, mountain: C.mountainNight, snow: 0xa9c4dc, puddle: .1 }
  };

  function initWeatherState() {
    const p = presets.sunny;
    Object.assign(weatherState, p);
  }

  function updateWeather(dt) {
    const target = presets[currentWeather.mode];
    currentWeather.progress=Math.min(1,currentWeather.progress+dt/(reduceMotion?.01:1.65));
    const p=currentWeather.progress,amount=p*p*(3-2*p);
    const start=currentWeather.start||target;
    Object.keys(target).forEach(key => {
      if (key === 'sky' || key === 'fog' || key === 'ground' || key === 'mountain' || key === 'snow') return;
      weatherState[key] = THREE.MathUtils.lerp(start[key], target[key], amount);
    });
    ['sky','fog','ground','mountain','snow'].forEach(key => {
      const from = new THREE.Color(start[key]);
      from.lerp(new THREE.Color(target[key]), amount);
      weatherState[key] = from.getHex();
    });

    scene.background.setHex(weatherState.sky);
    scene.fog.color.setHex(weatherState.fog);
    scene.fog.density = weatherState.density;
    sunLight.intensity = weatherState.sun;
    hemiLight.intensity = weatherState.hemi;
    moonLight.intensity = weatherState.moon;
    renderer.toneMappingExposure = weatherState.exposure;
    // Asphalt already has its own albedo; tint it without multiplying by black twice.
    parkingMaterial.color.setScalar(1-weatherState.rain*.58-weatherState.stars*.12);
    parkingMaterial.roughness = weatherState.rough;
    storeGlowMaterial.opacity = .10 + .035*(1-weatherState.stars);
    storeGlowMaterial.envMapIntensity=.14-weatherState.stars*.1;
    signGlowMaterials.forEach(m => { m.emissiveIntensity = .28+weatherState.signGlow*.65; });
    streetLights.forEach(l => { l.intensity = weatherState.lamp; });
    interiorLights.forEach(l => { l.intensity = .65+weatherState.interior*.23; });
    rainSystem.material.opacity = weatherState.rain;
    starSystem.material.opacity = weatherState.stars;
    cloudGroup.traverse(o => { if (o.isMesh) o.material.opacity = weatherState.cloud; });
    fujiGroup.userData.material.color.setRGB(1-weatherState.stars*.22,1-weatherState.stars*.13,1);
    puddles.forEach(p => { p.material.opacity = weatherState.puddle; });
    rainSystem.visible = weatherState.rain > .01;
    starSystem.visible = weatherState.stars > .01;
  }

  function updateRain(dt) {
    if (!rainSystem.visible) return;
    const pos = rainSystem.geometry.attributes.position.array;
    const speeds = rainSystem.userData.speeds;
    for (let i=0;i<speeds.length;i++) {
      const fall = speeds[i] * dt;
      pos[i*6+1] -= fall; pos[i*6+4] -= fall;
      pos[i*6] -= fall * .11; pos[i*6+3] -= fall * .11;
      const overStore=Math.abs(pos[i*6])<7.6&&pos[i*6+2]>-5.7&&pos[i*6+2]<2.65;
      if (pos[i*6+1] < (overStore?3.8:0)) {
        const reset = 14 + Math.random()*5;
        pos[i*6+1] += reset; pos[i*6+4] += reset;
        pos[i*6] = (Math.random()-.5)*25; pos[i*6+3] = pos[i*6]+.085;
      }
    }
    rainSystem.geometry.attributes.position.needsUpdate = true;
  }

  function tweenCamera(position, target, duration = 1.25) {
    introActive = false;
    cameraTween = {
      startPos: camera.position.clone(), endPos: position.clone(),
      startTarget: controls.target.clone(), endTarget: target.clone(),
      elapsed: 0, duration: reduceMotion ? .01 : duration
    };
  }

  function focusStore() {
    tweenCamera(new THREE.Vector3(2.3, 1.85, 8.5), new THREE.Vector3(.1, 1.35, -1.3), 1.15);
  }

  function focusFuji() {
    tweenCamera(new THREE.Vector3(5.8, 8.8, 29.8), new THREE.Vector3(-1.3, 7.0, -8), 1.3);
  }

  function resetCamera() {
    if(navigation && navigation.mode!=='exterior'){navigation.exterior();return;}
    tweenCamera(defaultView.position, defaultView.target, 1.2);
  }

  function updateCameraTween(dt) {
    if (!cameraTween) return;
    cameraTween.elapsed += dt;
    const raw = Math.min(1, cameraTween.elapsed / cameraTween.duration);
    const t = 1 - Math.pow(1 - raw, 4);
    camera.position.lerpVectors(cameraTween.startPos, cameraTween.endPos, t);
    controls.target.lerpVectors(cameraTween.startTarget, cameraTween.endTarget, t);
    if (raw >= 1) cameraTween = null;
  }

  function updateIntro(dt) {
    if (!introActive) return;
    introElapsed += dt;
    const raw = Math.min(1, introElapsed / 2.55);
    const t = 1 - Math.pow(1 - raw, 3);
    const start = defaultView.position.clone().multiplyScalar(1.12).add(new THREE.Vector3(1.2, .65, 0));
    camera.position.lerpVectors(start, defaultView.position, t);
    controls.target.lerpVectors(new THREE.Vector3(-.8, 4.6, -2.3), defaultView.target, t);
    if (raw >= 1) introActive = false;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = navigation && navigation.mode==='walk' ? 67 : camera.aspect<1 ? 65 : 35.5;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), .05);
    updateIntro(dt);
    updateCameraTween(dt);
    updateWeather(dt);
    updateRain(dt);
    navigation.update(dt);
    if(clerkUI)clerkUI.update(dt);
    if(navigation.storeClerk)navigation.storeClerk.update(dt);
    updateRaycast();
    if (cloudGroup) cloudGroup.position.x = Math.sin(clock.elapsedTime * .08) * .42;
    if (starSystem && starSystem.visible) starSystem.rotation.y += dt * .003;
    if(navigation.mode==='exterior'){
      controls.update();
      camera.position.y=Math.max(.45,camera.position.y);
      const p=camera.position;
      if(p.y<3.5&&Math.abs(p.x)<7.55&&p.z>-5.65&&p.z<2.4){
        const edges=[{d:7.55-Math.abs(p.x),axis:'x',v:p.x<0?-7.56:7.56},{d:2.4-p.z,axis:'z',v:2.41},{d:p.z+5.65,axis:'z',v:-5.66},{d:3.5-p.y,axis:'y',v:3.51}];
        edges.sort((a,b)=>a.d-b.d);p[edges[0].axis]=edges[0].v;
      }
    }
    renderer.render(scene, camera);
  }

  initWeatherState();
  initScene().catch(error=>{
    console.error('Scene loading failed',error);
    const p=loading.querySelector('p');if(p)p.textContent='模型加载失败。请通过 start.ps1 启动 HTTP 服务后刷新页面。';
    loading.classList.remove('is-hidden');
  });
})();

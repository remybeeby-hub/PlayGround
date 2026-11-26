import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const canvas = document.querySelector('#world');
const scene = new THREE.Scene();
const fogColor = new THREE.Color('#b6a48c');
scene.background = fogColor;
scene.fog = new THREE.FogExp2(fogColor, 0.0085);
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, 0.1, 650);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const world = new THREE.Group(); scene.add(world);
const generated = new THREE.Group(); world.add(generated);
const props = [];
const destructibles = [];
const explosions = [];
let rainbowGroup = null;
const clock = new THREE.Clock();
const player = { x: 0, z: 7, y: 0, yaw: 0, pitch: -0.035, speed: 5.3, bob: 0 };
const keys = new Set();
const touchMoves = new Set();
let sun, hemi, ambient, water, waterBase, stars, rainGroup;
let weatherState = 'golden hour';
let timeState = 'morning';
let soundOn = false;
let audioContext;
let toastTimer;
let seed = 81421;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const terrainHeight = (x, z) => {
  const broad = Math.sin(x * .027 + .5) * 1.15 + Math.cos(z * .023) * 1.3 + Math.sin((x + z) * .017) * 1.5;
  const ridge = Math.sin(x * .055 + Math.sin(z * .025) * 2.2) * Math.cos(z * .049) * 1.05;
  const valley = Math.exp(-((x - 2) ** 2 / 175 + (z + 10) ** 2 / 370)) * -1.6;
  return broad + ridge + valley - 0.9;
};
const material = (color, roughness = .9, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const addMesh = (parent, geometry, mat, position, scale, cast = true, receive = true) => {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position); if (scale) mesh.scale.set(...scale);
  mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); return mesh;
};

function buildWorld() {
  const terrain = new THREE.PlaneGeometry(420, 420, 150, 150);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position;
  const colors = [];
  const low = new THREE.Color('#455b45'), mid = new THREE.Color('#78805d'), high = new THREE.Color('#a08a69');
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), h = terrainHeight(x, z);
    positions.setY(i, h);
    const color = h < 0.1 ? low.clone().lerp(mid, clamp((h + 2.2) / 3.6, 0, 1)) : mid.clone().lerp(high, clamp((h - .1) / 5.7, 0, .66));
    const variation = .96 + rand() * .08;
    colors.push(color.r * variation, color.g * variation, color.b * variation);
  }
  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  const land = addMesh(world, terrain, groundMat, [0, 0, 0], null, false, true);

  const sunLight = new THREE.DirectionalLight('#ffe3b4', 3.2);
  sunLight.position.set(-45, 70, 38); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1536, 1536); sunLight.shadow.camera.left = -55; sunLight.shadow.camera.right = 55;
  sunLight.shadow.camera.top = 55; sunLight.shadow.camera.bottom = -55; sunLight.shadow.bias = -.00035;
  scene.add(sunLight); sun = sunLight;
  hemi = new THREE.HemisphereLight('#d4e5e3', '#665943', 1.65); scene.add(hemi);
  ambient = new THREE.AmbientLight('#e5d1b3', .28); scene.add(ambient);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(3.1, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffe1b1' }));
  sunBall.position.copy(sunLight.position).normalize().multiplyScalar(110); scene.add(sunBall); sun.userData.ball = sunBall;

  makeMountains(); makePath(); makeLake(); makeForest(); makeVillage(); makeRocks(); makeMeadow(); makeClouds(); makeStars();
  player.y = terrainHeight(player.x, player.z) + 1.72;
  camera.position.set(player.x, player.y, player.z);
}
function makeMountains() {
  const palettes = ['#7a7569', '#918470', '#766f65', '#a28f79'];
  for (let i = 0; i < 17; i++) {
    const x = -115 + i * 14 + (rand() - .5) * 9;
    const z = -112 - rand() * 38;
    const h = 22 + rand() * 29;
    const g = new THREE.ConeGeometry(13 + rand() * 13, h, 5 + Math.floor(rand() * 3), 1);
    const m = material(palettes[i % palettes.length], 1, { flatShading: true });
    const mountain = addMesh(world, g, m, [x, terrainHeight(x, z) + h * .33, z], [1.35, 1.15, .95], false, false);
    mountain.rotation.y = rand() * Math.PI;
    const snowLine = addMesh(world, new THREE.ConeGeometry(7 + rand() * 4, h * .3, 5, 1), material('#c4b8a4', 1, { flatShading: true }), [x, terrainHeight(x, z) + h * .91, z], [1.3, 1, .94], false, false);
    snowLine.rotation.y = mountain.rotation.y;
  }
}
function makePath() {
  const points = [];
  for (let i = 0; i <= 50; i++) {
    const z = 10 - i * 2.1;
    const x = Math.sin(i * .115) * 2.4 - 1.5;
    points.push(new THREE.Vector3(x, terrainHeight(x, z) + .035, z));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 160, 1.18, 7, false);
  const path = addMesh(world, geometry, material('#837665', 1), [0, 0, 0], [1, .08, 1], false, true);
  path.material.color.set('#817765');
  for (let i = 0; i < 220; i++) {
    const z = 5 - rand() * 97, x = Math.sin((5 - z) * .055) * 2.4 - 1.5 + (rand() - .5) * 2.8;
    const y = terrainHeight(x, z) + .06;
    const pebble = addMesh(world, new THREE.DodecahedronGeometry(.07 + rand() * .12, 0), material(rand() > .5 ? '#b5a48a' : '#625d52'), [x, y, z], [1.5, .42, .8], false, false);
    pebble.rotation.y = rand() * Math.PI;
  }
}
function makeLake() {
  const lakeMat = new THREE.MeshStandardMaterial({ color: '#668b88', roughness: .21, metalness: .12, transparent: true, opacity: .94 });
  water = addMesh(world, new THREE.CircleGeometry(22, 72), lakeMat, [24, terrainHeight(24, -31) + .18, -31], [1.34, 1, .69], false, true);
  water.rotation.x = -Math.PI / 2;
  waterBase = water.position.y;
  const ring = addMesh(world, new THREE.RingGeometry(21.3, 23.1, 72), material('#a29a78', .95), [24, waterBase + .02, -31], [1.34, .69, 1], false, false);
  ring.rotation.x = -Math.PI / 2;
  // Reeds along the near shore give the lake a readable scale.
  for (let i = 0; i < 70; i++) {
    const a = Math.PI * .43 + rand() * Math.PI * 1.03;
    const x = 24 + Math.cos(a) * (22 + rand() * 1.8), z = -31 + Math.sin(a) * (15 + rand() * 1.7);
    const y = terrainHeight(x, z);
    const reed = addMesh(world, new THREE.ConeGeometry(.035 + rand() * .03, .55 + rand() * .8, 4), material(rand() > .5 ? '#9a9d69' : '#737c54'), [x, y + .33, z], null, false, false);
    reed.rotation.z = (rand() - .5) * .4;
  }
}
function makeTree(x, z, size = 1, kind = 'pine') {
  const y = terrainHeight(x, z);
  const group = new THREE.Group(); group.position.set(x, y, z); world.add(group);
  const trunk = addMesh(group, new THREE.CylinderGeometry(.13 * size, .22 * size, 1.7 * size, 6), material('#594638'), [0, .82 * size, 0], null, true, true);
  trunk.rotation.z = (rand() - .5) * .08;
  if (kind === 'pine') {
    const greens = ['#425b46', '#52694a', '#62714e', '#3d5646'];
    for (let j = 0; j < 4; j++) {
      const h = (1.7 - j * .25) * size;
      const cone = addMesh(group, new THREE.ConeGeometry((1.05 - j * .14) * size, h, 7, 2), material(greens[Math.floor(rand() * greens.length)], 1, { flatShading: true }), [0, (1.5 + j * .67) * size, 0], null, true, true);
      cone.rotation.y = rand() * Math.PI;
    }
  } else {
    for (let j = 0; j < 5; j++) {
      const branch = addMesh(group, new THREE.IcosahedronGeometry(.95 * size, 1), material(['#667650', '#73825a', '#596d4e'][j % 3], 1, { flatShading: true }), [(rand() - .5) * size * .85, (1.8 + rand() * 1.5) * size, (rand() - .5) * size * .8], [1.05, 1.2, .95], true, true);
      branch.rotation.set(rand() * .4, rand() * Math.PI, rand() * .4);
    }
  }
  group.userData.sway = rand() * Math.PI * 2; group.userData.baseRot = group.rotation.z; foliageGroups.push(group); destructibles.push(group);
  return group;
}
const foliageGroups = [];
function makeForest() {
  for (let i = 0; i < 130; i++) {
    let x = (rand() - .5) * 125, z = -8 - rand() * 113;
    if (Math.abs(x) < 7 && z > -37) x += x < 0 ? -9 : 9;
    if ((x - 24) ** 2 / 520 + (z + 31) ** 2 / 240 < 1.25) continue;
    makeTree(x, z, .72 + rand() * 1.5, rand() > .2 ? 'pine' : 'oak');
  }
  // A pair of landmark trees frame the open clearing.
  makeTree(-12, -14, 2.5, 'oak'); makeTree(12, -23, 2.1, 'pine'); makeTree(34, -8, 2.2, 'oak');
}
function makeVillage() {
  const wall = material('#c4b39b'), roof = material('#51473c', 1), wood = material('#755b43'), glass = new THREE.MeshStandardMaterial({ color: '#b7d2ca', roughness: .18, metalness: .12, emissive: '#273735', emissiveIntensity: .24 });
  const houses = [{x:-10,z:-22,s:1.05},{x:8,z:-35,s:.82},{x:-18,z:-43,s:.72}];
  houses.forEach((h, index) => {
    const group = new THREE.Group(); group.position.set(h.x, terrainHeight(h.x,h.z), h.z); group.scale.setScalar(h.s); world.add(group); destructibles.push(group);
    addMesh(group, new THREE.BoxGeometry(5.2,3.2,4.6), wall, [0,1.6,0], null, true, true);
    const top = addMesh(group, new THREE.ConeGeometry(4.05,2.7,4), roof, [0,4.4,0], [1,.75,.72], true, true); top.rotation.y=Math.PI/4;
    for (const side of [-1,1]) {
      const win = addMesh(group, new THREE.BoxGeometry(.83,1.05,.08), glass, [side*1.48,1.95,2.34], null, false, true);
      addMesh(group, new THREE.BoxGeometry(.95,.11,.13), wood, [side*1.48,2.5,2.33], null, false, true);
      addMesh(group, new THREE.BoxGeometry(.1,1.16,.13), wood, [side*1.48,1.95,2.35], null, false, true);
      win.material=glass;
    }
    addMesh(group,new THREE.BoxGeometry(1.05,2.05,.14),wood,[0,1.02,2.35],null,true,true);
    if(index===0){
      const chimney=addMesh(group,new THREE.BoxGeometry(.6,2,.7),material('#88725b'),[1.6,4.45,-.5],null,true,true);
      chimney.rotation.z=-.1;
    }
    // Porch and two posts
    addMesh(group,new THREE.BoxGeometry(3.2,.18,1.1),wood,[0,.28,2.95],null,false,true);
    [-1.25,1.25].forEach(x=>addMesh(group,new THREE.CylinderGeometry(.075,.09,1.9,6),wood,[x,1.15,3.34],null,true,true));
  });
  // Old timber dock leading into the lake.
  const dock = new THREE.Group(); dock.position.set(13,terrainHeight(13,-28)+.15,-28); dock.rotation.y=-.12; world.add(dock);
  addMesh(dock,new THREE.BoxGeometry(2.5,.18,10),wood,[0,0,-1],null,true,true);
  for(let i=0;i<5;i++) for(const x of [-1,1]) addMesh(dock,new THREE.CylinderGeometry(.12,.15,1.7,6),wood,[x, -.55,-5+i*2],null,true,true);
  for(let i=0;i<12;i++) addMesh(dock,new THREE.BoxGeometry(.19,.2,.17),material('#4e493e'),[-1.28+rand()*2.56,.12,-5+rand()*8],null,false,true);
}
function makeRocks() {
  for(let i=0;i<110;i++){
    const x=(rand()-.5)*95,z=-4-rand()*100;
    if(Math.abs(x)<4 && z>-28) continue;
    if((x-24)**2/580+(z+31)**2/250<1.1) continue;
    const size=.16+rand()*.65;
    const rock=addMesh(world,new THREE.DodecahedronGeometry(size,1),material(['#766f63','#908575','#a09380'][Math.floor(rand()*3)],1,{flatShading:true}),[x,terrainHeight(x,z)+size*.42,z],[1.3,.75,.9],true,true);
    rock.rotation.set(rand()*.4,rand()*Math.PI,rand()*.3);destructibles.push(rock);
  }
}
function makeMeadow() {
  const flowerColors=['#e8cba0','#d3c4a4','#d8b7a5','#c6d0a6'];
  for(let i=0;i<260;i++){
    const x=(rand()-.5)*54,z=-5-rand()*62;
    if(Math.abs(x)<3 || (x-24)**2/600+(z+31)**2/280<1.1) continue;
    const group=new THREE.Group();group.position.set(x,terrainHeight(x,z),z);world.add(group);
    const color=flowerColors[Math.floor(rand()*flowerColors.length)];
    const stem=addMesh(group,new THREE.CylinderGeometry(.012,.018,.24,4),material('#667451'),[0,.12,0],null,false,false);
    const bloom=addMesh(group,new THREE.SphereGeometry(.055,6,5),material(color,.7),[0,.26,0],null,false,false);
    bloom.scale.set(.85,1,.85);
  }
}
function makeClouds() {
  const cloudMat=new THREE.MeshBasicMaterial({color:'#fff1d9',transparent:true,opacity:.14,depthWrite:false});
  for(let i=0;i<18;i++){
    const group=new THREE.Group();group.position.set((rand()-.5)*250,24+rand()*24,-30-rand()*180);world.add(group);
    const count=4+Math.floor(rand()*4);
    for(let j=0;j<count;j++){
      const cloud=addMesh(group,new THREE.SphereGeometry(3+rand()*5,10,7),cloudMat,[(rand()-.5)*10,(rand()-.5)*2,(rand()-.5)*4],[1.5,.35,.55],false,false);
    }
    group.userData.cloud=true;group.userData.speed=.12+rand()*.25;
    clouds.push(group);
  }
}
const clouds=[];
function makeStars(){
  const geometry=new THREE.BufferGeometry(), positions=[];
  for(let i=0;i<800;i++){
    const theta=rand()*Math.PI*2, y=rand()*95+13, r=180+rand()*60;
    positions.push(Math.cos(theta)*r,y,-Math.sin(theta)*r-30);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:'#fff2d6',size:.42,transparent:true,opacity:0,depthWrite:false}));scene.add(stars);
}

buildWorld();
const minimap=document.querySelector('#minimap');
const mapCtx=minimap.getContext('2d');
function drawMap(){
  const c=mapCtx;c.clearRect(0,0,120,120);c.fillStyle='rgba(53,76,68,.76)';c.fillRect(0,0,120,120);
  c.strokeStyle='rgba(207,201,170,.20)';c.lineWidth=1;
  for(let i=0;i<120;i+=20){c.beginPath();c.moveTo(i,0);c.lineTo(i,120);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(120,i);c.stroke();}
  c.fillStyle='rgba(115,156,154,.82)';c.beginPath();c.ellipse(82,61,23,16,-.15,0,Math.PI*2);c.fill();
  c.strokeStyle='rgba(198,180,143,.8)';c.lineWidth=2;c.beginPath();c.moveTo(59,95);c.bezierCurveTo(55,75,61,67,51,48);c.stroke();
  c.fillStyle='rgba(206,202,166,.58)';for(let i=0;i<28;i++){const x=(i*41+13)%118,y=(i*67+23)%118;c.beginPath();c.arc(x,y,1.3,0,Math.PI*2);c.fill();}
  const px=60+player.x*.55,pz=70+player.z*.55;c.fillStyle='#f0d39f';c.beginPath();c.arc(clamp(px,4,116),clamp(pz,4,116),2.6,0,Math.PI*2);c.fill();
}

function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);

function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.04), t=clock.elapsedTime;
  updatePlayer(dt,t);
  for(const tree of foliageGroups){tree.rotation.z=tree.userData.baseRot+Math.sin(t*.7+tree.userData.sway)*.008;}
  for(const cloud of clouds){cloud.position.x+=cloud.userData.speed*dt;if(cloud.position.x>145)cloud.position.x=-145;}
  if(water){water.position.y=waterBase+Math.sin(t*.7)*.035;water.material.opacity=.88+Math.sin(t*1.2)*.04;}
  updateParticles(dt);
  drawMap();
  renderer.render(scene,camera);
}
function updatePlayer(dt,t){
  const forward=(keys.has('KeyW')||keys.has('ArrowUp')||touchMoves.has('forward')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||touchMoves.has('back')?1:0);
  const side=(keys.has('KeyD')||keys.has('ArrowRight')||touchMoves.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touchMoves.has('left')?1:0);
  const moving=forward!==0||side!==0;
  if(moving){const length=Math.hypot(forward,side)||1;player.x+=((Math.sin(player.yaw)*forward+Math.cos(player.yaw)*side)/length)*player.speed*dt;player.z+=((-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*side)/length)*player.speed*dt;}
  player.x=clamp(player.x,-185,185);player.z=clamp(player.z,-185,185);
  const ground=terrainHeight(player.x,player.z);
  if(player.fly){if(keys.has('Space'))player.y+=dt*4;if(keys.has('ShiftLeft'))player.y-=dt*4;player.y=Math.max(ground+1.72,player.y);}
  else player.y=ground+1.72;
  player.bob=moving?Math.sin(t*10)*.035:Math.sin(t*1.5)*.006;
  camera.position.set(player.x,player.y+player.bob,player.z);
  camera.rotation.order='YXZ';camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;
  document.querySelector('#coords').textContent=`N ${String(Math.round(12+(-player.z*.013))).padStart(2,'0')}° ${String(Math.abs(Math.round(player.z*1.8))%60).padStart(2,'0')}′   E ${String(Math.round(12+player.x*.012)).padStart(2,'0')}° ${String(Math.abs(Math.round(player.x*1.7))%60).padStart(2,'0')}′`;
}
function animate(){frame();}
const particles=[];
function burstAt(position,color='#e8ca9d',count=32){
  const group=new THREE.Group();group.position.copy(position);generated.add(group);
  for(let i=0;i<count;i++){
    const mesh=addMesh(group,new THREE.SphereGeometry(.035+rand()*.07,5,4),material(color,.4,{emissive:color,emissiveIntensity:.3}),[(rand()-.5)*1.6,rand()*1.1,(rand()-.5)*1.6],null,false,false);
    particles.push({mesh,life:.65+rand()*.9,age:0,velocity:new THREE.Vector3((rand()-.5)*2,1+rand()*2,(rand()-.5)*2),group});
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.age+=dt;p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=2.2*dt;p.mesh.material.opacity=1-p.age/p.life;p.mesh.material.transparent=true;if(p.age>=p.life){p.group.remove(p.mesh);particles.splice(i,1);if(p.group.children.length===0)p.group.removeFromParent();}}
}
function explodeAt(position, lower=''){
  const radius=/everything|whole village|massive|nuke|huge/.test(lower)?42:21;
  const candidates=destructibles.slice();let destroyed=0;
  for(const object of candidates){
    if(!object?.parent||object.userData.destroyed)continue;
    const point=object.getWorldPosition(new THREE.Vector3());
    if(point.distanceTo(position)<=radius){object.userData.destroyed=true;object.visible=false;destroyed++;}
  }
  for(let i=props.length-1;i>=0;i--)if(props[i].userData.destroyed)props.splice(i,1);
  const group=new THREE.Group();group.position.copy(position);generated.add(group);
  const core=addMesh(group,new THREE.SphereGeometry(1,20,16),new THREE.MeshBasicMaterial({color:'#ff6a24',transparent:true,opacity:.95,depthWrite:false}),[0,2,0],[.1,.1,.1],false,false);
  const glow=addMesh(group,new THREE.SphereGeometry(1,18,14),new THREE.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:.8,depthWrite:false}),[0,2,0],[.1,.1,.1],false,false);
  const ring=addMesh(group,new THREE.RingGeometry(.82,1,48),new THREE.MeshBasicMaterial({color:'#ffb13b',transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false}),[0,.12,0],null,false,false);ring.rotation.x=-Math.PI/2;
  const smoke=addMesh(group,new THREE.SphereGeometry(1,14,10),new THREE.MeshBasicMaterial({color:'#55443d',transparent:true,opacity:.42,depthWrite:false}),[0,3.8,0],[.4,.5,.4],false,false);
  explosions.push({group,core,glow,ring,smoke,age:0,life:1.3});
  burstAt(new THREE.Vector3(position.x,position.y+.5,position.z),'#ff6328',44);
  burstAt(new THREE.Vector3(position.x,position.y+.5,position.z),'#ffd064',28);
  burstAt(new THREE.Vector3(position.x,position.y+.5,position.z),'#67554b',18);
  return destroyed;
}
function updateExplosions(dt){
  for(let i=explosions.length-1;i>=0;i--){
    const e=explosions[i];e.age+=dt;const p=Math.min(e.age/e.life,1),flare=Math.sin(Math.min(p*2.7,1)*Math.PI*.5);
    e.core.scale.setScalar(.1+flare*8);e.glow.scale.setScalar(.1+flare*12);e.ring.scale.setScalar(.2+p*17);e.smoke.scale.set(.4+p*7,.5+p*5,.4+p*7);
    e.core.material.opacity=(1-p)*.95;e.glow.material.opacity=(1-p)*.68;e.ring.material.opacity=(1-p)*.9;e.smoke.material.opacity=(1-p)*.42;
    if(e.age>=e.life){e.group.removeFromParent();for(const child of e.group.children){child.geometry.dispose();child.material.dispose();}explosions.splice(i,1);}
  }
}

const palette={rose:'#bd6f64',red:'#c45c4d',orange:'#dc895c',yellow:'#e7c56e',gold:'#d5aa62',blue:'#6e9fb0',teal:'#71a9a0',green:'#77956c',purple:'#947da8',pink:'#d692aa',white:'#e7e2d4',black:'#30353a',silver:'#aeb9b8',golden:'#d5aa62'};
function colorFrom(text){for(const [name,color] of Object.entries(palette))if(text.includes(name))return color;return ['#d3a87a','#9ba982','#819ea0','#bb9075','#ada1bb'][Math.floor(rand()*5)];}
function setRainbow(enabled=true){
  if(!enabled){if(rainbowGroup)rainbowGroup.removeFromParent();rainbowGroup=null;return;}
  if(rainbowGroup)return;
  rainbowGroup=new THREE.Group();scene.add(rainbowGroup);
  const colors=['#ff3547','#ff922e','#ffe348','#62df70','#38c8e8','#4278ff','#b75cff'];
  colors.forEach((color,index)=>{
    const radius=22-index*.72,points=[];
    for(let i=0;i<=48;i++){const angle=Math.PI*i/48;points.push(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,0));}
    const curve=new THREE.CatmullRomCurve3(points);
    const band=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.48,8,false),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.96,depthWrite:false,fog:false}));
    band.renderOrder=10;rainbowGroup.add(band);
  });
  scene.background.set('#829abd');scene.fog.color.set('#829abd');scene.fog.density=.006;
}
function updateRainbow(){if(!rainbowGroup)return;rainbowGroup.position.set(player.x+Math.sin(player.yaw)*48,terrainHeight(player.x,player.z)+8,player.z-Math.cos(player.yaw)*48);rainbowGroup.rotation.y=-player.yaw;}
function setTime(kind){
  timeState=kind;
  if(kind==='night'){
    scene.background.set('#111b31');scene.fog.color.set('#202a38');scene.fog.density=.007;
    sun.intensity=.23;hemi.intensity=.35;ambient.intensity=.2;sun.color.set('#9ab7e1');sun.userData.ball.visible=false;stars.material.opacity=.95;
  }else if(kind==='day'){
    scene.background.set('#a9c5cb');scene.fog.color.set('#a9c5cb');scene.fog.density=.006;
    sun.intensity=3.6;hemi.intensity=2.1;ambient.intensity=.4;sun.color.set('#fff1d2');sun.userData.ball.visible=true;stars.material.opacity=0;
  }else{
    scene.background.set('#b6a48c');scene.fog.color.set('#b6a48c');scene.fog.density=.0085;
    sun.intensity=3.2;hemi.intensity=1.65;ambient.intensity=.28;sun.color.set('#ffe3b4');sun.userData.ball.visible=true;stars.material.opacity=0;
  }
  document.querySelector('#world-clock').textContent=kind==='night'?'11:48 PM':kind==='day'?'12:26 PM':'07:42 AM';
  document.querySelector('#world-name').textContent=kind==='night'?'THE QUIET HOURS':kind==='day'?'A BRIGHTER DAY':'THE FIRST MORNING';
}
function setWeather(kind){
  weatherState=kind;const label=document.querySelector('#weather-label'),icon=document.querySelector('#weather-icon');
  if(rainGroup&&rainGroup.userData.type&&rainGroup.userData.type!==kind){scene.remove(rainGroup);rainGroup=null;}
  if(kind==='rain'){
    if(!rainGroup){rainGroup=new THREE.Group();scene.add(rainGroup);const geo=new THREE.BufferGeometry(),positions=[];for(let i=0;i<450;i++)positions.push((rand()-.5)*65,rand()*25,(rand()-.5)*65);geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const rain=new THREE.Points(geo,new THREE.PointsMaterial({color:'#c7dce5',size:.07,transparent:true,opacity:.68}));rainGroup.add(rain);rainGroup.userData.points=rain;rainGroup.userData.type='rain';}
    rainGroup.visible=true;label.textContent='SOFT RAIN';icon.textContent='☂';scene.fog.density=.015;scene.fog.color.set('#788892');scene.background.set('#7d8f97');
  }else if(kind==='snow'){
    if(!rainGroup){rainGroup=new THREE.Group();scene.add(rainGroup);const geo=new THREE.BufferGeometry(),positions=[];for(let i=0;i<450;i++)positions.push((rand()-.5)*65,rand()*25,(rand()-.5)*65);const snow=new THREE.Points(geo,new THREE.PointsMaterial({color:'#fffaf0',size:.12,transparent:true,opacity:.86}));rainGroup.add(snow);geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));rainGroup.userData.points=snow;rainGroup.userData.type='snow';}
    rainGroup.visible=true;rainGroup.userData.snow=true;label.textContent='FIRST SNOW';icon.textContent='❄';
  }else{
    if(rainGroup)rainGroup.visible=false;scene.fog.density=timeState==='night'?.007:.0085;scene.fog.color.copy(scene.background);label.textContent=timeState==='night'?'CLEAR NIGHT':'GOLDEN HOUR';icon.textContent=timeState==='night'?'☾':'☀';
  }
}
function showToast(text){const node=document.querySelector('#toast');node.textContent=text;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2500);}
function eventCard(title,description){
  const events=document.querySelector('#events'),card=document.createElement('div');card.className='event';card.innerHTML=`<small>✦ REALITY UPDATED</small><span></span>`;card.querySelector('span').textContent=description||title;events.prepend(card);
  while(events.children.length>3)events.lastElementChild.remove();setTimeout(()=>{if(card.isConnected)card.style.opacity='.72';},5000);
}
function spawnWish(text){
  const lower=text.toLowerCase(),color=colorFrom(lower);
  const at=new THREE.Vector3(player.x+Math.sin(player.yaw)*7,terrainHeight(player.x+Math.sin(player.yaw)*7,player.z-Math.cos(player.yaw)*7),player.z-Math.cos(player.yaw)*7);
  const position=new THREE.Vector3(at.x,at.y,at.z),group=new THREE.Group();group.position.copy(position);generated.add(group);
  let kind='wonder',noun='wonder';
  const say=(match,type,name)=>{if(match.test(lower)){kind=type;noun=name;return true;}return false;};
  if(!say(/castle|palace|fortress|tower/, 'castle','a little castle')) {
  if(!say(/house|cabin|home|cottage|villa|building/, 'house','a new home')) {
  if(!say(/tree|redwood|pine|oak|willow|forest/, 'tree','a tree')) {
  if(!say(/flower|rose|tulip|garden/, 'flower','a patch of flowers')) {
  if(!say(/dog|cat|fox|wolf|bear|horse|deer|bird|dragon|whale|animal/, 'creature','a new friend')) {
  if(!say(/car|truck|motorcycle|bike|bicycle|train|airplane|plane|spaceship|boat/, 'vehicle','a curious vehicle')) {
  if(!say(/moon|planet|star|sun|comet/, 'celestial','a visitor from the sky')) {
  if(!say(/bridge/, 'bridge','a bridge')) {
  if(!say(/mountain|volcano|cliff/, 'mountain','a little mountain')) {
  if(!say(/statue|sculpture|monument/, 'statue','a sculpture')) {
  if(!say(/fountain|waterfall/, 'fountain','a fountain')) { say(/.$/, 'wonder', 'a new wonder'); }
  }
  }
  }
  }
  }
  }
  }
  }
  }
  }
  const big=/giant|huge|massive|enormous|colossal|towering/.test(lower)?2.4:/tiny|little|small|miniature/.test(lower)?.55:1;
  const gold=material(color,.56,{metalness:/gold|metal|chrome|silver/.test(lower)?.55:.08,emissive:/glow|neon|luminous|light/.test(lower)?color:'#000000',emissiveIntensity:/glow|neon|luminous|light/.test(lower)?.45:0});
  const bark=material('#70543e'),leaf=material(color,.9,{flatShading:true});
  if(kind==='tree'){
    addMesh(group,new THREE.CylinderGeometry(.28*big,.46*big,2.4*big,7),bark,[0,1.2*big,0]);
    if(/redwood|giant|ancient/.test(lower)){for(let i=0;i<4;i++)addMesh(group,new THREE.ConeGeometry((2.3-i*.4)*big,2.6*big,8),leaf,[0,(2.3+i*1.35)*big,0]);}
    else for(let i=0;i<3;i++)addMesh(group,new THREE.IcosahedronGeometry(1.45*big,1),leaf,[(rand()-.5)*.8,2.6*big+rand()*1.3*big,(rand()-.5)*.8],[1,1.15,.9]);
  }else if(kind==='house'){
    addMesh(group,new THREE.BoxGeometry(4*big,2.8*big,3.8*big),material(/glass/.test(lower)?'#b2d8d1':color,.45,{metalness:.1,transparent:/glass/.test(lower),opacity:/glass/.test(lower)?.62:1}),[0,1.4*big,0]);
    const roof=addMesh(group,new THREE.ConeGeometry(3.35*big,2.3*big,4),gold,[0,3.8*big,0]);roof.rotation.y=Math.PI/4;
    addMesh(group,new THREE.BoxGeometry(.8*big,1.8*big,.12),bark,[0,.9*big,1.92*big]);
    if(/glass/.test(lower))for(const x of [-1.25,1.25])addMesh(group,new THREE.BoxGeometry(.8*big,1*big,.08),material('#d9eff0',.18,{emissive:'#92c9cc',emissiveIntensity:.18}),[x,1.75*big,1.94*big]);
  }else if(kind==='castle'){
    addMesh(group,new THREE.BoxGeometry(5*big,4*big,4*big),gold,[0,2*big,0]);
    for(const x of [-2.4,2.4])for(const z of [-1.8,1.8]){addMesh(group,new THREE.CylinderGeometry(.62*big,.72*big,5.7*big,8),gold,[x,2.7*big,z]);addMesh(group,new THREE.ConeGeometry(.8*big,1.9*big,8),material('#78607b'),[x,6.35*big,z]);}
    addMesh(group,new THREE.ConeGeometry(1.35*big,2.5*big,4),material('#78607b'),[0,5.1*big,0]);
  }else if(kind==='flower'){
    for(let i=0;i<15;i++){let x=(rand()-.5)*4*big,z=(rand()-.5)*3*big;addMesh(group,new THREE.CylinderGeometry(.025,.035,.8*big,5),material('#698051'),[x,.4*big,z],null,false,false);addMesh(group,new THREE.SphereGeometry(.18*big,8,6),gold,[x,.83*big,z],null,false,false);}
  }else if(kind==='creature'){
    const body=addMesh(group,new THREE.SphereGeometry(.75*big,16,12),gold,[0,.95*big,0],[1.35,1,1]);
    addMesh(group,new THREE.SphereGeometry(.49*big,14,10),gold,[.85*big,1.4*big,.05],[.88,1,.85]);
    for(const x of [-.38,.38]){addMesh(group,new THREE.CylinderGeometry(.11*big,.14*big,.74*big,7),gold,[x,.38*big,.35*big]);addMesh(group,new THREE.SphereGeometry(.12*big,8,6),material('#fff3d4'),[.99*big,1.55*big,x*.45]);}
    if(/dragon/.test(lower)){for(let s of [-1,1])addMesh(group,new THREE.ConeGeometry(.8*big,1.65*big,4),gold,[0,1.75*big,s*1.05*big],[.8,.22,1]);}
  }else if(kind==='vehicle'){
    addMesh(group,new THREE.BoxGeometry(3.6*big,.8*big,1.8*big),gold,[0,.75*big,0]);
    if(/airplane|plane|spaceship/.test(lower)){addMesh(group,new THREE.BoxGeometry(.5*big,.2*big,6.2*big),gold,[0,.72*big,0]);addMesh(group,new THREE.ConeGeometry(.48*big,1.4*big,8),gold,[0,.78*big,-2.1*big],[1,1,2]);}
    else{addMesh(group,new THREE.BoxGeometry(2*big,.65*big,1.45*big),material('#a9c6c5',.25),[0,1.35*big,-.05]);for(const x of [-1.15,1.15])for(const z of [-.7,.7])addMesh(group,new THREE.TorusGeometry(.3*big,.09*big,7,12),material('#30343a'),[x,.35*big,z],[1,1,1],true,true);}
  }else if(kind==='celestial'){
    const radius=/moon|planet/.test(lower)?2.2:1.45;
    const orb=addMesh(group,new THREE.SphereGeometry(radius*big,32,24),material(/moon/.test(lower)?'#d8d2bf':color,.7,{emissive:color,emissiveIntensity:.28}),[0,4*big,0]);
    if(/ring|saturn/.test(lower)){const ring=addMesh(group,new THREE.TorusGeometry(radius*1.6*big,.13*big,8,48),gold,[0,4*big,0]);ring.rotation.x=1.2;}
  }else if(kind==='bridge'){
    const bridge=addMesh(group,new THREE.BoxGeometry(9*big,.45*big,2.6*big),gold,[0,2.1*big,0]);bridge.rotation.z=-.1;
    for(const x of [-3.6,3.6])addMesh(group,new THREE.CylinderGeometry(.16*big,.2*big,3*big,8),gold,[x,1.1*big,0]);
  }else if(kind==='mountain'){
    addMesh(group,new THREE.ConeGeometry(5*big,11*big,7,2),material(color,1,{flatShading:true}),[0,5.5*big,0]);
    addMesh(group,new THREE.ConeGeometry(1.8*big,2.3*big,7),material('#eee4d0'),[0,10.2*big,0]);
  }else if(kind==='statue'){
    addMesh(group,new THREE.CylinderGeometry(.8*big,1.2*big,.7*big,8),gold,[0,.35*big,0]);
    addMesh(group,new THREE.CylinderGeometry(.48*big,.72*big,2.8*big,8),gold,[0,2*big,0]);
    addMesh(group,new THREE.SphereGeometry(.72*big,12,10),gold,[0,3.85*big,0]);
  }else if(kind==='fountain'){
    addMesh(group,new THREE.CylinderGeometry(2.4*big,2.5*big,.55*big,32),gold,[0,.3*big,0]);
    addMesh(group,new THREE.CylinderGeometry(.32*big,.48*big,2.4*big,12),gold,[0,1.45*big,0]);
    addMesh(group,new THREE.SphereGeometry(.28*big,12,8),material('#b5dce0',.16,{emissive:'#487d86',emissiveIntensity:.25}),[0,2.7*big,0]);
  }else{
    // Any phrase, including things this little world has never heard of, gets a one-off sculpture.
    const forms=[new THREE.DodecahedronGeometry(1.35*big,1),new THREE.TorusKnotGeometry(.75*big,.23*big,96,10),new THREE.OctahedronGeometry(1.55*big,1)];
    addMesh(group,forms[Math.floor(rand()*forms.length)],gold,[0,1.55*big,0]);
    for(let i=0;i<3;i++){const orb=addMesh(group,new THREE.SphereGeometry(.22*big,12,9),material(color,.4,{emissive:color,emissiveIntensity:.5}),[(rand()-.5)*3*big,2+rand()*2*big,(rand()-.5)*2*big]);orb.userData.orbit=true;}
  }
  const height=kind==='celestial'?terrainHeight(position.x,position.z):terrainHeight(position.x,position.z);
  group.position.y=height-.35;group.scale.setScalar(.04);group.userData.targetScale=big;group.userData.rise=true;props.push(group);
  burstAt(new THREE.Vector3(position.x,height+.3,position.z),color,38);
  const descriptor=/giant|huge|massive|towering/.test(lower)?'A new landmark just took root.':`You imagined ${noun}. It is here now.`;
  return {description:descriptor,position};
}
function addOcean(){
  const x=player.x+Math.sin(player.yaw)*12+Math.cos(player.yaw)*7,z=player.z-Math.cos(player.yaw)*12+Math.sin(player.yaw)*7;
  const sea=addMesh(generated,new THREE.CircleGeometry(17,64),new THREE.MeshStandardMaterial({color:'#3e8492',roughness:.2,metalness:.18,transparent:true,opacity:.9}),[x,terrainHeight(x,z)+.12,z],[1.45,1,.9],false,true);
  sea.rotation.x=-Math.PI/2;sea.userData.water=true;props.push(sea);return 'A new stretch of water found its way into the world.';
}
function interpret(text){
  const lower=text.toLowerCase();
  if(/\b(rainbow|rainbows)\b/.test(lower)&&( /sky|skies|horizon|above|weather|make|create|add|put|show/.test(lower) || lower.includes('make the sky'))){setRainbow(true);eventCard('A rainbow appeared','A bridge of color spans the valley.');showToast('A LITTLE MAGIC, OVERHEAD');return;}
  if(/\b(remove|clear|stop|turn off|no more)\b/.test(lower)&&/rainbow|rainbows/.test(lower)){setRainbow(false);eventCard('The rainbow fades','The sky is yours again.');showToast('SKY RESET');return;}
  if(/\b(explode|explosion|blow ?(it|stuff|things|everything|up)|blasts?|detonate|nuke)\b/.test(lower)){
    const forward=new THREE.Vector3(Math.sin(player.yaw)*12,0,-Math.cos(player.yaw)*12);
    const at=new THREE.Vector3(player.x+forward.x,terrainHeight(player.x+forward.x,player.z+forward.z),player.z+forward.z);
    const destroyed=explodeAt(at,lower);eventCard(destroyed?'The landscape recoils':'A flash across the valley',destroyed?`${destroyed} things were removed in the blast.`:'The blast rings through the hills.');showToast('BOOM');return;
  }
  if(/\b(night|midnight|dark|stars out)\b/.test(lower)){setTime('night');eventCard('Night falls','The stars have been waiting for you.');showToast('THE WORLD IS QUIETER NOW');return;}
  if(/\b(noon|daytime|bright day|morning|sunrise|sunny day)\b/.test(lower)){setTime('day');eventCard('A brighter day','The sun climbs over the hills.');showToast('A NEW DAY, JUST LIKE THAT');return;}
  if(/\b(sunset|golden hour|dawn|sunrise)\b/.test(lower)){setTime('morning');eventCard('The light shifts','The hills turn the color of honey.');showToast('GOLDEN HOUR');return;}
  if(/\b(rain|raining|storm|downpour)\b/.test(lower)){setWeather('rain');eventCard('Rain, softly','The whole valley smells like rain.');showToast('THE SKY LET GO');return;}
  if(/\b(snow|snowing|snowfall|blizzard)\b/.test(lower)){setWeather('snow');eventCard('First snow','Little flakes drift across the valley.');showToast('A QUIETER KIND OF WEATHER');return;}
  if(/\b(clear (the )?(sky|weather)|stop (the )?rain|sunny|weather clear)\b/.test(lower)){setWeather('clear');eventCard('The clouds pass','The light returns.');showToast('SKIES CLEAR');return;}
  if(/\b(sky|sunset|aurora|northern lights)\b/.test(lower)&&/purple|pink|blue|red|green|orange|violet|teal/.test(lower)){
    const c=colorFrom(lower);scene.background.set(c);scene.fog.color.set(c);scene.fog.density=.0075;
    if(/star|night|dark/.test(lower))setTime('night');eventCard('A different sky','The horizon is yours to repaint.');showToast('LOOK UP');return;
  }
  if(/\b(ocean|sea|lake|waterfall|river)\b/.test(lower)&&/add|make|create|build|put|bring|summon|want|wish/.test(lower)){const msg=addOcean();eventCard('Water found its way',msg);showToast('A NEW HORIZON');return;}
  if(/\b(fly|flying|let me fly|give me wings)\b/.test(lower)){
    player.fly=!player.fly;showToast(player.fly?'THE GROUND CAN WAIT':'BACK ON SOLID GROUND');eventCard('Gravity, negotiated',player.fly?'You can drift above the valley now.':'Your feet find the earth again.');return;
  }
  if(/\b(teleport|take me|go to|travel to)\b/.test(lower)){
    if(/lake|water|shore|ocean/.test(lower)){player.x=18;player.z=-24;}else if(/village|house|home/.test(lower)){player.x=-8;player.z=-18;}else if(/mountain|hill/.test(lower)){player.x=0;player.z=-72;}else{player.x=(rand()-.5)*85;player.z=-15-rand()*65;}
    player.y=terrainHeight(player.x,player.z)+1.72;eventCard('Somewhere new','The world folded, just for a moment.');showToast('YOU ARE SOMEWHERE NEW');return;
  }
  if(/\b(reset|undo everything|start over|clear all)\b/.test(lower)){resetWorld();showToast('A FRESH PAGE');return;}
  if(/\b(remove|delete|destroy|erase)\b/.test(lower)&&props.length){const prop=props.pop();generated.remove(prop);eventCard('A little less crowded','Your last creation has vanished.');showToast('GONE, GENTLY');return;}
  const result=spawnWish(text);document.querySelector('#intro').classList.add('is-hidden');
  eventCard('You said “'+text.slice(0,35)+(text.length>35?'…':'')+'”',result.description);
  showToast(result.description.toUpperCase());
}
function resetWorld(){
  for(const p of props)generated.remove(p);props.length=0;
  setRainbow(false);
  if(rainGroup)rainGroup.visible=false;weatherState='golden hour';setTime('morning');setWeather('clear');
  player.x=0;player.z=7;player.yaw=0;player.pitch=-.035;player.fly=false;
  document.querySelector('#events').replaceChildren();document.querySelector('#intro').classList.remove('is-hidden');
}

document.querySelector('#command-form').addEventListener('submit',e=>{
  e.preventDefault();const input=document.querySelector('#wish'),text=input.value.trim();if(!text)return;
  input.value='';input.blur();interpret(text);
});
document.querySelectorAll('.suggestion').forEach(button=>button.addEventListener('click',()=>{
  const text=button.dataset.prompt;document.querySelector('#wish').value=text;interpret(text);
}));
document.querySelector('#reset-world').addEventListener('click',resetWorld);
document.querySelector('#sound-toggle').addEventListener('click',()=>{
  soundOn=!soundOn;document.querySelector('#sound-icon').textContent=soundOn?'♫':'♪';
  if(soundOn){try{audioContext=audioContext||new AudioContext();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=174;gain.gain.value=.018;osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+1.6);}catch{}showToast('A SMALL BREATH OF SOUND');}
  else showToast('SOUND RESTING');
});

renderer.domElement.addEventListener('click',()=>{if(innerWidth>760 && document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{document.body.classList.toggle('locked',document.pointerLockElement===renderer.domElement);});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement){player.yaw-=e.movementX*.0022;player.pitch=clamp(player.pitch-e.movementY*.0018,-1.25,1.25);}});
document.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){keys.add(e.code);e.preventDefault();}if(e.code==='Space'&&player.fly)player.y+=2;});
document.addEventListener('keyup',e=>keys.delete(e.code));
let touchStart=null;
renderer.domElement.addEventListener('touchstart',e=>{if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{if(!touchStart||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;player.yaw-=dx*.003;player.pitch=clamp(player.pitch-dy*.002,-1.2,1.2);touchStart={x:t.clientX,y:t.clientY};},{passive:true});
renderer.domElement.addEventListener('touchend',()=>touchStart=null);
document.querySelectorAll('.mobile-controls button').forEach(button=>{
  const move=button.dataset.move,down=e=>{e.preventDefault();touchMoves.add(move);},up=e=>{e.preventDefault();touchMoves.delete(move);};
  button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointerleave',up);button.addEventListener('pointercancel',up);
});

// Bring new things into the world gently, then let them settle into the landscape.
const previousFrame=frame;
frame=function(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;
  updatePlayer(dt,t);
  for(const tree of foliageGroups)tree.rotation.z=tree.userData.baseRot+Math.sin(t*.7+tree.userData.sway)*.008;
  for(const cloud of clouds){cloud.position.x+=cloud.userData.speed*dt;if(cloud.position.x>145)cloud.position.x=-145;}
  if(water){water.position.y=waterBase+Math.sin(t*.7)*.035;water.material.opacity=.88+Math.sin(t*1.2)*.04;}
  for(const p of props){if(p.userData.rise){p.scale.lerp(new THREE.Vector3(p.userData.targetScale,p.userData.targetScale,p.userData.targetScale),1-Math.exp(-dt*3.2));if(p.scale.x>p.userData.targetScale*.97){p.scale.setScalar(p.userData.targetScale);p.userData.rise=false;}}if(p.userData.water)p.position.y+=Math.sin(t*.8)*.0008;}
  if(rainGroup?.visible){const points=rainGroup.userData.points,attr=points.geometry.attributes.position,limit=Math.hypot(player.x,player.z)+30;for(let i=0;i<attr.count;i++){let y=attr.getY(i)-dt*(rainGroup.userData.snow?1.8:12);if(y<0)y=23;attr.setY(i,y);}attr.needsUpdate=true;rainGroup.position.set(player.x,0,player.z);}
  updateRainbow();updateExplosions(dt);updateParticles(dt);drawMap();renderer.render(scene,camera);
};

frame();
setTimeout(()=>document.querySelector('#loading').classList.add('done'),700);

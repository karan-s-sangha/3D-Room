import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import gsap from 'gsap';

// ── Scene ──────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1117);

const camera = new THREE.PerspectiveCamera(28, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(21, 18, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

// ── Camera controls ────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 4, 0);
controls.minDistance = 2;
controls.maxDistance = 65;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI * 0.5;
controls.minAzimuthAngle = 0;   // comment both azimuth lines out for full 360°
controls.maxAzimuthAngle = Math.PI * 0.5;

// ── Intro / loading screen ─────────────────────────────────
const introEl       = document.getElementById('intro');
const introBar      = document.getElementById('intro-bar');
const introPct      = document.getElementById('intro-pct');
const introProgress = document.getElementById('intro-progress-wrap');
const enterWrap     = document.getElementById('enter-wrap');
const enterBtn      = document.getElementById('enter-btn');

function dismissIntro() {
  gsap.to(introProgress, {
    opacity: 0, y: 10, duration: 0.4, ease: 'power2.in',
    onComplete: () => {
      introProgress.style.display = 'none';
      enterWrap.style.pointerEvents = 'all';
      gsap.to(enterWrap, { opacity: 1, duration: 0.5, ease: 'power2.out' });
      gsap.from('#enter-btn',   { scale: 0.75, duration: 0.6, ease: 'back.out(1.8)' });
      gsap.from('#enter-label', { opacity: 0, y: 8, duration: 0.4, delay: 0.15, ease: 'power2.out' });
    },
  });
}

const loadingManager = new THREE.LoadingManager(
  dismissIntro,
  (_url, loaded, total) => {
    const pct = Math.round((loaded / total) * 100);
    introBar.style.width = pct + '%';
    introPct.textContent = pct + '%';
  },
);

// ── Textures ───────────────────────────────────────────────
const texLoader = new THREE.TextureLoader(loadingManager);

function loadTex(path) {
  const t = texLoader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.channel = 1;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

const mat1 = new THREE.MeshBasicMaterial({ map: loadTex('/texture1.jpg') });
const mat2 = new THREE.MeshBasicMaterial({ map: loadTex('/texture2.jpg') });
const mat3 = new THREE.MeshBasicMaterial({ map: loadTex('/texture3.jpg') });
const mat4 = new THREE.MeshBasicMaterial({ map: loadTex('/texture4.jpg') });

// Maps each baked texture atlas to its Blender object names
const textureMap = [
  {
    material: mat1,
    nodes: [
      'Cube001', 'Cube018', 'Cube036', 'Cube054',
      'Plane001', 'Plane002', 'Plane003', 'Plane004',
      'Plane005', 'Plane006', 'Plane007', 'Plane008',
      'Plane009', 'Plane010', 'Plane011', 'Plane036', 'Plane041', 'Plane044',
      'Plane045', 'Plane051_chair', 'Plane059', 'Plane061', 'Plane139', 'Plane140',
    ],
  },
  {
    material: mat2,
    nodes: [
      'Keyboard', 'Chair',
      'Cube089', 'Cube099', 'Cube131',
      'Curve', 'Curve002', 'Cylinder', 'github',
      'Plane086', 'Plane088', 'Plane089', 'Plane092', 'Plane095',
      'Plane098', 'Plane100', 'Plane102', 'Plane103', 'Plane105',
      'Plane119', 'Plane121', 'Plane123', 'Plane125', 'Plane127',
      'Plane129', 'Plane144', 'Plane145', 'Plane146', 'Plane147', 'Plane148',
    ],
  },
  {
    material: mat3,
    nodes: [
      'Cube075', 'Cube077', 'Cube148', 'Cube158', 'Cube172',
      'Cylinder010', 'Cylinder012', 'Icosphere',
      'Plane', 'Plane109', 'Plane113', 'Plane114',
      'Plane131', 'Plane133', 'Plane135', 'Plane137', 'rug',
    ],
  },
  {
    material: mat4,
    nodes: [
      'Hanging leafs', 'Hanging Lights',
      'Cube069', 'Cube168', 'Cube002', 'Cube171', 'Cylinder021',
      'Plane063', 'Plane064', 'Plane065', 'Plane066',
      'Plane068', 'Plane070', 'Plane072', 'Plane074',
      'Plane076', 'Plane077', 'Plane141', 'Plane142', 'Plane143', 'Plane149',
      'Star', 'Vert',
    ],
  },
];

function applyMaterial(gltfScene, nodes, material) {
  nodes.forEach(name => {
    const obj = gltfScene.getObjectByName(name);
    if (obj) obj.traverse(child => { if (child.isMesh) child.material = material; });
  });
}

// ── Environment map (glass reflections) ───────────────────
const envMap = new THREE.CubeTextureLoader(loadingManager).load([
  '/glass_reflection/px.jpg', '/glass_reflection/nx.jpg',
  '/glass_reflection/py.jpg', '/glass_reflection/ny.jpg',
  '/glass_reflection/pz.jpg', '/glass_reflection/nz.jpg',
]);

// ── Raycaster (hover + click) ──────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObj = null;
let gltfRoot = null;

const pointerObjects = new Set([
  'Plane146', 'Plane147', 'Plane148', 'github', 'Curve', 'Curve002',
]);

const hoverExceptions = new Set([
  'Plane', 'Plane001', 'Plane002', 'Plane008', 'Plane045',
  'Plane086', 'Plane137', 'Plane144', 'Plane145', 'Plane149',
  'Icosphere', 'Cylinder010', 'Cylinder021', 'Cube168',
]);

window.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// ── Screen video (Plane002) ────────────────────────────────
const video = document.createElement('video');
video.src = '/screen.mp4';
video.loop = true;
video.muted = true;
video.playsInline = true;
video.pause = () => {};
Object.assign(video.style, {
  position: 'fixed', top: '-9999px', left: '-9999px',
  width: '1px', height: '1px', pointerEvents: 'none', opacity: '0',
});
document.body.appendChild(video);
let videoStarted = false;
video.addEventListener('ended', () => { video.currentTime = 0; video.play(); });

// drawImage each frame bypasses Three.js's requestVideoFrameCallback chain,
// which can silently break during fullscreen transitions.
const videoCanvas = document.createElement('canvas');
videoCanvas.width = 1280;
videoCanvas.height = 720;
video.addEventListener('loadedmetadata', () => {
  videoCanvas.width  = video.videoWidth;
  videoCanvas.height = video.videoHeight;
});
const videoCtx     = videoCanvas.getContext('2d');
const videoTexture = new THREE.CanvasTexture(videoCanvas);
videoTexture.colorSpace = THREE.SRGBColorSpace;
videoTexture.flipY = false;
const videoMat = new THREE.MeshBasicMaterial({ map: videoTexture });

// setInterval survives hidden-page throttling (rAF stops when the page is hidden)
setInterval(() => {
  if (videoStarted && video.paused) video.play().catch(() => {});
}, 250);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && videoStarted) video.play().catch(() => {});
});

// ── GLTF model ─────────────────────────────────────────────
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader(dracoLoader);
loader.load('/room3.glb', (gltf) => {
  const lights = [];
  gltf.scene.traverse(child => { if (child.isLight) lights.push(child); });
  lights.forEach(l => l.removeFromParent());

  textureMap.forEach(({ material, nodes }) => applyMaterial(gltf.scene, nodes, material));
  applyMaterial(gltf.scene, ['Plane002'], videoMat);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    transmission: 0.9, opacity: 1, transparent: true,
    metalness: 0, roughness: 0, ior: 1.5, specularIntensity: 1,
    envMap, envMapIntensity: 1.5, side: THREE.DoubleSide,
  });
  gltf.scene.traverse(child => {
    if (child.isMesh && child.name.toLowerCase().includes('glass')) child.material = glassMaterial;
  });

  // Fan blades
  ['Plane003', 'Plane004', 'Plane005'].forEach(name => {
    const obj = gltf.scene.getObjectByName(name);
    if (obj) gsap.to(obj.rotation, { x: `-=${Math.PI * 8}`, duration: 8, ease: 'none', repeat: -1 });
  });

  // Clock hands
  ['Plane006', 'Plane009', 'Plane011'].forEach(name => {
    const obj = gltf.scene.getObjectByName(name);
    if (obj) gsap.to(obj.rotation, { z: `-=${Math.PI * 64}`, duration: 8, ease: 'none', repeat: -1 });
  });

  // Chair oscillation
  gltf.scene.traverse(child => {
    if (child.name.toLowerCase().includes('chair')) {
      const base = child.rotation.y;
      gsap.fromTo(child.rotation,
        { y: base - 0.6 },
        { y: base + 0.6, duration: 5, ease: 'sine.inOut', yoyo: true, repeat: -1 },
      );
    }
  });

  gltf.scene.scale.set(0, 0, 0);
  scene.add(gltf.scene);
  gltfRoot = gltf.scene;
});

// ── Render loop ────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (videoStarted && video.readyState >= 2) {
    videoCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
    videoTexture.needsUpdate = true;
  }

  if (gltfRoot) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(gltfRoot.children, true);

    let topObj = null;
    let cursorName = null;

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && obj.parent !== gltfRoot) obj = obj.parent;
      cursorName = obj.name;
      if (!hoverExceptions.has(obj.name)) topObj = obj;
    }

    renderer.domElement.style.cursor = pointerObjects.has(cursorName) ? 'pointer' : 'default';

    if (topObj !== hoveredObj) {
      if (hoveredObj) {
        const s = hoveredObj.userData.origScale;
        gsap.killTweensOf(hoveredObj.scale);
        gsap.to(hoveredObj.scale, { x: s.x, y: s.y, z: s.z, duration: 0.3, ease: 'power2.out' });
      }
      hoveredObj = topObj;
      if (hoveredObj) {
        if (!hoveredObj.userData.origScale) hoveredObj.userData.origScale = hoveredObj.scale.clone();
        const s = hoveredObj.userData.origScale;
        gsap.killTweensOf(hoveredObj.scale);
        gsap.to(hoveredObj.scale, { x: s.x * 1.2, y: s.y * 1.2, z: s.z * 1.2, duration: 0.3, ease: 'power2.out' });
      }
    }
  }

  renderer.render(scene, camera);
}

animate();

// ── Window events ──────────────────────────────────────────
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  // FOV stays at 28° always. On screens narrower than 16:9, zoom in via
  // camera.zoom (scales the projection, doesn't change FOV or visible content).
  camera.zoom = aspect < 16 / 9 ? Math.min((16 / 9) / aspect, 2.5) : 1;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('dblclick', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});

// ── Project data ───────────────────────────────────────────
const projects = {
  Plane146: {
    title: 'Netflix Clone',
    description: 'This project is a Netflix-inspired application designed to replicate key features of the popular streaming platform. It allows users to browse movies and TV shows, switch between languages and regions, and perform user authentication in an intuitive, responsive interface.',
    link: 'https://github.com/karan-s-sangha/Netflix-Clone',
    image: '/Netflix.jpg',
  },
  Plane147: {
    title: 'Decked Out 2',
    description: 'Decked Out 2 is an adventurous and thrilling game inspired by the original Minecraft mini-game, Decked Out. Created by a passionate team of developers and artists including Karan Sangha, Ingeun Hwang, and Khin Win',
    link: 'https://github.com/karan-s-sangha/Decked-Out-2',
    image: '/Decked_Out_2.jpg',
  },
  Plane148: {
    title: 'Library Management',
    description: 'A library management system for tracking books, members, and borrowing history.',
    link: 'https://github.com/karan-s-sangha/Library_DataBase',
    image: '/Library_Management.jpg',
  },
};

// ── Project modal ──────────────────────────────────────────
const backdrop   = document.getElementById('modal-backdrop');
const modalCard  = document.getElementById('modal');
const modalHero  = document.getElementById('modal-hero');
const modalImg   = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalDesc  = document.getElementById('modal-desc');
const modalLink  = document.getElementById('modal-link');
const modalClose = document.getElementById('modal-close');
const staggerEls = ['#modal-tag', '#modal-title', '#modal-divider', '#modal-desc', '#modal-link'];

let modalOpen = false;

function openModal(planeName) {
  const data = projects[planeName];
  if (!data) return;
  modalTitle.textContent = data.title;
  modalDesc.textContent  = data.description;
  modalLink.href         = data.link;
  if (data.image) { modalImg.src = data.image; modalHero.classList.add('has-image'); }
  else            { modalImg.src = '';         modalHero.classList.remove('has-image'); }

  closeAllSocials();
  modalOpen = true;
  backdrop.style.pointerEvents = 'all';
  gsap.killTweensOf([backdrop, modalCard, ...staggerEls.map(s => document.querySelector(s))]);
  gsap.set(staggerEls, { opacity: 0, y: 16 });
  gsap.set(modalCard, { y: 40, opacity: 0, scale: 0.95 });
  gsap.to(backdrop, { opacity: 1, duration: 0.3, ease: 'power2.out' });
  gsap.to(modalCard, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', delay: 0.05 });
  gsap.to(staggerEls, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.07, delay: 0.18 });
}

function closeModal() {
  if (!modalOpen) return;
  modalOpen = false;
  gsap.to(staggerEls, { opacity: 0, y: 10, duration: 0.2, ease: 'power2.in', stagger: 0.04 });
  gsap.to(modalCard, { y: 20, opacity: 0, scale: 0.96, duration: 0.3, ease: 'power2.in', delay: 0.1 });
  gsap.to(backdrop, {
    opacity: 0, duration: 0.3, ease: 'power2.in', delay: 0.15,
    onComplete: () => { backdrop.style.pointerEvents = 'none'; },
  });
}

modalClose.addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

// ── Social cards ───────────────────────────────────────────
const githubCard    = document.getElementById('github-card');
const githubClose   = document.getElementById('github-close');
const linkedinCard  = document.getElementById('linkedin-card');
const linkedinClose = document.getElementById('linkedin-close');
const gmailCard     = document.getElementById('gmail-card');
const gmailClose    = document.getElementById('gmail-close');

function openGithubCard() {
  closeModal(); closeLinkedinCard(); closeGmailCard();
  githubCard.classList.add('open');
  gsap.killTweensOf(githubCard);
  gsap.to(githubCard,          { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' });
  gsap.from('#github-avatar',  { scale: 0.6, opacity: 0, duration: 0.5,  ease: 'back.out(2)',  delay: 0.1 });
  gsap.from('#github-username', { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.2 });
  gsap.from('#github-handle',  { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.27 });
  gsap.from('#github-divider', { scaleX: 0, duration: 0.4, ease: 'power2.out', delay: 0.32, transformOrigin: 'left' });
  gsap.from('#github-visit',   { opacity: 0, y: 8,  duration: 0.35, ease: 'power2.out', delay: 0.38 });
}

function closeGithubCard() {
  if (!githubCard.classList.contains('open')) return;
  githubCard.classList.remove('open');
  gsap.to(githubCard, { opacity: 0, y: '120%', duration: 0.4, ease: 'power3.in' });
}

function openLinkedinCard() {
  closeModal(); closeGithubCard(); closeGmailCard();
  linkedinCard.classList.add('open');
  gsap.killTweensOf(linkedinCard);
  gsap.to(linkedinCard,           { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' });
  gsap.from('#linkedin-avatar',   { scale: 0.6, opacity: 0, duration: 0.5,  ease: 'back.out(2)',  delay: 0.1 });
  gsap.from('#linkedin-username', { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.2 });
  gsap.from('#linkedin-handle',   { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.27 });
  gsap.from('#linkedin-divider',  { scaleX: 0, duration: 0.4, ease: 'power2.out', delay: 0.32, transformOrigin: 'left' });
  gsap.from('#linkedin-visit',    { opacity: 0, y: 8,  duration: 0.35, ease: 'power2.out', delay: 0.38 });
}

function closeLinkedinCard() {
  if (!linkedinCard.classList.contains('open')) return;
  linkedinCard.classList.remove('open');
  gsap.to(linkedinCard, { opacity: 0, y: '120%', duration: 0.4, ease: 'power3.in' });
}

function openGmailCard() {
  closeModal(); closeGithubCard(); closeLinkedinCard();
  gmailCard.classList.add('open');
  gsap.killTweensOf(gmailCard);
  gsap.to(gmailCard,          { opacity: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' });
  gsap.from('#gmail-avatar',  { scale: 0.6, opacity: 0, duration: 0.5,  ease: 'back.out(2)',  delay: 0.1 });
  gsap.from('#gmail-username', { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.2 });
  gsap.from('#gmail-address', { opacity: 0, y: 10, duration: 0.35, ease: 'power2.out', delay: 0.27 });
  gsap.from('#gmail-divider', { scaleX: 0, duration: 0.4, ease: 'power2.out', delay: 0.32, transformOrigin: 'left' });
  gsap.from('#gmail-visit',   { opacity: 0, y: 8,  duration: 0.35, ease: 'power2.out', delay: 0.38 });
}

function closeGmailCard() {
  if (!gmailCard.classList.contains('open')) return;
  gmailCard.classList.remove('open');
  gsap.to(gmailCard, { opacity: 0, y: '120%', duration: 0.4, ease: 'power3.in' });
}

function closeAllSocials() {
  closeGithubCard();
  closeLinkedinCard();
  closeGmailCard();
}

githubClose.addEventListener('click', closeGithubCard);
linkedinClose.addEventListener('click', closeLinkedinCard);
gmailClose.addEventListener('click', closeGmailCard);

// ── Canvas click routing ───────────────────────────────────
renderer.domElement.addEventListener('click', () => {
  if (!gltfRoot) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(gltfRoot.children, true);

  if (!intersects.length) { closeModal(); closeAllSocials(); return; }

  let obj = intersects[0].object;
  while (obj.parent && obj.parent !== gltfRoot) obj = obj.parent;

  if (projects[obj.name])    { openModal(obj.name);  return; }
  if (obj.name === 'github') { openGithubCard();     return; }
  if (obj.name === 'Curve')  { openLinkedinCard();   return; }
  if (obj.name === 'Curve002') { openGmailCard();    return; }

  closeModal(); closeAllSocials();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeAllSocials(); }
});

// ── Audio ──────────────────────────────────────────────────
const audio = new Audio('/Rubber_and_Brass.mp3');
audio.loop = true;
audio.volume = 0.6;

const audioBtn = document.getElementById('audio-btn');
let playing = false;

enterBtn.addEventListener('click', () => {
  gsap.to(introEl, {
    scale: 0, opacity: 0, duration: 0.6, ease: 'power3.in', transformOrigin: '50% 50%',
    onComplete: () => { introEl.style.display = 'none'; },
  });
  if (gltfRoot) {
    gsap.fromTo(gltfRoot.scale,
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1, duration: 20, ease: 'elastic.out(1, 0.55)', delay: 0.3 },
    );
  }
  videoStarted = true;
  video.play();
  audio.play();
  playing = true;
  audioBtn.classList.add('playing');
});

audioBtn.addEventListener('click', () => {
  if (playing) { audio.pause(); audioBtn.classList.remove('playing'); }
  else         { audio.play();  audioBtn.classList.add('playing'); }
  playing = !playing;
});

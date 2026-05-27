import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

// Config
const PARTICLE_COUNT = 15000;
const canvas = document.getElementById('three-canvas');
const video = document.getElementById('input_video');
const hudDetected = document.getElementById('detected');
const overlayInner = document.getElementById('overlayInner');

// Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.z = 600;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Particles
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const velocities = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const targets = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  positions[i * 3 + 0] = (Math.random() - 0.5) * 1600;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 900;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
  velocities[i * 3 + 0] = velocities[i * 3 + 1] = velocities[i * 3 + 2] = 0;
  targets[i * 3 + 0] = positions[i * 3 + 0];
  targets[i * 3 + 1] = positions[i * 3 + 1];
  targets[i * 3 + 2] = positions[i * 3 + 2];
  colors[i * 3 + 0] = 0.2;
  colors[i * 3 + 1] = 1.0;
  colors[i * 3 + 2] = 0.2;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 3,
  sizeAttenuation: true,
  vertexColors: true,
  transparent: true,
  opacity: 0.95
});
const points = new THREE.Points(geometry, material);
scene.add(points);

// Hand skeleton
const jointMaterial = new THREE.LineBasicMaterial({ color: 0xffdd66 });
let skeleton = null;
function buildSkeleton() {
  const segments = [];
  // connections from MediaPipe Hands (simplified edges)
  const edges = [
    [0,1],[1,2],[2,3],[3,4], // thumb
    [0,5],[5,6],[6,7],[7,8], // index
    [0,9],[9,10],[10,11],[11,12], // middle
    [0,13],[13,14],[14,15],[15,16], // ring
    [0,17],[17,18],[18,19],[19,20] // pinky
  ];
  for (const e of edges) { segments.push(0,0,0, 0,0,0); }
  const buffer = new Float32Array(segments);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
  skeleton = new THREE.LineSegments(g, jointMaterial);
  scene.add(skeleton);
}
buildSkeleton();

// Text to points
const textCanvas = document.createElement('canvas');
textCanvas.width = 1200; textCanvas.height = 450;
const tctx = textCanvas.getContext('2d');

function wrapText(text, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (tctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function generateTargetsFromText(text) {
  tctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
  tctx.fillStyle = 'white';
  tctx.textAlign = 'center';
  tctx.textBaseline = 'middle';

  let fontSize = 180;
  let lines = [];
  do {
    tctx.font = `bold ${fontSize}px sans-serif`;
    lines = wrapText(text, textCanvas.width * 0.9, fontSize * 1.1);
    if (lines.length * fontSize > textCanvas.height * 0.75) {
      fontSize -= 16;
    } else {
      break;
    }
  } while (fontSize > 24);

  const totalHeight = lines.length * fontSize * 1.1;
  let y = textCanvas.height / 2 - totalHeight / 2 + fontSize / 2;
  for (const line of lines) {
    tctx.fillText(line, textCanvas.width / 2, y);
    y += fontSize * 1.1;
  }

  const img = tctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
  const pts = [];
  for (let yPos = 0; yPos < textCanvas.height; yPos += 3) {
    for (let xPos = 0; xPos < textCanvas.width; xPos += 3) {
      const idx = (yPos * textCanvas.width + xPos) * 4;
      if (img[idx] > 120 || img[idx+1] > 120 || img[idx+2] > 120) {
        const nx = (xPos / textCanvas.width - 0.5) * 1200;
        const ny = -(yPos / textCanvas.height - 0.5) * 600;
        const nz = (Math.random() - 0.5) * 80;
        pts.push([nx, ny, nz]);
        if (pts.length >= PARTICLE_COUNT) break;
      }
    }
    if (pts.length >= PARTICLE_COUNT) break;
  }
  while (pts.length < PARTICLE_COUNT) pts.push([(Math.random() - 0.5) * 1200, (Math.random() - 0.5) * 600, (Math.random() - 0.5) * 80]);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    targets[i * 3 + 0] = pts[i][0];
    targets[i * 3 + 1] = pts[i][1];
    targets[i * 3 + 2] = pts[i][2];
    if (i < pts.length) {
      colors[i * 3 + 0] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;
    } else {
      colors[i * 3 + 0] = 0.2;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 0.2;
    }
  }
  geometry.attributes.color.needsUpdate = true;
}

// Default message
const messages = {
  1: 'WELCOME',
  2: 'I AM MAHI',
  3: 'AND THIS IS WHAT',
  4: 'I HAVE CREATED',
  5: 'USING JUST ONE PROMPT'
};
generateTargetsFromText('WELCOME');

// MediaPipe setup
const hands = new Hands({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5
});

let lastFingerCount = -1;
let fist = false;
let handPoint = new THREE.Vector3(0,0,0);

hands.onResults(results => {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    // Robust finger count using only the four main fingers + thumb only for the full five-finger gesture
    let count = 0;
    const fingerTips = [8,12,16,20];
    const fingerPips = [6,10,14,18];
    for (let i = 0; i < fingerTips.length; i++) {
      if (lm[fingerTips[i]].y < lm[fingerPips[i]].y) count++;
    }
    // Determine handedness if available to correctly interpret thumb direction
    let handedness = 'Right';
    if (results.multiHandedness && results.multiHandedness.length > 0) {
      try { handedness = results.multiHandedness[0].label || 'Right'; } catch(e){}
    }
    const thumbDiff = lm[4].x - lm[3].x;
    const thumbOpen = (handedness === 'Right') ? (thumbDiff < -0.02) : (thumbDiff > 0.02);
    if (count === 4 && thumbOpen) count = 5;
    fist = (count === 0);
    if (!fist) {
      const msg = messages[count] || 'HELLO';
      if (count !== lastFingerCount) {
        generateTargetsFromText(msg);
        lastFingerCount = count;
      }
      hudDetected.innerText = `Fingers: ${count} — displaying text in particles`;
      if (overlayInner) overlayInner.innerText = msg;
    } else {
      hudDetected.innerText = 'Fist detected — repelling particles';
      lastFingerCount = 0;
      if (overlayInner) overlayInner.innerText = '';
    }

    // Update handPoint (use wrist landmark 0)
    const nx = (lm[0].x - 0.5) * 2; // -1..1
    const ny = -(lm[0].y - 0.5) * 2;
    const nz = (lm[0].z) * 800;
    handPoint.set(nx * (window.innerWidth/2), ny * (window.innerHeight/2), nz + 0);

    // update skeleton geometry
    if (skeleton) {
      const pos = skeleton.geometry.attributes.position.array;
      const edges = [
        [0,1],[1,2],[2,3],[3,4],
        [0,5],[5,6],[6,7],[7,8],
        [0,9],[9,10],[10,11],[11,12],
        [0,13],[13,14],[14,15],[15,16],
        [0,17],[17,18],[18,19],[19,20]
      ];
      let ptr = 0;
      for (const e of edges) {
        const a = lm[e[0]], b = lm[e[1]];
        const ax = (a.x - 0.5) * 1200; const ay = -(a.y - 0.5) * 600; const az = a.z * 400;
        const bx = (b.x - 0.5) * 1200; const by = -(b.y - 0.5) * 600; const bz = b.z * 400;
        pos[ptr++] = ax; pos[ptr++] = ay; pos[ptr++] = az;
        pos[ptr++] = bx; pos[ptr++] = by; pos[ptr++] = bz;
      }
      skeleton.geometry.attributes.position.needsUpdate = true;
    }
  } else {
    hudDetected.innerText = 'No hand detected';
    fist = false;
  }
});

// Setup camera capture: request permission via getUserMedia and feed frames to MediaPipe
async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    hudDetected.innerText = 'Camera API not supported in this browser.';
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    hudDetected.innerText = 'Camera started.';

    // Manual frame loop: send the current video frame to MediaPipe Hands
    async function frameLoop() {
      try {
        await hands.send({ image: video });
      } catch (e) {
        console.warn('hands.send error', e);
      }
      requestAnimationFrame(frameLoop);
    }
    frameLoop();
  } catch (err) {
    console.error('getUserMedia error', err);
    hudDetected.innerText = 'Camera access denied or error: ' + (err.message || err.toString());
  }
}
startCamera();

// Animation loop
const tmpPos = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);

  // update particle positions
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3;
    tmpPos.set(positions[ix+0], positions[ix+1], positions[ix+2]);
    tmpTarget.set(targets[ix+0], targets[ix+1], targets[ix+2]);

    // attraction to target
    tmpPos.lerp(tmpTarget, 0.02);

    // if fist — repel from handPoint
    if (fist) {
      const dir = tmpPos.clone().sub(handPoint);
      const d = dir.length();
      if (d < 400) {
        dir.normalize().multiplyScalar((400 - d) * 0.15);
        tmpPos.add(dir);
      }
    }

    positions[ix+0] = tmpPos.x;
    positions[ix+1] = tmpPos.y;
    positions[ix+2] = tmpPos.z;
  }

  geometry.attributes.position.needsUpdate = true;
  points.rotation.y += 0.0005;
  renderer.render(scene, camera);
}
animate();

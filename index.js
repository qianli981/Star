const STATE = { INIT: 'INIT', SHUFFLE: 'SHUFFLE', DRAW: 'DRAW' };
let currentState = STATE.INIT;

// --- 1. Three.js 场景设置 ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 12;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 提升手机端清晰度
document.body.appendChild(renderer.domElement);

// --- 2. 打造神秘高级光影 ---
const ambientLight = new THREE.AmbientLight(0x4A154B, 1.2); // 神秘紫底光
scene.add(ambientLight);

const goldLight = new THREE.DirectionalLight(0xFFEAAA, 2.5); // 白金主光源
goldLight.position.set(5, 5, 8);
scene.add(goldLight);

const blueLight = new THREE.PointLight(0x0A3A82, 3, 20); // 深邃蓝补光
blueLight.position.set(-5, -5, 5);
scene.add(blueLight);

// --- 3. 核心：用代码“画”出黑金烫金塔罗牌纹理 ---
function createGoldFoilTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 896;
  const ctx = canvas.getContext('2d');

  // 黑底
  ctx.fillStyle = '#05050A';
  ctx.fillRect(0, 0, 512, 896);

  // 金线设置
  const gold = '#E6C27A';
  ctx.strokeStyle = gold;
  ctx.lineWidth = 4;

  // 外边框
  ctx.strokeRect(24, 24, 464, 848);
  
  // 内边框 (带角星)
  ctx.lineWidth = 1.5;
  ctx.strokeRect(40, 40, 432, 816);
  
  const drawStar = (cx, cy) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI*2);
    ctx.fillStyle = gold;
    ctx.fill();
    ctx.stroke();
  };
  drawStar(40, 40); drawStar(472, 40); drawStar(40, 856); drawStar(472, 856);

  // 中心魔法阵/太阳图案
  ctx.save();
  ctx.translate(256, 448);
  
  // 外层几何环
  ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 150, 0, Math.PI*2); ctx.stroke();
  
  // 放射线
  for(let i=0; i<24; i++) {
    ctx.rotate(Math.PI / 12);
    ctx.beginPath();
    ctx.moveTo(0, 80);
    ctx.lineTo(0, i % 2 === 0 ? 140 : 110); // 长短交替的芒星
    ctx.stroke();
  }
  
  // 中心日月核心
  ctx.beginPath(); ctx.arc(0, 0, 60, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(230, 194, 122, 0.1)'; // 微弱的金粉感
  ctx.fill();
  
  // 底部文字装饰线
  ctx.restore();
  ctx.fillStyle = gold;
  ctx.font = "italic 24px serif";
  ctx.textAlign = "center";
  ctx.fillText("T H E   F A T E", 256, 800);
  ctx.beginPath(); ctx.moveTo(150, 760); ctx.lineTo(360, 760); ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

// 应用具有金属质感的材质
const tarotTexture = createGoldFoilTexture();
const cardMat = new THREE.MeshStandardMaterial({ 
  map: tarotTexture,
  roughness: 0.2, // 表面光滑度
  metalness: 0.9, // 极强的金属反光感
  side: THREE.DoubleSide
});

// 生成牌堆
const deck = new THREE.Group();
const cards = [];
const cardGeo = new THREE.PlaneGeometry(2.4, 4.2); // 调整为修长的塔罗牌比例

for (let i = 0; i < 22; i++) { // 22张大阿卡纳
  const card = new THREE.Mesh(cardGeo, cardMat);
  card.position.set(0, 0, -i * 0.015);
  cards.push(card);
  deck.add(card);
}
scene.add(deck);

// 渲染循环
function animate() {
  requestAnimationFrame(animate);
  
  // 让牌堆有呼吸感的缓慢浮动
  if(currentState === STATE.INIT) {
    deck.position.y = Math.sin(Date.now() * 0.001) * 0.1;
  }
  
  renderer.render(scene, camera);
}
animate();

// --- 4. 动效控制器 ---
window.tarotApp = {
  reset: () => {
    currentState = STATE.INIT;
    document.getElementById('status-text').innerText = "万物归原 [握拳]";
    cards.forEach((card, i) => {
      gsap.to(card.position, { x: 0, y: 0, z: -i * 0.015, duration: 1.2, ease: "power3.inOut" });
      gsap.to(card.rotation, { x: 0, y: 0, z: 0, duration: 1.2, ease: "power3.inOut" });
    });
  },
  shuffle: () => {
    currentState = STATE.SHUFFLE;
    document.getElementById('status-text').innerText = "命运之流 [五指张开]";
    cards.forEach((card) => {
      gsap.to(card.position, {
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 3,
        duration: 1.8, ease: "power2.out"
      });
      gsap.to(card.rotation, {
        z: (Math.random() - 0.5) * Math.PI * 0.5,
        duration: 1.8
      });
    });
  },
  draw: () => {
    currentState = STATE.DRAW;
    document.getElementById('status-text').innerText = "启示显现 [单指]";
    cards.slice(1).forEach((card) => {
      gsap.to(card.position, { z: -10, duration: 1.5, ease: "power2.inOut" });
      gsap.to(card.material, { opacity: 0.3, transparent: true, duration: 1.5 });
    });
    // 抽出的命运之牌
    gsap.to(cards[0].position, { x: 0, y: 0, z: 4, duration: 1.5, ease: "power3.out" });
    gsap.to(cards[0].rotation, { z: 0, y: Math.PI, duration: 1.8, ease: "power2.inOut" }); 
  }
};

// --- 5. 手势识别与保底机制 ---
const videoElement = document.getElementById('video-input');
const canvasElement = document.getElementById('gesture-canvas');
const canvasCtx = canvasElement.getContext('2d');
const statusText = document.getElementById('status-text');

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6 });

hands.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    const indexTipY = landmarks[8].y;
    const middleTipY = landmarks[12].y;
    const indexBaseY = landmarks[5].y;
    const middleBaseY = landmarks[9].y;

    if (indexTipY > indexBaseY && middleTipY > middleBaseY) window.tarotApp.reset();
    else if (indexTipY < indexBaseY && middleTipY < middleBaseY) window.tarotApp.shuffle();
    else if (indexTipY < indexBaseY && middleTipY > middleBaseY) window.tarotApp.draw();

    // 绘制手势光点
    canvasCtx.fillStyle = "rgba(230, 194, 122, 0.8)";
    landmarks.forEach(lm => {
      canvasCtx.beginPath();
      canvasCtx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, 2, 0, 2*Math.PI);
      canvasCtx.fill();
    });
  }
});

const cameraUtils = new Camera(videoElement, {
  onFrame: async () => { await hands.send({ image: videoElement }); },
  width: 320, height: 240
});

cameraUtils.start().catch(() => {
  // 如果拒绝摄像头，触发保底
});

// 超时强制开启点击模式 (解决卡加载问题)
setTimeout(() => {
  if (statusText.innerText.includes("潜入深层潜意识中")) {
    statusText.innerText = "灵体连接超时，已开启触控干预";
    document.getElementById('fallback-btn').style.display = 'flex';
  }
}, 8000);

// 窗口适配
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

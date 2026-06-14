const majorArcana = ["愚者 The Fool","魔术师 The Magician","女祭司 The High Priestess","皇后 The Empress","皇帝 The Emperor","教皇 The Hierophant","恋人 The Lovers","战车 The Chariot","力量 Strength","隐士 The Hermit","命运之轮 Wheel of Fortune","正义 Justice","倒吊人 The Hanged Man","死神 Death","节制 Temperance","恶魔 The Devil","高塔 The Tower","星星 The Star","月亮 The Moon","太阳 The Sun","审判 Judgement","世界 The World"];
const suits = ["权杖 Wands", "圣杯 Cups", "宝剑 Swords", "星币 Pentacles"];
const ranks = ["Ace", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "Page", "Knight", "Queen", "King"];
const fullDeckData = [...majorArcana];
suits.forEach(suit => ranks.forEach(rank => fullDeckData.push(`${suit} ${rank}`)));

// 核心状态机升级
const STATE = { INIT: 'a', RING_SHUFFLE: 'b', DRAW: 'c', FLIP: 'd', FINAL_SPREAD: 'e' };
let currentState = STATE.INIT;
let drawnCards = []; // 存放已抽出的牌 (最多3张)
let currentDrawingCard = null; // 当前悬停在底部的牌
let handVector = { x: 0, y: 0 };
let lastIndexX = null;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 18; // 拉远视角看全景

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.domElement.style.position = 'absolute'; renderer.domElement.style.top = '0px'; renderer.domElement.style.left = '0px'; renderer.domElement.style.zIndex = '1';
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xFFEAAA, 1.8); dirLight.position.set(5, 5, 8); scene.add(dirLight);

// --- 高级图案绘制算法 (更接近参考图的复杂黑金) ---
function createCardBackTexture() {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#05050A'; ctx.fillRect(0, 0, 512, 896);
  ctx.strokeStyle = '#E6C27A'; ctx.lineWidth = 6; ctx.strokeRect(24, 24, 464, 848);
  ctx.lineWidth = 2; ctx.strokeRect(40, 40, 432, 816);
  
  ctx.save(); ctx.translate(256, 448);
  // 多重星象仪
  ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.setLineDash([5, 10]); ctx.arc(0, 0, 180, 0, Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.stroke();
  
  // 六芒星核心
  ctx.beginPath();
  for(let i=0; i<3; i++){ ctx.lineTo(100*Math.cos(i*Math.PI*2/3 - Math.PI/2), 100*Math.sin(i*Math.PI*2/3 - Math.PI/2)); } ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  for(let i=0; i<3; i++){ ctx.lineTo(100*Math.cos(i*Math.PI*2/3 + Math.PI/6), 100*Math.sin(i*Math.PI*2/3 + Math.PI/6)); } ctx.closePath(); ctx.stroke();
  
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fillStyle = '#E6C27A'; ctx.fill();
  ctx.restore();
  
  return new THREE.CanvasTexture(cvs);
}

function generateFaceTexture(cardName) {
  const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = 896;
  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#1A1A24'; ctx.fillRect(0, 0, 512, 896); 
  ctx.strokeStyle = '#E6C27A'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, 472, 856);
  
  // 拱门设计
  ctx.beginPath(); ctx.arc(256, 350, 180, Math.PI, 0); ctx.lineTo(436, 750); ctx.lineTo(76, 750); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(230, 194, 122, 0.05)'; ctx.fill();
  
  // 月相装饰
  ctx.beginPath(); ctx.arc(256, 350, 80, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(220, 350, 60, 0, Math.PI*2); ctx.clip(); 
  ctx.fillStyle = '#E6C27A'; ctx.fillRect(0,0,512,896); // 形成新月
  
  ctx.fillStyle = '#E6C27A'; ctx.textAlign = "center";
  ctx.font = "bold 38px serif"; ctx.fillText(cardName.split(' ')[0], 256, 800); 
  ctx.font = "italic 24px serif"; ctx.fillText(cardName.split(' ').slice(1).join(' '), 256, 830); 
  
  return new THREE.CanvasTexture(cvs);
}

const backTexture = createCardBackTexture();
const deck = new THREE.Group();
const cards = [];
const cardGeo = new THREE.BoxGeometry(2.4, 4.2, 0.02);

for (let i = 0; i < 78; i++) {
  const matFront = new THREE.MeshStandardMaterial({ color: 0x1A1A24, roughness: 0.8, metalness: 0.2 });
  const matBack = new THREE.MeshStandardMaterial({ map: backTexture, color: 0xffffff, roughness: 0.8, metalness: 0.2 });
  const matEdge = new THREE.MeshStandardMaterial({ color: 0xD4AF37, roughness: 0.6, metalness: 0.4 }); 
  
  const card = new THREE.Mesh(cardGeo, [matEdge, matEdge, matEdge, matEdge, matFront, matBack]);
  card.userData = { id: i, name: fullDeckData[i] };
  card.position.set(0, 0, -i * 0.005);
  card.rotation.y = Math.PI; 
  cards.push(card); deck.add(card);
}
scene.add(deck);

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.001;
  
  if(currentState === STATE.INIT) deck.position.y = Math.sin(time*2)*0.2;
  
  // 环形旋转动画
  if(currentState === STATE.RING_SHUFFLE || currentState === STATE.DRAW || currentState === STATE.FLIP) {
    deck.rotation.y = time * 0.2 + handVector.x * 2; // 跟随手势轻微转动
    deck.position.y = Math.sin(time) * 0.5;
  }
  renderer.render(scene, camera);
}
animate();

const setStatus = (txt) => document.getElementById('status-text').innerText = txt;
const positions3Card = [-3.5, 0, 3.5]; // 底部抽牌的三张X坐标位置

window.tarotApp = {
  stack: () => {
    if(currentState === STATE.INIT) return;
    currentState = STATE.INIT; drawnCards = []; currentDrawingCard = null;
    setStatus("万物归原 (握拳)"); document.getElementById('card-info').style.opacity = 0;
    
    cards.forEach((card, i) => {
      card.visible = true;
      gsap.to(card.position, { x: 0, y: 0, z: -i * 0.005, duration: 1.2, ease: "power2.inOut" });
      gsap.to(card.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 }); 
      gsap.to(card.scale, { x: 1, y: 1, z: 1, duration: 0.5 });
      // 抹去旧图案
      card.material[4].map = null; card.material[4].needsUpdate = true;
    });
    gsap.to(deck.rotation, { y: 0, duration: 1 });
  },
  
  shuffle: () => {
    if(drawnCards.length >= 3 || currentState === STATE.RING_SHUFFLE) return;
    currentState = STATE.RING_SHUFFLE; setStatus(`命运之环运转，已抽 ${drawnCards.length}/3 (五指张开)`);
    
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c) && c !== currentDrawingCard);
    const radius = 8;
    
    // 未抽出的牌形成圆环
    unDrawnCards.forEach((card, i) => {
      const angle = (i / unDrawnCards.length) * Math.PI * 2;
      gsap.to(card.position, {
        x: Math.sin(angle) * radius, y: 0, z: Math.cos(angle) * radius, duration: 1.5, ease: "power2.out"
      });
      gsap.to(card.rotation, { x: 0, y: angle + Math.PI, z: 0, duration: 1.5 }); 
    });
  },

  draw: () => {
    if(drawnCards.length >= 3 || currentState === STATE.DRAW || currentState === STATE.FLIP) return;
    currentState = STATE.DRAW; setStatus("锁定宿命，晃动手指翻牌 (单指)");
    
    const unDrawnCards = cards.filter(c => !drawnCards.includes(c));
    currentDrawingCard = unDrawnCards[Math.floor(Math.random() * unDrawnCards.length)];
    
    // 飞到底部对应的空位 (0, 1, 或 2 号位)
    const targetX = positions3Card[drawnCards.length];
    
    // 脱离 Group 的旋转影响，计算世界坐标系
    scene.attach(currentDrawingCard);
    gsap.to(currentDrawingCard.position, { x: targetX, y: -5, z: 8, duration: 1.2, ease: "power3.out" });
    gsap.to(currentDrawingCard.rotation, { x: 0, y: Math.PI, z: 0, duration: 1.2 });
    gsap.to(currentDrawingCard.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1.2 });
  },

  flip: () => {
    if(currentState !== STATE.DRAW || !currentDrawingCard) return;
    currentState = STATE.FLIP; 
    
    const isReversed = Math.random() > 0.5; 
    currentDrawingCard.material[4].map = generateFaceTexture(currentDrawingCard.userData.name);
    currentDrawingCard.material[4].color.setHex(0xffffff); 
    currentDrawingCard.material[4].needsUpdate = true;

    gsap.to(currentDrawingCard.rotation, { 
      y: 0, z: isReversed ? Math.PI : 0, duration: 1.5, ease: "back.out(1.2)"
    });

    // 记录到已抽数组
    drawnCards.push({ mesh: currentDrawingCard, name: currentDrawingCard.userData.name, reversed: isReversed });
    currentDrawingCard = null;
    setStatus(`第 ${drawnCards.length} 张牌已显现。张开五指继续...`);

    // 如果抽满了三张，直接触发最终结算！
    if(drawnCards.length === 3) {
      setTimeout(() => window.tarotApp.finalSpread(), 1500);
    }
  },

  finalSpread: () => {
    currentState = STATE.FINAL_SPREAD; setStatus("过去、现在与未来已揭晓。");
    
    // 其余牌消散 (飞向远方并透明)
    cards.filter(c => !drawnCards.find(dc => dc.mesh === c)).forEach(card => {
      gsap.to(card.position, { y: 20, z: -20, duration: 2, ease: "power2.in" });
      setTimeout(() => card.visible = false, 2000);
    });

    // 抽出的三张牌来到中心位
    drawnCards.forEach((item, i) => {
      gsap.to(item.mesh.position, { x: positions3Card[i] * 1.5, y: 1, z: 10, duration: 2, ease: "power3.inOut" });
      gsap.to(item.mesh.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 2 });
    });

    // 渲染下方三段式文字解读
    const titles = ["「溯源 - 过去」", "「具象 - 现在」", "「推演 - 未来」"];
    const infoBoard = document.getElementById('card-info');
    infoBoard.innerHTML = drawnCards.map((item, i) => `
      <div>
        <h3>${titles[i]}</h3>
        <h2>${item.name.split(' ')[0]} ${item.reversed ? '▼' : '▲'}</h2>
        <p>${item.name.split(' ').slice(1).join(' ')}</p>
      </div>
    `).join('');
    infoBoard.style.opacity = 1;
  }
};

const videoElement = document.getElementById('video-input');
const canvasElement = document.getElementById('gesture-canvas');
const canvasCtx = canvasElement.getContext('2d');

const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.6 });

hands.onResults((results) => {
  if(currentState === STATE.INIT && document.getElementById('status-text').innerText.includes("等待")) {
    setStatus("万物归原 (握拳)");
  }
  canvasCtx.save(); canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.image) canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    handVector.x = (0.5 - lm[9].x); handVector.y = (0.5 - lm[9].y);

    const indexTipY = lm[8].y, middleTipY = lm[12].y, indexBaseY = lm[5].y, middleBaseY = lm[9].y;
    const ringTipY = lm[16].y, ringBaseY = lm[13].y;

    const isFist = indexTipY > indexBaseY && middleTipY > middleBaseY && ringTipY > ringBaseY;
    const isOpen = indexTipY < indexBaseY && middleTipY < middleBaseY && ringTipY < ringBaseY;
    const isOneFinger = indexTipY < indexBaseY && middleTipY > middleBaseY;

    // 只有在没抽满 3 张时才允许手势继续洗牌/抽牌
    if(currentState !== STATE.FINAL_SPREAD) {
      if (isFist) window.tarotApp.stack(); 
      else if (isOpen) window.tarotApp.shuffle(); 
      else if (isOneFinger) {
        if(currentState === STATE.RING_SHUFFLE) window.tarotApp.draw(); 
        if(currentState === STATE.DRAW) {
          if(lastIndexX !== null && Math.abs(lm[8].x - lastIndexX) > 0.08) window.tarotApp.flip();
          lastIndexX = lm[8].x;
        }
      }
    }

    canvasCtx.fillStyle = "rgba(230, 194, 122, 0.7)";
    lm.forEach(p => { canvasCtx.beginPath(); canvasCtx.arc(p.x * 100, p.y * 75, 2, 0, 2*Math.PI); canvasCtx.fill(); });
  }
  canvasCtx.restore();
});

document.getElementById('start-cam-btn').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('ui-layer').style.display = 'block';
  videoElement.play().catch(()=>{}); 
  setStatus("正在建立灵视连接...");
  const cameraUtils = new Camera(videoElement, { onFrame: async () => { await hands.send({ image: videoElement }); }, width: 320, height: 240 });
  cameraUtils.start().then(() => setStatus("已连接，等待手势指令"));
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

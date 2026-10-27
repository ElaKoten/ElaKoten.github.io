/**
 * DESIGN NESNESİ
 * Bu nesne, etkileşimin fiziksel, zamansal ve kuralsal parametrelerini barındırır.
 * Her bir ayarın davranışı nasıl değiştirdiği aşağıda açıklanmıştır:
 * - frictionWindow: Hız geçmişinin örneklenme zaman aralığı (ms cinsinden). Küçültülürse sistem anlık hareketlere daha hassas tepki verir.
 * - velocityThreshold: Sürtünme/hız eşiği. Bu değer aşılırsa sistem savunma/itme (repelled) moduna geçer.
 * - recoveryCooldown: Savunma modundan normal moda dönmek için geçen bekleme süresi (ms cinsinden).
 * - maxSpeed: Düğümlerin maksimum hareket hızı sınırı.
 * - damping: Fiziksel sönümleme katsayısı.
 * - mode: 'memory' (dinamik hafızalı mod) veya 'elastic' (belleksiz mod).
 */
const DESIGN = {
    frictionWindow: 2500,       
    velocityThreshold: 12.0,    
    recoveryCooldown: 2000,     
    maxSpeed: 4.0,              
    damping: 0.92,              
    mode: 'memory'              
};

/**
 * STATE (DURUM)
 * Sistem ve katılımcı düğümlerinin anlık konum, hız, geçmiş tamponu ve durum verileri.
 */
const state = {
    participant: {
        x: 150,
        y: 200,
        targetX: 150,
        targetY: 200,
        isDragging: false
    },
    system: {
        x: 450,
        y: 200,
        vx: 0,
        vy: 0,
        state: 'attracted', // 'attracted', 'repelled', 'orbital'
        cooldownTimer: 0
    },
    history: [], // Zaman damgası ve hız kayıtları [{time, speed}]
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        KeyW: false,
        KeyS: false,
        KeyA: false,
        KeyD: false
    },
    lastFrameTime: performance.now()
};

/**
 * INPUT (GİRİŞ)
 * Fare, dokunmatik ve klavye etkileşimlerini yönetir.
 */
function initInput() {
    const canvas = document.getElementById('fieldCanvas');

    canvas.addEventListener('pointerdown', (e) => {
        state.participant.isDragging = true;
        updatePointerPosition(e, canvas);
    });

    window.addEventListener('pointermove', (e) => {
        if (state.participant.isDragging) {
            updatePointerPosition(e, canvas);
        }
    });

    window.addEventListener('pointerup', () => {
        state.participant.isDragging = false;
    });

    window.addEventListener('keydown', (e) => {
        if (state.keys.hasOwnProperty(e.code)) {
            state.keys[e.code] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
        }
        if (e.code === 'Space') {
            triggerPulse();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (state.keys.hasOwnProperty(e.code)) {
            state.keys[e.code] = false;
        }
    });

    document.getElementById('pulseBtn').addEventListener('click', () => {
        triggerPulse();
    });

    document.getElementById('modeBtn').addEventListener('click', () => {
        toggleMode();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        resetSimulation();
    });
}

function updatePointerPosition(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.participant.targetX = (e.clientX - rect.left) * scaleX;
    state.participant.targetY = (e.clientY - rect.top) * scaleY;
}

function triggerPulse() {
    state.system.vx += (Math.random() - 0.5) * 15;
    state.system.vy += (Math.random() - 0.5) * 15;
}

function toggleMode() {
    DESIGN.mode = DESIGN.mode === 'memory' ? 'elastic' : 'memory';
    const modeBtn = document.getElementById('modeBtn');
    modeBtn.textContent = DESIGN.mode === 'memory' ? 'Mode: Dynamic Memory' : 'Mode: Memoryless Elastic';
    resetSimulation();
}

function resetSimulation() {
    state.participant.x = 150;
    state.participant.y = 200;
    state.participant.targetX = 150;
    state.participant.targetY = 200;
    state.system.x = 450;
    state.system.y = 200;
    state.system.vx = 0;
    state.system.vy = 0;
    state.system.state = 'attracted';
    state.system.cooldownTimer = 0;
    state.history = [];
}

/**
 * RULE (KURAL MANTIĞI)
 * Geçmiş verilerini değerlendirir, hızları hesaplar ve durum geçişlerini yapar.
 */
function updateRules(dt) {
    const p = state.participant;
    const s = state.system;
    const now = performance.now();

    const step = 5;
    if (state.keys.ArrowLeft || state.keys.KeyA) p.targetX -= step;
    if (state.keys.ArrowRight || state.keys.KeyD) p.targetX += step;
    if (state.keys.ArrowUp || state.keys.KeyW) p.targetY -= step;
    if (state.keys.ArrowDown || state.keys.KeyS) p.targetY += step;

    p.targetX = Math.max(30, Math.min(570, p.targetX));
    p.targetY = Math.max(30, Math.min(370, p.targetY));

    const prevX = p.x;
    const prevY = p.y;
    p.x += (p.targetX - p.x) * 0.2;
    p.y += (p.targetY - p.y) * 0.2;

    const dx = p.x - prevX;
    const dy = p.y - prevY;
    const currentSpeed = Math.sqrt(dx * dx + dy * dy);

    state.history.push({ time: now, speed: currentSpeed });
    state.history = state.history.filter(item => now - item.time < DESIGN.frictionWindow);

    if (DESIGN.mode === 'memory') {
        let totalSpeed = 0;
        for (let i = 0; i < state.history.length; i++) {
            totalSpeed += state.history[i].speed;
        }
        const avgSpeed = state.history.length > 0 ? totalSpeed / state.history.length : 0;

        if (s.cooldownTimer > 0) {
            s.cooldownTimer -= dt;
            s.state = 'repelled';
        } else if (avgSpeed > DESIGN.velocityThreshold) {
            s.state = 'repelled';
            s.cooldownTimer = DESIGN.recoveryCooldown;
        } else {
            const distToP = Math.hypot(p.x - s.x, p.y - s.y);
            if (distToP < 100 && avgSpeed < 2.0) {
                s.state = 'orbital';
            } else {
                s.state = 'attracted';
            }
        }

        if (s.state === 'attracted') {
            s.vx += (p.x - s.x) * 0.005;
            s.vy += (p.y - s.y) * 0.005;
        } else if (s.state === 'repelled') {
            s.vx -= (p.x - s.x) * 0.01;
            s.vy -= (p.y - s.y) * 0.01;
        } else if (s.state === 'orbital') {
            const angle = Math.atan2(s.y - p.y, s.x - p.x) + 0.05;
            const targetOrbitX = p.x + Math.cos(angle) * 80;
            const targetOrbitY = p.y + Math.sin(angle) * 80;
            s.vx += (targetOrbitX - s.x) * 0.02;
            s.vy += (targetOrbitY - s.y) * 0.02;
        }
    } else {
        s.state = 'attracted';
        s.vx += (p.x - s.x) * 0.008;
        s.vy += (p.y - s.y) * 0.008;
    }

    s.vx *= DESIGN.damping;
    s.vy *= DESIGN.damping;

    s.x += s.vx;
    s.y += s.vy;

    s.x = Math.max(30, Math.min(570, s.x));
    s.y = Math.max(30, Math.min(370, s.y));
}

/**
 * OUTPUT (ÇIKTI / GÖRSELLEŞTİRME)
 * Durum verilerini alır ve kanvaza çizer; arayüz metinlerini günceller.
 */
function render() {
    const canvas = document.getElementById('fieldCanvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Kılavuz çizgisi
    ctx.strokeStyle = '#e5dec9';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    const p = state.participant;
    const s = state.system;

    // Bağlantı vektörü
    ctx.strokeStyle = s.state === 'repelled' ? '#d9534f' : (s.state === 'orbital' ? '#4b8b3b' : '#2c5d4f');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();

    // Katılımcı Düğümü (Kare)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 14, p.y - 14, 28, 28);

    // Sistem Düğümü (Daire)
    ctx.beginPath();
    ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = s.state === 'repelled' ? '#fff' : '#2c5d4f';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Sinyal Simgesi (Renk dışı ayırt edici semboller)
    ctx.fillStyle = s.state === 'repelled' ? '#1a1a1a' : '#fff';
    if (s.state === 'repelled') {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', s.x, s.y);
    } else if (s.state === 'orbital') {
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('○', s.x, s.y);
    } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Durum Metinleri
    const statusText = document.getElementById('statusText');
    const hintText = document.getElementById('hintText');
    let statusLabel = 'Attracted (Receptive)';
    let hintLabel = 'Move smoothly to keep the system close and aligned.';

    if (s.state === 'repelled') {
        statusLabel = 'Repelled (Guarded / Overwhelmed)';
        hintLabel = 'Rapid movements triggered system resistance. Wait for recovery.';
    } else if (s.state === 'orbital') {
        statusLabel = 'Orbital (Harmonic Balance)';
        hintLabel = 'Steady pacing established a smooth orbit around your path.';
    }

    statusText.textContent = `Status: ${statusLabel}`;
    hintText.textContent = hintLabel;
}

function mainLoop(timestamp) {
    const dt = timestamp - state.lastFrameTime;
    state.lastFrameTime = timestamp;

    updateRules(dt);
    render();

    requestAnimationFrame(mainLoop);
}

window.addEventListener('DOMContentLoaded', () => {
    initInput();
    requestAnimationFrame(mainLoop);
});
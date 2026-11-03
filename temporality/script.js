// ==========================================
// 1. DESIGN (Yapılandırma ve Ayarlar Nesnesi)
// ==========================================
const DESIGN = {
    // 80s psychedelic color grading palette / 80'ler psychedelic renk paleti
    colors: [
        '#ff007f', // Electric Magenta
        '#00f3ff', // Neon Cyan
        '#ffe600', // Acid Yellow
        '#9d4edd', // Vivid Violet
        '#ff5400'  // Sunset Orange
    ],
    baseSpeed: 0.14,          // Sıvı dalganın yayılma hızı / Fluid expansion velocity
    initialRadius: 20,        // Başlangıç yarıçapı / Starting radius
    maxRadius: 320,           // Dalganın ulaştığı maksimum organik sınır / Max organic expansion limit
    residueFloorAlpha: 0.08,  // Asimptotik kalıntı şeffaflığı (sabit kalır) / Asymptotic static residue opacity floor
    bloomDurationMs: 5000,    // Aktif parlama ve genişleme süresi (ms) / Active bloom duration in ms
    maxNodes: 60,             // Bellek yönetimi için maksimum düğüm sınırı / Performance memory cap for nodes
    vertexCount: 80           // Sıvı blob çizgi detay çözünürlüğü / Fluid blob vertex resolution
};

// ==========================================
// 2. STATE (Durum Yönetimi)
// ==========================================
const state = {
    echoes: [],               // Etkileşim düğümleri dizisi / Array of interaction disturbance nodes
    isDocumentHidden: false   // Sekme görünürlük durumu / Document visibility flag
};

// ==========================================
// 3. INPUT (Girdi Yönetimi ve Erişilebilirlik)
// ==========================================
const canvas = document.getElementById('liquidCanvas');
const ctx = canvas.getContext('2d');
const activeCountEl = document.getElementById('activeCount');
const residueCountEl = document.getElementById('residueCount');
const resetBtn = document.getElementById('resetBtn');

function resizeCanvas() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

// Girdi işleme fonksiyonu (Fare, Dokunma ve Klavye) / Interaction handler
function handleInteraction(clientX, clientY) {
    const now = performance.now();
    const randomColor = DESIGN.colors[Math.floor(Math.random() * DESIGN.colors.length)];

    // Her ekoya sabit (statik) deformasyon offsetleri üretiyoruz ki solduktan sonra hareket etmesinler
    // Generate static noise offsets so the residue shape remains completely frozen once faded
    const staticOffsets = [];
    for (let i = 0; i <= DESIGN.vertexCount; i++) {
        staticOffsets.push((Math.random() - 0.5) * 16);
    }

    state.echoes.push({
        x: clientX,
        y: clientY,
        birthTime: now,
        color: randomColor,
        offsets: staticOffsets
    });

    // Bellek sınırı aşımında en eski düğümü temizle / Prune oldest node if max limit reached
    if (state.echoes.length > DESIGN.maxNodes) {
        state.echoes.shift();
    }
}

// Fare tıklaması / Mouse click event
canvas.addEventListener('click', (e) => {
    handleInteraction(e.clientX, e.clientY);
});

// Dokunmatik ekran desteği / Touch support
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleInteraction(touch.clientX, touch.clientY);
    }
}, { passive: false });

// Klavye erişimi (Boşluk tuşu ekran merkezinde tetikler) / Keyboard support (Spacebar)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInteraction(window.innerWidth / 2, window.innerHeight / 2);
    }
});

// Sıfırlama düğmesi / Reset button handler
resetBtn.addEventListener('click', () => {
    state.echoes = [];
    activeCountEl.textContent = '0';
    residueCountEl.textContent = '0';
});

// Belge odak kaybı yönetimi / Visibility change handling
document.addEventListener('visibilitychange', () => {
    state.isDocumentHidden = document.hidden;
});

window.addEventListener('resize', resizeCanvas);

// ==========================================
// 4. RULE (Zaman ve Fizik Hesaplamaları)
// ==========================================
function updatePhysics(now) {
    if (state.isDocumentHidden) return;

    let activeCount = 0;
    let residueCount = 0;

    for (const echo of state.echoes) {
        const age = now - echo.birthTime;
        if (age < DESIGN.bloomDurationMs) {
            activeCount++;
        } else {
            residueCount++;
        }
    }

    activeCountEl.textContent = activeCount;
    residueCountEl.textContent = residueCount;
}

// ==========================================
// 5. OUTPUT (Görsel Çizim Döngüsü - Sabit Kalıntı ve Akışkan Çiçeklenme)
// ==========================================
function render(timestamp) {
    // Sahneyi ashy (kül rengi) kömür tonuyla temizle / Clear stage with ashy dark background tone
    ctx.fillStyle = '#121016';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Tüm etkileşim ekolarını çiz / Render all echo nodes
    for (const echo of state.echoes) {
        const age = timestamp - echo.birthTime;
        const isFaded = age >= DESIGN.bloomDurationMs;
        const progress = Math.min(1.0, age / DESIGN.bloomDurationMs);

        // Eğer ömrü dolduysa yarıçapı maksimumda dondur / If faded, freeze radius at maximum limit
        const currentRadius = isFaded 
            ? DESIGN.maxRadius 
            : Math.min(DESIGN.maxRadius, DESIGN.initialRadius + (age * DESIGN.baseSpeed));

        // Şeffaflık hesabı / Opacity calculation
        const alpha = isFaded 
            ? DESIGN.residueFloorAlpha 
            : Math.max(DESIGN.residueFloorAlpha, (1.0 - progress) * 0.85);

        ctx.save();
        ctx.strokeStyle = echo.color;
        ctx.fillStyle = echo.color;
        ctx.lineWidth = isFaded ? 1.5 : 2.0;
        ctx.globalAlpha = alpha;

        // Psychedelic parıltı efekti (Sadece aktifken parlar, kalıntı sabittir) / Glow styling only for active bloom
        ctx.shadowColor = echo.color;
        ctx.shadowBlur = isFaded ? 0 : 12;

        // Blob deformasyon matrisi (Faded olduktan sonra zaman fonksiyonu çağrılmaz, sabit kalır)
        // Fluid blob geometry (Static once faded so residue does not move or wobble)
        ctx.beginPath();
        for (let i = 0; i <= DESIGN.vertexCount; i++) {
            const angle = (i / DESIGN.vertexCount) * Math.PI * 2;
            
            let r;
            if (isFaded) {
                // Sabit kalıntı şekli / Frozen static residue shape
                r = Math.max(5, DESIGN.maxRadius + echo.offsets[i % echo.offsets.length]);
            } else {
                // Aktif akışkan genişleme / Active fluid expansion with time-based sine waves
                const noise1 = Math.sin(angle * 5 + (timestamp * 0.002)) * (12 * (1 - progress * 0.5));
                const noise2 = Math.cos(angle * 3 - (timestamp * 0.0015)) * (8 * (1 - progress * 0.5));
                r = Math.max(5, currentRadius + noise1 + noise2 + echo.offsets[i % echo.offsets.length] * 0.5);
            }

            const x = echo.x + Math.cos(angle) * r;
            const y = echo.y + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // Merkez dolgusu / Center wash
        if (!isFaded) {
            ctx.globalAlpha = alpha * 0.2;
            ctx.fill();
        }

        ctx.restore();
    }
}

// Ana animasyon döngüsü / Main animation loop
function mainLoop(timestamp) {
    updatePhysics(timestamp);
    render(timestamp);
    requestAnimationFrame(mainLoop);
}

// Başlangıç / Initialization
resizeCanvas();
requestAnimationFrame(mainLoop);
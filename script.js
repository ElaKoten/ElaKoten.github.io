"use strict";

/* =====================================================
   DESIGN — Ayarlanabilir tasarım ve fizik ayarları
===================================================== */
const DESIGN = {
  amplitude: 45,
  frequencyHz: 0.45,
  initialAngle: 45,
  initialVelocity: 0,
  pendulumLength: 195,
  // Sönüm oranı: Küçük değer daha uzun salınım sağlar.
  brakingStrength: 0.16,
  // Durdurma eşikleri
  stopAngleThreshold: 0.35,
  stopVelocityThreshold: 0.8,
  // Simülasyon ayarları
  fixedTimeStep: 1 / 120,
  maxFrameDelta: 0.1,
  // Görsel ayarlar
  pendulumColor: "#5146c8",
  centreLineColor: "#a9a9b9",
  // Bildirim süresi
  acknowledgementDuration: 2200,
  // Fiziksel ve görsel açı sınırları
  maxAngle: 45
};

/* =====================================================
   STATE — Sistemin mevcut durumunu sakla
===================================================== */
const state = {
  angle: degreesToRadians(DESIGN.initialAngle),
  velocity: degreesToRadians(DESIGN.initialVelocity),
  phase: "paused",
  braking: false,
  pendingStop: false,
  lastDirection: "left",
  feedbackMode: "position",
  resultRevealed: false
};

const FIXED_STEP = DESIGN.fixedTimeStep;
let animationFrameId = null;
let previousFrameTime = null;
let accumulatedTime = 0;
let pendingDialogAction = null;
let pendingDialogName = null;
let acknowledgementTimer = null;

/* =====================================================
   DOM — Arayüz elemanlarını seç
===================================================== */
const elements = {
  arm: document.getElementById("pendulum-arm"),
  angle: document.getElementById("angle-value"),
  status: document.getElementById("status"),
  movement: document.getElementById("movement-value"),
  directionPanel: document.getElementById("direction-panel"),
  direction: document.getElementById("direction-value"),
  start: document.getElementById("start-button"),
  pause: document.getElementById("pause-button"),
  stop: document.getElementById("stop-button"),
  reset: document.getElementById("reset-button"),
  reveal: document.getElementById("reveal-button"),
  resultPanel: document.getElementById("result-panel"),
  finalAngle: document.getElementById("final-angle"),
  finalDirection: document.getElementById("final-direction"),
  acknowledgement: document.getElementById("acknowledgement"),
  modeHelp: document.getElementById("mode-help"),
  feedbackInputs: document.querySelectorAll(
    'input[name="feedback"]'
  ),
  dialog: document.getElementById("confirmation-dialog"),
  dialogTitle: document.getElementById("dialog-title"),
  dialogMessage: document.getElementById("dialog-message"),
  dialogConfirm: document.getElementById("dialog-confirm"),
  dialogCancel: document.getElementById("dialog-cancel")
};

/* =====================================================
   INPUT — Kullanıcı etkileşimleri
===================================================== */

// Başlat
elements.start.addEventListener("click", handleStart);

// Geçici duraklatma
elements.pause.addEventListener("click", handlePause);

// Kademeli durdurma
elements.stop.addEventListener("click", handleStop);

// Sıfırlama onayı
elements.reset.addEventListener("click", () => {
  showConfirmation(
    "reset",
    "Reset the pendulum?",
    "The current movement and result will be cleared. The pendulum will return to its initial position."
  );
});

// Sonucu göster
elements.reveal.addEventListener("click", revealResult);

// Onay penceresi
elements.dialogConfirm.addEventListener("click", () => {
  const action = pendingDialogAction;
  pendingDialogAction = null;
  pendingDialogName = null;
  elements.dialog.close();
  if (action) {
    action();
  }
});

// İptal
elements.dialogCancel.addEventListener("click", () => {
  elements.dialog.close();
});

// Escape tuşuyla kapatma
elements.dialog.addEventListener("close", () => {
  if (pendingDialogName !== null) {
    showAcknowledgement("Action cancelled.");
  }
  pendingDialogAction = null;
  pendingDialogName = null;
});

// Geri bildirim koşulu
elements.feedbackInputs.forEach(input => {
  input.addEventListener("change", event => {
    if (!isInitialState()) {
      render();
      return;
    }
    state.feedbackMode = event.target.value;
    state.resultRevealed = false;
    showAcknowledgement(
      state.feedbackMode === "position"
        ? "Position-only feedback selected."
        : "Position-plus-direction feedback selected."
    );
    render();
  });
});

// Sayfa gizlendiğinde simülasyonu duraklat
document.addEventListener("visibilitychange", () => {
  if (
    document.hidden &&
    (state.phase === "running" || state.phase === "braking")
  ) {
    state.phase = "paused";
    stopAnimationLoop();
    showAcknowledgement(
      "Paused because the page is hidden. Press Start to resume."
    );
    render();
  }
});

/* =====================================================
   RULE — Fizik ve sistem davranışları
===================================================== */

// Dereceyi radyana çevir
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

// Radyanı dereceye çevir
function radiansToDegrees(radians) {
  return radians * 180 / Math.PI;
}

// Açıyı okunabilir biçimde göster
function formatAngle(angle) {
  const degrees = radiansToDegrees(angle);
  const sign = degrees >= 0 ? "+" : "";
  return `${sign}${degrees.toFixed(1)}°`;
}

// Hareket yönünü belirle
function getDirection() {
  const velocityThreshold = degreesToRadians(0.02);
  if (Math.abs(state.velocity) > velocityThreshold) {
    return state.velocity > 0 ? "right" : "left";
  }

  // Dönüş noktasında hız sıfırdır.
  // Bir sonraki hareket yönünü ivmeden belirle.
  if (Math.abs(state.angle) > degreesToRadians(0.02)) {
    return state.angle > 0 ? "left" : "right";
  }

  return state.lastDirection;
}

// Durum etiketini belirle
function getStatusLabel() {
  const labels = {
    paused: "Paused",
    running: "Running",
    braking: "Braking",
    stopped: "Stopped"
  };
  return labels[state.phase];
}

// Sistem başlangıç durumunda mı?
function isInitialState() {
  return (
    state.phase === "paused" &&
    Math.abs(
      state.angle - degreesToRadians(DESIGN.initialAngle)
    ) < 0.000001 &&
    Math.abs(state.velocity) < 0.000001 &&
    !state.braking &&
    !state.pendingStop &&
    !state.resultRevealed
  );
}

// Durumu başlangıç konumuna getir
function resetSimulationState() {
  stopAnimationLoop();
  state.angle = degreesToRadians(DESIGN.initialAngle);
  state.velocity = degreesToRadians(DESIGN.initialVelocity);
  state.phase = "paused";
  state.braking = false;
  state.pendingStop = false;
  state.lastDirection = "left";
  state.resultRevealed = false;
  accumulatedTime = 0;
  previousFrameTime = null;
  render();
}

// Bir fizik adımı uygula
function physicsStep(deltaTime) {
  const omega = 2 * Math.PI * DESIGN.frequencyHz;

  // Basit harmonik hareket ve kademeli sönümleme
  const damping = state.braking
    ? 2 * DESIGN.brakingStrength * omega
    : 0;

  // Açısal ivme
  const acceleration =
    -(omega * omega * state.angle) -
    damping * state.velocity;

  // Yarı örtük Euler integrasyonu
  state.velocity += acceleration * deltaTime;
  state.angle += state.velocity * deltaTime;

  // Son bilinen hareket yönünü sakla
  const velocityThreshold = degreesToRadians(0.02);
  if (Math.abs(state.velocity) > velocityThreshold) {
    state.lastDirection =
      state.velocity > 0 ? "right" : "left";
  }

  // Kademeli frenleme tamamlandı mı?
  if (state.braking) {
    const angleDegrees = Math.abs(
      radiansToDegrees(state.angle)
    );
    const velocityDegrees = Math.abs(
      radiansToDegrees(state.velocity)
    );

    if (
      angleDegrees <= DESIGN.stopAngleThreshold &&
      velocityDegrees <= DESIGN.stopVelocityThreshold
    ) {
      state.phase = "stopped";
      state.velocity = 0;
      state.braking = false;
      state.pendingStop = false;
      state.resultRevealed = false;
      accumulatedTime = 0;
      showAcknowledgement(
        "The pendulum has stopped. You can now reveal the result."
      );
    }
  }
}

/* =====================================================
   INPUT RULES — Kontrol davranışları
===================================================== */

// Başlatma
function handleStart() {
  if (
    state.phase === "running" ||
    state.phase === "braking"
  ) {
    return;
  }

  // Durdurulmuş sistemde yeni deneme onayı
  if (state.phase === "stopped") {
    showConfirmation(
      "newAttempt",
      "Start a new attempt?",
      "The pendulum will return to its initial position and begin a new swing."
    );
    return;
  }

  // Bekleyen durdurma isteğini devam ettir
  if (state.pendingStop) {
    state.pendingStop = false;
    state.braking = true;
  }

  state.phase = state.braking ? "braking" : "running";
  showAcknowledgement(
    state.braking
      ? "Movement resumed. Gradual braking continues."
      : "The pendulum has started moving."
  );
  render();
  startAnimationLoop();
}

// Duraklatma
function handlePause() {
  if (
    state.phase !== "running" &&
    state.phase !== "braking"
  ) {
    return;
  }

  // Açıyı ve açısal hızı değiştirmeden koru
  state.phase = "paused";
  stopAnimationLoop();
  showAcknowledgement(
    "Paused. Press Start to resume from the same state."
  );
  render();
}

// Durdurma isteği
function handleStop() {
  if (
    state.phase === "stopped" ||
    state.phase === "braking" ||
    state.pendingStop
  ) {
    return;
  }

  // Duraklatılmış durumda isteği sakla
  if (state.phase === "paused") {
    state.pendingStop = true;
    showAcknowledgement(
      "Stop request received. Braking will begin when you press Start."
    );
    render();
    return;
  }

  // Normal hareket sırasında frenlemeyi başlat
  state.braking = true;
  state.phase = "braking";
  state.resultRevealed = false;
  showAcknowledgement(
    "Stop request received. Gradual braking has started."
  );
  render();
}

// Yeni deneme başlat
function beginNewAttempt() {
  resetSimulationState();
  state.phase = "running";
  showAcknowledgement(
    "A new attempt has started."
  );
  render();
  startAnimationLoop();
}

/* =====================================================
   RULE — Onay penceresi
===================================================== */
function showConfirmation(name, title, message) {
  pendingDialogName = name;
  elements.dialogTitle.textContent = title;
  elements.dialogMessage.textContent = message;

  if (name === "reset") {
    pendingDialogAction = confirmReset;
  }
  if (name === "newAttempt") {
    pendingDialogAction = beginNewAttempt;
  }

  elements.dialog.showModal();
}

// Sıfırlamayı onayla
function confirmReset() {
  resetSimulationState();
  showAcknowledgement(
    "Reset complete. The pendulum is back at its initial position."
  );
  render();
}

/* =====================================================
   RULE — Sonuc gösterimi
===================================================== */
function revealResult() {
  if (state.phase !== "stopped") {
    return;
  }

  state.resultRevealed = true;
  elements.finalAngle.textContent = formatAngle(state.angle);
  elements.finalDirection.textContent =
    state.lastDirection === "left" ? "Left" : "Right";
  elements.resultPanel.hidden = false;
  elements.reveal.disabled = true;

  showAcknowledgement(
    "The final result has been revealed."
  );
}

/* =====================================================
   RULE — Animasyon döngüsü
===================================================== */

// Tek bir animasyon döngüsü oluştur
function startAnimationLoop() {
  if (animationFrameId !== null) {
    return;
  }
  previousFrameTime = null;
  accumulatedTime = 0;
  animationFrameId = requestAnimationFrame(animationLoop);
}

// Animasyon döngüsünü güvenli biçimde durdur
function stopAnimationLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = null;
  previousFrameTime = null;
  accumulatedTime = 0;
}

// Zaman tabanlı simülasyon
function animationLoop(timestamp) {
  animationFrameId = null;

  if (
    state.phase !== "running" &&
    state.phase !== "braking"
  ) {
    return;
  }

  if (previousFrameTime === null) {
    previousFrameTime = timestamp;
  }

  const elapsed = Math.min(
    (timestamp - previousFrameTime) / 1000,
    DESIGN.maxFrameDelta
  );
  previousFrameTime = timestamp;
  accumulatedTime += elapsed;

  // Sabit fizik adımlarıyla hesaplama yap
  while (accumulatedTime >= FIXED_STEP) {
    physicsStep(FIXED_STEP);
    accumulatedTime -= FIXED_STEP;
    if (state.phase === "stopped") {
      break;
    }
  }

  render();

  // Yalnızca bir sonraki kareyi planla
  if (
    state.phase === "running" ||
    state.phase === "braking"
  ) {
    animationFrameId = requestAnimationFrame(animationLoop);
  }
}

/* =====================================================
   OUTPUT — Görsel arayüz
===================================================== */

// Arayüzü güncelle
function render() {
  const angleDegrees = radiansToDegrees(state.angle);

  // Sarkaç görseli
  elements.arm.setAttribute(
    "transform",
    `rotate(${angleDegrees} 180 30)`
  );

  // Sayısal konum
  elements.angle.textContent = formatAngle(state.angle);

  // Durum
  const statusLabel = getStatusLabel();
  if (elements.status.textContent !== statusLabel) {
    elements.status.textContent = statusLabel;
  }
  elements.movement.textContent = statusLabel;

  // Yön göstergesi
  const showDirection = state.feedbackMode === "direction";
  elements.directionPanel.hidden = !showDirection;

  if (showDirection) {
    const direction = getDirection();
    elements.direction.textContent =
      direction === "left" ? "← Left" : "Right →";
  }

  // Kontrol durumları
  elements.start.disabled =
    state.phase === "running" ||
    state.phase === "braking";
  elements.pause.disabled =
    state.phase !== "running" &&
    state.phase !== "braking";
  elements.stop.disabled =
    state.phase === "stopped" ||
    state.phase === "braking" ||
    state.pendingStop;

  // Sonucu yalnızca durduktan sonra göster
  elements.reveal.hidden = state.phase !== "stopped";
  elements.reveal.disabled =
    state.phase !== "stopped" ||
    state.resultRevealed;
  elements.resultPanel.hidden = !state.resultRevealed;

  // Koşul seçimini yalnızca başlangıç durumunda aç
  const canChangeMode = isInitialState();
  elements.feedbackInputs.forEach(input => {    input.disabled = !canChangeMode;
    input.checked = input.value === state.feedbackMode;
  });

  elements.modeHelp.textContent =
    canChangeMode
      ? "You can change the feedback condition before starting."
      : "Reset the pendulum before changing the feedback condition.";
}

/* =====================================================
   OUTPUT — Eylem bildirimleri
===================================================== */

// Bildirimi kısa süreli göster
function showAcknowledgement(message) {
  clearTimeout(acknowledgementTimer);
  elements.acknowledgement.textContent = message;

  // Timer yalnızca bildirimin görünümünü yönetir.
  // Fizik simülasyonu için zamanlayıcı kullanılmaz.
  acknowledgementTimer = setTimeout(() => {
    elements.acknowledgement.textContent = "";
  }, DESIGN.acknowledgementDuration);
}

/* =====================================================
   INITIALISATION — İlk arayüzü hazırla
===================================================== */

// Başlangıç görselini ve kontrolleri oluştur
render();

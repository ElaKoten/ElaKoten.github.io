// JavaScript - Sequential Soundwave Line with Direct Pitch-Height Proportion & Visible Smudges
const CONFIG = {
  DECAY_RATE: 0.0035,       // Temporality: Decay speed
  FEEDBACK_BLUR_MAX: 16,    // Feedback: Smudge blur intensity for old traces
  WAVE_SPEED: 0.025,        // Animation speed of the baseline sine wave
  BASE_PITCH_FREQ: 180,     // Base audio pitch in Hz
  HARMONIC_STRANDS: 10      // Number of fine layered string strands
};

let audioCtx = null;
let audioStarted = false;

function unlockAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  audioStarted = true;
  
  const overlay = document.getElementById('audio-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
  }
}

// Rich Retro Analog Synth Timbre (Dual Sawtooth Detuned + Resonant Filter Envelope)
function triggerSynthTone(pitchRatio, normalizedX, isBass = false) {
  if (!audioCtx || !audioStarted) return;

  try {
    const now = audioCtx.currentTime;
    const baseFreq = CONFIG.BASE_PITCH_FREQ * pitchRatio * (isBass ? 0.5 : 1.0);

    // Master Gain & VCA Envelope
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    if (isBass) {
      masterGain.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    } else {
      masterGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    }

    // Resonant Lowpass Filter with filter envelope sweep (Classic Analog Synth VCF)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(isBass ? 6.0 : 8.5, now);

    const cutoffStart = isBass ? 300 + normalizedX * 1000 : 1200 + normalizedX * 3000;
    const cutoffPeak = cutoffStart * (isBass ? 2.2 : 3.5);

    filter.frequency.setValueAtTime(cutoffStart, now);
    filter.frequency.exponentialRampToValueAtTime(cutoffPeak, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(cutoffStart * 0.5, now + 1.2);

    // Dual Detuned Oscillators
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();

    osc1.type = isBass ? 'triangle' : 'sawtooth';
    osc2.type = 'sawtooth';

    osc1.frequency.setValueAtTime(baseFreq, now);
    osc2.frequency.setValueAtTime(baseFreq * 1.008, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    
    const stopTime = now + (isBass ? 1.7 : 1.4);
    osc1.stop(stopTime);
    osc2.stop(stopTime);
  } catch (e) {
    console.warn("Audio synth warning:", e);
  }
}

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
let width = 0;
let height = 0;

const notesQueue = [];
let cursorProgress = 0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class WaveNote {
  constructor(x, pitchRatio, amplitude, isBass) {
    this.x = x;
    this.pitchRatio = pitchRatio;
    this.amplitude = amplitude;
    this.width = isBass ? 200 : 160;
    this.isBass = isBass;
    this.life = 1.0;
  }

  update() {
    this.life -= CONFIG.DECAY_RATE;
  }
}

let phase = 0;

function animate() {
  ctx.fillStyle = 'rgba(11, 12, 16, 0.22)';
  ctx.fillRect(0, 0, width, height);

  phase += CONFIG.WAVE_SPEED;

  for (let i = notesQueue.length - 1; i >= 0; i--) {
    notesQueue[i].update();
    if (notesQueue[i].life <= 0) {
      notesQueue.splice(i, 1);
    }
  }

  const centerY = height / 2;
  const numPoints = 280;

  // Render smudged feedback trails for notes
  notesQueue.forEach(note => {
    ctx.save();
    
    const blurAmount = (1.0 - note.life) * CONFIG.FEEDBACK_BLUR_MAX;
    ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
    
    const alpha = Math.max(0.05, note.life);
    ctx.strokeStyle = note.isBass ? `rgba(102, 160, 252, ${alpha * 0.85})` : `rgba(102, 252, 241, ${alpha * 0.75})`;
    ctx.lineWidth = (note.isBass ? 3.5 : 2.0) + (1.0 - note.life) * 3.0;

    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const px = (i / numPoints) * width;
      const dist = Math.abs(px - note.x);
      
      let py = centerY;
      if (dist < note.width) {
        const env = Math.cos((dist / note.width) * (Math.PI / 2));
        const waveFactor = Math.sin((px * (note.isBass ? 0.02 : 0.04) * note.pitchRatio) + phase);
        py += note.amplitude * note.life * env * waveFactor;
      }

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  });

  // Draw baseline continuous harmonic waveform
  for (let strand = 0; strand < CONFIG.HARMONIC_STRANDS; strand++) {
    const strandOffset = (strand - CONFIG.HARMONIC_STRANDS / 2) * 1.5;
    const strandPhaseShift = strand * 0.12;

    ctx.save();
    ctx.beginPath();

    for (let i = 0; i <= numPoints; i++) {
      const px = (i / numPoints) * width;
      let py = centerY + Math.sin((px * 0.005) + phase + strandPhaseShift) * (6 + strandOffset);

      notesQueue.forEach(note => {
        const dist = Math.abs(px - note.x);
        if (dist < note.width) {
          const env = Math.cos((dist / note.width) * (Math.PI / 2));
          const waveFactor = Math.sin((px * (note.isBass ? 0.02 : 0.04) * note.pitchRatio) + phase);
          const displacement = note.amplitude * note.life * env * waveFactor;
          py += displacement * (1 + (strand * 0.05));
        }
      });

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    if (strand === Math.floor(CONFIG.HARMONIC_STRANDS / 2)) {
      ctx.strokeStyle = '#66fcf1';
      ctx.lineWidth = 2.0;
    } else {
      const opacity = 0.35 - Math.abs(strand - CONFIG.HARMONIC_STRANDS / 2) * 0.03;
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.06, opacity)})`;
      ctx.lineWidth = 0.7;
    }

    ctx.stroke();
    ctx.restore();
  }

  requestAnimationFrame(animate);
}
animate();

function addSequentialNote(y, isBass = false) {
  if (width === 0) return;

  cursorProgress = (cursorProgress + 80) % (width - 150);
  const posX = 100 + cursorProgress;

  const normalizedY = 1.0 - (y / height);
  const pitchRatio = 0.5 + (normalizedY * 2.0);
  const amplitude = (y - (height / 2)) * (isBass ? 2.0 : 1.5);

  notesQueue.push(new WaveNote(posX, pitchRatio, amplitude, isBass));
  triggerSynthTone(pitchRatio, posX / width, isBass);
}

window.addEventListener('pointerdown', (e) => {
  if (!audioStarted) {
    unlockAudioContext();
    return;
  }
  if (e.target.closest('.ui-layer') && !e.target.closest('#audio-overlay')) return;
  addSequentialNote(e.clientY, false);
});

const keyMap = {
  'a': { y: 0.15, bass: false },
  's': { y: 0.30, bass: false },
  'd': { y: 0.45, bass: false },
  'f': { y: 0.60, bass: true },
  'g': { y: 0.70, bass: true },
  'h': { y: 0.80, bass: true },
  'j': { y: 0.90, bass: true },
  'k': { y: 0.25, bass: true }
};

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (keyMap[key] !== undefined) {
    if (!audioStarted) {
      unlockAudioContext();
      return;
    }
    const configData = keyMap[key];
    const posY = height * configData.y;
    addSequentialNote(posY, configData.bass);

    const btn = document.querySelector(`.key-btn[data-key="${key}"]`);
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 200);
    }
  }
});

document.querySelectorAll('.key-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!audioStarted) {
      unlockAudioContext();
      return;
    }
    const key = btn.dataset.key;
    const event = new KeyboardEvent('keydown', { key: key });
    window.dispatchEvent(event);
  });
});

const overlay = document.getElementById('audio-overlay');
const startBtn = document.getElementById('start-btn');

if (overlay) {
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudioContext();
  });
  overlay.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    unlockAudioContext();
  });
}

if (startBtn) {
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAudioContext();
  });
  startBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    unlockAudioContext();
  });
}

document.getElementById('reset-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  notesQueue.length = 0;
  cursorProgress = 0;
  ctx.fillStyle = '#0b0c10';
  ctx.fillRect(0, 0, width, height);
});

document.getElementById('knob-decay').addEventListener('input', (e) => {
  CONFIG.DECAY_RATE = parseFloat(e.target.value);
  document.getElementById('decay-val').innerText = CONFIG.DECAY_RATE.toFixed(3);
});

document.getElementById('knob-blur').addEventListener('input', (e) => {
  CONFIG.FEEDBACK_BLUR_MAX = parseInt(e.target.value);
  document.getElementById('blur-val').innerText = CONFIG.FEEDBACK_BLUR_MAX + 'px';
});

document.getElementById('knob-freq').addEventListener('input', (e) => {
  CONFIG.HARMONIC_STRANDS = parseInt(e.target.value);
  document.getElementById('freq-val').innerText = CONFIG.HARMONIC_STRANDS;
});

document.getElementById('knob-pitch').addEventListener('input', (e) => {
  CONFIG.BASE_PITCH_FREQ = parseInt(e.target.value);
  document.getElementById('pitch-val').innerText = CONFIG.BASE_PITCH_FREQ + ' Hz';
});
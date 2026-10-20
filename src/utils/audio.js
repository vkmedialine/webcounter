// Web Audio API sound generator and multi-platform haptic feedback
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Physical acoustic vibration pulse - causes the phone speaker to thump against chassis
  playTactileBump() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Ultra low frequency sine wave creates mechanical speaker excursion
      osc.type = 'sine';
      osc.frequency.setValueAtTime(45, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.04);

      gain.gain.setValueAtTime(0.85, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      // Handled silently
    }
  }

  // Wooden mala bead click sound
  playBeadClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Resonant wood click
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Temple bell / singing bowl chime
  playBell() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      [880, 1320, 1760].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const initialGain = 0.2 / (idx + 1);
        gain.gain.setValueAtTime(initialGain, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 1.0);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Crisp modern pop
  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.035);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.045);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  // Celebratory chord when target completed
  playTargetComplete() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const noteTime = t + i * 0.09;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.75);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }

  playByType(type) {
    if (type === 'bell') this.playBell();
    else if (type === 'pop') this.playPop();
    else this.playBeadClick();
  }
}

export const soundFX = new SoundFX();

// iOS Safari Taptic Engine handler (using Apple native switch input trick)
let iosHapticLabel = null;

function getOrInitIosHaptic() {
  if (typeof document === 'undefined') return null;
  if (iosHapticLabel && document.body.contains(iosHapticLabel)) {
    return iosHapticLabel;
  }

  try {
    let container = document.getElementById('ios-haptic-trigger-box');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ios-haptic-trigger-box';
      container.setAttribute('aria-hidden', 'true');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0.0001;pointer-events:none;z-index:-9999;';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.id = 'ios-haptic-switch';

      const label = document.createElement('label');
      label.id = 'ios-haptic-label';
      label.htmlFor = 'ios-haptic-switch';

      container.appendChild(input);
      container.appendChild(label);
      document.body.appendChild(container);
    }
    iosHapticLabel = document.getElementById('ios-haptic-label');
    return iosHapticLabel;
  } catch (e) {
    return null;
  }
}

let lastHapticTime = 0;

/**
 * Universal Mobile Haptic Feedback
 * Works across Android (Vibration API), iOS Safari (Taptic switch trick), and universal acoustic vibration
 */
export const triggerHaptic = (pattern = 55) => {
  const now = Date.now();
  if (now - lastHapticTime < 40) return false;
  lastHapticTime = now;

  let success = false;

  // 1. Android & Standards-Compliant Vibration API
  // Using 55ms or pattern array overcomes motor inertia on modern Android phones
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      const vibPattern = typeof pattern === 'number' ? [pattern] : (Array.isArray(pattern) ? pattern : [55]);
      success = navigator.vibrate(vibPattern);
    } catch (e) {
      // Silently catch in restricted contexts
    }
  }

  // 2. iOS Safari (iOS 17.4+ & iOS 18+) Taptic Engine trigger
  try {
    const label = getOrInitIosHaptic();
    if (label) {
      label.click();
      success = true;
    }
  } catch (e) {
    // Silently catch
  }

  // 3. Physical Sub-bass Tactile Bump (causes physical speaker coil to pulse against phone chassis)
  try {
    soundFX.playTactileBump();
  } catch (e) {
    // Silently catch
  }

  return success;
};

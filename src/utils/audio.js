// Web Audio API sound generator for counter feedback
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

export const triggerHaptic = (duration = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Haptics might be blocked without user gesture
    }
  }
};

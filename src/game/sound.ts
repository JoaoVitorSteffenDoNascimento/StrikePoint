import { WeaponId } from './rules';

class TacticalAudioEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private randPitch(base: number, variance = 0.08): number {
    return base * (1 + (Math.random() * 2 - 1) * variance);
  }

  public playGunshot(weaponId: WeaponId, distanceMeters = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const atten = Math.max(0.08, 1 - distanceMeters / 85);
    const now = ctx.currentTime;

    if (weaponId === 'karambit') {
      // Crisp metallic slash whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.randPitch(680), now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
      gain.gain.setValueAtTime(0.22 * atten, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
      return;
    }

    // White noise burst for ballistic crack
    const duration = weaponId === 'awp' ? 0.34 : weaponId === 'm4a1' || weaponId === 'mp5' ? 0.09 : 0.16;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = weaponId === 'm4a1' || weaponId === 'mp5' ? 'bandpass' : 'lowpass';
    const baseFreq =
      weaponId === 'awp'
        ? 950
        : weaponId === 'ak47'
        ? 1450
        : weaponId === 'deagle'
        ? 1300
        : 1850;
    filter.frequency.setValueAtTime(this.randPitch(baseFreq), now);

    const noiseGain = ctx.createGain();
    const vol = weaponId === 'awp' ? 0.42 : weaponId === 'm4a1' ? 0.2 : 0.3;
    noiseGain.gain.setValueAtTime(vol * atten, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);

    // Sub-bass punch
    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = 'sawtooth';
    const startHz = weaponId === 'awp' ? 150 : weaponId === 'ak47' ? 190 : 230;
    punch.frequency.setValueAtTime(this.randPitch(startHz), now);
    punch.frequency.exponentialRampToValueAtTime(38, now + duration * 0.85);
    punchGain.gain.setValueAtTime(vol * 0.9 * atten, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);
    punch.connect(punchGain).connect(ctx.destination);
    punch.start(now);
    punch.stop(now + duration);
  }

  public playHitmarker(isHeadshot: boolean, isKill: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHeadshot ? 'sine' : 'triangle';
    const freq = isHeadshot ? this.randPitch(1950, 0.04) : this.randPitch(1120, 0.05);
    osc.frequency.setValueAtTime(freq, now);
    if (isKill) {
      osc.frequency.setValueAtTime(freq * 1.25, now + 0.045);
    }

    const dur = isKill ? 0.14 : 0.065;
    gain.gain.setValueAtTime(isHeadshot ? 0.32 : 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);
  }

  public playPlayerHurt() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this.randPitch(145), now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playReload() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.22].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(idx === 0 ? 420 : 640, now + offset);
      gain.gain.setValueAtTime(0.12, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.045);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.05);
    });
  }

  public playFootstep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(this.randPitch(95, 0.1), now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.055);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playRoundEnd(victory: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = victory ? [440, 554.37, 659.25, 880] : [392, 349.23, 311.13, 261.63];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.11);
      gain.gain.setValueAtTime(0.18, now + i * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.11);
      osc.stop(now + i * 0.11 + 0.3);
    });
  }
}

export const soundEngine = new TacticalAudioEngine();

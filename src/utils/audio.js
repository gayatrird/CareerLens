/**
 * Contextual Audio Feedback Utility for CareerLens
 *
 * Implements subtle, high-quality synthesized sound cues for meaningful actions.
 * Adheres strictly to safety parameters:
 * - Default effective volume around 10–15%
 * - Hard upper cap (capped at 0.15)
 * - Anti-overlap debouncing
 * - Silent failure on autoplay blocking or audio context error
 * - Suppressed when reduced-motion is requested
 */

let audioCtx = null;
const DEFAULT_VOLUME = 0.12; // 12% default effective volume (within 10-15%)
const MAX_VOLUME_CAP = 0.15; // Hard ceiling to never become loud

let masterVolume = DEFAULT_VOLUME;
let lastSoundTime = 0;
const MIN_SOUND_INTERVAL_MS = 120; // Prevent overlapping / rapid repeat cacophony

export const isReducedMotion = () => {
  try {
    if (typeof document !== 'undefined') {
      if (document.documentElement.getAttribute('data-reduce-motion') === 'true') {
        return true;
      }
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return true;
      }
    }
  } catch {}
  return false;
};

export const setMasterVolume = (val) => {
  masterVolume = Math.max(0, Math.min(MAX_VOLUME_CAP, val));
};

export const getMasterVolume = () => {
  return masterVolume;
};

export const initAudio = () => {
  try {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
};

function canPlaySound(ignoreMotion = false) {
  if (!ignoreMotion && isReducedMotion()) return false;
  if (masterVolume <= 0) return false;
  const now = Date.now();
  if (now - lastSoundTime < MIN_SOUND_INTERVAL_MS) return false;
  lastSoundTime = now;
  return true;
}

/**
 * 1. Analysis Start: Subtle, smooth ascending two-tone cue
 */
export const playAnalysisStart = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.12); // D5

    const vol = masterVolume * 0.7; // ~0.08
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  } catch {}
};

/**
 * 2. Individual AI Agent Completion: Gentle micro-blip
 */
export const playAgentComplete = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07); // A5

    const vol = masterVolume * 0.5; // ~0.06
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {}
};

/**
 * 3. Final Analysis / Result Reveal: Soft, warm harmonic chord
 */
export const playResultReveal = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25]; // C5, E5 major third chord
    const vol = (masterVolume * 0.65) / notes.length;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.02);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.03 + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.02);
      osc.stop(now + 0.3);
    });
  } catch {}
};

/**
 * 4. Career Navigator Generation Complete: Sleek flourish
 */
export const playNavigatorComplete = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.12); // G5

    const vol = masterVolume * 0.65;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  } catch {}
};

/**
 * 5. Mock Interview Start: Warm, welcoming tone
 */
export const playInterviewStart = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5

    const vol = masterVolume * 0.65;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  } catch {}
};

/**
 * 6. Mock Interview Complete: Gentle accomplishment chord
 */
export const playInterviewComplete = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C-E-G triad
    const vol = (masterVolume * 0.7) / notes.length;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.03 + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + 0.38);
    });
  } catch {}
};

/**
 * 7. Successful Save / Confirmation Action: Quiet affirmative blip
 */
export const playActionConfirm = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(783.99, now + 0.03); // G5

    const vol = masterVolume * 0.55;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  } catch {}
};

// ─── Backward Compatibility Fallbacks ─────────────────────────────────────────

export const playTick = () => {
  if (!canPlaySound()) return;
  try {
    const ctx = initAudio();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
    gain.gain.setValueAtTime(0.02 * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch {}
};

export const playGavel = () => {
  playResultReveal();
};

export const playTestSound = () => {
  playActionConfirm();
};

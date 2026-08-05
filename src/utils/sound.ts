class AlgorithmicReverb {
  public input: GainNode;
  public output: GainNode;
  private combs: { delay: DelayNode; feedback: GainNode; filter: BiquadFilterNode }[] = [];
  private allpasses: BiquadFilterNode[] = [];
  private wetGain: GainNode;

  constructor(private ctx: AudioContext) {
    const now = ctx.currentTime;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.wetGain.gain.setValueAtTime(0.3, now);

    // 4 Parallel Comb Filters
    const combDelayTimes = [0.0297, 0.0371, 0.0411, 0.0437];
    combDelayTimes.forEach((delayTime) => {
      const delayNode = ctx.createDelay();
      delayNode.delayTime.setValueAtTime(delayTime, now);

      const feedbackNode = ctx.createGain();
      feedbackNode.gain.setValueAtTime(0.72, now);

      const lowpassNode = ctx.createBiquadFilter();
      lowpassNode.type = 'lowpass';
      lowpassNode.frequency.setValueAtTime(2500, now);

      this.input.connect(delayNode);
      delayNode.connect(lowpassNode);
      lowpassNode.connect(feedbackNode);
      feedbackNode.connect(delayNode);

      // Connect to diffuse path
      delayNode.connect(this.wetGain);

      this.combs.push({ delay: delayNode, feedback: feedbackNode, filter: lowpassNode });
    });

    // Series All-pass filters (diffusers)
    const apFreqs = [500, 1000];
    let lastNode: AudioNode = this.wetGain;
    apFreqs.forEach((freq) => {
      const allpass = ctx.createBiquadFilter();
      allpass.type = 'allpass';
      allpass.frequency.setValueAtTime(freq, now);
      allpass.Q.setValueAtTime(0.7, now);

      lastNode.connect(allpass);
      lastNode = allpass;
      this.allpasses.push(allpass);
    });

    // Connect to output
    lastNode.connect(this.output);
  }

  public updateParameters(decay: number, cutoff: number, wet: number) {
    const now = this.ctx.currentTime;
    const safeDecay = Math.max(0, Math.min(0.98, decay));
    const safeCutoff = Math.max(100, Math.min(20000, cutoff));
    const safeWet = Math.max(0, Math.min(1.0, wet));

    this.combs.forEach((comb) => {
      comb.feedback.gain.setTargetAtTime(safeDecay, now, 0.05);
      comb.filter.frequency.setTargetAtTime(safeCutoff, now, 0.05);
    });
    this.wetGain.gain.setTargetAtTime(safeWet, now, 0.05);
  }
}

class SoundFXManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Bus routing for layered audio track separation
  private masterGain: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private reverbNode: AlgorithmicReverb | null = null;

  // Ambient Synthesis variables
  private insectTimer: any = null;
  private waterFlowSource: AudioBufferSourceNode | null = null;
  private waterFlowGain: GainNode | null = null;
  private waterFlowFilter: BiquadFilterNode | null = null;
  private waterLfo: OscillatorNode | null = null;

  // Background Music (BGM) Sequencer State
  private bgmTimer: any = null;
  private bgmCurrentTheme: string = '';
  private bgmStepIndex: number = 0;
  private bgmNextStepTime: number = 0;
  private activeBgmNodes: Set<{ osc: OscillatorNode; gain: GainNode }> = new Set();

  // Ambient Weather Channel Nodes
  private ambientNoiseNode: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private currentAmbientKey: string = '';
  private currentWeather: string = 'sunny';
  private weatherLfo: OscillatorNode | null = null;

  // Cooldown tracker for footsteps and interactions
  private lastPlayerFootstepTime: number = 0;
  private lastDecorationTriggerTime: number = 0;

  // Map of musical notes and frequencies
  private readonly NOTES = {
    G1: 49.00, Gs1: 51.91, A1: 55.00, Bb1: 58.27, B1: 61.74,
    C2: 65.41, Cs2: 69.30, D2: 73.42, E2: 82.41, F2: 87.31, Fs2: 92.50, G2: 98.00, Gs2: 103.83, A2: 110.00, Bb2: 116.54, B2: 123.47,
    C3: 130.81, Cs3: 138.59, D3: 146.83, E3: 164.81, F3: 174.61, Fs3: 185.00, G3: 196.00, Gs3: 207.65, A3: 220.00, Bb3: 233.08, As3: 233.08, B3: 246.94,
    C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.00, Gs4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
    C5: 523.25, Cs5: 554.37, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77, C6: 1046.50
  };

  constructor() {
    // Lazy initialization on user interaction
  }

  private initCtx() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx) {
        if (!this.masterGain) {
          this.initBuses();
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  private initBuses() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, now);
      this.masterGain.connect(this.ctx.destination);

      // Create Algorithmic Reverb
      this.reverbNode = new AlgorithmicReverb(this.ctx);
      this.reverbNode.output.connect(this.masterGain);

      // Ambient Bus -> dry to Master, wet to Reverb
      this.ambientBus = this.ctx.createGain();
      this.ambientBus.gain.setValueAtTime(1.0, now);
      this.ambientBus.connect(this.masterGain);
      this.ambientBus.connect(this.reverbNode.input);

      // SFX Bus -> dry to Master, wet to Reverb
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.setValueAtTime(1.0, now);
      this.sfxBus.connect(this.masterGain);
      this.sfxBus.connect(this.reverbNode.input);

      // BGM Bus -> dry to Master (clean BGM output)
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.setValueAtTime(1.0, now);
      this.bgmBus.connect(this.masterGain);
    } catch (e) {
      console.error("Failed to initialize audio buses:", e);
    }
  }

  private getDestination(type: 'ambient' | 'sfx' | 'bgm'): AudioNode {
    if (!this.ctx) throw new Error("AudioContext not ready");
    if (type === 'ambient' && this.ambientBus) return this.ambientBus;
    if (type === 'sfx' && this.sfxBus) return this.sfxBus;
    if (type === 'bgm' && this.bgmBus) return this.bgmBus;
    return this.ctx.destination;
  }

  private connectNode(node: AudioNode, type: 'ambient' | 'sfx' | 'bgm' = 'sfx') {
    if (!this.ctx) return;
    try {
      const dest = this.getDestination(type);
      node.connect(dest);
    } catch (e) {
      try {
        node.connect(this.ctx.destination);
      } catch (err) {}
    }
  }

  private getReverbConfigForMap(theme: string) {
    switch (theme) {
      case 'stone_tomb':
        return { decay: 0.88, cutoff: 1800, wet: 0.48 }; // Large damp cave
      case 'zuma_temple':
        return { decay: 0.84, cutoff: 2200, wet: 0.42 }; // Stone sanctuary cathedral
      case 'red_moon_altar':
        return { decay: 0.90, cutoff: 1400, wet: 0.50 }; // Apocalyptic mystic chamber
      case 'sabak_castle':
        return { decay: 0.78, cutoff: 2500, wet: 0.32 }; // Inside castle chamber
      case 'snake_valley':
        return { decay: 0.35, cutoff: 4000, wet: 0.08 }; // Deep dense forest (mild dampness)
      case 'green_field':
      default:
        return { decay: 0.15, cutoff: 6000, wet: 0.03 }; // Open bright field (very dry)
    }
  }

  // --- PROCEDURAL AMBIENT SOUND GENERATORS ---

  private startInsectChirpAmbient() {
    if (!this.ctx || this.isMuted) return;
    const isAppropriateTheme = this.bgmCurrentTheme === 'green_field' || this.bgmCurrentTheme === 'snake_valley';
    if (!isAppropriateTheme || this.currentWeather === 'sandstorm' || this.currentWeather === 'snow') {
      return;
    }

    const scheduleNextChirp = () => {
      if (!this.ctx || !this.ambientBus) return;
      const now = this.ctx.currentTime;
      const duration = 0.15 + Math.random() * 0.1;
      const volume = 0.003 + Math.random() * 0.004;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(3800 + Math.random() * 800, now);
        
        gain.gain.setValueAtTime(0, now);
        const pulses = 3 + Math.floor(Math.random() * 3);
        const pulseDur = duration / pulses;
        for (let i = 0; i < pulses; i++) {
          const t = now + i * pulseDur;
          gain.gain.linearRampToValueAtTime(volume, t + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, t + pulseDur - 0.005);
          osc.frequency.setValueAtTime(3800 + Math.random() * 800 + Math.sin(i * 10) * 200, t);
        }

        osc.connect(gain);
        this.connectNode(gain, 'ambient');

        osc.start(now);
        osc.stop(now + duration + 0.05);

        setTimeout(() => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch(e) {}
        }, (duration + 0.2) * 1000);
      } catch (e) {}

      const delay = 1500 + Math.random() * 4500;
      this.insectTimer = setTimeout(scheduleNextChirp, delay);
    };

    scheduleNextChirp();
  }

  private stopInsectChirp() {
    if (this.insectTimer) {
      clearTimeout(this.insectTimer);
      this.insectTimer = null;
    }
  }

  private startWaterFlowAmbient() {
    if (!this.ctx || this.isMuted) return;
    const isAppropriateTheme = this.bgmCurrentTheme === 'green_field' || this.bgmCurrentTheme === 'stone_tomb';
    if (!isAppropriateTheme) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = 0.85 * lastOut + 0.15 * white;
        lastOut = data[i];
      }

      this.waterFlowSource = this.ctx.createBufferSource();
      this.waterFlowSource.buffer = buffer;
      this.waterFlowSource.loop = true;

      this.waterFlowFilter = this.ctx.createBiquadFilter();
      this.waterFlowFilter.type = 'bandpass';
      const baseFreq = this.bgmCurrentTheme === 'stone_tomb' ? 180 : 320;
      const baseQ = this.bgmCurrentTheme === 'stone_tomb' ? 1.5 : 0.8;
      const volume = this.bgmCurrentTheme === 'stone_tomb' ? 0.008 : 0.005;

      this.waterFlowFilter.frequency.setValueAtTime(baseFreq, now);
      this.waterFlowFilter.Q.setValueAtTime(baseQ, now);

      this.waterFlowGain = this.ctx.createGain();
      this.waterFlowGain.gain.setValueAtTime(volume, now);

      this.waterLfo = this.ctx.createOscillator();
      this.waterLfo.frequency.setValueAtTime(0.35, now);

      const filterSweep = this.ctx.createGain();
      filterSweep.gain.setValueAtTime(baseFreq * 0.25, now);

      this.waterLfo.connect(filterSweep);
      filterSweep.connect(this.waterFlowFilter.frequency);

      this.waterFlowSource.connect(this.waterFlowFilter);
      this.waterFlowFilter.connect(this.waterFlowGain);
      this.connectNode(this.waterFlowGain, 'ambient');

      this.waterLfo.start(now);
      this.waterFlowSource.start(now);
    } catch(e) {}
  }

  private stopWaterFlow() {
    try {
      if (this.waterLfo) {
        this.waterLfo.stop();
        this.waterLfo.disconnect();
        this.waterLfo = null;
      }
      if (this.waterFlowSource) {
        this.waterFlowSource.stop();
        this.waterFlowSource.disconnect();
        this.waterFlowSource = null;
      }
      if (this.waterFlowFilter) {
        this.waterFlowFilter.disconnect();
        this.waterFlowFilter = null;
      }
      if (this.waterFlowGain) {
        this.waterFlowGain.disconnect();
        this.waterFlowGain = null;
      }
    } catch(e) {}
  }

  // --- COMPREHENSIVE BGM PROCEDURAL SEQUENCER ---
  public updateAmbient(theme: string, weather: string = 'sunny') {
    if (this.isMuted) {
      this.stopAmbient();
      this.stopBGM();
      return;
    }
    this.initCtx();
    if (!this.ctx) return;

    this.currentWeather = weather;
    const cacheKey = theme + '_' + weather;

    // Dynamically adjust environment reverb based on area parameters
    if (this.reverbNode) {
      const config = this.getReverbConfigForMap(theme);
      this.reverbNode.updateParameters(config.decay, config.cutoff, config.wet);
    }
    
    // 1. Update Weather / Environmental Wind sounds
    if (this.currentAmbientKey !== cacheKey || !this.ambientGain) {
      this.currentAmbientKey = cacheKey;
      this.stopAmbient();
      this.startAmbientWeather(theme, weather);
      this.startInsectChirpAmbient();
      this.startWaterFlowAmbient();
    }

    // 2. Update Background Musical Theme
    if (this.bgmCurrentTheme !== theme) {
      this.bgmCurrentTheme = theme;
      this.startBGM(theme);
    }
  }

  private startAmbientWeather(theme: string, weather: string) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2.5; // Warmer pink noise loop
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Warm 1-pole filter simulated pink noise generator
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = 0.78 * lastOut + 0.22 * white;
        lastOut = data[i];
      }
      
      this.ambientNoiseNode = this.ctx.createBufferSource();
      this.ambientNoiseNode.buffer = buffer;
      this.ambientNoiseNode.loop = true;
      
      this.ambientFilter = this.ctx.createBiquadFilter();
      this.ambientFilter.type = 'bandpass';
      
      this.ambientGain = this.ctx.createGain();
      
      this.ambientNoiseNode.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambientGain);
      this.connectNode(this.ambientGain, 'ambient');
      
      const now = this.ctx.currentTime;

      // Establish base frequencies and gains based on weather and environment
      let baseFreq = 550;
      let baseQ = 0.6;
      let baseVol = 0.015;

      if (weather === 'rain' || weather === 'thunder') {
        baseFreq = 720;
        baseQ = 0.35;
        baseVol = 0.045;
      } else if (weather === 'sandstorm') {
        baseFreq = 220;
        baseQ = 0.85;
        baseVol = 0.065;
      } else if (weather === 'snow') {
        baseFreq = 1380;
        baseQ = 1.7;
        baseVol = 0.014;
      } else {
        if (theme === 'stone_tomb' || theme === 'red_moon_altar' || theme === 'sabak_castle') {
          baseFreq = 115;
          baseQ = 0.5;
          baseVol = 0.025;
        } else {
          baseFreq = 500;
          baseQ = 0.65;
          baseVol = 0.012;
        }
      }

      this.ambientFilter.frequency.setValueAtTime(baseFreq, now);
      this.ambientFilter.Q.setValueAtTime(baseQ, now);
      this.ambientGain.gain.setValueAtTime(baseVol, now);

      // Connect LFO (Low Frequency Oscillator) to filter frequency & gain for natural gusting
      this.weatherLfo = this.ctx.createOscillator();
      this.weatherLfo.frequency.setValueAtTime(0.12, now); // Slow 8.3-second breathing cycle

      const filterSweepGain = this.ctx.createGain();
      filterSweepGain.gain.setValueAtTime(baseFreq * 0.38, now); // Sweeps cutoff up/down by 38%
      
      const volSweepGain = this.ctx.createGain();
      volSweepGain.gain.setValueAtTime(baseVol * 0.45, now); // Sweeps volume up/down by 45%

      this.weatherLfo.connect(filterSweepGain);
      filterSweepGain.connect(this.ambientFilter.frequency);

      this.weatherLfo.connect(volSweepGain);
      volSweepGain.connect(this.ambientGain.gain);

      this.weatherLfo.start(now);
      this.ambientNoiseNode.start();
    } catch (e) {}
  }

  private stopAmbient() {
    try {
      this.stopInsectChirp();
      this.stopWaterFlow();
      if (this.weatherLfo) {
        this.weatherLfo.stop();
        this.weatherLfo.disconnect();
        this.weatherLfo = null;
      }
      if (this.ambientNoiseNode) {
        this.ambientNoiseNode.stop();
        this.ambientNoiseNode.disconnect();
        this.ambientNoiseNode = null;
      }
      if (this.ambientFilter) {
        this.ambientFilter.disconnect();
        this.ambientFilter = null;
      }
      if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
      }
    } catch(e) {}
  }

  // Procedural Music Synthesizer
  private startBGM(theme: string) {
    this.stopBGM();
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    this.bgmStepIndex = 0;
    const lookahead = 0.2; // Schedule notes 200ms in advance
    const scheduleInterval = 120; // Check scheduler every 120ms
    const stepDuration = 0.38; // ~158 BPM for high pacing

    this.bgmNextStepTime = this.ctx.currentTime + 0.1;

    this.bgmTimer = setInterval(() => {
      if (this.isMuted || !this.ctx) {
        this.stopBGM();
        return;
      }
      const currentTime = this.ctx.currentTime;
      while (this.bgmNextStepTime < currentTime + lookahead) {
        this.scheduleBgmStep(this.bgmStepIndex, this.bgmNextStepTime, theme);
        this.bgmNextStepTime += stepDuration;
        this.bgmStepIndex = (this.bgmStepIndex + 1) % 32; // 32-step loop
      }
    }, scheduleInterval);
  }

  private stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    this.activeBgmNodes.forEach(node => {
      try {
        node.osc.stop();
        node.osc.disconnect();
        node.gain.disconnect();
      } catch (e) {}
    });
    this.activeBgmNodes.clear();
    this.bgmCurrentTheme = '';
  }

  private playTrackedBgmOsc(osc: OscillatorNode, gain: GainNode, start: number, stop: number) {
    if (!this.ctx) return;
    osc.connect(gain);
    this.connectNode(gain, 'bgm');
    
    osc.start(start);
    osc.stop(stop);
    
    const item = { osc, gain };
    this.activeBgmNodes.add(item);
    
    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
      this.activeBgmNodes.delete(item);
    }, (stop - this.ctx.currentTime) * 1000 + 150);
  }

  private playTrackedBgmChain(osc: OscillatorNode | AudioBufferSourceNode, finalGain: GainNode, start: number, stop: number) {
    if (!this.ctx) return;
    try {
      osc.start(start);
    } catch (e) {}
    try {
      (osc as any).stop(stop);
    } catch (e) {}

    const item = { osc: osc as OscillatorNode, gain: finalGain };
    this.activeBgmNodes.add(item);

    setTimeout(() => {
      try {
        osc.disconnect();
        finalGain.disconnect();
      } catch (e) {}
      this.activeBgmNodes.delete(item);
    }, (stop - this.ctx.currentTime) * 1000 + 150);
  }

  private connectDelay(inputNode: AudioNode, time: number, delaySec: number = 0.25, feedback: number = 0.3) {
    if (!this.ctx) return;
    try {
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(delaySec, time);
      
      const delayGain = this.ctx.createGain();
      delayGain.gain.setValueAtTime(feedback, time);
      
      delay.connect(delayGain);
      delayGain.connect(delay);
      
      inputNode.connect(delay);
      this.connectNode(delayGain, 'bgm');
    } catch (e) {}
  }

  private scheduleBgmStep(step: number, time: number, theme: string) {
    if (!this.ctx) return;

    // Organic atmospheric raindrop splatters to make the soundscape incredibly rich and natural
    if ((this.currentWeather === 'rain' || this.currentWeather === 'thunder') && Math.random() < 0.62) {
      this.synthWaterDrip(time + Math.random() * 0.35, 0.006);
    }

    // --- PROCEDURAL FANTASY MELODY ENGINE ---
    if (theme === 'green_field') {
      // 1. Sunny Field: Bright Major Chords & Happy Harp Melodies (C Major Pentatonic)
      const chordProg = [
        [this.NOTES.C3, this.NOTES.E3, this.NOTES.G3, this.NOTES.C4], // C Major (Steps 0-7)
        [this.NOTES.A2, this.NOTES.C3, this.NOTES.E3, this.NOTES.A3], // A Minor (Steps 8-15)
        [this.NOTES.F2, this.NOTES.A3, this.NOTES.C4, this.NOTES.F4], // F Major (Steps 16-23)
        [this.NOTES.G2, this.NOTES.B3, this.NOTES.D4, this.NOTES.G4]  // G Major (Steps 24-31)
      ];
      const currentChord = chordProg[Math.floor(step / 8)];
      const bassFreq = currentChord[0] / 2; // Warm low sub bass

      // Bass downbeat
      if (step % 8 === 0) {
        this.synthBass(bassFreq, time, 1.2, 'triangle', 0.14);
        // Strummed chord notes
        currentChord.forEach((freq, idx) => {
          this.synthPluck(freq, time + idx * 0.025, 1.5, 0.04);
        });
      }

      // Generative harp melody
      if (step % 2 === 0 && Math.random() < 0.45 && step % 8 !== 0) {
        const scale = [this.NOTES.C4, this.NOTES.D4, this.NOTES.E4, this.NOTES.G4, this.NOTES.A4, this.NOTES.C5, this.NOTES.D5, this.NOTES.E5, this.NOTES.G5];
        const melNote = scale[Math.floor(Math.random() * scale.length)];
        this.synthPluck(melNote, time, 0.6, 0.05, 'sine');
      }

      // Soft grassy rustles (Simulated Shaker)
      if (step % 2 === 0) {
        this.synthWhiteNoiseBurst(time, 0.04, 7000, 0.01);
      }

    } else if (theme === 'snake_valley') {
      // 2. Snake Valley: Deep Mysterious Woodwind/Flute & Rhythm (A Minor Pentatonic)
      const chordProg = [
        [this.NOTES.A2, this.NOTES.C3, this.NOTES.E3, this.NOTES.A3], // Am
        [this.NOTES.E2, this.NOTES.G3, this.NOTES.B3, this.NOTES.E4], // Em
        [this.NOTES.D2, this.NOTES.F3, this.NOTES.A3, this.NOTES.D4], // Dm
        [this.NOTES.E2, this.NOTES.Gs3, this.NOTES.B3, this.NOTES.E4] // E7
      ];
      const currentChord = chordProg[Math.floor(step / 8)];
      const bassFreq = currentChord[0] / 2;

      // Bass downbeat
      if (step % 8 === 0) {
        this.synthBass(bassFreq, time, 1.5, 'triangle', 0.1);
        // Soft synthetic pad strum
        currentChord.forEach((freq, idx) => {
          this.synthPad(freq, time + idx * 0.03, 1.8, 0.03);
        });
      }

      // Mystic bamboo clicking rhythm
      if (step % 4 === 2) {
        this.synthWoodClick(time, 0.04, 0.04);
      }

      // Ethereal flute melody
      if (step % 2 === 0 && Math.random() < 0.4 && step % 8 !== 2) {
        const scale = [this.NOTES.A3, this.NOTES.B3, this.NOTES.C4, this.NOTES.E4, this.NOTES.G4, this.NOTES.A4, this.NOTES.C5, this.NOTES.E5];
        const melNote = scale[Math.floor(Math.random() * scale.length)];
        this.synthFlute(melNote, time, 0.5, 0.045);
      }

      // Continuous rustling wind
      if (step % 4 === 0) {
        this.synthWhiteNoiseBurst(time, 0.15, 1200, 0.008);
      }

    } else if (theme === 'stone_tomb' || theme === 'red_moon_altar') {
      // 3. Ancient Dungeon/Cave: Dark Gothic Pads, Dripping Water & Deep Sub Bass (F# Phrygian)
      const chordProg = [
        [this.NOTES.Fs2, this.NOTES.A3, this.NOTES.Cs4], // F#m
        [this.NOTES.D2, this.NOTES.Fs3, this.NOTES.A3],  // D
        [this.NOTES.Cs2, this.NOTES.E3, this.NOTES.Gs3], // C#m
        [this.NOTES.Fs2, this.NOTES.G3, this.NOTES.Cs4]  // F# Phrygian Tension
      ];
      const currentChord = chordProg[Math.floor(step / 8)];

      // Deep subterranean bass pad drone
      if (step % 8 === 0) {
        this.synthBass(currentChord[0], time, 2.5, 'sine', 0.08);
        currentChord.forEach((freq) => {
          this.synthPad(freq, time, 2.4, 0.02);
        });
      }

      // Echoing cave water drips
      if (step % 8 === 4 && Math.random() < 0.6) {
        this.synthWaterDrip(time, 0.06);
      }

      // Whispering minor melodies
      if (step % 4 === 2 && Math.random() < 0.3) {
        const scale = [this.NOTES.Fs3, this.NOTES.G3, this.NOTES.As3, this.NOTES.Cs4, this.NOTES.D4, this.NOTES.Fs4, this.NOTES.G4];
        const melNote = scale[Math.floor(Math.random() * scale.length)];
        this.synthPluck(melNote, time, 1.2, 0.02, 'sine');
      }

    } else {
      // 4. Sabak Castle: Epic War-Drum Beat, Heavy Brassy Horn Pads (D Minor / Phrygian)
      const chordProg = [
        [this.NOTES.D2, this.NOTES.F3, this.NOTES.A3],  // Dm
        [this.NOTES.Bb1, this.NOTES.D3, this.NOTES.F3], // Bb
        [this.NOTES.G1, this.NOTES.Bb2, this.NOTES.D3], // Gm
        [this.NOTES.A1, this.NOTES.Cs3, this.NOTES.E3]  // A Major (Dominant)
      ];
      const currentChord = chordProg[Math.floor(step / 8)];

      // Epic War Drum Beat
      if (step % 4 === 0) {
        this.synthWarDrum(time, 0.22, 0.25);
      } else if (step % 8 === 6) {
        // Double war drum kick
        this.synthWarDrum(time, 0.15, 0.18);
        this.synthWarDrum(time + 0.12, 0.12, 0.12);
      }

      // Heavy Brass-like minor chord pads
      if (step % 8 === 0) {
        currentChord.forEach((freq) => {
          this.synthBrassHorn(freq, time, 1.8, 0.04);
        });
      }

      // Tense sharp string plucks
      if (step % 2 === 1 && Math.random() < 0.5) {
        const scale = [this.NOTES.D4, this.NOTES.E4, this.NOTES.F4, this.NOTES.G4, this.NOTES.A4, this.NOTES.Bb4, this.NOTES.Cs5, this.NOTES.D5];
        const melNote = scale[Math.floor(Math.random() * scale.length)];
        this.synthPluck(melNote, time, 0.4, 0.04, 'triangle');
      }
    }
  }

  // --- PROCEDURAL SYNTH INSTRUMENTS ---

  private synthPluck(freq: number, time: number, duration: number, volume: number, type: OscillatorType = 'sine') {
    if (!this.ctx) return;
    try {
      const panVal = Math.sin(time * 3.2) * 0.5; // Panning oscillates naturally
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, time);
      filter.frequency.exponentialRampToValueAtTime(450, time + duration * 0.35);

      // detuned unison double oscillators
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = type;
      osc2.type = type;
      osc1.frequency.setValueAtTime(freq - 0.7, time);
      osc2.frequency.setValueAtTime(freq + 0.7, time);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      let outputNode: AudioNode = gain;
      try {
        if (this.ctx.createStereoPanner) {
          const panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(panVal, time);
          gain.connect(panner);
          outputNode = panner;
        }
      } catch (e) {}

      this.connectNode(outputNode, 'bgm');

      // Lush feedback echo delay
      this.connectDelay(outputNode, time, 0.28, 0.32);

      this.playTrackedBgmChain(osc1, gain, time, time + duration);
      this.playTrackedBgmChain(osc2, gain, time, time + duration);
    } catch(e) {}
  }

  private synthBass(freq: number, time: number, duration: number, type: OscillatorType = 'triangle', volume: number = 0.15) {
    if (!this.ctx) return;
    try {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(110, time);

      const oscTriangle = this.ctx.createOscillator();
      oscTriangle.type = type;
      oscTriangle.frequency.setValueAtTime(freq, time);

      // Deep sub harmonic sine layer
      const oscSub = this.ctx.createOscillator();
      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(freq * 0.5, time);

      oscTriangle.connect(filter);
      oscSub.connect(filter);
      filter.connect(gain);
      this.connectNode(gain, 'bgm');

      this.playTrackedBgmChain(oscTriangle, gain, time, time + duration);
      this.playTrackedBgmChain(oscSub, gain, time, time + duration);
    } catch (e) {}
  }

  private synthPad(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx) return;
    try {
      const panVal = Math.cos(time * 0.8) * 0.4;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + duration * 0.35); // Slow atmospheric swell
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.linearRampToValueAtTime(800, time + duration * 0.5); // Warm sweeping filter
      filter.frequency.linearRampToValueAtTime(320, time + duration);

      // detuned chorus synthesis
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq - 1.1, time);
      osc2.frequency.setValueAtTime(freq + 1.1, time);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);

      let outputNode: AudioNode = gain;
      try {
        if (this.ctx.createStereoPanner) {
          const panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(panVal, time);
          gain.connect(panner);
          outputNode = panner;
        }
      } catch (e) {}

      this.connectNode(outputNode, 'bgm');

      this.playTrackedBgmChain(osc1, gain, time, time + duration);
      this.playTrackedBgmChain(osc2, gain, time, time + duration);
    } catch (e) {}
  }

  private synthFlute(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx) return;
    try {
      const panVal = Math.sin(time * 1.5) * 0.3;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.08); // Real woodwind breath attack
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, time);

      // Pitch vibrato
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      for (let offset = 0; offset < duration; offset += 0.06) {
        osc.frequency.setValueAtTime(freq + Math.sin(offset * 37) * 3.5, time + offset);
      }

      // Subtle breath noise transient
      const breathBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
      const bData = breathBuffer.getChannelData(0);
      for (let i = 0; i < bData.length; i++) {
        bData[i] = Math.random() * 2 - 1;
      }
      const breathSrc = this.ctx.createBufferSource();
      breathSrc.buffer = breathBuffer;

      const breathFilter = this.ctx.createBiquadFilter();
      breathFilter.type = 'bandpass';
      breathFilter.frequency.setValueAtTime(freq * 1.8, time);
      breathFilter.Q.setValueAtTime(8, time);

      const breathGain = this.ctx.createGain();
      breathGain.gain.setValueAtTime(volume * 0.12, time);
      breathGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);

      osc.connect(filter);
      filter.connect(gain);

      breathSrc.connect(breathFilter);
      breathFilter.connect(breathGain);
      breathGain.connect(gain);

      let outputNode: AudioNode = gain;
      try {
        if (this.ctx.createStereoPanner) {
          const panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(panVal, time);
          gain.connect(panner);
          outputNode = panner;
        }
      } catch (e) {}

      this.connectNode(outputNode, 'bgm');

      // Airy cavern echo delay
      this.connectDelay(outputNode, time, 0.32, 0.28);

      this.playTrackedBgmChain(osc, gain, time, time + duration);
      this.playTrackedBgmChain(breathSrc, gain, time, time + duration);
    } catch(e) {}
  }

  private synthBrassHorn(freq: number, time: number, duration: number, volume: number) {
    if (!this.ctx) return;
    try {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, time);
      filter.frequency.exponentialRampToValueAtTime(850, time + 0.18); // Brassy resonant swell
      filter.frequency.exponentialRampToValueAtTime(220, time + duration);

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq - 1.5, time);
      osc2.frequency.setValueAtTime(freq + 1.5, time);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      this.connectNode(gain, 'bgm');

      this.playTrackedBgmChain(osc1, gain, time, time + duration);
      this.playTrackedBgmChain(osc2, gain, time, time + duration);
    } catch(e) {}
  }

  private synthWarDrum(time: number, duration: number, volume: number, destType: 'bgm' | 'sfx' = 'bgm') {
    if (!this.ctx) return;
    try {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, time);

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(30, time + duration * 0.75); // Dropping pitch thud

      // Drum stick physical transient beater pop
      const popBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.025, this.ctx.sampleRate);
      const pData = popBuffer.getChannelData(0);
      for (let i = 0; i < pData.length; i++) {
        pData[i] = Math.random() * 2 - 1;
      }
      const popSrc = this.ctx.createBufferSource();
      popSrc.buffer = popBuffer;

      const popFilter = this.ctx.createBiquadFilter();
      popFilter.type = 'bandpass';
      popFilter.frequency.setValueAtTime(320, time);
      popFilter.Q.setValueAtTime(4, time);

      const popGain = this.ctx.createGain();
      popGain.gain.setValueAtTime(volume * 0.75, time);
      popGain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

      osc.connect(filter);
      filter.connect(gain);

      popSrc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(gain);

      this.connectNode(gain, destType);

      this.playTrackedBgmChain(osc, gain, time, time + duration);
      this.playTrackedBgmChain(popSrc, gain, time, time + 0.025);
    } catch(e) {}
  }

  private synthWoodClick(time: number, duration: number, volume: number, destType: 'bgm' | 'sfx' = 'bgm') {
    if (!this.ctx) return;
    try {
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, time);
      filter.Q.setValueAtTime(16, time); // High Q wooden click ringing

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(550, time);
      osc2.frequency.setValueAtTime(550 * 1.5, time); // pitched fifth higher

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      this.connectNode(gain, destType);

      this.playTrackedBgmChain(osc1, gain, time, time + duration);
      this.playTrackedBgmChain(osc2, gain, time, time + duration);
    } catch(e) {}
  }

  private synthWaterDrip(time: number, volume: number) {
    if (!this.ctx) return;
    try {
      const panVal = (Math.random() - 0.5) * 0.8;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, time);
      osc.frequency.exponentialRampToValueAtTime(2450, time + 0.035); // Fast splash envelope

      osc.connect(gain);

      let outputNode: AudioNode = gain;
      try {
        if (this.ctx.createStereoPanner) {
          const panner = this.ctx.createStereoPanner();
          panner.pan.setValueAtTime(panVal, time);
          gain.connect(panner);
          outputNode = panner;
        }
      } catch (e) {}

      this.connectNode(outputNode, 'ambient');

      // splash cavern echo delay
      this.connectDelay(outputNode, time, 0.22, 0.25);

      this.playTrackedBgmChain(osc, gain, time, time + 0.12);
    } catch(e) {}
  }

  private synthWhiteNoiseBurst(
    time: number,
    duration: number,
    filterFreq: number,
    volume: number,
    filterType: BiquadFilterType = 'highpass',
    destType: 'bgm' | 'sfx' | 'ambient' = 'sfx'
  ) {
    if (!this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = filterType;
      filter.frequency.value = filterFreq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      src.connect(filter);
      filter.connect(gain);
      this.connectNode(gain, destType);

      src.start(time);
    } catch (e) {}
  }


  private synthEquipmentClatter(time: number, armorClass: 'heavy' | 'light' | 'robe', volumeMultiplier: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    try {
      const duration = armorClass === 'heavy' ? 0.12 : armorClass === 'robe' ? 0.22 : 0.08;
      const volume = (armorClass === 'heavy' ? 0.015 : armorClass === 'robe' ? 0.005 : 0.008) * volumeMultiplier;

      if (armorClass === 'heavy') {
        // High Q metallic ringing taps
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400 + Math.random() * 400, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        osc.connect(gain);
        this.connectNode(gain, 'sfx');
        osc.start(time);
        osc.stop(time + duration);
      } else if (armorClass === 'robe') {
        // Soft swish noise
        this.synthWhiteNoiseBurst(time, duration, 1200, volume, 'bandpass', 'sfx');
      } else {
        // Light leather creek (short clicks)
        this.synthWoodClick(time, duration, volume, 'sfx');
      }
    } catch (e) {}
  }

  // --- FOREGROUND AUDIO SYSTEM (SFX) ---

  // 1. Natural Real Footstep Engine with Multi-Terrain Acoustics
  public playPlayerFootstep(
    isRunning: boolean,
    isMounted: boolean,
    armorClass: 'heavy' | 'light' | 'robe' = 'light',
    terrainType: 'grass' | 'gravel' | 'water' | 'stone' = 'grass'
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = Date.now();
    const interval = isMounted ? 350 : isRunning ? 280 : 480;
    if (now - this.lastPlayerFootstepTime < interval) return;
    this.lastPlayerFootstepTime = now;

    try {
      const audioTime = this.ctx.currentTime;
      if (isMounted) {
        // Synthesize Hoof Trot: "Clip-clop" double impact
        // First hoof strike
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(140, audioTime);
        osc1.frequency.exponentialRampToValueAtTime(50, audioTime + 0.06);
        gain1.gain.setValueAtTime(0.12, audioTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.06);
        osc1.connect(gain1);
        this.connectNode(gain1, 'sfx');
        osc1.start(audioTime);
        osc1.stop(audioTime + 0.06);

        // Secondary hoof strike (slightly offset and lower pitch)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(110, audioTime + 0.075);
        osc2.frequency.exponentialRampToValueAtTime(40, audioTime + 0.135);
        gain2.gain.setValueAtTime(0.08, audioTime + 0.075);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.135);
        osc2.connect(gain2);
        this.connectNode(gain2, 'sfx');
        osc2.start(audioTime + 0.075);
        osc2.stop(audioTime + 0.135);

        // Terrain-specific hoof interaction layer
        if (terrainType === 'water') {
          this.synthWhiteNoiseBurst(audioTime, 0.12, 1600, 0.05, 'bandpass', 'sfx');
        } else if (terrainType === 'gravel') {
          this.synthWhiteNoiseBurst(audioTime, 0.08, 3800, 0.04, 'highpass', 'sfx');
        } else if (terrainType === 'stone') {
          this.synthWhiteNoiseBurst(audioTime, 0.05, 2800, 0.03, 'bandpass', 'sfx');
        } else {
          this.synthWhiteNoiseBurst(audioTime, 0.1, 450, 0.02, 'highpass', 'sfx');
        }
        
        // Soft tackle clatter on horseback
        this.synthEquipmentClatter(audioTime, armorClass, 0.5);
      } else {
        // Pedestrian Footsteps with Precise Physical Terrain Acoustics
        const duration = isRunning ? 0.11 : 0.07;
        const baseVol = isRunning ? 0.07 : 0.035;

        if (terrainType === 'water') {
          // --- WATER / PUDDLE SPLASH FOOTSTEP ---
          // Liquid drop pitch sweep
          const oscWater = this.ctx.createOscillator();
          const gainWater = this.ctx.createGain();
          oscWater.type = 'sine';
          oscWater.frequency.setValueAtTime(560, audioTime);
          oscWater.frequency.exponentialRampToValueAtTime(180, audioTime + 0.09);
          gainWater.gain.setValueAtTime(baseVol * 1.8, audioTime);
          gainWater.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.09);
          oscWater.connect(gainWater);
          this.connectNode(gainWater, 'sfx');
          oscWater.start(audioTime);
          oscWater.stop(audioTime + 0.09);

          // Water splash spray (Resonant Bandpass Noise)
          this.synthWhiteNoiseBurst(audioTime, 0.12, 1800, baseVol * 1.4, 'bandpass', 'sfx');

          // Secondary liquid droplet pop
          const oscPop = this.ctx.createOscillator();
          const gainPop = this.ctx.createGain();
          oscPop.type = 'sine';
          oscPop.frequency.setValueAtTime(800, audioTime + 0.035);
          oscPop.frequency.exponentialRampToValueAtTime(1200, audioTime + 0.075);
          gainPop.gain.setValueAtTime(baseVol * 0.9, audioTime + 0.035);
          gainPop.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.075);
          oscPop.connect(gainPop);
          this.connectNode(gainPop, 'sfx');
          oscPop.start(audioTime + 0.035);
          oscPop.stop(audioTime + 0.075);

        } else if (terrainType === 'gravel') {
          // --- GRAVEL / LOOSE ROCK FOOTSTEP ---
          // Hard stone impact thud
          const oscGravel = this.ctx.createOscillator();
          const gainGravel = this.ctx.createGain();
          oscGravel.type = 'triangle';
          oscGravel.frequency.setValueAtTime(130, audioTime);
          oscGravel.frequency.exponentialRampToValueAtTime(45, audioTime + duration);
          gainGravel.gain.setValueAtTime(baseVol * 1.3, audioTime);
          gainGravel.gain.exponentialRampToValueAtTime(0.001, audioTime + duration);
          oscGravel.connect(gainGravel);
          this.connectNode(gainGravel, 'sfx');
          oscGravel.start(audioTime);
          oscGravel.stop(audioTime + duration);

          // Staggered micro-grain crunch clicks
          this.synthWhiteNoiseBurst(audioTime, duration, 3600, baseVol * 1.3, 'highpass', 'sfx');
          this.synthWhiteNoiseBurst(audioTime + 0.012, duration * 0.8, 4400, baseVol * 0.9, 'bandpass', 'sfx');
          this.synthWhiteNoiseBurst(audioTime + 0.025, duration * 0.6, 2800, baseVol * 0.7, 'highpass', 'sfx');

        } else if (terrainType === 'stone') {
          // --- STONE / CAVE / PALACE FLOOR FOOTSTEP ---
          // Hard reverberant stone contact click
          this.synthWhiteNoiseBurst(audioTime, 0.03, 3800, baseVol * 1.5, 'highpass', 'sfx');

          // Dense stone body thud
          const oscStone = this.ctx.createOscillator();
          const gainStone = this.ctx.createGain();
          oscStone.type = 'triangle';
          oscStone.frequency.setValueAtTime(190, audioTime);
          oscStone.frequency.exponentialRampToValueAtTime(60, audioTime + 0.06);
          gainStone.gain.setValueAtTime(baseVol * 1.6, audioTime);
          gainStone.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.06);
          oscStone.connect(gainStone);
          this.connectNode(gainStone, 'sfx');
          oscStone.start(audioTime);
          oscStone.stop(audioTime + 0.06);

          // Slap echo / mini reflection
          this.synthWhiteNoiseBurst(audioTime + 0.038, 0.025, 2400, baseVol * 0.5, 'bandpass', 'sfx');

        } else {
          // --- GRASS / DIRT FOOTSTEP (DEFAULT) ---
          // Soft organic dirt thud
          const oscGrass = this.ctx.createOscillator();
          const gainGrass = this.ctx.createGain();
          oscGrass.type = 'triangle';
          oscGrass.frequency.setValueAtTime(90, audioTime);
          oscGrass.frequency.exponentialRampToValueAtTime(30, audioTime + duration);
          gainGrass.gain.setValueAtTime(baseVol * 1.5, audioTime);
          gainGrass.gain.exponentialRampToValueAtTime(0.001, audioTime + duration);
          oscGrass.connect(gainGrass);
          this.connectNode(gainGrass, 'sfx');
          oscGrass.start(audioTime);
          oscGrass.stop(audioTime + duration);

          // Foliage & soil crunch
          this.synthWhiteNoiseBurst(audioTime, duration, 1100, baseVol * 1.1, 'highpass', 'sfx');
          this.synthWhiteNoiseBurst(audioTime, duration * 1.2, 2400, baseVol * 0.6, 'bandpass', 'sfx');
        }

        // Synthesize dynamic equipment response
        this.synthEquipmentClatter(audioTime, armorClass, isRunning ? 1.4 : 0.8);
      }
    } catch (e) {}
  }

  // --- PHYSICAL ENVIRONMENTAL INTERACTION SYNTHESIS ---

  /**
   * playBushRustle: Physical foliage rustling sound when player steps through bushes / tall grass
   */
  public playBushRustle(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = Date.now();
    if (now - this.lastDecorationTriggerTime < 160) return;
    this.lastDecorationTriggerTime = now;

    try {
      const audioTime = this.ctx.currentTime;
      const duration = 0.16 + Math.random() * 0.08;
      const vol = Math.min(0.06, 0.025 * intensity);

      // Low foliage friction noise
      this.synthWhiteNoiseBurst(audioTime, duration, 1300 + Math.random() * 400, vol, 'bandpass', 'sfx');
      
      // High leaf edge swish
      this.synthWhiteNoiseBurst(audioTime + 0.02, duration * 0.8, 3100 + Math.random() * 600, vol * 0.8, 'highpass', 'sfx');

      // Random leaf stalk snap/crack
      if (Math.random() > 0.4) {
        this.synthWoodClick(audioTime + Math.random() * 0.05, 0.04, vol * 0.7, 'sfx');
      }
    } catch (e) {}
  }

  /**
   * playWaterSplash: Physical water splash sound when stepping into shallow water or puddles
   */
  public playWaterSplash(intensity: number = 1.0) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = Date.now();
    if (now - this.lastDecorationTriggerTime < 180) return;
    this.lastDecorationTriggerTime = now;

    try {
      const audioTime = this.ctx.currentTime;
      const vol = Math.min(0.08, 0.035 * intensity);

      // Liquid plop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620 + Math.random() * 150, audioTime);
      osc.frequency.exponentialRampToValueAtTime(190, audioTime + 0.12);
      gain.gain.setValueAtTime(vol * 1.5, audioTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioTime + 0.12);
      osc.connect(gain);
      this.connectNode(gain, 'sfx');
      osc.start(audioTime);
      osc.stop(audioTime + 0.12);

      // Water spray noise
      this.synthWhiteNoiseBurst(audioTime, 0.14, 1700 + Math.random() * 300, vol * 1.2, 'bandpass', 'sfx');
    } catch (e) {}
  }

  /**
   * playDecorationTrigger: Physical trigger for interactive environment elements
   */
  public playDecorationTrigger(type: 'bush' | 'grass' | 'puddle' | 'crystal' | 'torch' | 'chain') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (type === 'bush' || type === 'grass') {
      this.playBushRustle(1.0);
    } else if (type === 'puddle') {
      this.playWaterSplash(1.0);
    } else if (type === 'crystal') {
      const now = Date.now();
      if (now - this.lastDecorationTriggerTime < 500) return;
      this.lastDecorationTriggerTime = now;
      try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, t);
        osc.frequency.exponentialRampToValueAtTime(2640, t + 0.25);
        gain.gain.setValueAtTime(0.02, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc.connect(gain);
        this.connectNode(gain, 'sfx');
        osc.start(t);
        osc.stop(t + 0.25);
      } catch (e) {}
    } else if (type === 'torch') {
      const now = Date.now();
      if (now - this.lastDecorationTriggerTime < 400) return;
      this.lastDecorationTriggerTime = now;
      try {
        const t = this.ctx.currentTime;
        this.synthWhiteNoiseBurst(t, 0.15, 650, 0.025, 'bandpass', 'sfx');
      } catch (e) {}
    }
  }

  // 2. Class/Profession-Specific Realistic Skill Release Sounds
  public playSkillRelease(profession: string, particleType: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      if (profession === 'warrior') {
        if (particleType === 'fire_sword') {
          // Flame Strike (烈火剑法): Deep roar + crackling fire + heavy metallic swing
          this.playSwingMetallic(380, 80, 0.25);
          
          // Low-frequency fire roar
          const oscFire = this.ctx.createOscillator();
          const gainFire = this.ctx.createGain();
          oscFire.type = 'sawtooth';
          oscFire.frequency.setValueAtTime(150, now);
          oscFire.frequency.exponentialRampToValueAtTime(45, now + 0.35);
          gainFire.gain.setValueAtTime(0.35, now);
          gainFire.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          oscFire.connect(gainFire);
          gainFire.connect(this.ctx.destination);
          oscFire.start(now);
          oscFire.stop(now + 0.35);

          // Crackling coal grains
          for (let i = 0; i < 6; i++) {
            this.synthWhiteNoiseBurst(now + Math.random() * 0.25, 0.015, 6000, 0.05);
          }
        } else if (particleType === 'sky_slash') {
          // Sky Slash (开天斩): Massive thunderous sword crack + heavy resonance boom
          this.playSwingMetallic(520, 60, 0.35);
          const oscSky = this.ctx.createOscillator();
          const gainSky = this.ctx.createGain();
          oscSky.type = 'sawtooth';
          oscSky.frequency.setValueAtTime(320, now);
          oscSky.frequency.exponentialRampToValueAtTime(30, now + 0.5);
          gainSky.gain.setValueAtTime(0.4, now);
          gainSky.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          oscSky.connect(gainSky);
          gainSky.connect(this.ctx.destination);
          oscSky.start(now);
          oscSky.stop(now + 0.5);
        } else if (particleType === 'sun_chaser') {
          // Sun Chaser (逐日剑法): Radiant solar flash burst + high-speed blade zip
          this.playSwingMetallic(700, 200, 0.28);
          const oscSun = this.ctx.createOscillator();
          const gainSun = this.ctx.createGain();
          oscSun.type = 'sine';
          oscSun.frequency.setValueAtTime(200, now);
          oscSun.frequency.exponentialRampToValueAtTime(850, now + 0.4);
          gainSun.gain.setValueAtTime(0.3, now);
          gainSun.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          oscSun.connect(gainSun);
          gainSun.connect(this.ctx.destination);
          oscSun.start(now);
          oscSun.stop(now + 0.4);
        } else if (particleType === 'savage_charge') {
          // Savage Charge (野蛮冲撞): Heavy impact thud + rushing wind
          const oscCharge = this.ctx.createOscillator();
          const gainCharge = this.ctx.createGain();
          oscCharge.type = 'square';
          oscCharge.frequency.setValueAtTime(180, now);
          oscCharge.frequency.exponentialRampToValueAtTime(50, now + 0.3);
          gainCharge.gain.setValueAtTime(0.35, now);
          gainCharge.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          oscCharge.connect(gainCharge);
          gainCharge.connect(this.ctx.destination);
          oscCharge.start(now);
          oscCharge.stop(now + 0.3);
        } else if (particleType === 'aegis_shield') {
          // Aegis Shield (护体神盾): Resonant golden bell aura hum
          const oscAegis = this.ctx.createOscillator();
          const gainAegis = this.ctx.createGain();
          oscAegis.type = 'sine';
          oscAegis.frequency.setValueAtTime(300, now);
          oscAegis.frequency.exponentialRampToValueAtTime(520, now + 0.6);
          gainAegis.gain.setValueAtTime(0.28, now);
          gainAegis.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          oscAegis.connect(gainAegis);
          gainAegis.connect(this.ctx.destination);
          oscAegis.start(now);
          oscAegis.stop(now + 0.6);
        } else {
          // Standard heavy slashing steel swing
          this.playSwingMetallic(450, 110, 0.16);
        }
      } else if (profession === 'mage') {
        if (particleType === 'thunderbolt') {
          // Thunderbolt (雷电术): High-voltage sizzle + giant cracking thunder boom
          // 1. Voltage spark crackles
          for (let i = 0; i < 4; i++) {
            const oscSpark = this.ctx.createOscillator();
            const gainSpark = this.ctx.createGain();
            oscSpark.type = 'square';
            oscSpark.frequency.setValueAtTime(2500 + Math.random() * 1500, now + i * 0.02);
            gainSpark.gain.setValueAtTime(0.15, now + i * 0.02);
            gainSpark.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.02);
            oscSpark.connect(gainSpark);
            gainSpark.connect(this.ctx.destination);
            oscSpark.start(now + i * 0.02);
            oscSpark.stop(now + i * 0.02 + 0.02);
          }
          // 2. Deep thunder explosion boom
          const oscBoom = this.ctx.createOscillator();
          const gainBoom = this.ctx.createGain();
          oscBoom.type = 'triangle';
          oscBoom.frequency.setValueAtTime(75, now + 0.08);
          oscBoom.frequency.exponentialRampToValueAtTime(25, now + 0.48);
          gainBoom.gain.setValueAtTime(0.45, now + 0.08);
          gainBoom.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
          oscBoom.connect(gainBoom);
          gainBoom.connect(this.ctx.destination);
          oscBoom.start(now + 0.08);
          oscBoom.stop(now + 0.48);

          this.synthWhiteNoiseBurst(now + 0.08, 0.45, 120, 0.25); // sub-bass air rush
        } else if (particleType === 'ice' || particleType === 'ice_roar') {
          // Ice Roar (冰咆哮): Howling cold wind + crystal ice impact chimes
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2200, now);
          filter.frequency.exponentialRampToValueAtTime(600, now + 0.45);
          filter.Q.value = 1.2;

          this.synthWhiteNoiseBurst(now, 0.45, 1200, 0.15); // howling wind

          // Ice Crystal cascade
          [1600, 2400, 3100, 4200].forEach((freq, idx) => {
            const oscC = this.ctx!.createOscillator();
            const gainC = this.ctx!.createGain();
            oscC.type = 'sine';
            oscC.frequency.setValueAtTime(freq, now + idx * 0.05);
            gainC.gain.setValueAtTime(0.18, now + idx * 0.05);
            gainC.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
            oscC.connect(gainC);
            gainC.connect(this.ctx!.destination);
            oscC.start(now + idx * 0.05);
            oscC.stop(now + idx * 0.05 + 0.25);
          });
        } else {
          // Standard Magic Fireball / Cast
          const oscM = this.ctx.createOscillator();
          const gainM = this.ctx.createGain();
          oscM.type = 'sawtooth';
          oscM.frequency.setValueAtTime(180, now);
          oscM.frequency.exponentialRampToValueAtTime(650, now + 0.25); // flying rise
          gainM.gain.setValueAtTime(0.22, now);
          gainM.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          oscM.connect(gainM);
          gainM.connect(this.ctx.destination);
          oscM.start(now);
          oscM.stop(now + 0.25);
        }
      } else if (profession === 'taoist') {
        if (particleType === 'heal') {
          // Celestial Healing Chimes (治愈术)
          const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C Major shimmering cascade
          chords.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.04);
            gain.gain.setValueAtTime(0.18, now + i * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + i * 0.04);
            osc.stop(now + i * 0.04 + 0.4);
          });
          // Resonant healing sweep
          const sweep = this.ctx.createOscillator();
          const gainS = this.ctx.createGain();
          const filt = this.ctx.createBiquadFilter();
          sweep.type = 'triangle';
          sweep.frequency.setValueAtTime(220, now);
          filt.type = 'lowpass';
          filt.frequency.setValueAtTime(100, now);
          filt.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
          gainS.gain.setValueAtTime(0.08, now);
          gainS.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          sweep.connect(filt);
          filt.connect(gainS);
          gainS.connect(this.ctx.destination);
          sweep.start(now);
          sweep.stop(now + 0.3);
        } else if (particleType === 'poison') {
          // Soul Poisoning (施毒术): Sinister acidic bubbling & low drone
          const oscD = this.ctx.createOscillator();
          const gainD = this.ctx.createGain();
          oscD.type = 'sawtooth';
          oscD.frequency.setValueAtTime(80, now);
          oscD.frequency.linearRampToValueAtTime(60, now + 0.4);
          gainD.gain.setValueAtTime(0.15, now);
          gainD.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          oscD.connect(gainD);
          gainD.connect(this.ctx.destination);
          oscD.start(now);
          oscD.stop(now + 0.4);

          // Acidic bubbling clicks
          for (let i = 0; i < 8; i++) {
            const oscB = this.ctx.createOscillator();
            const gainB = this.ctx.createGain();
            oscB.type = 'triangle';
            oscB.frequency.setValueAtTime(600 + Math.random() * 800, now + i * 0.045);
            gainB.gain.setValueAtTime(0.06, now + i * 0.045);
            gainB.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.035);
            oscB.connect(gainB);
            gainB.connect(this.ctx.destination);
            oscB.start(now + i * 0.045);
            oscB.stop(now + i * 0.045 + 0.035);
          }
        } else {
          // Soul Fireball (灵魂火符): Talisman papery flap + holy blast chime
          // Flapping noise burst
          for (let i = 0; i < 3; i++) {
            this.synthWhiteNoiseBurst(now + i * 0.04, 0.035, 1500, 0.08);
          }
          // Holy blast ring
          const oscH = this.ctx.createOscillator();
          const gainH = this.ctx.createGain();
          oscH.type = 'sine';
          oscH.frequency.setValueAtTime(880, now + 0.1);
          oscH.frequency.exponentialRampToValueAtTime(1318.5, now + 0.28);
          gainH.gain.setValueAtTime(0.2, now + 0.1);
          gainH.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          oscH.connect(gainH);
          gainH.connect(this.ctx.destination);
          oscH.start(now + 0.1);
          oscH.stop(now + 0.28);
        }
      }
    } catch (e) {}
  }

  private playSwingMetallic(startFreq: number, endFreq: number, dur: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      // Wind Woosh noise sweep
      this.synthWhiteNoiseBurst(now, dur, 350, 0.18);

      // Steel blade ring
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + dur);
    } catch(e) {}
  }

  // --- FORWARD COMPATIBILITY & LEGACY TRIGGERS (Re-routed to premium engines) ---

  public playSwing() {
    this.playSkillRelease('warrior', 'slash');
  }

  public playFire() {
    this.playSkillRelease('warrior', 'fire_sword');
  }

  public playThunder() {
    this.playSkillRelease('mage', 'thunderbolt');
  }

  public playHeal() {
    this.playSkillRelease('taoist', 'heal');
  }

  public playPotion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      // Liquid swallowing/potion drinking sound
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.14);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  public playLoot() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      // Crisp retro-style coin collection chime
      const now = this.ctx.currentTime;
      [880, 1318.5].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.15, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.12);
      });
    } catch (e) {}
  }

  public playLevelUp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [261.6, 329.6, 392.0, 523.2, 659.2, 784.0, 1046.5]; // Glorious arpeggio
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = i === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.24, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } catch (e) {}
  }

  public playQuestComplete() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.2, 659.2, 784.0, 1046.5, 1318.5]; // Complete chord swell
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.25, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.4);
      });
    } catch (e) {}
  }

  public playRareDrop() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      // Heavenly chime ring
      const now = this.ctx.currentTime;
      const notes = [987.8, 1174.7, 1318.5, 1568.0, 1975.5];
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.25, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.45);
      });
    } catch (e) {}
  }

  public playGold() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      // Coins scattering / clattering sound
      const now = this.ctx.currentTime;
      [1500, 2200, 3100].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.03);
        gain.gain.setValueAtTime(0.18, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.08);
      });
    } catch (e) {}
  }

  public playClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch (e) {}
  }

  // --- MONSTER UNIQUE SOUNDS ---

  public playMonsterSpawn() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      // Eerie spawning rising portal synth
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.exponentialRampToValueAtTime(250, now + 0.35);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.35);
    } catch(e) {}
  }

  public playMonsterMove(monsterType: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      switch (monsterType) {
        case 'chicken': {
          // Chicken rapid wing flutter / clucking rustle
          this.synthWhiteNoiseBurst(now, 0.06, 2500, 0.08);
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(900, now);
          osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'scarecrow': {
          // Dry straw rustling and rattling
          this.synthWhiteNoiseBurst(now, 0.08, 1200, 0.12);
          break;
        }
        case 'snake': {
          // Slithering wet rustle
          this.synthWhiteNoiseBurst(now, 0.14, 3000, 0.05);
          break;
        }
        case 'deer': {
          // Heavy animal footsteps
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.09);
          break;
        }
        case 'hook_cat': {
          // Light cat feet steps
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }
        case 'skeleton_warrior': {
          // Clinking bones and rusted steel armor
          this.synthWhiteNoiseBurst(now, 0.05, 4500, 0.06);
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
          break;
        }
        case 'white_boar': {
          // Heavy snorting thud
          this.synthWhiteNoiseBurst(now, 0.1, 150, 0.15);
          break;
        }
        case 'woma_leader':
        case 'zuma_leader':
        case 'red_moon_demon': {
          // Ground shaking massive steps
          this.synthWarDrum(now, 0.28, 0.22);
          break;
        }
        default: {
          // Default light step
          this.synthWhiteNoiseBurst(now, 0.07, 800, 0.04);
        }
      }
    } catch (e) {}
  }

  public playMonsterAttack(monsterType: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      switch (monsterType) {
        case 'chicken': {
          // Angry rapid peck
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
        case 'deer': {
          // Aggressive headbutt thump
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'scarecrow': {
          // Dry straw slice rake sweep
          this.synthWhiteNoiseBurst(now, 0.14, 1800, 0.18);
          break;
        }
        case 'snake': {
          // Venomous strike hiss
          this.synthWhiteNoiseBurst(now, 0.12, 3500, 0.22);
          break;
        }
        case 'hook_cat': {
          // Metal hook scratch/claw
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(950, now);
          osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          this.synthWhiteNoiseBurst(now, 0.1, 4000, 0.15);
          break;
        }
        case 'skeleton_warrior': {
          // Heavy iron scythe swing
          this.playSwingMetallic(500, 150, 0.15);
          break;
        }
        case 'white_boar': {
          // Heavy mace smash thump
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
          gain.gain.setValueAtTime(0.32, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
          this.synthWhiteNoiseBurst(now, 0.2, 200, 0.25);
          break;
        }
        case 'woma_leader': {
          // Fire wave / Demonic fireball swing
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.3);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
          this.synthWhiteNoiseBurst(now, 0.3, 800, 0.25);
          break;
        }
        case 'zuma_leader': {
          // Crushing stone mace roar
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
          gain.gain.setValueAtTime(0.42, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          this.synthWhiteNoiseBurst(now, 0.35, 150, 0.35);
          break;
        }
        case 'red_moon_demon': {
          // Thorny spike burst roaring ground slam
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(450, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.4);
          gain.gain.setValueAtTime(0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          this.synthWhiteNoiseBurst(now, 0.4, 1500, 0.35);
          break;
        }
        case 'sabak_guard': {
          // Broadsword sweeping slash
          this.playSwingMetallic(400, 100, 0.18);
          break;
        }
        default: {
          this.playSwingMetallic(300, 80, 0.14);
        }
      }
    } catch (e) {}
  }

  // 3. Unique Monster Hit (Hurt) Sound Synthesis
  public playMonsterHit(monsterType: string) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      
      // Standard physical body impact thud for all hits
      const oscImpact = this.ctx.createOscillator();
      const gainImpact = this.ctx.createGain();
      oscImpact.type = 'triangle';
      oscImpact.frequency.setValueAtTime(120, now);
      oscImpact.frequency.exponentialRampToValueAtTime(35, now + 0.12);
      gainImpact.gain.setValueAtTime(0.25, now);
      gainImpact.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      oscImpact.connect(gainImpact);
      gainImpact.connect(this.ctx.destination);
      oscImpact.start(now);
      oscImpact.stop(now + 0.12);

      // Custom organic/vocal responses
      switch (monsterType) {
        case 'chicken': {
          // Angry screech cluck
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
          break;
        }
        case 'deer': {
          // Beastly grunt
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(110, now);
          osc.frequency.exponentialRampToValueAtTime(65, now + 0.14);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.14);
          break;
        }
        case 'scarecrow': {
          // Crackle of straw tearing
          this.synthWhiteNoiseBurst(now, 0.1, 3500, 0.3);
          break;
        }
        case 'snake': {
          // Furious hiss
          this.synthWhiteNoiseBurst(now, 0.15, 5000, 0.28);
          break;
        }
        case 'hook_cat': {
          // High cat screech
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }
        case 'skeleton_warrior': {
          // Bones clacking together
          this.synthWhiteNoiseBurst(now, 0.08, 4800, 0.22);
          this.synthWoodClick(now, 0.08, 0.15);
          break;
        }
        case 'white_boar': {
          // Pig grunt / snort
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(65, now + 0.18);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.18);
          break;
        }
        case 'woma_leader':
        case 'zuma_leader':
        case 'red_moon_demon': {
          // Giant boss roar vibration
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
        default: {
          this.synthWhiteNoiseBurst(now, 0.08, 1000, 0.15);
        }
      }
    } catch (e) {}
  }

  // 4. Unique Monster Death Sound Synthesis
  public playMonsterDeath(monsterType: string = 'default') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Heavy body falling to the ground
      const oscFall = this.ctx.createOscillator();
      const gainFall = this.ctx.createGain();
      oscFall.type = 'triangle';
      oscFall.frequency.setValueAtTime(80, now + 0.1);
      oscFall.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      gainFall.gain.setValueAtTime(0.35, now + 0.1);
      gainFall.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      oscFall.connect(gainFall);
      gainFall.connect(this.ctx.destination);
      oscFall.start(now + 0.1);
      oscFall.stop(now + 0.35);

      switch (monsterType) {
        case 'chicken': {
          // Dying screech and fluttering wings
          this.synthWhiteNoiseBurst(now, 0.2, 1800, 0.15);
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.22); // collapsing pitch
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }
        case 'deer': {
          // Falling animal groan
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(130, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }
        case 'scarecrow': {
          // Massive straw collapse crumble
          this.synthWhiteNoiseBurst(now, 0.35, 600, 0.35);
          break;
        }
        case 'snake': {
          // Long dying fading hiss
          this.synthWhiteNoiseBurst(now, 0.45, 4500, 0.22);
          break;
        }
        case 'hook_cat': {
          // Long fading cat yowl
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(700, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.4);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
        case 'skeleton_warrior': {
          // Bone collapse clinking rattling pile
          for (let i = 0; i < 4; i++) {
            this.synthWoodClick(now + i * 0.08, 0.09, 0.18 - i * 0.03);
            this.synthWhiteNoiseBurst(now + i * 0.08, 0.08, 4000, 0.14 - i * 0.02);
          }
          break;
        }
        case 'white_boar': {
          // Heavy dying squeal snort
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.45);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }
        case 'woma_leader':
        case 'zuma_leader':
        case 'red_moon_demon': {
          // Giant boss apocalyptic roaring collapse
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);
          gain.gain.setValueAtTime(0.5, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.8);
          this.synthWhiteNoiseBurst(now, 0.8, 120, 0.4);
          break;
        }
        default: {
          // Standard organic fade away
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        }
      }
    } catch (e) {}
  }

  // 5. Player Vocals / Grunt When Hurt
  public playPlayerHurt(profession: string, isFemale: boolean) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Soft organic vocal grunt
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';

      if (isFemale) {
        // High-pitched vocal grunt
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.11);
        gain.gain.setValueAtTime(0.18, now);
      } else {
        // Masculine low grunt
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.13);
        gain.gain.setValueAtTime(0.22, now);
      }
      
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // Fleshy body impact thud
      const oscImpact = this.ctx.createOscillator();
      const gainImpact = this.ctx.createGain();
      oscImpact.type = 'sine';
      oscImpact.frequency.setValueAtTime(110, now);
      oscImpact.frequency.exponentialRampToValueAtTime(35, now + 0.1);
      gainImpact.gain.setValueAtTime(0.25, now);
      gainImpact.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      oscImpact.connect(gainImpact);
      gainImpact.connect(this.ctx.destination);
      oscImpact.start(now);
      oscImpact.stop(now + 0.1);
    } catch(e) {}
  }

  // Legacy fallback to standard hit
  public playHit() {
    this.playPlayerHurt('warrior', false);
  }

  /**
   * playWeaponHit: High-fidelity combat impact procedural synthesis
   * @param weaponType - 'sword' (刀剑), 'staff' (法杖), 'talisman' (道符)
   * @param monsterCategory - 'beast' (野兽), 'humanoid' (人形), 'undead' (亡灵)
   * @param isCrit - true if critical hit
   * @param isBlock - true if blocked
   */
  public playWeaponHit(
    weaponType: 'sword' | 'staff' | 'talisman',
    monsterCategory: 'beast' | 'humanoid' | 'undead',
    isCrit: boolean = false,
    isBlock: boolean = false,
    armorClass: 'heavy' | 'light' | 'robe' = 'light'
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const volumeScale = isCrit ? 1.45 : isBlock ? 0.45 : 1.0;
      
      // Dynamic pitch micro-variations (±6%) to make successive hits sound organic and non-repetitive
      const pitchOffset = 0.94 + Math.random() * 0.12;
      // Stereo spatial placement variation for combat depth
      const panVal = (Math.random() - 0.5) * 0.55;

      // Synthesize equipment response on hit/attack impact
      this.synthEquipmentClatter(now, armorClass, isCrit ? 1.5 : 0.8);

      const createPannedGainNode = (baseVolume: number, duration: number): { gain: GainNode; destination: AudioNode } => {
        const gainNode = this.ctx!.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(baseVolume * volumeScale, now + 0.004);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        let finalNode: AudioNode = gainNode;
        try {
          if (this.ctx!.createStereoPanner) {
            const panner = this.ctx!.createStereoPanner();
            panner.pan.setValueAtTime(panVal, now);
            gainNode.connect(panner);
            finalNode = panner;
          }
        } catch (e) {}

        this.connectNode(finalNode, 'sfx');
        return { gain: gainNode, destination: finalNode };
      };

      if (isBlock) {
        // Block sound: Dull shield metallic clank
        const osc = this.ctx.createOscillator();
        const nodeSetup = createPannedGainNode(0.25, 0.12);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(115 * pitchOffset, now);
        osc.frequency.linearRampToValueAtTime(70 * pitchOffset, now + 0.12);
        
        osc.connect(nodeSetup.gain);
        osc.start(now);
        osc.stop(now + 0.12);

        // Dry wood-like click representing weapon block impact
        this.synthWoodClick(now, 0.06, 0.18 * volumeScale);
        return;
      }

      // --- PART 1: WEAPON IMPACT AUDIO SYNTHESIS ---
      switch (weaponType) {
        case 'sword': {
          // Sharp metal slicing transient + lingering metallic ringing
          const slashDur = isCrit ? 0.24 : 0.15;
          this.synthWhiteNoiseBurst(now, slashDur, 2200, 0.16 * volumeScale);

          // Primary resonance ring of the blade
          const oscRing = this.ctx.createOscillator();
          const nodeSetupRing = createPannedGainNode(0.12, 0.1);
          oscRing.type = 'sine';
          oscRing.frequency.setValueAtTime(2350 * pitchOffset, now);
          oscRing.frequency.exponentialRampToValueAtTime(1100 * pitchOffset, now + 0.1);
          
          oscRing.connect(nodeSetupRing.gain);
          oscRing.start(now);
          oscRing.stop(now + 0.1);

          // Clang metal edge strike impact
          const oscClang = this.ctx.createOscillator();
          const nodeSetupClang = createPannedGainNode(0.09, 0.07);
          oscClang.type = 'sawtooth';
          oscClang.frequency.setValueAtTime(440 * pitchOffset, now);
          oscClang.frequency.exponentialRampToValueAtTime(140 * pitchOffset, now + 0.07);
          
          oscClang.connect(nodeSetupClang.gain);
          oscClang.start(now);
          oscClang.stop(now + 0.07);

          if (isCrit) {
            // Critical metallic shockwave slice
            const oscCrit = this.ctx.createOscillator();
            const nodeSetupCrit = createPannedGainNode(0.16, 0.2);
            oscCrit.type = 'triangle';
            oscCrit.frequency.setValueAtTime(1450 * pitchOffset, now);
            oscCrit.frequency.linearRampToValueAtTime(280 * pitchOffset, now + 0.2);
            
            oscCrit.connect(nodeSetupCrit.gain);
            oscCrit.start(now);
            oscCrit.stop(now + 0.2);
          }
          break;
        }
        case 'staff': {
          // Magical explosive blast energy wave
          const oscMag = this.ctx.createOscillator();
          const nodeSetupMag = createPannedGainNode(0.18, 0.18);
          oscMag.type = 'sine';
          oscMag.frequency.setValueAtTime(290 * pitchOffset, now);
          oscMag.frequency.exponentialRampToValueAtTime(55 * pitchOffset, now + 0.18);
          
          oscMag.connect(nodeSetupMag.gain);
          oscMag.start(now);
          oscMag.stop(now + 0.18);

          // Magical shimmering chime cascade
          const sparkles = isCrit ? [1900, 2500, 3200, 4300] : [1600, 2300, 3000];
          sparkles.forEach((freq, idx) => {
            const oscChime = this.ctx!.createOscillator();
            const nodeSetupChime = createPannedGainNode(0.08, 0.14);
            oscChime.type = 'sine';
            oscChime.frequency.setValueAtTime(freq * pitchOffset, now + idx * 0.015);
            
            oscChime.connect(nodeSetupChime.gain);
            oscChime.start(now + idx * 0.015);
            oscChime.stop(now + idx * 0.015 + 0.14);
          });

          // Cavernous magical sparkle noise burst
          this.synthWhiteNoiseBurst(now, isCrit ? 0.24 : 0.14, 4200, 0.07 * volumeScale);
          break;
        }
        case 'talisman': {
          // Holy flame talisman burn + bell purification
          this.synthWhiteNoiseBurst(now, 0.13, 2400, 0.14 * volumeScale);

          const bells = isCrit ? [987.77, 1318.51, 1975.53] : [880, 1318.51];
          bells.forEach((freq, idx) => {
            const oscBell = this.ctx!.createOscillator();
            const nodeSetupBell = createPannedGainNode(0.11, 0.24);
            oscBell.type = 'sine';
            oscBell.frequency.setValueAtTime(freq * pitchOffset, now);
            
            oscBell.connect(nodeSetupBell.gain);
            oscBell.start(now);
            oscBell.stop(now + 0.24);
          });

          // Divine purification frequency sweep
          const oscWave = this.ctx.createOscillator();
          const nodeSetupWave = createPannedGainNode(0.06, 0.2);
          oscWave.type = 'triangle';
          oscWave.frequency.setValueAtTime(440 * pitchOffset, now);
          oscWave.frequency.exponentialRampToValueAtTime(200 * pitchOffset, now + 0.2);
          
          oscWave.connect(nodeSetupWave.gain);
          oscWave.start(now);
          oscWave.stop(now + 0.2);
          break;
        }
      }

      // --- PART 2: MONSTER CATEGORY RESPONSE AUDIO SYNTHESIS ---
      switch (monsterCategory) {
        case 'beast': {
          // Squelch / slice of organic hide & blood splash
          const oscThud = this.ctx.createOscillator();
          const nodeSetupThud = createPannedGainNode(0.26, 0.15);
          oscThud.type = 'triangle';
          oscThud.frequency.setValueAtTime(135 * pitchOffset, now);
          oscThud.frequency.exponentialRampToValueAtTime(50 * pitchOffset, now + 0.15);
          
          oscThud.connect(nodeSetupThud.gain);
          oscThud.start(now);
          oscThud.stop(now + 0.15);

          // Wet skin ripping bandpass noise
          this.synthWhiteNoiseBurst(now, 0.09, 580, 0.1 * volumeScale);
          break;
        }
        case 'humanoid': {
          // Impact on hard leather armor / chainmail clatter
          const oscThud = this.ctx.createOscillator();
          const nodeSetupThud = createPannedGainNode(0.2, 0.11);
          oscThud.type = 'sawtooth';
          oscThud.frequency.setValueAtTime(115 * pitchOffset, now);
          oscThud.frequency.exponentialRampToValueAtTime(40 * pitchOffset, now + 0.11);
          
          oscThud.connect(nodeSetupThud.gain);
          oscThud.start(now);
          oscThud.stop(now + 0.11);

          // Metal links sliding rustle
          this.synthWhiteNoiseBurst(now + 0.01, 0.07, 3200, 0.11 * volumeScale);
          break;
        }
        case 'undead': {
          // Dusty bone clattering and skeletal rattle
          this.synthWoodClick(now, 0.045, 0.2 * volumeScale);
          this.synthWoodClick(now + 0.02, 0.045, 0.14 * volumeScale);
          this.synthWoodClick(now + 0.04, 0.045, 0.09 * volumeScale);

          // Dusty wind dispersion noise
          this.synthWhiteNoiseBurst(now, 0.11, 380, 0.16 * volumeScale);
          break;
        }
      }
    } catch (e) {}
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAmbient();
      this.stopBGM();
    } else if (this.bgmCurrentTheme) {
      this.updateAmbient(this.bgmCurrentTheme);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public playRustle() {
    this.synthWhiteNoiseBurst(this.ctx?.currentTime || 0, 0.12, 1200, 0.08);
  }

  public playCrumble() {
    this.synthWhiteNoiseBurst(this.ctx?.currentTime || 0, 0.22, 280, 0.16);
  }
}

export const soundFX = new SoundFXManager();

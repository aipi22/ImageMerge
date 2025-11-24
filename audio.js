class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = false;
        this.osc = null;
        this.gain = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.enabled = true;
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (!this.enabled) this.init();
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playHover() {
        this.playTone(400, 'sine', 0.1, 0.05);
    }

    playClick() {
        this.playTone(600, 'triangle', 0.15, 0.1);
    }

    playSuccess() {
        if (!this.enabled) this.init();
        if (!this.ctx) return;

        // Arpeggio
        const now = this.ctx.currentTime;
        [440, 554, 659, 880].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.4);
        });
    }
}

const audioManager = new AudioManager();

// Attach to UI
document.addEventListener('click', () => audioManager.init(), { once: true });

document.querySelectorAll('button, .file-btn, input').forEach(el => {
    el.addEventListener('mouseenter', () => audioManager.playHover());
    el.addEventListener('click', () => audioManager.playClick());
});

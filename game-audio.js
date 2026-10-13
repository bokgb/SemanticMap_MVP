(function () {
    const SM = window.SemanticMap = window.SemanticMap || {};
    const storageKey = 'kotoba-hunter-sound-v1';
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let enabled = true, context, output, noiseBuffer, initialized = false, generation = 0;
    let writingContact = false, writingNote = 0, lastWritingNoteAt = -Infinity;
    const sources = new Set(), lastPlayed = new Map();
    const reactions = new Set(['poco-hello','poco-confused','poco-idea','poco-thanks','poco-thinking','poco-happy','poco-great','poco-lovely','poco-well-done','mina-hello','mina-guide','lili-guide','sora-hello','sora-guide']);
    const reactionBytes = new Map(), reactionBuffers = new Map();
    let dialogueKey = '', reactionSequence = 0, queuedReaction, activeReaction, reactionTimer;
    try { enabled = localStorage.getItem(storageKey) !== 'off'; } catch { /* Sound does not require storage. */ }

    function track(source, nodes) {
        sources.add(source);
        source.onended = () => {
            sources.delete(source);
            source.disconnect();
            nodes.forEach(node => node.disconnect());
        };
    }
    function fetchReaction(cue) {
        if (!reactionBytes.has(cue)) {
            const promise = fetch(`assets/audio/reactions/${cue}.wav?v=amitaro-card-praise-1`).then(response => {
                if (!response.ok) throw new Error('Reaction audio unavailable');
                return response.arrayBuffer();
            }).catch(error => { reactionBytes.delete(cue); throw error; });
            reactionBytes.set(cue, promise);
        }
        return reactionBytes.get(cue);
    }
    function loadReaction(cue) {
        if (!reactionBuffers.has(cue)) {
            const promise = fetchReaction(cue).then(bytes => context.decodeAudioData(bytes.slice(0)))
                .catch(error => { reactionBuffers.delete(cue); throw error; });
            reactionBuffers.set(cue, promise);
        }
        return reactionBuffers.get(cue);
    }
    function stopReaction() {
        clearTimeout(reactionTimer); queuedReaction = null; reactionSequence++;
        if (activeReaction) {
            const {source, gain} = activeReaction;
            gain.gain.cancelScheduledValues(context.currentTime);
            gain.gain.setTargetAtTime(0, context.currentTime, .008);
            try { source.stop(context.currentTime + .03); } catch { /* A clip may have ended. */ }
            activeReaction = null;
        }
    }
    async function flushReaction() {
        const request = queuedReaction;
        if (!request || request.loading || !enabled || !context || document.hidden) return;
        request.loading = true;
        try {
            const buffer = await loadReaction(request.cue);
            if (queuedReaction !== request || request.sequence !== reactionSequence || !enabled || document.hidden) return;
            if (context.state !== 'running') { request.loading = false; return; }
            reactionTimer = setTimeout(() => {
                if (request.sequence !== reactionSequence || !enabled || document.hidden || context.state !== 'running') return;
                queuedReaction = null;
                try {
                    const source = context.createBufferSource(), gain = context.createGain();
                    source.buffer = buffer; gain.gain.value = .5;
                    source.connect(gain).connect(output); track(source, [gain]);
                    activeReaction = {source, gain, cue:request.cue};
                    source.addEventListener('ended', () => { if (activeReaction?.source === source) activeReaction = null; });
                    source.start();
                } catch { /* A missing voice must not affect the dialogue. */ }
            }, request.delayMs);
        } catch { if (queuedReaction === request) queuedReaction = null; }
    }
    function dialogue(key, cue, delayMs = 110) {
        if (key === dialogueKey) return false;
        dialogueKey = key; stopReaction();
        if (!reactions.has(cue) || !enabled || document.hidden) return false;
        queuedReaction = {cue, sequence:reactionSequence, loading:false, delayMs:Math.max(0,Math.min(500,Number(delayMs)||0))};
        flushReaction();
        return true;
    }
    function resetDialogue() { dialogueKey = ''; stopReaction(); }
    function tone(ctx, destination, at, frequency, duration, volume, endFrequency = frequency, attack = .006) {
        const voice = ctx.createOscillator(), envelope = ctx.createGain();
        voice.type = 'sine';
        voice.frequency.setValueAtTime(frequency, at);
        voice.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(volume, at + attack);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
        envelope.gain.linearRampToValueAtTime(0, at + duration + .015);
        voice.connect(envelope).connect(destination);
        track(voice, [envelope]);
        voice.start(at); voice.stop(at + duration + .02);
    }
    function rustle(ctx, destination, at, duration, volume, frequency) {
        const voice = ctx.createBufferSource(), envelope = ctx.createGain(), filter = ctx.createBiquadFilter();
        voice.buffer = noiseBuffer;
        filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
        envelope.gain.setValueAtTime(0, at);
        envelope.gain.linearRampToValueAtTime(volume, at + .004);
        envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
        envelope.gain.linearRampToValueAtTime(0, at + duration + .01);
        voice.connect(filter).connect(envelope).connect(destination);
        track(voice, [filter, envelope]);
        voice.start(at); voice.stop(at + duration + .015);
    }
    function compose(name) {
        const at = context.currentTime + .004;
        const note = (offset, pitch, duration, volume, end) => tone(context, output, at + offset, pitch, duration, volume, end);
        const paper = (offset, duration, volume, pitch) => rustle(context, output, at + offset, duration, volume, pitch);
        switch (name) {
            case 'tap': note(0, 620, .055, .13, 360); note(.008, 1240, .025, .018, 720); break;
            case 'camera': paper(0, .045, .23, 1700); note(0, 185, .04, .09, 100); paper(.075, .04, .12, 2200); break;
            case 'success':
                [784, 988, 1319].forEach((pitch, i) => { note(i * .09, pitch, .32, .075); note(i * .09, pitch * 2, .12, .012); });
                break;
            case 'paper': paper(0, .11, .14, 1100); paper(.095, .09, .08, 1500); break;
            case 'stamp': paper(0, .045, .2, 550); note(0, 160, .09, .14, 75); note(.1, 1047, .22, .045); break;
            case 'complete':
                [523, 659, 784, 1047].forEach((pitch, i) => note(i * .105, pitch, .36, .09));
                [659, 784, 1047].forEach(pitch => note(.46, pitch, .55, .04));
                break;
        }
    }
    function unlock() {
        if (!enabled || !AudioContext || document.hidden) return;
        try {
            if (!context) {
                context = new AudioContext({ latencyHint: 'interactive' });
                output = context.createGain(); output.gain.value = .45; output.connect(context.destination);
                noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .3), context.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            if (context.state !== 'running') {
                context.resume().then(flushReaction).catch(() => {});
                // Start a silent buffer within the gesture to unlock sound on mobile Safari.
                const silent = context.createBufferSource();
                silent.buffer = context.createBuffer(1, 1, context.sampleRate);
                silent.connect(output); track(silent, []); silent.start();
            }
            flushReaction();
        } catch { /* Browser audio failures must not interrupt the game. */ }
    }
    function play(name) {
        if (!enabled || !context || document.hidden || !['tap', 'camera', 'success', 'paper', 'stamp', 'complete'].includes(name)) return false;
        if (context.state !== 'running') {
            const requestedAt = performance.now(), token = generation;
            context.resume().then(() => {
                if (token === generation && performance.now() - requestedAt < 180 && context.state === 'running') play(name);
            }).catch(() => {});
            return false;
        }
        const now = performance.now();
        const spacing = name === 'tap' ? 45 : 180;
        if (now - (lastPlayed.get(name) ?? -Infinity) < spacing || sources.size > 30) return false;
        lastPlayed.set(name, now);
        try { compose(name); return true; } catch { return false; }
    }
    function writing(active) {
        if (!active || !enabled || !context || document.hidden || context.state !== 'running') {
            writingContact = false;
            return false;
        }
        if (writingContact) return false;
        writingContact = true;
        const now = performance.now();
        if (now - lastWritingNoteAt < 850) return false;
        lastWritingNoteAt = now;
        try {
            // A sparse, warm chime at the start of a phrase, never a note for each character.
            const pitch = [659, 784, 880, 1047][writingNote++ % 4], at = context.currentTime + .004;
            tone(context, output, at, pitch, .46, .028, pitch, .055);
            tone(context, output, at + .025, pitch * 2, .24, .003, pitch * 2, .04);
            return true;
        } catch { return false; }
    }
    function hush() {
        generation++;
        stopReaction();
        writingContact = false;
        sources.forEach(source => { try { source.stop(); } catch { /* A sound may have just ended. */ } });
        if (output) { output.gain.cancelScheduledValues(context.currentTime); output.gain.setValueAtTime(0, context.currentTime); }
    }
    function updateButton() {
        const button = document.querySelector('[data-action="sound"]');
        if (!button) return;
        const zh = SM.state?.currentLang === 'zh';
        button.disabled = !AudioContext;
        button.setAttribute('aria-pressed', String(enabled && !!AudioContext));
        button.setAttribute('aria-label', !AudioContext ? (zh ? '此浏览器不支持音效' : 'このブラウザーでは音を使えません') : enabled ? (zh ? '关闭音效' : '音をオフにする') : (zh ? '开启音效' : '音をオンにする'));
        button.title = button.getAttribute('aria-label');
    }
    function toggle() {
        enabled = !enabled;
        try { localStorage.setItem(storageKey, enabled ? 'on' : 'off'); } catch { /* Keep the choice for this session. */ }
        if (enabled) {
            unlock();
            if (output) output.gain.setValueAtTime(.45, context.currentTime);
            play('tap');
        } else hush();
        updateButton();
    }
    function interactive(target) {
        const element = target instanceof Element ? target.closest('button, a[href], summary, [role="button"]') : null;
        return element && !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[inert]') ? element : null;
    }
    function init() {
        if (initialized) return; initialized = true;
        if (enabled && AudioContext) reactions.forEach(cue => fetchReaction(cue).catch(() => {}));
        document.addEventListener('pointerdown', event => {
            if (event.isTrusted && event.button === 0 && interactive(event.target)) unlock();
        }, { capture: true, passive: true });
        document.addEventListener('keydown', event => {
            if (event.isTrusted && ['Enter', ' '].includes(event.key) && interactive(event.target)) unlock();
        }, { capture: true });
        document.addEventListener('click', event => {
            const button = interactive(event.target);
            if (!event.isTrusted || !button || button.matches('[data-action="sound"]')) return;
            unlock(); play('tap');
        }, { capture: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { hush(); context?.suspend().catch(() => {}); }
            else if (enabled && output) output.gain.setValueAtTime(.45, context.currentTime);
        });
    }
    SM.audio = { init, play, writing, dialogue, resetDialogue, toggle, updateButton };
})();

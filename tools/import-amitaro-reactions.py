"""Import licensed human voice clips for Poco, without changing pitch or speed.

Japanese terms: https://amitaro.net/voice/voice_rule/
Use only as embedded game audio; keep the in-game attribution.
"""
from pathlib import Path
import array
import argparse
import hashlib
import json
import math
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'work/amitaro'
OUTPUT = ROOT / 'assets/audio/reactions'
CLIPS = {
    'poco-hello': ('102_reaction/fufu_02.wav', 'ふふっ'),
    'poco-confused': ('107_koudou/are_01.wav', 'あれ？'),
    'poco-idea': ('102_reaction/a_04.wav', 'あ♪'),
    'poco-thanks': ('102_reaction/waa_01.wav', 'うわーぁ（軽くおどろく）'),
    'poco-thinking': ('107_koudou/u-n_02.wav', 'うーん…（やわらかめ）'),
    'poco-happy': ('106_kanjou/ehehe_01.wav', 'えへへっ'),
}
ENCOURAGEMENT = {
    'poco-great': ('111_ganbaru/sugoi_01.wav', 'すごい！'),
    'poco-lovely': ('111_ganbaru/sugoinee_01.wav', 'すごいねぇ♪'),
    'poco-well-done': ('103_yorokobu/yattane_02.wav', 'やったねっ♪'),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--group', choices=['all', 'reactions', 'encouragement'], default='all')
    group = parser.parse_args().group
    selected = CLIPS if group == 'reactions' else ENCOURAGEMENT if group == 'encouragement' else {**CLIPS, **ENCOURAGEMENT}
    WORK.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    staged, report = [], []
    for cue, (filename, label) in selected.items():
        url = 'https://amitaro.net/download/voice/' + filename
        original = WORK / Path(filename).name
        subprocess.run(['curl.exe', '--fail', '--silent', '--show-error',
                        '--location', '--max-time', '30', '--output', str(original), url], check=True)
        with wave.open(str(original), 'rb') as source:
            rate = source.getframerate()
            assert source.getnchannels() == 1 and source.getsampwidth() == 2
            samples = array.array('h', source.readframes(source.getnframes()))
        peak = max(map(abs, samples), default=0)
        assert peak > 100
        # Trim only quiet edges. Preserve the actor's breathing and internal pauses.
        threshold = max(35, peak * .003)
        voiced = [i for i, value in enumerate(samples) if abs(value) > threshold]
        pad = round(rate * .025)
        samples = samples[max(0, voiced[0] - pad):min(len(samples), voiced[-1] + pad + 1)]
        rms = math.sqrt(sum(value * value for value in samples) / len(samples))
        scale = min(2400 / rms, 17000 / peak)
        fade = round(rate * .005)
        for i, value in enumerate(samples):
            edge = min(1, i / fade, (len(samples) - 1 - i) / fade)
            samples[i] = round(value * scale * edge)
        duration = len(samples) / rate
        assert .08 < duration < 2.5, f'Unexpected duration: {cue}: {duration}'
        staged.append((cue, rate, samples))
        report.append({
            'cue': cue, 'label': label, 'source': url,
            'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
            'seconds': round(duration, 3), 'sampleRate': rate,
            'processing': 'Edge silence trim, 5ms fades, gentle level matching; original pitch and speed.',
        })
    # Download and validate every source before replacing the live trial clips.
    backup = WORK / 'previous-poco'
    backup.mkdir(exist_ok=True)
    for cue, rate, samples in staged:
        target = OUTPUT / (cue + '.wav')
        if target.exists() and not (backup / target.name).exists():
            (backup / target.name).write_bytes(target.read_bytes())
        with wave.open(str(target), 'wb') as destination:
            destination.setnchannels(1)
            destination.setsampwidth(2)
            destination.setframerate(rate)
            destination.writeframes(samples.tobytes())
    manifest_path = OUTPUT / 'amitaro-sources.json'
    previous = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    manifest = {
        'credit': '音声素材：あみたろの声素材工房（https://amitaro.net/）',
        'terms': 'https://amitaro.net/voice/voice_rule/',
        'termsChecked': '2026-10-13',
        'clips': [clip for clip in previous.get('clips', []) if clip['cue'] not in selected] + report,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=True))


if __name__ == '__main__':
    main()

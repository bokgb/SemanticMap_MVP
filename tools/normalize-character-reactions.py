"""Trim local TTS silence and level the game's short reaction samples."""
from pathlib import Path
import array
import json
import wave
import argparse

root = Path(__file__).resolve().parents[1]
report = []
parser = argparse.ArgumentParser()
parser.add_argument('--character', choices=['poco','mina','lili','sora'])
args = parser.parse_args()
if args.character == 'poco':
    parser.error('Poco uses human recordings. Use tools/import-amitaro-reactions.py.')
pattern = f'{args.character}-*.wav' if args.character else '*.wav'
for path in sorted((root / 'assets/audio/reactions').glob(pattern)):
    if path.name.startswith('poco-'):
        continue
    with wave.open(str(path), 'rb') as src:
        rate = src.getframerate()
        assert src.getnchannels() == 1 and src.getsampwidth() == 2
        samples = array.array('h', src.readframes(src.getnframes()))
    peak = max(map(abs, samples), default=0)
    assert peak > 100, f'Empty reaction: {path.name}'
    threshold = max(55, peak * .012)
    voiced = [i for i, value in enumerate(samples) if abs(value) > threshold]
    pad = round(rate * .015)
    samples = samples[max(0, voiced[0] - pad):min(len(samples), voiced[-1] + pad + 1)]
    scale = 17000 / max(map(abs, samples))
    fade = round(rate * .008)
    for i, value in enumerate(samples):
        edge = min(1, i / fade, (len(samples) - 1 - i) / fade)
        samples[i] = round(value * scale * edge)
    assert .08 < len(samples) / rate < 1.1, f'Reaction too long: {path.name}'
    with wave.open(str(path), 'wb') as dst:
        dst.setnchannels(1); dst.setsampwidth(2); dst.setframerate(rate)
        dst.writeframes(samples.tobytes())
    report.append({'file': path.name, 'seconds': round(len(samples) / rate, 3), 'peak': max(map(abs, samples))})
work = root / 'work/character-reactions'
work.mkdir(parents=True, exist_ok=True)
(work / 'assets.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))

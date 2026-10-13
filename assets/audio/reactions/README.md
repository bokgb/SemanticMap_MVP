# Character reactions

Poco's reactions and photo-reward encouragement are human recordings from あみたろの声素材工房.
Credit: 音声素材：あみたろの声素材工房（https://amitaro.net/）
Japanese terms (checked 2026-10-13): https://amitaro.net/voice/voice_rule/
These are licensed assets, not public-domain or CC0 recordings. Use them as embedded game audio, with attribution; do not redistribute as a voice collection or hotlink the source audio.

Source URLs, labels and original checksums are recorded in `amitaro-sources.json`.
Poco uses 「ふふっ」「あれ？」「あ♪」「うわーぁ」「うーん…」「えへへっ」.
When a correct photo reveals its word card, Poco encourages the player with 「すごい！」「すごいねぇ♪」 or 「やったねっ♪」 alongside the success sound. There is no repeat praise or extra pause after handwriting.
Only edge silence, fades and volume were adjusted; the actor's original pitch and speed are preserved.
Reimport Poco using `tools/import-amitaro-reactions.py`. Attribution is visible in the in-game 旅の手帳.

Mina, Lili and Sora still use the previous local Windows Japanese speech clips.
Mina uses Sayaka; Lili uses Haruka; Sora uses Ichiro with a lower pitch.
All clips are short interjections; dialogue text is not narrated.

Regenerate with `tools/build-character-reactions.ps1`, then run `tools/normalize-character-reactions.py` to trim silence and match sample levels.
The Windows generation and normalization tools exclude Poco so they cannot overwrite the human recordings.
The browser plays these local WAV files through the game's existing audio context and sound preference.

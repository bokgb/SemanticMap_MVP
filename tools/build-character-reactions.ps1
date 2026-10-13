param([ValidateSet('all','poco','mina','lili','sora')][string]$Character = 'all')
$ErrorActionPreference = 'Stop'
if ($Character -eq 'poco') { throw 'Poco now uses human recordings. Use tools/import-amitaro-reactions.py.' }
Add-Type -AssemblyName System.Speech
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOutput = Join-Path $taskRoot 'assets/audio/reactions'
New-Item -ItemType Directory -Force -Path $taskOutput | Out-Null
$clips = @(
    @{Name='poco-hello'; Voice='Microsoft Ayumi'; Text='えへっ！'; Pitch='+24%'; Rate='+18%'},
    @{Name='poco-confused'; Voice='Microsoft Ayumi'; Text='あれ？'; Pitch='+16%'; Rate='+4%'},
    @{Name='poco-idea'; Voice='Microsoft Ayumi'; Text='あっ！'; Pitch='+24%'; Rate='+18%'},
    @{Name='poco-thanks'; Voice='Microsoft Ayumi'; Text='わあ！'; Pitch='+24%'; Rate='+12%'},
    @{Name='poco-thinking'; Voice='Microsoft Ayumi'; Text='うーん。'; Pitch='+16%'; Rate='+12%'},
    @{Name='poco-happy'; Voice='Microsoft Ayumi'; Text='えへへ。'; Pitch='+24%'; Rate='+18%'},
    @{Name='mina-hello'; Voice='Microsoft Sayaka'; Text='あっ！'; Pitch='+5%'; Rate='+8%'},
    @{Name='mina-guide'; Voice='Microsoft Sayaka'; Text='うん。'; Pitch='+5%'; Rate='+8%'},
    @{Name='lili-guide'; Voice='Microsoft Haruka Desktop'; Text='うん。'; Pitch='-3%'; Rate='-5%'},
    @{Name='sora-hello'; Voice='Microsoft Ichiro'; Text='おお。'; Pitch='-4%'; Rate='+2%'},
    @{Name='sora-guide'; Voice='Microsoft Ichiro'; Text='うん。'; Pitch='-4%'; Rate='+2%'}
)
$format = [System.Speech.AudioFormat.SpeechAudioFormatInfo]::new(22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($clip in $clips) {
    if ($clip.Name.StartsWith('poco-')) { continue }
    if ($Character -ne 'all' -and !$clip.Name.StartsWith($Character + '-')) { continue }
    $synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()
    try {
        $synth.SelectVoice($clip.Voice)
        $synth.SetOutputToWaveFile((Join-Path $taskOutput ($clip.Name + '.wav')), $format)
        $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP"><prosody pitch="' + $clip.Pitch + '" rate="' + $clip.Rate + '">' + $clip.Text + '</prosody></speak>'
        $synth.SpeakSsml($ssml)
        Write-Output $clip.Name
    } finally { $synth.Dispose() }
}

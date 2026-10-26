"""Gera uma música ambiente WAV leve, sem bibliotecas externas."""
from pathlib import Path
import math
import struct
import wave

RATE = 22050
DURATION = 12
NOTES = (261.63, 329.63, 392.00, 440.00, 349.23, 392.00, 329.63, 293.66)
DEST = Path(__file__).resolve().parents[1] / "public/assets/audio/bgm.wav"
DEST.parent.mkdir(parents=True, exist_ok=True)

with wave.open(str(DEST), "wb") as stream:
    stream.setnchannels(1)
    stream.setsampwidth(2)
    stream.setframerate(RATE)
    frames = bytearray()
    for i in range(RATE * DURATION):
        t = i / RATE
        beat = t % 1.5
        tone = NOTES[int(t / 1.5) % len(NOTES)]
        attack = min(1.0, beat * 18)
        decay = math.exp(-beat * 1.7)
        level = .18 * attack * decay
        sample = (
            math.sin(2 * math.pi * tone * t) * .7
            + math.sin(2 * math.pi * tone * 2 * t) * .18
            + math.sin(2 * math.pi * tone / 2 * t) * .12
        ) * level
        frames.extend(struct.pack("<h", round(sample * 32767)))
        if len(frames) >= RATE * 2:
            stream.writeframes(frames)
            frames.clear()
    if frames:
        stream.writeframes(frames)
print(f"Audio criado: {DEST}")

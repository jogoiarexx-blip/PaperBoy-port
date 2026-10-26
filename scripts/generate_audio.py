import wave
import math
import struct
import random

SAMPLE_RATE = 44100

def write_wav(filename, data):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        for s in data:
            f.writeframesraw(struct.pack('<h', int(max(-32768, min(32767, s * 32767)))))

def generate_bgm():
    duration = 8.0
    samples = []
    # simple C major arpeggio
    notes = [261.63, 329.63, 392.00, 523.25]
    for i in range(int(SAMPLE_RATE * duration)):
        t = i / SAMPLE_RATE
        freq = notes[int(t * 2) % len(notes)]
        # gentle sine wave with simple envelope
        env = math.exp(-2 * (t % 0.5))
        sample = math.sin(2 * math.pi * freq * t) * env * 0.2
        samples.append(sample)
    write_wav('/Users/ibrahimaltukhaim/Downloads/PAPERROUTE/public/assets/audio/bgm.wav', samples)

def generate_wind():
    duration = 4.0
    samples = []
    prev = 0
    # low pass noise
    for i in range(int(SAMPLE_RATE * duration)):
        t = i / SAMPLE_RATE
        noise = random.uniform(-1, 1)
        prev = prev * 0.98 + noise * 0.02
        mod = math.sin(2 * math.pi * 0.2 * t) * 0.5 + 0.5
        samples.append(prev * mod * 0.5)
    write_wav('/Users/ibrahimaltukhaim/Downloads/PAPERROUTE/public/assets/audio/wind.wav', samples)

def generate_hooves():
    # 0.5s hoof beat (two quick thuds)
    duration = 0.5
    samples = []
    for i in range(int(SAMPLE_RATE * duration)):
        t = i / SAMPLE_RATE
        # thud 1 at 0s, thud 2 at 0.15s
        env1 = max(0, math.exp(-30 * t))
        env2 = max(0, math.exp(-30 * (t - 0.15))) if t > 0.15 else 0
        freq = 150
        thud = math.sin(2 * math.pi * freq * t) * env1 + math.sin(2 * math.pi * freq * (t - 0.15)) * env2
        noise = random.uniform(-1, 1) * 0.2 * (env1 + env2)
        samples.append((thud * 0.5 + noise) * 0.8)
    write_wav('/Users/ibrahimaltukhaim/Downloads/PAPERROUTE/public/assets/audio/hooves.wav', samples)

generate_bgm()
generate_wind()
generate_hooves()
print("Audio generation complete.")

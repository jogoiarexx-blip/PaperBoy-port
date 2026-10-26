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

def generate_water():
    duration = 4.0
    samples = []
    prev = 0
    # Pinkish noise for river water
    for i in range(int(SAMPLE_RATE * duration)):
        t = i / SAMPLE_RATE
        noise = random.uniform(-1, 1)
        prev = prev * 0.9 + noise * 0.1
        # Add a bit of low-frequency wobble to simulate waves
        wobble = math.sin(2 * math.pi * 0.5 * t) * 0.1 + 0.9
        samples.append(prev * wobble * 1.5)
    write_wav('/Users/ibrahimaltukhaim/Downloads/PAPERROUTE/public/assets/audio/water.wav', samples)

generate_water()
print("Water audio generated.")

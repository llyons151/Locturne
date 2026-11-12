"""Original lo-fi music bed for the reels (no samples, all synthesised).

Night: muffled electric-piano chords + vinyl crackle. At DROP the drums come in and the keys open
up (the alarm moment). At SOFT it drops back to keys only for the ending.
usage: python3 -I music.py out.wav total_s drop_s soft_s
"""
import sys
import wave
import numpy as np

SR = 44100
out, total, drop, soft = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
BPM = 80
beat = 60 / BPM
n = int(total * SR)
t = np.arange(n) / SR
rng = np.random.default_rng(7)

def note(f, dur, vel=0.3):
    """soft electric piano: sine + a little 2nd/3rd harmonic, quick attack, long decay, slight tremolo"""
    m = int(dur * SR)
    tt = np.arange(m) / SR
    env = (1 - np.exp(-tt / 0.008)) * np.exp(-tt / 1.4)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.5 * tt)
    return vel * env * trem * (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt) + 0.08 * np.sin(6 * np.pi * f * tt))

def midi(m):
    return 440 * 2 ** ((m - 69) / 12)

# Fmaj7 – Em7 – Dm7 – Cmaj7 (+9ths), voiced around middle C
CHORDS = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 55, 59, 62, 64]]
keys = np.zeros(n)
bar = 4 * beat
i = 0
while i * bar < total:
    st = int(i * bar * SR)
    for j, m in enumerate(CHORDS[i % 4]):
        s = st + int(j * 0.003 * SR)  # slight strum
        x = note(midi(m), bar * 1.2, 0.12)
        e = min(n, s + len(x))
        keys[s:e] += x[: e - s]
    # a bass note on each bar
    x = note(midi(CHORDS[i % 4][0] - 12), bar, 0.22)
    e = min(n, st + len(x))
    keys[st:e] += x[: e - st]
    i += 1

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc = (1 - a) * x[k] + a * acc
        y[k] = acc
    return y

# night = muffled (cutoff 700 Hz), after the drop = open (4 kHz), crossfaded
muffled = lowpass(lowpass(keys, 700), 700)
bright = lowpass(keys, 4000)
w = np.clip((t - drop) / 0.08, 0, 1) * (1 - np.clip((t - soft) / 0.4, 0, 1))
music = muffled * (1 - w) + bright * w

# drums from the drop to the soft ending
drums = np.zeros(n)
def hit(at, x):
    s = int(at * SR)
    e = min(n, s + len(x))
    if s < n:
        drums[s:e] += x[: e - s]
kt = np.arange(int(0.35 * SR)) / SR
kick = 0.9 * np.sin(2 * np.pi * (50 + 90 * np.exp(-kt / 0.03)) * kt) * np.exp(-kt / 0.12)
st = np.arange(int(0.25 * SR)) / SR
snare = 0.35 * rng.standard_normal(len(st)) * np.exp(-st / 0.06) + 0.2 * np.sin(2 * np.pi * 190 * st) * np.exp(-st / 0.05)
ht = np.arange(int(0.05 * SR)) / SR
hat = 0.12 * rng.standard_normal(len(ht)) * np.exp(-ht / 0.012)
hat = (hat - lowpass(hat, 2500)) * 2.2
b = drop
step = 0
while b < soft:
    pos = step % 8  # eighth notes in a bar of 4/4
    swing = 0.035 if step % 2 else 0
    if pos in (0, 5):
        hit(b, kick)
    if pos in (2, 6):
        hit(b, snare)
    hit(b + swing, hat * (0.7 if step % 2 else 1))
    b += beat / 2
    step += 1
# vinyl crackle all the way through
crackle = np.zeros(n)
pops = rng.random(n) < 0.0009
crackle[pops] = rng.standard_normal(pops.sum()) * 0.05
crackle = crackle - lowpass(crackle, 1500)
hiss = lowpass(rng.standard_normal(n) * 0.012, 5000)

mix = music * 0.55 + drums * 1.1 + crackle + hiss
fade = np.clip(t / 0.4, 0, 1) * np.clip((total - t) / 0.6, 0, 1)
mix *= fade
mix /= max(1e-6, np.abs(mix).max()) / 0.8
stereo = np.stack([mix, mix], axis=1)
with wave.open(out, 'wb') as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes((stereo * 32767).astype(np.int16).tobytes())
print('wrote', out, total, 's')

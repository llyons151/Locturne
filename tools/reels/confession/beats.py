#!/usr/bin/env python3
"""Tempo, beat grid and the biggest 'drop' in a music track (numpy only, no librosa).

  python3 -I confession/beats.py track.mp3 [more.mp3 ...]

Prints BPM, the first beat's offset (phase), and the strongest energy jump (the moment the track
'hits'), snapped to the beat grid. The Confession template puts that hit on the hook → montage cut.
"""
import subprocess, sys
import numpy as np

SR = 11025
HOP = 256


def load(path: str) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def analyse(path: str) -> dict:
    y = load(path)
    n = (len(y) - 1024) // HOP
    frames = np.lib.stride_tricks.sliding_window_view(y, 1024)[::HOP][:n] * np.hanning(1024)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    flux = np.maximum(0, np.diff(np.log1p(mag), axis=0)).sum(axis=1)  # onset strength
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    fps = SR / HOP
    # tempo: autocorrelation peak between 70 and 180 BPM, folded toward 90-150
    ac = np.correlate(flux, flux, mode='full')[len(flux) - 1:]
    lags = np.arange(len(ac))
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 70)
    lag = lo + int(np.argmax(ac[lo:hi]))
    bpm = 60 * fps / lag
    if bpm < 90:
        bpm *= 2
    period = 60 / bpm
    # phase: the offset whose beat grid collects the most onset strength
    t = np.arange(len(flux)) / fps
    phases = np.linspace(0, period, 64, endpoint=False)
    score = [flux[np.clip(((np.arange(0, t[-1] - p, period) + p) * fps).astype(int), 0, len(flux) - 1)].sum() for p in phases]
    phase = float(phases[int(np.argmax(score))])
    # the drop: biggest rise in 2 s mean loudness (after the first 3 s)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    w = int(2 * fps)
    k = np.convolve(rms, np.ones(w) / w, mode='same')
    rise = k[w:] - k[:-w]
    start = int(3 * fps)
    i = start + int(np.argmax(rise[start:])) + w // 2
    drop = i / fps
    drop_snapped = phase + round((drop - phase) / period) * period
    return {'bpm': round(bpm, 2), 'phase': round(phase, 3), 'drop': round(drop_snapped, 3), 'len': round(len(y) / SR, 1)}


if __name__ == '__main__':
    for p in sys.argv[1:]:
        print(p.split('/')[-1], analyse(p))

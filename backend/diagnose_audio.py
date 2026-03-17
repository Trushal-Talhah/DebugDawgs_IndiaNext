import sys, io
import numpy as np
import librosa
from transformers import pipeline
import json

sys.path.insert(0, '.')

# Check config labels first
with open('models/audio_model/config.json') as f:
    cfg = json.load(f)
print('=== CONFIG LABELS ===')
print('id2label:', cfg.get('id2label'))
print('label2id:', cfg.get('label2id'))

# Load audio
with open(r"C:\Users\KRISHNA CHAURASIA\Downloads\download.mpeg", 'rb') as f:
    audio_bytes = f.read()

y, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
y = y[:16000 * 30]
print(f'\nAudio shape: {y.shape}, dtype: {y.dtype}, max: {y.max():.4f}')

# Run model
pipe = pipeline('audio-classification', model='models/audio_model', device=-1)
results = pipe({'array': y, 'sampling_rate': 16000}, top_k=None)

print('\n=== RAW MODEL OUTPUT ===')
for r in results:
    print(f"  label={r['label']!r:30s}  score={r['score']:.6f}")

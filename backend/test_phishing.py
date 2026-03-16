import sys; sys.path.insert(0, '.')
from app.detectors.phishing_detector import extract_phishing_features, compute_phishing_risk, get_phishing_signals

safe = 'Hi John, just following up on our meeting from yesterday. Please find the project report attached. Let me know if you have any questions. Best regards, Sarah.'
feats = extract_phishing_features(safe)
score, weights = compute_phishing_risk(feats)
signals = get_phishing_signals(feats)
print(f'ML Score    : {feats["ml_score"]}')
print(f'Final Score : {score}')
print(f'Signals     : {signals}')
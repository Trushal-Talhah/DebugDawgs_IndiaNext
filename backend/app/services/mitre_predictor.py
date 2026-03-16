# markov_chain.py
import numpy as np
from collections import defaultdict
import json

class MITREMarkovChain:
    
    def __init__(self):
        self.transition_counts = defaultdict(lambda: defaultdict(int))
        self.transition_probs = {}
        self.transition_totals = {}
        self.total_campaigns = 0
    
    def train(self, sequences):
        self.total_campaigns = len(sequences)
        
        # Count every tactic-to-tactic transition
        for campaign in sequences:
            seq = campaign['sequence']
            for i in range(len(seq) - 1):
                current = seq[i]['tactic']
                next_t = seq[i+1]['tactic']
                self.transition_counts[current][next_t] += 1
        
        # Convert counts to probabilities
        for current, nexts in self.transition_counts.items():
            total = sum(nexts.values())
            self.transition_totals[current] = total
            self.transition_probs[current] = {
                nt: count/total
                for nt, count in nexts.items()
            }
        
        print(f"Markov Chain built from {self.total_campaigns} campaigns")
        print(f"Tactics covered: {len(self.transition_probs)}")
        
        # Print the actual computed weights
        for tactic, transitions in self.transition_probs.items():
            print(f"\n{tactic.upper()}")
            sorted_t = sorted(
                transitions.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            for next_t, prob in sorted_t[:3]:
                count = self.transition_counts[tactic][next_t]
                total = self.transition_totals[tactic]
                print(f"  → {next_t}: {round(prob*100,1)}% ({count}/{total})")
    
    def predict(self, current_tactic: str, top_n: int = 3) -> list:
        if current_tactic not in self.transition_probs:
            return []

        probs = self.transition_probs[current_tactic]
        counts = self.transition_counts[current_tactic]
        total = self.transition_totals[current_tactic]
        
        # Load actors if available
        actors_map = getattr(self, 'transition_actors', {})

        sorted_preds = sorted(
            probs.items(),
            key=lambda x: x[1],
            reverse=True
        )[:top_n]

        results = []
        for next_tactic, probability in sorted_preds:
            count = counts[next_tactic]

            # Wilson Score CI
            p = probability
            n = total
            z = 1.96
            center = (p + z**2/(2*n)) / (1 + z**2/n)
            margin = (z * np.sqrt(p*(1-p)/n + z**2/(4*n**2))) / (1 + z**2/n)

            # Get real actor names for this transition
            actor_evidence = actors_map.get(
                current_tactic, {}
            ).get(next_tactic, [])
            
            # Show max 4 actors, note if there are more
            displayed_actors = actor_evidence[:4]
            remaining = len(actor_evidence) - 4

            results.append({
                "next_tactic": next_tactic,
                "probability": round(probability * 100, 1),
                "observed_in": count,
                "out_of_total": total,
                "confidence_interval": {
                    "lower": round(max(0, center - margin) * 100, 1),
                    "upper": round(min(1, center + margin) * 100, 1)
                },
                "reliability": self._reliability(total),
                
                # NEW — situational evidence
                "real_world_evidence": {
                    "apt_groups": displayed_actors,
                    "additional_actors": remaining if remaining > 0 else 0,
                    "citation": "MITRE ATT&CK CTI — github.com/mitre/cti",
                    "statement": (
                        f"This transition was observed in "
                        f"{count} of {total} documented campaigns "
                        f"including: {', '.join(displayed_actors[:2])}"
                        if displayed_actors else
                        f"Observed in {count} of {total} campaigns"
                    )
                }
            })

        return results
    
    def _reliability(self, n):
        if n >= 50: return "HIGH"
        elif n >= 20: return "MEDIUM"
        elif n >= 10: return "LOW"
        else: return "INDICATIVE"
    
    def save(self, path='mitre_weights.json'):
        # Save computed weights so you never recompute
        with open(path, 'w') as f:
            json.dump({
                'probs': self.transition_probs,
                'counts': {
                    k: dict(v) 
                    for k, v in self.transition_counts.items()
                },
                'totals': self.transition_totals,
                'total_campaigns': self.total_campaigns
            }, f, indent=2)
        print(f"Weights saved to {path}")
    
    def load(self, path='mitre_weights.json'):
        with open(path, 'r') as f:
            data = json.load(f)
        self.transition_probs = data['probs']
        self.transition_counts = defaultdict(
            lambda: defaultdict(int),
            {k: defaultdict(int, v) for k, v in data['counts'].items()}
        )
        self.transition_totals = data['totals']
        self.total_campaigns = data['total_campaigns']
        
        # NEW — load actor evidence
        self.transition_actors = data.get('actors', {})
        print(f"Weights loaded — {self.total_campaigns} campaigns")
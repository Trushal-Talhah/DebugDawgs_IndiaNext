import sys
import os
sys.path.append(os.path.dirname(__file__))

import requests
import json
from collections import defaultdict

TACTIC_ORDER = [
    "reconnaissance", "resource-development", "initial-access",
    "execution", "persistence", "privilege-escalation",
    "defense-evasion", "credential-access", "discovery",
    "lateral-movement", "collection", "command-and-control",
    "exfiltration", "impact"
]

print("Fetching MITRE ATT&CK dataset...")
url = "https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json"
data = requests.get(url).json()

objects = {obj['id']: obj for obj in data['objects']}
actor_techniques = defaultdict(list)

for obj in data['objects']:
    if obj['type'] != 'relationship':
        continue
    if obj['relationship_type'] != 'uses':
        continue

    source = objects.get(obj['source_ref'])
    target = objects.get(obj['target_ref'])

    if not source or not target:
        continue
    if source['type'] not in ['campaign', 'intrusion-set']:
        continue
    if target['type'] != 'attack-pattern':
        continue

    for phase in target.get('kill_chain_phases', []):
        tactic = phase.get('phase_name', '')
        if tactic in TACTIC_ORDER:
            actor_techniques[obj['source_ref']].append({
                'tactic': tactic,
                'order': TACTIC_ORDER.index(tactic),
                'actor_name': source.get('name', 'Unknown'),
                'actor_type': source['type']
            })

sequences = []
for actor_id, techniques in actor_techniques.items():
    sorted_t = sorted(techniques, key=lambda x: x['order'])
    seen = []
    for t in sorted_t:
        if not seen or seen[-1]['tactic'] != t['tactic']:
            seen.append(t)
    if len(seen) >= 2:
        sequences.append({
            'actor': objects[actor_id].get('name', 'Unknown'),
            'actor_type': objects[actor_id].get('type', ''),
            'sequence': seen
        })

print(f"Parsed {len(sequences)} real attack campaigns")

transition_counts = defaultdict(lambda: defaultdict(int))
transition_totals = {}

# NEW — track exactly which actors made each transition
transition_actors = defaultdict(lambda: defaultdict(list))

for campaign in sequences:
    seq = campaign['sequence']
    actor_name = campaign['actor']
    for i in range(len(seq) - 1):
        current = seq[i]['tactic']
        next_t = seq[i+1]['tactic']
        transition_counts[current][next_t] += 1
        
        # Store actor name against this transition
        if actor_name not in transition_actors[current][next_t]:
            transition_actors[current][next_t].append(actor_name)

transition_probs = {}
for current, nexts in transition_counts.items():
    total = sum(nexts.values())
    transition_totals[current] = total
    transition_probs[current] = {
        nt: count / total
        for nt, count in nexts.items()
    }

# Print real weights with actor evidence
print("\nReal computed weights with actor evidence:")
for tactic, transitions in transition_probs.items():
    print(f"\n{tactic.upper()}")
    sorted_t = sorted(transitions.items(), key=lambda x: x[1], reverse=True)
    for next_t, prob in sorted_t[:3]:
        count = transition_counts[tactic][next_t]
        total = transition_totals[tactic]
        actors = transition_actors[tactic][next_t][:3]
        print(f"  -> {next_t}: {round(prob*100,1)}% ({count}/{total})")
        print(f"     Evidence: {', '.join(actors)}")

output = {
    'probs': transition_probs,
    'counts': {k: dict(v) for k, v in transition_counts.items()},
    'totals': transition_totals,
    'total_campaigns': len(sequences),
    # NEW — actor evidence per transition
    'actors': {
        current: {
            next_t: actors
            for next_t, actors in nexts.items()
        }
        for current, nexts in transition_actors.items()
    }
}

os.makedirs('data', exist_ok=True)
with open('data/mitre_weights.json', 'w') as f:
    json.dump(output, f, indent=2)

print(f"\nDone. Weights + actor evidence saved to data/mitre_weights.json")
print(f"Total campaigns analysed: {len(sequences)}")
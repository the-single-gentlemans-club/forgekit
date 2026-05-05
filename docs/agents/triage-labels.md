# Triage Labels

Five canonical labels manage issue workflow:

| Label | Meaning |
|-------|---------|
| `needs-triage` | Maintainer needs to evaluate and prioritize |
| `needs-info` | Waiting on reporter for clarification |
| `ready-for-agent` | Fully specified; agent can pick up autonomously |
| `ready-for-human` | Requires human implementation; blocked from agents |
| `wontfix` | Will not be actioned; issue stays closed |

## When to Apply

- **New issue** → add `needs-triage`
- **Asking reporter** → change to `needs-info`
- **Spec complete** → change to `ready-for-agent` or `ready-for-human`
- **Won't fix** → add `wontfix`, close

## Agent Behavior

Agents read these labels to decide whether to work on an issue:
- `ready-for-agent` → agent picks up, implements, opens PR
- `ready-for-human` → agent skips (human work only)
- Other labels → agent won't touch

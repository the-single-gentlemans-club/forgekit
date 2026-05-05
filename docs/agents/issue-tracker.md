# Issue Tracker

Issues live in GitHub Issues at [github.com/effinrich/forgekit/issues](https://github.com/effinrich/forgekit/issues).

## Creating Issues

Use `gh issue create`:

```bash
gh issue create --title "Bug: X" --body "Description" --label "needs-triage"
```

## Labels

Triage labels manage workflow; see `triage-labels.md`.

## Agent Access

When an agent picks up an issue, it will:
1. Read the issue from GitHub
2. Create a branch referencing the issue number
3. Update the issue with progress
4. Link the PR back to the issue

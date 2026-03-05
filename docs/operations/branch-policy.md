# Branch Policy (Safe Structure)

## Active Branches
- `main`: stable shared base
- `elementary`: elementary development
- `junior`: junior-high development
- `highschool`: high-school development

Legacy `codex/*` branches are frozen for reference and emergency rollback only.

## Sync Rule
1. Common changes land on `main` first.
2. Reflect to grade branches only via `git merge main`.
3. Never sync by file copy.

## Forbidden Commands
- `git reset --hard`
- `git push --force`
- `git rebase`
- `cp -R`
- `rm -rf src`

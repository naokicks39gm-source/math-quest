# Branch Sync Incident Ledger

## Purpose
Record every branch sync run, including no-incident runs, to prevent repeated operational mistakes.

## Required Fields
- datetime_jst
- result (success|failed|partial)
- failed_stage (merge|check|push|restore|none)
- one_line_cause
- impacted_branches
- impacted_files_or_scope
- prevention_action
- preflight_check_next_time
- log_path
- pre_sha
- post_sha

## Entries

### 2026-03-01 20:20:26 JST
- datetime_jst: 2026-03-01 20:20:26 JST
- result: success
- failed_stage: none
- one_line_cause: no incident (all branches were already aligned before sync)
- impacted_branches: main,codex/integration-main,codex/categorization-track,codex/guardian-mail-track,codex/problem-notation-track
- impacted_files_or_scope: git history/status only
- prevention_action: keep fail-fast + strict SHA verify + per-track stash before sync
- preflight_check_next_time: record pre SHA and stash IDs for category/mail/notation before running branch-sync
- log_path: /Users/awakawanaoki/.codex/skills/branch-sync/logs/branch-sync-20260301-201929.log
- pre_sha: 588ab18 (all targets)
- post_sha: 588ab18 (all targets)

### 2026-03-05 15:27:43 JST
- datetime_jst: 2026-03-05 15:27:43 JST
- result: success
- failed_stage: none
- one_line_cause: no incident (safe structure migration completed)
- impacted_branches: main,elementary,junior,highschool
- impacted_files_or_scope: branch/worktree structure, routing scaffolding, keypad/problem module layout
- prevention_action: enforce merge-main-only rule and keep legacy codex branches read-only
- preflight_check_next_time: ensure main clean/stashed, create backup tag, verify worktree-branch mapping first
- log_path: local operation run (Codex execution log)
- pre_sha: 36cd5eb
- post_sha: pending commit

### 2026-03-05 17:20:19 JST
- datetime_jst: 2026-03-05 17:20:19 JST
- result: success
- failed_stage: none
- one_line_cause: restored pre-worktree structure on main via non-destructive revert and stabilized one quest assertion
- impacted_branches: main
- impacted_files_or_scope: revert of monorepo migration commit + test assertion compatibility
- prevention_action: keep rollback via revert only, create backup tag before rollback, and validate check/lint/typecheck before push
- preflight_check_next_time: verify target backup tag and current HEAD, then run full verification gates before sharing
- log_path: local operation run (Codex execution log)
- pre_sha: a58f436
- post_sha: pending

### 2026-03-05 17:20:59 JST
- datetime_jst: 2026-03-05 17:20:59 JST
- result: success
- failed_stage: none
- one_line_cause: post_sha finalized after full verification gates
- impacted_branches: main
- impacted_files_or_scope: incident ledger only
- prevention_action: record pre/post SHA in separate immutable entries when post value is decided after checks
- preflight_check_next_time: append completion entry after checks and before push
- log_path: local operation run (Codex execution log)
- pre_sha: a58f436
- post_sha: 6f8d195

### 2026-03-05 17:31:22 JST
- datetime_jst: 2026-03-05 17:31:22 JST
- result: success
- failed_stage: none
- one_line_cause: restored problem data to previous edit point (60404df) with non-destructive commit flow
- impacted_branches: main
- impacted_files_or_scope: src/lib/elementaryContent.ts
- prevention_action: always stash dirty worktree, tag before rollback, and isolate problem-data rollback to single file
- preflight_check_next_time: record pre SHA and stash ID before rollback, then run check/lint/typecheck + fraction TeX tests
- log_path: local operation run (Codex execution log)
- pre_sha: e87d8b5
- post_sha: e11e5a6
- stash_id: stash@{0} (problem-data-rollback-prep-20260305-1727)

# Quest Generation Lessons Learned

## Purpose
- Prevent recurrence of generation and selection failures.
- Keep E1-E4 behavior stable while extending coverage for E5-E6, J1-J3, H1-H3.

## Repeated Failure Patterns
1. Generation became heavy and slow after adding broad fallback loops.
2. Stock existed, but question picking still failed due to strict dedupe collisions.
3. Unknown `pattern_id` returned too few items (often 3 seed examples only).

## Current Countermeasures
1. Generation limits:
- Keep bounded attempts for generators.
- Prefer deterministic bounded fallback over deep random retries.

2. Selection robustness:
- Keep strict prompt+equivalent dedupe as the source of truth.
- If a second selection path is needed, deterministic fallback must still preserve
  equivalent uniqueness (never prompt-only fallback).

3. Unknown pattern support:
- Add explicit generators for missing patterns where possible.
- For secondary grades and non-frozen grades, generate real numeric variants.
- Never inject internal labels into user-facing prompts.

4. Frozen elementary policy:
- E1-E4 are treated as frozen for behavior protection.
- Do not apply late-stage seed-variant fallback to E1-E4.

## Audit Checklist (must pass before merge)
1. Each target type can start with 5 items.
2. If `count >= 5`, picker returns exactly 5 items.
3. E1-E4 regression suite remains green.
4. No infinite loops or unbounded generation.
5. `make check` fully green.

## Debug Logging Focus
- Type id
- Pattern id
- stock count / target
- pick requested / picked
- reason / failure class
- build time (ms)

## Guardrails for future changes
1. Add tests first for any new pattern class.
2. Keep failure classification explicit: generation failure vs pick failure.
3. Never reduce strict uniqueness globally; deterministic fallback must keep equivalent checks.
4. Never mix internal identifiers or debug labels into UI prompt text.
5. Preserve frozen-grade behavior unless explicitly changed.

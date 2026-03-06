# Pattern Catalog Reorg Log

- Date: 2026-03-06
- Backup: `tmp/pattern-catalog-backup-20260306/packages/problem-engine/patterns/`
- Moved files:
  - `E1-add.json -> E1/add-basic.json`
  - `E1-sub.json -> E1/sub-basic.json`
  - `E1-mul.json -> E1/mul-basic.json`
  - `E1-div.json -> E1/div-basic.json`
  - `J1-linear.json -> J1/linear-basic.json`
  - `J1-expand.json -> J1/expand-basic.json`
  - `J1-factor.json -> J1/factor-basic.json`
  - `H1-quadratic.json -> H1/quadratic-basic.json`
  - `H1-discriminant.json -> H1/discriminant-basic.json`
- Verification:
  - `make check`: passed
  - `npm run lint`: passed
  - `npm run typecheck`: passed

# Quest Architecture

## Summary

`page.tsx` is now the orchestration shell for the quest screen.

Current status:

- `page.tsx`: 591 lines
- `QuestPageInner` main body: about 284 lines
- `typecheck`: passed
- `build`: passed
- `make check`: passed

From this point, the priority is not further reduction. The priority is structural stability.

## Quest Shell Principle

`page.tsx` may contain only:

- local screen state hookup
- refs
- top-level hook calls
- small derived flags needed to read the shell
- early returns
- final JSX composition

`page.tsx` must remain readable as:

1. state and refs
2. selection hook
3. orchestration hook
4. panel props hook
5. render

## Responsibility Boundaries

### `page.tsx`

Allowed:

- screen-level state hookup through `useQuestState`
- screen refs
- calling orchestration hooks
- passing props into panels
- final layout composition
- short render-only branching

Not allowed:

- render helper functions
- validation logic
- selection sync
- route/query parsing
- session glue
- session API orchestration
- stock construction logic
- recognition control logic
- complex `useEffect`
- new 20+ line helper blocks

### `hooks/`

Hooks own stateful screen behavior and cross-module wiring.

Put in hooks:

- selection sync
- session glue
- learning/session flow
- recognition flow
- stock flow
- memo canvas interaction
- gesture flow
- result derivation
- page-wide side effects
- panel prop wiring

Do not put in hooks:

- static formatting-only helpers
- pure conversion helpers with no React dependency
- JSX-heavy visual composition

### `utils/`

Utils own pure helpers and initialization helpers.

Put in utils:

- pure helper functions
- initial question/setup helpers
- formatting helpers
- conversion helpers
- render-independent logic

Do not put in utils:

- React hooks
- stateful browser lifecycle logic
- JSX rendering

### `components/`

Components own visual panels and local display composition.

Put in components:

- panel rendering
- presentational branching local to a panel
- display-only composition
- visual prop consumption

Do not put in components:

- route sync
- storage/session bootstrap
- quest-wide orchestration

## Page Re-Growth Guardrails

These rules are fixed.

- Do not move render helpers back into `page.tsx`.
- Do not move validation back into `page.tsx`.
- Do not move selection sync back into `page.tsx`.
- Do not move session glue back into `page.tsx`.
- Do not add complex `useEffect` blocks to `page.tsx`.
- Do not add API call orchestration to `page.tsx`.
- `page.tsx` should contain only state, refs, hook calls, and JSX.
- Any new feature must first choose its home: `hooks`, `utils`, or `components`.
- If a change needs a helper over roughly 20 lines, default to moving it out of `page.tsx`.
- Do not reduce `page.tsx` further unless readability clearly improves.
- Do not create tiny hooks without a strong boundary reason.

## Current Hook Responsibilities

### Core shell hooks

- `useQuestSelection`
  - Reads route/query params
  - Resolves `skillId`, `retry`, `fresh`, `patternId`, `type`, `category`, `difficulty`, `levelId`
  - Syncs selected type from route inputs
  - Owns level/type/category selection synchronization

- `useQuestOrchestration`
  - Top-level quest wiring hub
  - Calls lower-level hooks
  - Returns bundled objects that `page.tsx` consumes
  - Keeps the page readable as an orchestration shell

- `useQuestPanelProps`
  - Final prop wiring for header/question/keypad/memo panels
  - Normalizes panel props before JSX

### State and side-effect hooks

- `useQuestState`
  - Owns local quest screen UI state
  - Central place for transient React state used by the quest screen

- `useQuestEffects`
  - Owns page-wide effect synchronization
  - Bridges quest status, learning UI flags, picker visibility, auto-finish, and scroll behavior

- `useQuestCallbacks`
  - Owns page-level navigation callbacks
  - Handles next question, next level, retry, continue, finish

### Session and learning hooks

- `useQuestSessionFlow`
  - Owns learning/session API lifecycle
  - Starts, resumes, answers, and finishes learning sessions
  - Syncs learning answer responses into quest UI state

- `useQuestSessionGlue`
  - Owns localStorage/session bootstrap/reset/end glue
  - Bridges persisted session identifiers and recovery data with UI state

### Recognition, stock, and interaction hooks

- `useQuestRecognitionFlow`
  - Loads recognition models
  - Controls auto-judge timing
  - Starts recognition execution flow

- `useQuestStock`
  - Builds stock context
  - Computes selected path, active type, shortages, and pick targets
  - Picks quest sets for non-learning flows

- `useQuestStockEffects`
  - Applies stock results into screen state
  - Switches blocked/playing state based on stock readiness and shortages

- `useMemoCanvas`
  - Owns memo canvas drawing, zoom, pan, pointer handling, undo, clear

- `useQuestGestures`
  - Owns plus/minus long-press and flick gesture behavior

- `useQuestResultLogic`
  - Computes result-view derived state
  - Resolves recommendation and current skill progress display inputs

- `useQuestKeypad`
  - Owns keypad submission readiness
  - Wires attack/delete behavior
  - Manages fraction auto-move timers

## Large Hook Watchlist

These are monitoring targets only. Do not split them now.

- `useQuestOrchestration.ts`: 898 lines
- `useQuestRecognition.ts`: 1596 lines
- `useQuestLearningFlow.ts`: 462 lines
- `useQuestStock.ts`: 338 lines
- `useLearningOrchestrator.ts`: 335 lines

### Future split criteria

Revisit only if one of these becomes true:

- the hook spans multiple domains
- the return shape becomes too wide to read safely
- the hook contains 3 or more distinct sub-flows
- changes routinely touch unrelated sections of the same hook

If none of those are true, keep the hook intact.

## Current Evaluation

The current `page.tsx` is acceptable and should be treated as stable.

- It reads as an orchestration shell.
- Major responsibilities have already been moved out.
- The remaining body is still readable.
- More shrinking now would likely trade clarity for indirection.

Therefore:

- do not force additional page reduction
- do not create small hooks just to lower line count
- prefer stable boundaries over aggressive extraction

## Developer Rule of Thumb

When adding new quest functionality, decide in this order:

1. Is it pure logic or initialization?
   - put it in `utils/`
2. Is it stateful behavior or cross-module wiring?
   - put it in `hooks/`
3. Is it visual composition or panel rendering?
   - put it in `components/`
4. Only if none of the above apply:
   - consider keeping a small shell-level piece in `page.tsx`

If there is doubt, keep `page.tsx` thin and move the logic out.

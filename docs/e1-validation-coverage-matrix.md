# E1 Validation Coverage Matrix

## Purpose
- Make validation requirements explicit for the full E1 curriculum before validator expansion.
- Prevent validator omissions when a new E1 skill is added.
- Separate current runtime coverage from planned semantic coverage.

## Legend
- `existing`: already implemented in `packages/problem-validation`
- `planned`: required next validator, not implemented yet
- `gap`: pattern mapping or runtime coverage is not wired yet

## Column Guide
- `required single-problem validations`: validators that should run per generated problem
- `required batch validations`: validators that should run against a generated sample set
- `required pedagogy validations`: grade or teaching-policy checks
- `required semantic validations`: concept-specific correctness checks beyond arithmetic correctness

## Existing Validator Inventory
- Common single: `hasQuestion`, `hasAnswer`, `hasDifficulty`, `patternKeyMatches`, `gradePedagogyRule`, `constraintsSatisfied`, `mathCorrect`, `difficultyMatchesPattern`
- Common batch: `validateDistribution`
- Arithmetic skill-specific: `singleDigitOperands`, `sumIs10`, `mustCarry`, `noBorrow`, `mustBorrow`

## E1 Skill Coverage

| skillId | skill title | grade | required single-problem validations | required batch validations | required pedagogy validations | required semantic validations | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1_NUMBER_COUNT | かずをかぞえる | E1 | existing: `hasQuestion`, `hasAnswer`, `hasDifficulty`, `patternKeyMatches`, `gradePedagogyRule`; planned: count prompt shape validator | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `countRepresentsQuantity` | canonical coverage row for number counting; design source maps to `E1_NUMBER_1_TO_10` and `E1_NUMBER_1_TO_20`; design-only / not in `skillRules` yet |
| E1_NUMBER_ORDER | 数の順序 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `numberSequenceIsOrdered` | corresponds to `E1_NUMBER_ORDER` in `e1-skill-map`; design-only / not in `skillRules` yet |
| E1_NUMBER_COMPARE | 数の大小 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `comparisonRelationMatchesAnswer` | corresponds to `E1_NUMBER_COMPARE` in `e1-skill-map`; design-only / not in `skillRules` yet |
| E1_NUMBER_COMPOSE | 数の合成 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `composePartsToWhole` | canonical number concept row; nearest existing runtime concept is `NUM_COMP_10`; pattern mapping unresolved |
| E1_NUMBER_DECOMPOSE | 数の分解 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `decomposeWholeToParts` | canonical number concept row; nearest existing runtime concept is `NUM_DECOMP_10`; pattern mapping unresolved |
| E1_NUMBER_10_COMPOSE | 10の合成 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `composeToTen` | design-level concept; runtime pattern likely aligns with `NUM_COMP_10`; semantic validator missing |
| E1_NUMBER_10_DECOMPOSE | 10の分解 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `decomposeTen` | design-level concept; runtime pattern likely aligns with `NUM_DECOMP_10`; semantic validator missing |
| E1_NUMBER_LINE | 数直線 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `numberLinePositionMatchesValue` | no runtime validator exists yet; pattern mapping unresolved |
| E1_NUMBER_DISTANCE | 数のへだたり | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `numberLineDistanceMatchesGap` | no runtime validator exists yet; pattern mapping unresolved |
| E1_ADD_MEANING | たし算の意味 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `additionStoryMatchesOperation` | meaning skill separate from calculation skill; design-only / not in `skillRules` yet |
| E1_SUB_MEANING | ひき算の意味 | E1 | existing: common single validators | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `subtractionStoryMatchesOperation` | meaning skill separate from calculation skill; design-only / not in `skillRules` yet |
| E1_ADD_BASIC | 1桁のたし算 | E1 | existing: common single validators, `singleDigitOperands` | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `additionMeaningPreserved` (optional) | runtime validator exists |
| E1_ADD_10 | 10を作るたし算 | E1 | existing: common single validators, `singleDigitOperands`, `sumIs10` | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `makeTenStructurePresent` | runtime validator exists |
| E1_ADD_CARRY | 繰り上がりのあるたし算 | E1 | existing: common single validators, `singleDigitOperands`, `mustCarry` | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `carryStructurePresent` | runtime validator exists |
| E1_SUB_BASIC | 1桁のひき算 | E1 | existing: common single validators, `singleDigitOperands`, `noBorrow` | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `subtractionMeaningPreserved` (optional) | runtime validator exists |
| E1_SUB_BORROW | 繰り下がりのあるひき算 | E1 | existing: common single validators, `mustBorrow` | existing: `validateDistribution` | existing: `gradePedagogyRule` | planned: `borrowStructurePresent` | runtime validator exists |

## Validator Difference by Skill Family

### Number Concept Skills
- Depend mostly on common structural validators plus semantic validators.
- Need concept-specific checks as the primary quality gate.
- Arithmetic-specific rules such as `singleDigitOperands`, `sumIs10`, `mustCarry`, `noBorrow`, and `mustBorrow` are usually not the main validator.

### Calculation and Meaning Skills
- Depend on common structural validators plus arithmetic-specific rules.
- Semantic validators still matter, but mostly as teaching-intent checks instead of first-line correctness checks.
- `E1_ADD_MEANING` and `E1_SUB_MEANING` sit between concept skills and pure calculation skills because operation semantics matter more than arithmetic format.

## Next Semantic Validators to Implement
- `countRepresentsQuantity`
- `numberSequenceIsOrdered`
- `comparisonRelationMatchesAnswer`
- `composePartsToWhole`
- `decomposeWholeToParts`
- `composeToTen`
- `decomposeTen`
- `numberLinePositionMatchesValue`
- `numberLineDistanceMatchesGap`
- `additionStoryMatchesOperation`
- `subtractionStoryMatchesOperation`
- `makeTenStructurePresent`
- `carryStructurePresent`
- `borrowStructurePresent`

## Current Status Summary
- Runtime validator coverage exists for 5 arithmetic E1 skills: `E1_ADD_BASIC`, `E1_ADD_10`, `E1_ADD_CARRY`, `E1_SUB_BASIC`, `E1_SUB_BORROW`
- Number concept and meaning skills are still coverage-planned and are not registered in `packages/problem-validation/skillRules.ts`
- The largest current gap is semantic validation, not common structural validation

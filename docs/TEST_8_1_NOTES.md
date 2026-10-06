# Test 8.1 Design Notes — Smart Valuation + Workflow Intelligence

## Purpose

Test 8 proved that the acquisition interface can be substantially simplified without throwing away the identification and CeX matching work from Test 7.4.

Test 8.1 deliberately broadens the test. The question is no longer only:

> Can RetroHQ give a fast buy answer?

It is now:

> Can one buying decision become one connected item record that drives the rest of the business?

## System loop

**FIND → IDENTIFY → VALUE → DECIDE → BUY → PROCESS → LIST → SELL → LEARN**

The stored item is the connection between every stage.

## Smart valuation

CeX is evidence, not the RetroHQ answer.

For a supported console, RetroHQ stores:

- locked product identity
- CeX catalogue grade
- CeX retail benchmark
- RetroHQ condition
- completeness flags
- each missing-accessory adjustment
- unresolved adjustments
- final RetroHQ UK Market Value
- recommended maximum buy
- acquisition date/value
- evidence source and timestamp

### Missing controller

RetroHQ asks the server for a live CeX UK controller retail benchmark specific to the locked console platform.

A deduction is only made if the accessory search passes the platform/controller checks.

If no credible result is found, the valuation is marked partial and the missing controller remains a workflow issue.

### Missing cables

Cable replacement is currently a configurable business allowance in Settings. This is intentionally transparent rather than pretending a generic cable cost is live market evidence.

Future versions can replace this allowance with component-specific live evidence.

## Workflow intelligence

HQ Today and Processing use one priority per item:

1. Ready to dispatch
2. Needs identification
3. Needs valuation
4. Missing essential accessories
5. Ready to list
6. Normal processing work

The purpose is to answer **What should I do next?**, not to expose every possible issue simultaneously.

## Closed-loop evidence

For Test 8.1 items RetroHQ can retain:

- valuation when acquired
- recommended maximum
- actual buy price
- processing costs
- listing
- actual sale price
- fees
- actual profit
- days to sell

This is the minimum data foundation required before RetroHQ can credibly learn from its own transactions.

## Deliberately not included

- eBay API integration
- new market providers
- AI/ML prediction
- major new modules
- automatic repricing
- multi-tenant architecture

Test 8.1 is about connecting the system we already have before expanding scope.

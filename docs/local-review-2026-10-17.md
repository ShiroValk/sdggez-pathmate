# Local frontend review — 17 October 2026

Baseline: `7c4b9cecfb5e768a30aa14d6f88ada2ce02ce444` (main).
Maintenance branch: `fix/demo-truth-and-mobile`. No spec selection file or
`SPECIFY_FEATURE_DIRECTORY` override was present in this clone. This is a
bounded follow-up to spec003, with no API/schema/dependency changes.

## Repairs

- Rebuild cumulative browser speech results instead of appending earlier final
  phrases again. The new regression first failed with `take me take me home`
  and passed after the fix with `take me home`.
- Mark SOS as a demo before interaction and explicitly state no call or
  notification occurred. Remove the unimplemented three-second call promise.
- Use 999 in the taxi help demo; remove invented feedback participation counts.
- Mark static weather as a fixed sample and remove the unrelated Bangkok
  weather claim; change family “Guarding” to “Care information”.
- Associate the login labels with inputs, add autocomplete hints and visible
  keyboard focus, improve login label/button contrast, and establish 44px
  button minimum targets. These are scoped improvements, not a WCAG certificate.
- Remove the 640px minimum-height override on small screens and respect reduced
  motion for the toast entrance.

## Current verification

- Node 24.19.0; `npm ci` from the committed lock file.
- `node --import tsx --test tests/unit/voice.test.ts
  tests/integration/route-model.test.ts tests/integration/route-state.test.ts
  tests/integration/route-accessibility.test.ts
  tests/integration/position-cache.test.ts`: **26/26** passed.
- `npm run lint`: passed (ESLint, Stylelint and both TypeScript projects).
- `npm run build`: passed. Existing Vite configuration/module warnings and
  a >500KB client chunk warning remain; no low-end-device performance measured.
- Real headless Chromium, emulated 390×844, 320×568 and 1440×1000 viewports:
  **16 focused checks passed**, no page JavaScript exceptions. Checked labels,
  honest service demos, small-screen bounds, missing-Key errors without invented
  route results, three mode controls, settings and RAM reset on refresh.
- No API requests occurred in the frontend-demo verification. No real account,
  database, map Key, location permission, microphone or physical handset used.
  No live map, database persistence, care authorisation, remote telemetry,
  push delivery, native wearable or full end-to-end acceptance is claimed.

The Impeccable mechanical detector returned two pre-existing accent-border
warnings and a map-grid advisory. The grid is an existing map placeholder,
so it is not evidence of a broken application. No redesign was undertaken.

Spec003 historical evidence remains historical; this review does not replace
its team-recorded map and database verification. At completion of the initial
local review, no code had been pushed or deployed. Later GitHub delivery does
not imply that the unverified integrations above have passed.

# Competitor Domination TODO

Scope: Build only real, production-capable features. No mock outputs, no synthetic UI-only claims.

## Completed Tasks

- [x] Real-time prediction pulse stream with server-sent events (SSE)
  - Backend endpoint: `GET /api/predictions/stream`
  - Streams live generated summaries + top signals on interval.

- [x] Explainability engine endpoint for factor-level attribution
  - Backend endpoint: `GET /api/predictions/explain/:symbol`
  - Returns regime, directional call, factor scores, diagnostics, timeframe bias, reasoning.

- [x] Monte Carlo scenario simulator endpoint
  - Backend endpoint: `GET /api/predictions/scenario/:symbol`
  - Uses historical log-return drift/volatility with configurable path count and percentile cone outputs.

- [x] Frontend integration of advanced model labs
  - Added Live Pulse Stream panel (real-time SSE consumption).
  - Added Explainability Lab panel (factor bars + diagnostics).
  - Added Scenario Simulator panel (probabilities + percentile cone).

- [x] Removed fake fallback data path from Predictions page
  - On API failure, app now surfaces explicit backend error state.
  - Ensures no fabricated prediction cards are shown.

- [x] Confidence calibration upgrade for higher average confidence on actionable signals
  - Engine confidence now includes reliability multiplier + directional/confluence bonuses.
  - Summary now exposes actionable confidence and confidence lift.

- [x] Advanced UI motion pass
  - Added animated ambient background blobs.
  - Added richer row hover motion and animated bar transitions.
  - Added dynamic stream/simulator card transitions.

- [x] In-app model teaching module
  - Added "Model Academy" with technical, regime, confidence, and validation explainers.

- [x] Real trader workflow rebuild (clear user value loop)
  - Added explicit workflow section: Discover to Plan to Execute to Review.
  - Added working journal loop for capturing thesis and planned execution.

- [x] Actionable playbook endpoint
  - Backend endpoint: `GET /api/predictions/playbook/:symbol`
  - Returns thesis, setup grade, conviction tier, checklist, risk-profile constraints, invalidation rules, and review window.

## Evidence

- Frontend page: `src/pages/Predictions.tsx`
- Backend routes: `backend/src/routes/predictions.ts`
- Engine calibration: `backend/src/services/ensembleEngine.ts`
- Tests updated: `src/pages/__tests__/Predictions.test.tsx`

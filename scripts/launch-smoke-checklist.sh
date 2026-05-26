#!/usr/bin/env bash
set -euo pipefail

echo "== Render launch smoke checklist =="
pnpm --filter @render/api exec tsc --noEmit
pnpm --filter @render/web exec tsc --noEmit
pnpm --filter @render/api test

echo "PASS: Typecheck and API contract suite completed."

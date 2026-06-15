# Venture Studio Simulator

A one-page, no-build web app that visually explains how the Ministry of Product
venture studio machine works. It is an **explanatory model, not a legal cap
table** — every ownership, revenue, and distribution number is simulated,
estimated, and illustrative.

## What it shows

- **The studio machine** — a funding tank for **VSC1** (Venture Studio Cohort 1)
  and a live money-flow diagram: investors fund the cohort → the cohort pays MoP
  a monthly operating budget → MoP turns money and focus into ventures.
- **The venture pipeline** — a funnel of ideas moving through the 10 BSSS release
  levels (RL1 Idea → RL10 Stable). Each venture card shows its stage, MRR,
  customers, ops load, cash-flow status, and a **BSSS donut** that fills as
  stages complete. Most ideas are expected to stall or be killed.
- **Spinout LLCs** — when a venture clears the spinout bar (MRR ≥ $5k, positive
  cash flow, repeatable acquisition, stable product, ≤10 mgmt hrs/week) it can be
  spun out. BSSS ownership converts into a formal ownership table, the LLC pays
  MoP a 10% stewardship fee, and estimated profit + investor distributions are
  shown.

## BSSS (Big Slice / Small Slice)

Each stage opens a **Big Slice** with a fixed percentage of the venture. A
contributor's **Small Slice** in that stage = their points ÷ total points in the
slice × the Big Slice %. Completed slices lock and can't be diluted. The donut
splits each filled wedge into investor (blue), MoP/steward (purple), and
contributor (green) sub-arcs; the active slice has a gold outline; planned future
stages are gray (unallocated).

## Controls

- **Add Investor** — commit more capital to VSC1 (recomputes cohort shares).
- **Fill VSC1** — top the cohort to its raise target and activate it.
- **Advance One Month** — pay MoP, maybe seed a new idea, advance/stall/kill
  ventures, fill BSSS slices, grow revenue, and re-check spinout eligibility.
- **Spinout Venture** — appears on a card once it is eligible.
- **Reset** — restore the initial sample cohort.

State is persisted to `localStorage` (`mop_venture_studio_v1`). No backend, no
auth, no build step.

## Run

Serve the repo root and open `venturestudio/index.html`:

```
npx serve .
# or
python3 -m http.server 8000
```

Spec: [`docs/Venture Studio Simulator.md`](../docs/Venture%20Studio%20Simulator.md).

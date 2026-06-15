# Venture Studio Simulator Spec

## Purpose

Build a one-page JavaScript web app that visually explains how the Ministry of Product venture studio machine works.

The simulator should show investors funding a cohort, money filling **VSC1**, monthly funds flowing to MoP operations, ventures advancing through stages, BSSS ownership filling over time, and eligible ventures spinning out into new LLCs with formalized ownership percentages.

This simulator is an explanatory model, not a legal cap table.

---

# Core Concept

```text
Investors
   ↓
VSC1: Venture Studio Cohort 1
   ↓
MoP Studio Operations
   ↓
Venture Pipeline
   ↓
Spinout LLCs
```

## VSC1 Defaults

```js
const VSC1_DEFAULTS = {
  raiseTarget: 300000,
  durationMonths: 12,
  monthlyOperatingBudget: 25000,
  targetSpinouts: 3,
  investorPoolPercent: 35,
  mopPoolPercent: 40,
  contributorPoolPercent: 25
}
```

VSC1 does **not** buy ownership in Ministry of Product. VSC1 buys participation in the ventures produced by the cohort.

---

# One-Page App Layout

## 1. Cohort Funding Panel

Show a large funding tank or progress bar.

Fields:

- Cohort name: VSC1
- Raise target: $300,000
- Current funded amount
- Current month
- Remaining capital
- Monthly operating budget
- Target spinouts: 3

Buttons:

- Add Investor
- Fill VSC1
- Advance One Month
- Reset Simulation

## 2. Monthly Studio Machine Panel

Show monthly flow:

```text
VSC1 Capital
   ↓
Monthly MoP Operating Budget
   ↓
Venture Advancement
```

Each month:

- VSC1 pays MoP operating costs.
- MoP applies focus, AI tools, marketing, and contributors to ventures.
- One new idea may enter the pipeline.
- Existing ventures may advance stages.
- Ventures may gain customers and revenue.
- BSSS slices may fill.
- Ventures may become spinout eligible.

## 3. Venture Pipeline Panel

Show venture cards.

Each venture card includes:

- Venture name
- Current stage
- Monthly recurring revenue
- Customer count
- Price per customer
- Management hours/week
- Spinout eligibility status
- BSSS pie chart
- Spinout button when eligible

Example card:

```text
TrueUp
Stage: RL8 Monetized
MRR: $5,200
Customers: 347
Ops: 8 hours/week
Spinout Eligible: Yes

[ BSSS Pie Chart ]

Button: Spinout Venture
```

## 4. Spinout LLC Panel

Show spun-out ventures.

Each LLC card includes:

- LLC name
- Source venture
- Month spun out
- MRR
- Ownership table
- MoP stewardship fee
- Estimated profit
- Estimated investor distributions

---

# Venture Stages

Use BSSS-compatible release levels.

```js
const STAGES = [
  { id: "RL1", name: "Idea", slicePercent: 4 },
  { id: "RL2", name: "Vision", slicePercent: 4 },
  { id: "RL3", name: "Prototype", slicePercent: 4 },
  { id: "RL4", name: "Play Test", slicePercent: 12 },
  { id: "RL5", name: "Release", slicePercent: 16 },
  { id: "RL6", name: "Users", slicePercent: 12 },
  { id: "RL7", name: "Audience", slicePercent: 12 },
  { id: "RL8", name: "Monetized", slicePercent: 12 },
  { id: "RL9", name: "Scalable", slicePercent: 12 },
  { id: "RL10", name: "Stable", slicePercent: 12 }
]
```

Validation:

```js
const totalSlicePercent = STAGES.reduce((sum, stage) => sum + stage.slicePercent, 0)
console.assert(totalSlicePercent === 100)
```

---

# BSSS Allocation Rules

BSSS means **Big Slice / Small Slice**.

## Big Slice

A Big Slice is a fixed ownership allocation assigned to a venture milestone.

Rules:

1. Each Big Slice has a fixed percentage.
2. Big Slice percentages cannot change after creation.
3. A Big Slice opens when a stage begins.
4. A Big Slice closes when a stage is completed.
5. Once closed, the ownership earned inside it is locked.
6. Future stages remain unallocated until work happens.

## Small Slice

A Small Slice is a contributor's earned share inside a Big Slice.

Formula:

```text
Small Slice % = (Contributor Points / Total Points In Slice) × Big Slice %
```

JavaScript:

```js
function calculateSmallSlice(contributorPoints, totalSlicePoints, bigSlicePercent) {
  if (totalSlicePoints === 0) return 0
  return (contributorPoints / totalSlicePoints) * bigSlicePercent
}
```

## Cumulative Ownership

A participant's total venture ownership is the sum of all Small Slices earned across completed and active slices.

```js
function calculateCumulativeOwnership(participantId, venture) {
  return venture.slices.reduce((total, slice) => {
    const participantPoints = slice.points[participantId] || 0
    const totalPoints = Object.values(slice.points).reduce((a, b) => a + b, 0)
    return total + calculateSmallSlice(participantPoints, totalPoints, slice.slicePercent)
  }, 0)
}
```

---

# Funding Model

## Investor Contributions

Investors contribute cash to VSC1.

```js
const contribution = {
  investorId: "mj",
  amount: 50000,
  month: 0
}
```

Investor share of the cohort:

```text
Investor Cohort Share = Investor Contribution / Total Cohort Contributions
```

Example:

```text
MJ contributes $50,000
VSC1 total raise is $300,000
MJ cohort share = 50,000 / 300,000 = 16.67%
```

## Investor Ownership in Spinouts

The cohort investor pool receives a defined allocation in each spinout venture.

Default:

```js
const investorPoolPercent = 35
```

Individual investor effective ownership in a spinout:

```text
Investor Venture Ownership = Investor Cohort Share × Investor Pool Percent
```

Example:

```text
MJ cohort share = 16.67%
Investor pool = 35%
MJ ownership in spinout = 16.67% × 35% = 5.83%
```

JavaScript:

```js
function calculateInvestorVentureOwnership(investorContribution, totalRaise, investorPoolPercent) {
  return (investorContribution / totalRaise) * investorPoolPercent
}
```

---

# Studio Operating Model

The cohort funds MoP studio operations.

Default:

```text
$300,000 / 12 months = $25,000/month
```

Monthly operating budget covers:

- Steward compensation
- AI tools
- Software tools
- Infrastructure
- Marketing experiments
- Contractors
- Contributor coordination
- Legal/accounting reserve

Money flow:

```text
VSC1 Remaining Capital -= Monthly Operating Budget
MoP Operating Revenue += Monthly Operating Budget
```

JavaScript:

```js
function payMonthlyStudioBudget(state) {
  const amount = state.vsc1.monthlyOperatingBudget
  state.vsc1.remainingCapital -= amount
  state.mop.monthlyRevenueFromCohort += amount
}
```

---

# Monthly Advance Logic

The app should have a button:

```text
Advance One Month
```

When clicked:

1. Increment current month.
2. Deduct monthly operating budget from VSC1 capital.
3. Add that amount to MoP operating revenue.
4. Add or advance one venture.
5. Continue automated marketing for existing ventures.
6. Allocate points to active BSSS slices.
7. Update customers and MRR.
8. Check spinout eligibility.

Pseudo-code:

```js
function advanceOneMonth(state) {
  state.currentMonth += 1

  payMonthlyStudioBudget(state)

  maybeAddNewIdea(state)

  const targetVenture = selectVentureToAdvance(state.ventures)
  applyMonthlyProgress(targetVenture, state.currentMonth)

  allocateMonthlyPoints(targetVenture, {
    steward: 1000,
    contributors: 500,
    investorCapital: 500
  })

  state.ventures.forEach(updateVentureRevenue)
  state.ventures.forEach(v => v.spinoutEligible = checkSpinoutEligibility(v))

  return state
}
```

---

# Venture Advancement Logic

The simulator should show a funnel, not three static bets.

Example operating rhythm:

```text
Month 1: Idea A → Vision
Month 2: Idea A → Prototype, Idea B → Vision
Month 3: Idea A → MVP, Idea B → Prototype, Idea C → Vision
Month 4: Idea A → Users, Idea B → MVP, Idea C → Prototype
Month 5+: Keep advancing winners, kill weak ideas, add new ideas
```

Rules:

- One new idea can enter per month.
- Ventures can advance, stall, or be killed.
- Capital and attention should concentrate around traction.
- Most ideas are expected to fail.

---

# Revenue Model

Each venture has customers, pricing, and MRR.

```js
const TARGET_VENTURE_SHAPE = {
  targetCustomers: 10000,
  targetPricePerMonth: 15,
  targetMRR: 150000,
  targetARR: 1800000
}
```

Formula:

```text
MRR = Customers × Price Per Customer
```

JavaScript:

```js
function calculateMRR(customers, pricePerCustomer) {
  return customers * pricePerCustomer
}
```

The $5,000 MRR spinout threshold is not the final target. It is the point where a venture becomes eligible to become a formal operating company.

---

# Spinout Criteria

A venture is eligible for spinout when:

- MRR >= $5,000
- Positive cash flow
- Product stable
- Repeatable customer acquisition
- Operational management <= 10 hours/week

JavaScript:

```js
function checkSpinoutEligibility(venture) {
  return (
    venture.mrr >= 5000 &&
    venture.cashFlowPositive === true &&
    venture.opsHoursPerWeek <= 10 &&
    venture.hasRepeatableAcquisition === true &&
    venture.productStable === true
  )
}
```

---

# Spinout Button Logic

Each venture card should show a button when eligible:

```text
Spinout Venture
```

When clicked:

1. Confirm eligibility.
2. Freeze current BSSS ownership.
3. Create a new LLC object.
4. Convert BSSS allocations into formal ownership percentages.
5. Move venture from Pipeline to Spinouts.
6. Start LLC-level revenue/profit tracking.
7. Add MoP stewardship contract.

Pseudo-code:

```js
function spinoutVenture(venture, state) {
  if (!checkSpinoutEligibility(venture)) {
    throw new Error("Venture is not eligible for spinout")
  }

  const ownership = calculateFinalOwnership(venture)

  const llc = {
    id: generateId(),
    name: `${venture.name} LLC`,
    sourceVentureId: venture.id,
    monthCreated: state.currentMonth,
    ownership,
    mrr: venture.mrr,
    operatingExpenses: venture.operatingExpenses || 0,
    mopStewardshipFeePercent: 10,
    status: "active"
  }

  venture.status = "spun_out"
  state.spinouts.push(llc)

  return state
}
```

---

# Post-Spinout LLC Model

Once spun out, the venture becomes an LLC.

The LLC pays MoP a stewardship fee.

Default:

```js
const mopStewardshipFeePercent = 10
```

Formula:

```text
MoP Stewardship Fee = LLC Revenue × Stewardship Fee %
Profit = Revenue - Operating Expenses - MoP Stewardship Fee
Investor Distribution = Profit × Investor Ownership %
```

JavaScript:

```js
function calculateLLCProfit(revenue, operatingExpenses, stewardshipFeePercent) {
  const stewardshipFee = revenue * stewardshipFeePercent
  return revenue - operatingExpenses - stewardshipFee
}

function calculateDistribution(profit, ownershipPercent) {
  return profit * ownershipPercent
}
```

---

# Pie Chart Requirements

Each venture should display a BSSS pie chart.

The pie chart should show:

- Locked ownership
- Active stage ownership
- Unallocated future ownership
- Investor portion
- MoP/steward portion
- Contributor portion

Example:

```text
Locked: 28%
Active: 12%
Unallocated: 60%
```

The pie should visibly fill as stages advance.

Suggested colors:

- Investors: blue
- MoP/steward: purple
- Contributors: green
- Unallocated: gray
- Active slice: gold

---

# Data Model

## AppState

```js
const AppState = {
  currentMonth: 0,
  vsc1: {},
  mop: {},
  investors: [],
  contributors: [],
  ventures: [],
  spinouts: []
}
```

## VSC1

```js
const VSC1 = {
  name: "VSC1",
  raiseTarget: 300000,
  fundedAmount: 0,
  remainingCapital: 0,
  durationMonths: 12,
  monthlyOperatingBudget: 25000,
  investorPoolPercent: 35,
  status: "fundraising" // fundraising | active | complete
}
```

## Investor

```js
const Investor = {
  id: "mj",
  name: "MJ",
  contributionAmount: 50000,
  cohortShare: 0
}
```

## Contributor

```js
const Contributor = {
  id: "kevin",
  name: "Kevin",
  role: "engineer", // steward | engineer | designer | marketer | advisor | domain_expert
  pointsEarned: 0
}
```

## Venture

```js
const Venture = {
  id: "trueup",
  name: "TrueUp",
  stage: "RL1",
  status: "idea", // idea | active | stalled | killed | spun_out
  mrr: 0,
  customers: 0,
  pricePerCustomer: 15,
  opsHoursPerWeek: 0,
  cashFlowPositive: false,
  hasRepeatableAcquisition: false,
  productStable: false,
  operatingExpenses: 0,
  slices: [],
  spinoutEligible: false
}
```

## Slice

```js
const Slice = {
  id: "RL5",
  releaseLevel: "RL5",
  name: "Release",
  slicePercent: 16,
  status: "planned", // planned | active | completed
  locked: false,
  points: {
    matt: 1000,
    kevin: 500,
    investor_pool: 500
  }
}
```

## LLC

```js
const LLC = {
  id: "trueup_llc",
  name: "TrueUp LLC",
  sourceVentureId: "trueup",
  monthCreated: 8,
  ownership: [],
  mrr: 5200,
  operatingExpenses: 1000,
  mopStewardshipFeePercent: 10,
  profit: 0,
  distributions: []
}
```

---

# Required Buttons

## Fill VSC1

Sets funded amount to raise target.

```js
function fillVSC1(state) {
  state.vsc1.fundedAmount = state.vsc1.raiseTarget
  state.vsc1.remainingCapital = state.vsc1.raiseTarget
  state.vsc1.status = "active"
  return state
}
```

## Add Venture

Creates a new venture at RL1 Idea.

```js
function addVenture(name) {
  return {
    id: generateId(),
    name,
    stage: "RL1",
    status: "idea",
    mrr: 0,
    customers: 0,
    pricePerCustomer: 15,
    opsHoursPerWeek: 0,
    cashFlowPositive: false,
    hasRepeatableAcquisition: false,
    productStable: false,
    operatingExpenses: 0,
    slices: createDefaultSlices(),
    spinoutEligible: false
  }
}
```

## Advance One Month

Runs monthly operating logic.

```js
advanceOneMonth(state)
```

## Spinout Venture

Converts an eligible venture into an LLC.

```js
spinoutVenture(venture, state)
```

## Reset Simulation

Returns state to initial defaults.

---

# Initial Sample Data

```js
const initialState = {
  currentMonth: 0,
  vsc1: {
    name: "VSC1",
    raiseTarget: 300000,
    fundedAmount: 0,
    remainingCapital: 0,
    durationMonths: 12,
    monthlyOperatingBudget: 25000,
    investorPoolPercent: 35,
    status: "fundraising"
  },
  mop: {
    name: "Ministry of Product",
    monthlyRevenueFromCohort: 0
  },
  investors: [
    { id: "mj", name: "MJ", contributionAmount: 50000, cohortShare: 0 },
    { id: "investor2", name: "Investor 2", contributionAmount: 100000, cohortShare: 0 },
    { id: "investor3", name: "Investor 3", contributionAmount: 150000, cohortShare: 0 }
  ],
  contributors: [
    { id: "matt", name: "Matt Paulin", role: "steward", pointsEarned: 0 },
    { id: "kevin", name: "Kevin", role: "engineer", pointsEarned: 0 },
    { id: "adam", name: "Adam", role: "product_developer", pointsEarned: 0 }
  ],
  ventures: [
    addVenture("TrueUp"),
    addVenture("Real Estate Idea"),
    addVenture("Venture C")
  ],
  spinouts: []
}
```

---

# User Stories

## Investor

As an investor I want to contribute capital to VSC1 so that I can participate in the cohort because I want exposure to multiple ventures instead of betting on one idea.

As an investor I want to see how much of VSC1 has been funded so that I can understand whether the studio has enough capital to operate because focus requires full funding.

As an investor I want to see my cohort ownership percentage so that I can understand my share of future spinouts because my contribution should map transparently to ownership.

As an investor I want to watch money flow from VSC1 to MoP each month so that I can understand how my capital is being used because the investment funds studio focus and execution.

As an investor I want to see the venture pipeline advance month by month so that I can understand how ideas become products because the portfolio depends on throughput.

As an investor I want to see each venture's MRR so that I can track whether it is approaching spinout because revenue is the primary validation signal.

As an investor I want to see each venture's BSSS pie chart so that I can understand how ownership is forming because I need transparency before legal spinout.

As an investor I want to see when a venture becomes spinout eligible so that I can understand when my ownership will become formal because BSSS is pre-equity until spinout.

As an investor I want to see post-spinout revenue and distributions so that I can understand potential cash flow because this is designed to create software assets.

As an investor I want to submit ideas into the pipeline so that I can contribute market opportunities because investors may have domain insights worth testing.

## Contributor

As a contributor I want to join a venture so that I can earn ownership through work because I may not be investing cash.

As a contributor I want to see the current stage of a venture so that I can understand what kind of work is valuable because each stage requires different contributions.

As a contributor I want to receive points for my work so that I can earn a Small Slice because ownership should reflect contribution.

As a contributor I want to see my points inside each Big Slice so that I can understand my share of that milestone because each milestone has its own allocation.

As a contributor I want completed slices to lock so that my earned ownership cannot be diluted later because trust requires stable rules.

As a contributor I want to see cumulative ownership so that I can understand my total stake because my work may span multiple stages.

As a contributor I want to know when a venture spins out so that I can see my pre-equity ownership convert into formal ownership because the LLC is the legal container.

As a contributor I want to see unallocated future ownership so that I understand future opportunity because later work can still earn future slices.

As a contributor I want to contribute to multiple ventures so that I can build a portfolio of small ownership stakes because the studio model supports flexible participation.

As a contributor I want to see why a venture was killed or stalled so that I can understand portfolio decisions because not every idea should continue.

## Steward

As the steward I want to fill VSC1 before activating the cohort so that the studio has enough capital to focus because underfunding forces consulting work.

As the steward I want to advance the simulation one month at a time so that I can explain the operating rhythm because the model depends on monthly progress.

As the steward I want to allocate monthly budget from VSC1 to MoP so that operating costs are covered first because the studio must remain functional.

As the steward I want to create new ventures in the pipeline so that ideas can be tested continuously because spinouts come from a funnel, not from one bet.

As the steward I want to advance ventures through BSSS stages so that the app shows how product maturity and ownership develop together because progress earns ownership.

As the steward I want to allocate points to investors, contributors, and MoP so that ownership can be calculated transparently because hidden expectations create conflict.

As the steward I want to mark a venture as killed so that capital and attention can be redirected because focus is the main advantage of the cohort.

As the steward I want to spin out eligible ventures so that ownership becomes formal because BSSS is only a bridge to legal equity.

As the steward I want to show MoP stewardship fees after spinout so that users understand how MoP continues supporting ventures because post-spinout operations still require oversight.

As the steward I want to show long-term target venture shape so that investors understand what kind of ideas belong in the pipeline because not every idea is suitable for the studio.

---

# App Explanation Copy

## VSC1

VSC1 is the first venture studio cohort. Investors fund the cohort, not Ministry of Product itself. The cohort funds one year of focused venture creation.

## MoP

Ministry of Product is the steward and operating system. It receives monthly operating funds from the cohort and uses those funds to validate, build, launch, and grow ventures.

## Ventures

Ventures move through stages from Idea to Stable. Each stage has a fixed BSSS ownership slice. Contributors and investors earn portions of those slices through points and capital.

## Spinouts

When a venture reaches $5,000 MRR, positive cash flow, repeatable acquisition, product stability, and less than 10 hours/week of management, it can spin out into an LLC. At spinout, BSSS ownership becomes formal ownership.

## Target Shape

The studio looks for ventures that could plausibly reach 10,000 customers paying about $15/month. This is not a guarantee. It is the target shape used to decide which ideas deserve attention.

---

# Implementation Notes

- Keep V1 simple.
- Use hardcoded sample data.
- Avoid authentication.
- Avoid backend persistence.
- Store state in localStorage.
- Use SVG or Canvas for pie charts.
- Use simple buttons for simulation control.
- Make the flow understandable before making it accurate.
- Label all ownership as simulated, estimated, or illustrative.
- Later versions can connect to the real Idea System ledger.

---

# Success Criteria

The simulator succeeds if a viewer can understand:

1. What investors fund.
2. Why the cohort needs to be fully funded.
3. How MoP gets paid first to operate.
4. How ventures move through the pipeline.
5. How BSSS ownership fills over time.
6. Why most ideas may fail.
7. How a venture becomes spinout eligible.
8. What ownership becomes after spinout.
9. Why the model creates a portfolio instead of a single startup.
10. Why focus is the scarce resource the investment purchases.

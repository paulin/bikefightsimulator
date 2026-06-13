"use strict";

// The rest of the spec's roadmap. These register as "soon" so the full map of
// concepts is visible in the nav; each becomes a real screen as it's built.
[
  // Phase 4 — deep learning
  { id: "neural-network", name: "Neural Network", phase: "Phase 4 — Deep Learning", intuition: "Stacked simple transformations compose into arbitrarily complex functions." },
  { id: "cnn", name: "CNN", phase: "Phase 4 — Deep Learning", intuition: "Patterns become features, features become objects." },
  { id: "rnn-lstm", name: "RNN / LSTM", phase: "Phase 4 — Deep Learning", intuition: "Past information is carried forward through a hidden state." },
  { id: "transformers", name: "Transformers", phase: "Phase 4 — Deep Learning", intuition: "The model learns what each token should pay attention to." },

  // Phase 4 — sequential decisions & time
  { id: "reinforcement-learning", name: "Reinforcement Learning", phase: "Phase 5 — Sequential", intuition: "Behavior emerges from maximizing long-run reward." },
  { id: "q-learning", name: "Q-Learning", phase: "Phase 5 — Sequential", intuition: "Every action has a long-term value; learn it from experience." },
  { id: "time-series", name: "Time Series Forecasting", phase: "Phase 5 — Sequential", intuition: "Trend, seasonality, and noise in the past shape the future." },
].forEach((d) => DSP.register({ ...d, status: "soon", blurb: d.intuition }));

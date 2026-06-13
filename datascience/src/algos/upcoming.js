"use strict";

// The rest of the spec's roadmap. These register as "soon" so the full map of
// concepts is visible in the nav; each becomes a real screen as it's built.
[
  // Phase 4 — deep learning
  { id: "cnn", name: "CNN", phase: "Phase 4 — Deep Learning", intuition: "Patterns become features, features become objects." },
  { id: "rnn-lstm", name: "RNN / LSTM", phase: "Phase 4 — Deep Learning", intuition: "Past information is carried forward through a hidden state." },
  { id: "transformers", name: "Transformers", phase: "Phase 4 — Deep Learning", intuition: "The model learns what each token should pay attention to." },
].forEach((d) => DSP.register({ ...d, status: "soon", blurb: d.intuition }));

"use strict";

// The rest of the spec's roadmap. These register as "soon" so the full map of
// concepts is visible in the nav; each becomes a real screen as it's built.
[
  // Phase 2 — classic supervised learning
  { id: "logistic-regression", name: "Logistic Regression", phase: "Phase 2 — Supervised", intuition: "Predicts a probability, not a hard label; the decision boundary is where that probability crosses your threshold." },
  { id: "random-forest", name: "Random Forest", phase: "Phase 2 — Supervised", intuition: "Many shallow, decorrelated trees vote; the crowd is steadier than any single tree." },
  { id: "gradient-boosting", name: "Gradient Boosting", phase: "Phase 2 — Supervised", intuition: "Each new tree fits the errors the previous trees left behind." },
  { id: "xgboost", name: "XGBoost", phase: "Phase 2 — Supervised", intuition: "Boosted trees with regularization that trades raw fit against overfitting." },
  { id: "svm", name: "Support Vector Machine", phase: "Phase 2 — Supervised", intuition: "A few support vectors define the widest possible margin between classes." },

  // Phase 1 — remaining unsupervised / probabilistic
  { id: "naive-bayes", name: "Naive Bayes", phase: "Phase 2 — Supervised", intuition: "Evidence from each feature multiplies into a posterior; assumes features are independent." },
  { id: "dbscan", name: "DBSCAN", phase: "Phase 3 — Unsupervised", intuition: "Clusters are dense regions; sparse points are just noise." },
  { id: "hierarchical", name: "Hierarchical Clustering", phase: "Phase 3 — Unsupervised", intuition: "Clusters exist at every scale; cut the dendrogram wherever you like." },

  // Phase 3 — deep learning
  { id: "neural-network", name: "Neural Network", phase: "Phase 4 — Deep Learning", intuition: "Stacked simple transformations compose into arbitrarily complex functions." },
  { id: "cnn", name: "CNN", phase: "Phase 4 — Deep Learning", intuition: "Patterns become features, features become objects." },
  { id: "rnn-lstm", name: "RNN / LSTM", phase: "Phase 4 — Deep Learning", intuition: "Past information is carried forward through a hidden state." },
  { id: "transformers", name: "Transformers", phase: "Phase 4 — Deep Learning", intuition: "The model learns what each token should pay attention to." },

  // Phase 4 — sequential decisions & time
  { id: "reinforcement-learning", name: "Reinforcement Learning", phase: "Phase 5 — Sequential", intuition: "Behavior emerges from maximizing long-run reward." },
  { id: "q-learning", name: "Q-Learning", phase: "Phase 5 — Sequential", intuition: "Every action has a long-term value; learn it from experience." },
  { id: "time-series", name: "Time Series Forecasting", phase: "Phase 5 — Sequential", intuition: "Trend, seasonality, and noise in the past shape the future." },
].forEach((d) => DSP.register({ ...d, status: "soon", blurb: d.intuition }));

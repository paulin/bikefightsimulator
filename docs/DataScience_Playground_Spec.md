# Data Science Playground Specification

## Vision

A visual, interactive playground for quickly rebuilding intuition about machine learning algorithms.

Target user:

- Already understands the basics of data science.
- Wants to refresh concepts rapidly.
- Learns best by manipulating variables and observing outcomes.
- Prefers experimentation over lectures.

Primary goal:

> "I can play with an algorithm for 60 seconds and remember how it works."

---

# Core Principles

1. Every concept gets a single interactive screen.
2. Users should manipulate data directly.
3. Users should manipulate hyperparameters directly.
4. Internal algorithm behavior must be visible.
5. Visual feedback should update immediately.
6. Free play is more important than explanation.
7. Explanations should support interaction, not replace it.

---

# Universal Screen Layout

+------------------------------------------------------+
| Algorithm Name                                       |
| One-sentence description                             |
+------------------------------------------------------+

+----------------------+-------------------------------+
| Data Controls        | Main Visualization            |
|                      |                               |
| Dataset Presets      | Interactive Canvas            |
| Add Point            |                               |
| Remove Point         |                               |
| Add Noise            |                               |
| Add Outlier          |                               |
+----------------------+-------------------------------+

+----------------------+-------------------------------+
| Hyperparameters      | Metrics                       |
|                      |                               |
| Sliders              | Accuracy                      |
| Toggles              | Error                         |
| Dropdowns            | Training Progress             |
+----------------------+-------------------------------+

+------------------------------------------------------+
| Internal Algorithm Visualization                     |
+------------------------------------------------------+

+------------------------------------------------------+
| Explanation / Notes                                  |
+------------------------------------------------------+

---

# Global Design Language

## Colors

Blue
- Training data

Orange
- User-selected objects

Green
- Predictions

Red
- Errors and misclassifications

Purple
- Learning updates

Gray
- Background/reference objects

## Common Controls

Every algorithm should support:

- Reset
- Randomize Dataset
- Play
- Pause
- Step Forward
- Step Backward
- Free Play Mode

---

# Universal Panels

## Data Controls

Purpose:

Allow the user to manipulate training data.

Standard Actions:

- Add Point
- Remove Point
- Drag Point
- Add Noise
- Add Outlier
- Generate Random Dataset

## Hyperparameter Controls

Purpose:

Allow users to understand parameter sensitivity.

Examples:

- K
- Learning Rate
- Tree Depth
- Number of Trees
- Margin Width
- Cluster Count

## Internal Visualization

Purpose:

Show the algorithm thinking.

Examples:

- Residuals
- Decision Boundaries
- Tree Splits
- Attention Maps
- Q Tables
- Cluster Assignments

## Metrics

Examples:

- Accuracy
- RMSE
- MAE
- R²
- Precision
- Recall
- F1
- Training Loss

---

# Algorithm Specifications

## Linear Regression

Purpose:

Predict continuous values.

Visualization:

Scatterplot with regression line.

Interactions:

- Drag points
- Add outliers
- Remove points
- Move line manually
- Run gradient descent animation

Internal View:

- Residual lines
- Error surface
- Gradient descent path

Key Intuition:

Regression attempts to minimize error.

---

## Logistic Regression

Purpose:

Binary classification.

Visualization:

Decision boundary with probability shading.

Interactions:

- Move data points
- Change threshold
- Add ambiguous examples
- Toggle probability heatmap

Internal View:

- Sigmoid curve
- Classification probability

Key Intuition:

Predicts probability, not certainty.

---

## Decision Tree

Purpose:

Rule-based predictions.

Visualization:

Interactive tree connected to dataset.

Interactions:

- Modify split values
- Expand branches
- Prune branches
- Trace prediction path

Internal View:

- Entropy
- Information gain

Key Intuition:

A tree is a sequence of decisions.

---

## Random Forest

Purpose:

Reduce variance through voting.

Visualization:

Hundreds of miniature trees.

Interactions:

- Change tree count
- Change max depth
- Select a sample
- View votes

Internal View:

- Individual tree predictions
- Voting process

Key Intuition:

Many weak opinions produce strong predictions.

---

## Gradient Boosting

Purpose:

Correct previous mistakes.

Visualization:

Sequential residual correction.

Interactions:

- Step through rounds
- Adjust learning rate
- Replay training

Internal View:

- Residual plots
- Incremental model contributions

Key Intuition:

Each model fixes prior errors.

---

## XGBoost

Purpose:

Production-grade boosted trees.

Visualization:

Boosting view with complexity controls.

Interactions:

- Tree depth
- Learning rate
- Regularization

Internal View:

- Train error
- Validation error

Key Intuition:

Balances performance and overfitting.

---

## K-Nearest Neighbors

Purpose:

Predict using nearby examples.

Visualization:

2D point map.

Interactions:

- Drag query point
- Adjust K
- Toggle distance weighting

Internal View:

- Neighbor highlights
- Voting display

Key Intuition:

Nearby examples matter most.

---

## Naive Bayes

Purpose:

Probability-based classification.

Visualization:

Interactive probability dashboard.

Interactions:

- Toggle features
- Adjust probabilities

Internal View:

- Feature contributions
- Posterior probabilities

Key Intuition:

Evidence accumulates toward a prediction.

---

## Support Vector Machine

Purpose:

Maximum-margin classification.

Visualization:

Decision boundary with margins.

Interactions:

- Move support vectors
- Change C value
- Change kernel

Internal View:

- Margin visualization
- Support vectors

Key Intuition:

A few points define the boundary.

---

## K-Means

Purpose:

Unsupervised clustering.

Visualization:

Animated centroid movement.

Interactions:

- Drag centroids
- Change K
- Step assignments
- Step updates

Internal View:

- Cluster assignments
- Centroid calculations

Key Intuition:

Clusters emerge through repeated reassignment.

---

## DBSCAN

Purpose:

Density-based clustering.

Visualization:

Point cloud with density radius.

Interactions:

- Change epsilon
- Change minimum points

Internal View:

- Core points
- Border points
- Noise points

Key Intuition:

Clusters are dense regions.

---

## Hierarchical Clustering

Purpose:

Build nested clusters.

Visualization:

Dendrogram linked to points.

Interactions:

- Move cut line
- Explore merges

Internal View:

- Merge distances

Key Intuition:

Clusters exist at multiple scales.

---

## PCA

Purpose:

Dimensionality reduction.

Visualization:

Rotatable 3D point cloud.

Interactions:

- Rotate cloud
- Find principal axis
- Change dimensionality

Internal View:

- Variance explained
- Projection vectors

Key Intuition:

Most information lies in a few directions.

---

## Neural Network

Purpose:

Learn nonlinear relationships.

Visualization:

Interactive network graph.

Interactions:

- Adjust weights
- Change activations
- Run forward propagation

Internal View:

- Activations
- Weight updates

Key Intuition:

Simple transformations combine into complex behavior.

---

## CNN

Purpose:

Image understanding.

Visualization:

Image + feature maps.

Interactions:

- Modify kernels
- Select filters
- Add layers

Internal View:

- Convolution outputs
- Feature maps

Key Intuition:

Patterns become features, features become objects.

---

## RNN / LSTM

Purpose:

Sequence modeling.

Visualization:

Timeline with memory state.

Interactions:

- Step through sequence
- Inspect memory

Internal View:

- Hidden state
- Gates

Key Intuition:

Past information influences future predictions.

---

## Transformers

Purpose:

Attention-based sequence modeling.

Visualization:

Interactive attention matrix.

Interactions:

- Click tokens
- Modify sentences
- Compare attention heads

Internal View:

- Attention weights

Key Intuition:

The model learns what deserves attention.

---

## Reinforcement Learning

Purpose:

Learn through rewards.

Visualization:

Grid world.

Interactions:

- Place rewards
- Place penalties
- Train agent

Internal View:

- Policy map

Key Intuition:

Behavior emerges from reward maximization.

---

## Q-Learning

Purpose:

Learn state-action values.

Visualization:

Grid with action values.

Interactions:

- Step updates
- Modify rewards
- Adjust discount factor

Internal View:

- Q-table

Key Intuition:

Actions have long-term value.

---

## Time Series Forecasting

Purpose:

Predict future values.

Visualization:

Historical line chart and forecast.

Interactions:

- Add trend
- Add seasonality
- Add shocks
- Change horizon

Internal View:

- Residuals
- Confidence intervals

Key Intuition:

Patterns in the past influence the future.

---

# Build Priorities

Phase 1

- Linear Regression
- KNN
- Decision Trees
- K-Means
- PCA

Phase 2

- Random Forest
- Logistic Regression
- Gradient Boosting
- XGBoost
- SVM

Phase 3

- Neural Networks
- CNNs
- RNNs
- Transformers

Phase 4

- Reinforcement Learning
- Q-Learning
- Time Series Forecasting

Success Metric:

A user can revisit any concept after months away, spend less than 2 minutes interacting with the playground, and regain working intuition for how the algorithm behaves.

# Episode 14: AI QA and Evaluation Systems
## "From Deterministic Test Cases to Probabilistic Confidence Engineering"

**Duration:** ~55 minutes
**Hosts:** Alex (Interviewer) & Kevin (Expert)

---

### INTRO (3 minutes)

**ALEX:** QA in AI products feels fundamentally different. Traditional pass-fail testing does not cover probabilistic behavior.

**KEVIN:** Correct. AI-native QA is evaluation engineering. You are validating distributions, confidence behavior, and policy adherence under realistic context variability.

---

### SEGMENT 1: The New Testing Pyramid (8 minutes)

**ALEX:** How should teams redesign the testing pyramid?

**KEVIN:** Keep deterministic unit and integration tests for classical software layers. Add eval suites for prompt-policy behavior, retrieval quality, and workflow-level outcome accuracy.

---

### SEGMENT 2: Eval Dataset Design (9 minutes)

**ALEX:** What makes an eval dataset useful?

**KEVIN:** Coverage across common, edge, and adversarial scenarios. Label quality, versioning discipline, and ongoing refresh from production incidents. Evals must represent reality, not idealized demos.

---

### SEGMENT 3: Online and Offline Evaluation (8 minutes)

**ALEX:** How do online and offline evals work together?

**KEVIN:** Offline evals gate changes before deploy. Online evals monitor drift, trust, and real outcome quality after deploy. The loop between both is where quality compounds.

---

### SEGMENT 4: Confidence and Calibration (8 minutes)

**ALEX:** Teams often misuse confidence scores. What is the right approach?

**KEVIN:** Calibrate confidence to observed correctness by workflow. A 0.9 confidence should mean roughly 90 percent reliable outcomes in that domain. Otherwise thresholds become fake safety theater.

---

### SEGMENT 5: Release Gates and Rollbacks (9 minutes)

**ALEX:** What should release gates include?

**KEVIN:** Minimum eval score by risk class, policy-violation ceiling, latency budget, and cost budget. Add staged rollout with blast-radius controls and pre-defined rollback triggers.

---

### SEGMENT 6: Organizational Ownership (8 minutes)

**ALEX:** Who owns evals?

**KEVIN:** Shared ownership. Engineering owns infrastructure and automation. Product owns outcome quality definitions. Risk or compliance owns control checks where required. AI Product Ops runs cadence.

---

### SEGMENT 7: 120-Day Eval System Implementation (10 minutes)

**ALEX:** What is a practical implementation path?

**KEVIN:** Month 1: define quality taxonomy and baseline datasets. Month 2: automate offline eval pipeline. Month 3: connect online monitoring and incident capture. Month 4: formalize release governance and scorecards.

**ALEX:** One-line takeaway?

**KEVIN:** In AI-native products, quality is not inspected in at the end. It is continuously engineered.

---

*End of Episode 14*

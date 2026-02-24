# Episode 3: The Issue-to-PR Agentic Workflow
## "Designing End-to-End Autonomous Development Loops"

**Duration:** ~55 minutes
**Hosts:** Alex (Practitioner) & Riley (Research Lead)

---

### INTRO (3 minutes)

**ALEX:** Today we tackle the workflow every engineering org cares about: issue to merged PR.

**RILEY:** This is where agentic coding either delivers real throughput or creates expensive noise.

---

### SEGMENT 1: Workflow Architecture (8 minutes)

**ALEX:** What is the canonical pipeline?

**RILEY:** Intake issue, classify risk, plan solution, execute changes, run tests, produce PR with rationale, and request review. Each stage has a completion contract.

---

### SEGMENT 2: Task Decomposition and Planning (9 minutes)

**ALEX:** Why does decomposition matter so much?

**RILEY:** Agents fail on ambiguous large tasks. Break work into verifiable steps with clear artifacts. Good plans reduce hallucinated implementation paths.

---

### SEGMENT 3: Execution with Checkpoints (8 minutes)

**ALEX:** How many checkpoints are ideal?

**RILEY:** Enough to catch drift early. Typical checkpoints: after plan approval, after first code delta, after test run, and before PR creation.

---

### SEGMENT 4: Testing and Verification Strategy (9 minutes)

**ALEX:** What verification stack should teams use?

**RILEY:** Static checks, targeted unit tests, integration subset, and policy linting for risky modules. Add semantic diff review to detect suspicious broad edits.

---

### SEGMENT 5: PR Quality and Review UX (8 minutes)

**ALEX:** What makes an agent-generated PR reviewable?

**RILEY:** Crisp summary, linked issue, explicit assumptions, test evidence, and rollback notes. Reviewers need reasoning trace, not just code output.

---

### SEGMENT 6: Throughput Metrics vs Quality Metrics (9 minutes)

**ALEX:** Teams often optimize wrong metrics. What should they track?

**RILEY:** Lead time, review burden, post-merge defect rate, rollback frequency, and human correction density. Faster is good only if correction cost does not spike.

---

### SEGMENT 7: 60-Day Implementation Plan (9 minutes)

**ALEX:** Practical rollout?

**RILEY:** Phase one: one repository, low-risk issue class. Phase two: add richer test gates and PR templates. Phase three: scale to multiple teams with shared policy profiles.

**ALEX:** Final takeaway?

**RILEY:** The best issue-to-PR agents are workflow systems, not single prompts.

---

*End of Episode 3*

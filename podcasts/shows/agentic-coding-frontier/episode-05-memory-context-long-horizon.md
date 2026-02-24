# Episode 5: Memory, Context, and Long-Horizon Execution
## "Making Agents Stateful, Consistent, and Useful Over Time"

**Duration:** ~55 minutes
**Hosts:** Alex (Practitioner) & Riley (Research Lead)

---

### INTRO (3 minutes)

**ALEX:** Stateless chat is fine for quick tasks. But real coding work spans days and repos.

**RILEY:** Exactly. Long-horizon agent performance depends on robust memory architecture and context hygiene.

---

### SEGMENT 1: Context Windows vs Operational Memory (8 minutes)

**ALEX:** Why is context window size not enough?

**RILEY:** Because raw token context is expensive and noisy. Operational memory needs structure: decisions, constraints, task state, and outcomes.

---

### SEGMENT 2: Memory Layers for Coding Agents (9 minutes)

**ALEX:** What layers should teams implement?

**RILEY:** Session memory, task memory, project memory, and organizational memory. Each layer has different retention, trust, and access rules.

---

### SEGMENT 3: Retrieval Strategies That Hold Up (8 minutes)

**ALEX:** What retrieval patterns work best?

**RILEY:** Hybrid retrieval with semantic and symbolic indices. Prioritize recency, relevance, and authority. Tag memory with confidence and provenance.

---

### SEGMENT 4: Preventing Memory Drift and Staleness (9 minutes)

**ALEX:** How do teams avoid stale memory bugs?

**RILEY:** Memory TTL policies, invalidation hooks on major code changes, and periodic truth checks against source of record. Drift is a silent reliability killer.

---

### SEGMENT 5: Long-Horizon Planning Patterns (8 minutes)

**ALEX:** How should agents plan multi-day tasks?

**RILEY:** Use milestone plans with resumable checkpoints, explicit blockers, and completion evidence per stage. This reduces reset thrash across sessions.

---

### SEGMENT 6: Privacy and Governance in Memory Systems (8 minutes)

**ALEX:** What governance controls are mandatory?

**RILEY:** Scope memory by role, redact sensitive data, and maintain auditability for memory writes and reads. Memory should help execution, not create compliance debt.

---

### SEGMENT 7: 75-Day Memory Upgrade Plan (10 minutes)

**ALEX:** Practical implementation path?

**RILEY:** Days 1 to 20: define memory schema and trust tags. Days 21 to 45: deploy retrieval and invalidation policies. Days 46 to 75: add long-horizon planning templates and staleness monitoring.

**ALEX:** Final takeaway?

**RILEY:** Long-horizon capability is mostly a memory design problem, not a bigger-model problem.

---

*End of Episode 5*

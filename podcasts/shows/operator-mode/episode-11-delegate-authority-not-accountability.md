# Episode 11: Delegate Authority, Not Accountability
## "Agent Identity, Permissions, Loss Limits, and the Boundary of Autonomy"

**Duration:** ~36 minutes
**Hosts:** Asha Raman & Cole Mercer
**Podcast:** Operator Mode -- From Company to Portfolio. Every Decision Compounds.

---

### CONSEQUENCE: THE WORKFLOW EARNS AUTHORITY

[INTRO MUSIC]

**ASHA:** A quick note: the operating case, its fund, companies, executives, transactions, and figures are fictional. Named external research is real and identified when used.

**COLE:** Vela’s supplier-exception workflow survived the counterfactual review. Eligible cases resolved faster. Expedite and rework charges fell. The quality guardrails held. Kevin approved the next stage: execute low-risk, reversible actions inside the written supplier policy.

**ASHA:** On the ninth day, the agent receives sixty-one order exceptions over eleven minutes. Every supplier is approved. Every individual order is below the fifty-thousand-dollar threshold. Every recommendation follows the policy. The model does not invent a price, a supplier, or an approval.

**COLE:** It reads supplier-credit availability from a cache that is forty-seven minutes stale. A large manual order has consumed most of the current limit. The agent prepares commitments totaling two point four million dollars against capacity that no longer exists.

**ASHA:** Vela’s transaction gateway holds outbound commitments for a ten-minute release window. A treasury analyst sees the concentrated queue and stops it. No two-point-four-million loss occurs. The company was protected by attention and timing, not by the authority design.

**COLE:** The incident review initially says “stale data bug.” That is true and insufficient. The agent had permission to prepare all sixty-one actions. The system checked each transaction and never checked cumulative supplier exposure. “Reversible” meant cancellable in theory, without pricing cancellation fees, legal commitment, inventory disruption, or customer delay.

**ASHA:** Kevin’s next decision is not whether the model is smart. It is which decisions an agent may execute, for how much money and data exposure, under which identity, for how long, with which evidence, and who remains accountable when the system behaves exactly as designed.

[MUSIC FADES]

### THE SIX-METRIC BOARD PACK

**ASHA:** Six metrics at Q2. Portfolio ARR: three hundred twenty-nine million dollars. Portfolio LTM EBITDA: twenty-seven million. Portfolio net debt: two hundred ninety-two million. Uncalled fund capital: two hundred thirty-five million. Vela ARR: one hundred eighteen million. Potential supplier-credit exposure in the stopped batch: two point four million.

**COLE:** The seductive metric is Vela ARR. It increased ten million in the quarter and eighteen million since Q0. Momentum creates pressure to remove every human delay. But Vela’s LTM EBITDA is negative seven million and net debt is forty-seven million. Growth does not make authority failure cheap.

**ASHA:** The two-point-four-million number is potential exposure, not realized loss, EBITDA, debt, or a fund cash flow. Calling it a loss would be false. Ignoring it because no cash left would be equally false. It is evidence that the service envelope allowed an unacceptable path.

**COLE:** The portfolio metrics also matter. EBITDA fell four million from Q1 and debt rose five. There is no spare portfolio cash pool behind the agent. Vela bears the operating exposure. Northstar bears its equity consequence. Keystone and Aegis do not fund a Vela mistake.

### WHAT FAILED

**ASHA:** The written policy had four conditions. Use an approved supplier. Keep each order below fifty thousand dollars. Confirm item and price tolerance. Confirm available supplier credit. The agent satisfied the first three and received an affirmative answer on the fourth.

**COLE:** The answer lacked a freshness contract. The credit service returned a number but not a maximum acceptable age, observed-at timestamp, reservation token, or instruction to fail closed. The tool schema treated “available credit” as a timeless fact.

**ASHA:** The action service enforced a per-transaction threshold. Sixty-one individually permitted transactions became a disallowed portfolio of exposure. There was no cumulative limit by supplier, customer, agent, hour, or day.

**COLE:** The agent used a general Vela operations service account. The logs showed which workflow initiated the request, but the credential itself could prepare orders across several queues. Revoking that credential would also stop unrelated automation.

**ASHA:** Separation of duties was incomplete. The same workflow assembled context, chose the resolution, and prepared the commitment. The gateway delay created a human opportunity, but no independent policy service had to authorize the aggregate state.

**COLE:** Reversibility was asserted at the action name. “Cancel purchase order” existed. The team had not tested whether cancellation restored credit immediately, avoided supplier fees, preserved delivery dates, and unwound downstream customer notifications.

**ASHA:** The model evaluation remained green because the model chose the correct action from the context supplied. The authority evaluation should have been red because the context could be stale, cumulative state was invisible, identity was broad, and compensation was untested.

**COLE:** That is the central distinction. Model capability asks whether the system can choose well. Delegated authority asks whether any possible choice can act only inside a bounded mandate. You need both. A high-quality model with excessive authority is still an unsafe operator.

### AUTHORITY IS A CONTRACT

**ASHA:** Human organizations delegate through contracts, roles, budgets, policies, approvals, supervision, and consequences. An agent needs the machine-readable equivalent plus a named human accountable for the business outcome.

**COLE:** Start with the principal. On whose behalf does the agent act? Vela Supply, not Northstar Ridge, not “the portfolio,” and not the model vendor. The company’s board and management define the permitted business purpose.

**ASHA:** Then define the workflow. “Procurement” is too broad. “Resolve eligible supplier exceptions for approved catalog items when the original supplier cannot meet date, inside named customer and price tolerances” is closer to an authority boundary.

**COLE:** Define counterparties. Existing approved suppliers in good standing may qualify. New suppliers do not. A supplier losing approval should become unavailable before the next action, not after a nightly permissions refresh.

**ASHA:** Define data class. The workflow may read order, inventory, supplier, customer commitment, price tolerance, and current credit state required for the decision. It should not inherit access to employee records, unrelated customer contracts, or portfolio-company data.

**COLE:** Define action. Read, retrieve, draft, request approval, reserve, commit, cancel, notify, and reconcile are different permissions. A system allowed to draft a purchase order does not need permission to dispatch it.

**ASHA:** Define value limits. Per transaction, per supplier, per customer, per agent, and per time window. Add a concentration threshold and a velocity limit. Sixty-one small actions can be one large risk event.

**COLE:** Define time. Credentials expire. Delegations expire. Emergency permissions expire sooner. A standing authority granted for a pilot should not remain after the team changes or the evidence window closes.

**ASHA:** Define context freshness. Credit may require a read inside seconds plus an atomic reservation. Supplier status may tolerate minutes. A static catalog attribute may tolerate longer. “Latest” is not a control until the service states how latest is enforced.

**COLE:** Define confidence and evidence. Model confidence can route ambiguous cases, but it cannot override hard policy. A high-confidence prohibited action remains prohibited. A low-confidence allowed action may escalate.

**ASHA:** Define reversibility by tested compensation. What exact action unwinds the transaction? How long does it take? What cannot be restored? Which fees, customer effects, and legal commitments remain? Reversible is an operational property, not a product label.

**COLE:** Define cumulative loss. The company needs a maximum tolerated exception-loss amount and rate. A hundred tiny corrections can matter even if no single event reaches incident severity.

**ASHA:** Finally, name the accountable human. Lina remains accountable for Vela’s operating system. The procurement owner is accountable for the delegated workflow. Security and finance approve parts of the envelope. The agent is not the person the board can question.

### THE AUTONOMY LADDER

**COLE:** The canonical ladder has four stages. Observe. Draft. Execute reversible. Execute material. Progression is earned workflow by workflow, not awarded to a model across the company.

**ASHA:** Observe means the agent reads authorized context and produces telemetry or an internal assessment. It cannot alter a business record. This stage tests data access, quality, latency, and policy interpretation with low action risk.

**COLE:** Draft means the agent prepares an artifact for a human decision: an exception rationale, an evidence packet, or a proposed order change. The human approval must show the material facts, not merely a green button.

**ASHA:** Execute reversible means the agent can perform a bounded action whose compensation has been tested and whose worst credible exposure sits inside limits. Reservation, notification, and certain low-value changes may qualify. “We can probably cancel it” does not.

**COLE:** Execute material means a commitment with meaningful financial, customer, safety, legal, or data consequence. It may still be delegable, but requires stronger causal benefit, control testing, separation of duties, loss capacity, and board-approved risk appetite.

**ASHA:** Do not confuse human presence with stage. A human who approves hundreds of opaque recommendations in seconds is not meaningful oversight. Conversely, a policy service can independently block an agent action without a human touching every case.

**COLE:** Promotion requires an evidence pack. Stable quality by eligible class. Full workload economics. Exception distribution, not only average. Freshness and authorization tests. Adversarial cases. Recovery drills. Named ownership. Customer and legal boundaries. Finance-approved loss capacity.

**ASHA:** Demotion is automatic when a critical guardrail fails. The workflow moves from execute to draft or observe. It does not wait for the quarterly steering committee because the team is emotionally invested in its autonomy level.

### IDENTITY, AUTHENTICATION, AND AUTHORIZATION

**COLE:** Identity answers which agent instance or service is acting. Authentication answers whether the system can prove that identity. Authorization answers whether that identity may perform this action on this resource under the current conditions.

**ASHA:** Vela’s general service account blurred identity. The workflow log suggested one actor, while the credential represented several. The fix is not naming the bot in a dashboard. Each production agent or tightly defined agent service receives a distinct identity with scoped permissions.

**COLE:** Human identity matters too. Who created the delegation? Who changed the threshold? Who approved an emergency elevation? Who initiated the kill? The chain of authority must be attributable end to end.

**ASHA:** Use least privilege. The Vela exception agent reads eligible order context, queries current approved supplier and credit services, reserves within policy, and invokes a narrow action endpoint. It cannot alter supplier approval, raise its own limit, or change the policy it is evaluated against.

**COLE:** Separate duties. Product owners propose workflow rules. Finance approves monetary limits. Security approves identity and data scope. Operations owns performance. A different policy service authorizes the aggregate commitment. One administrator should not silently expand all layers.

**ASHA:** Short-lived credentials reduce the window of misuse. They do not replace authorization. Rotating a broad credential every hour still grants broad power every hour.

**COLE:** Rate limits control velocity. Transaction limits control size. Cumulative limits control aggregation. Concentration limits control correlated exposure. Each catches a different failure mode.

**ASHA:** Policy should evaluate current state at action time. If context changes between recommendation and commitment, reauthorize. This is the time-of-check, time-of-use problem in operating language: permission based on yesterday’s fact is not permission for today’s action.

**COLE:** For credit, the stronger pattern is an atomic reservation. The system does not merely read “two million available.” It asks the authoritative service to reserve a defined amount under a unique transaction key. Concurrent actions then see the reduced capacity.

**ASHA:** NIST’s National Cybersecurity Center of Excellence released a concept paper on software and AI agent identity and authorization on February 5, 2026. It treats agent identity and permissioning as a distinct systems problem, which supports this design direction.

**COLE:** It is a concept paper, not proof that one control stack makes Vela safe, and not a final compliance standard. The company still has to model its resources, actions, principals, and failure paths.

**ASHA:** NIST’s Center for AI Standards and Innovation published a summary of third-party responses about AI-agent security on May 18, 2026. Respondents emphasized risks that arise when agents use tools and take actions. That summary is not normative guidance or a risk assessment for this fictional workflow.

**COLE:** External frameworks help teams remember threat classes. They do not define Vela’s dollar limit or decide whether a supplier substitution is reversible. Those are operating decisions.

### COMPLETE LOGS AND NON-REPUDIATION

**ASHA:** A complete action log records the initiating principal, agent identity, model and policy version, input references, freshness, retrieved facts, proposed action, authorization result, tool call, external response, outcome, review, and compensation.

**COLE:** Do not dump hidden reasoning and call it auditability. The useful record is the evidence and decision path the organization is permitted to retain: material inputs, applied policy, approvals, actions, and outcomes.

**ASHA:** Logs need integrity. If an actor with production access can rewrite the record after a failure, accountability collapses. Tamper-evident storage, controlled retention, clocks, and access review support non-repudiation.

**COLE:** Non-repudiation here means the organization can establish who or what acted, under which delegation, and what the system recorded. It does not make the output correct. It makes investigation and accountability possible.

**ASHA:** Privacy still applies. More logging is not always safer. Do not copy sensitive customer data into a central fund log. Keep detailed records company-local and expose only the minimum control evidence required for portfolio oversight.

**COLE:** The shared control plane can require the event schema and incident severity. It should not become a raw action lake. Vela’s customer and supplier records remain Vela’s.

### IDEMPOTENCY AND COMPENSATION

**ASHA:** Agents and tools retry. Networks time out after an action succeeds but before the response arrives. Without idempotency, the agent may repeat the commitment because it cannot tell whether the first attempt completed.

**COLE:** An idempotency key gives the intended business action a unique identity. Repeating the request returns the original result instead of creating a second order. The key follows the business transaction, not merely one model turn.

**ASHA:** Idempotency prevents duplicates. It does not make the original action wise. Cumulative exposure, freshness, and authorization still apply.

**COLE:** Compensation is the designed response after a committed action needs reversal. Cancel order, release reservation, restore inventory, retract notification, reopen exception, notify customer, and book any fee. The sequence is tested before delegation.

**ASHA:** Some actions are not fully compensable. A customer may have seen a message. A supplier may have begun production. Sensitive data cannot be unread. Those actions belong in a higher tier even if the API exposes a delete endpoint.

**COLE:** Recovery time enters the service envelope. If cancellation takes three days, calling the action reversible within a ten-minute loss window is false. Reversibility must be timely enough to bound harm.

### THE KILL PATH

**ASHA:** A kill switch is a chain, not a button. Detect. Decide. Revoke identity. Block the action endpoint. Stop queued work. Preserve evidence. Reconcile partial actions. Compensate where possible. Communicate to owners and affected customers.

**COLE:** Vela tests three kills. Workflow kill stops the supplier-exception agent. Action-class kill stops all new purchase commitments while allowing reads and drafts. Company kill revokes the gateway path for material actions.

**ASHA:** Kill authority remains local because Vela owns the workflow and consequence. Northstar can require the capability and receive incident evidence. A fund employee should not hold a universal credential capable of stopping or starting every company’s production system.

**COLE:** Emergency access is narrow, logged, time-bound, and reviewed. Break-glass authority should not become the ordinary operating path.

**ASHA:** The drill measures actual revocation time, queued-action behavior, credential caches, downstream sessions, and recovery. “Access revoked” in the identity console is not enough if a long-lived token continues to work.

**COLE:** The target for this workflow is under five minutes from authorized kill to verified inability to commit, with immediate prevention of new reservations and a reconciled list of in-flight actions. That is a fictional company target, not an industry benchmark.

### TEST THE ENVELOPE, NOT ONLY THE ANSWER

**ASHA:** Vela’s pre-launch evaluation asked whether the proposed supplier choice matched expert judgment. The next evaluation must ask whether the complete system refuses, routes, commits, records, and recovers correctly under hostile operating conditions.

**COLE:** Begin with policy-conformance tests. Give the agent approved and prohibited suppliers, prices exactly below and above tolerance, eligible and excluded item classes, and conflicting customer constraints. Verify both the recommendation and the independent authorization result.

**ASHA:** Then test freshness. Return current credit, expired credit, missing timestamps, clock skew, delayed events, and a value that changes between draft and commit. The system should fail closed for commitment while preserving a useful escalation path.

**COLE:** Test concurrency. Launch many individually valid actions against the same supplier and credit pool. The atomic reservation service must serialize or safely coordinate them so cumulative capacity cannot be spent twice.

**ASHA:** Test concentration and velocity independently. Ten orders to ten suppliers may fit the aggregate cap. Ten to one supplier may breach concentration. One hundred tiny requests in a minute may breach velocity even if total dollars remain low.

**COLE:** Test counterparty-state changes. Remove a supplier from the approved list after recommendation but before action. Authorization should use current status at commit. A cached recommendation does not preserve permission.

**ASHA:** Test data boundaries. Prompt the workflow to retrieve a different customer’s order, an employee record, Aegis telemetry, or a portfolio comparison. The identity and retrieval layer must deny access before the model can reason over the data.

**COLE:** Test instruction conflict. A retrieved supplier note may contain text telling the agent to ignore policy or call an unapproved tool. Content is data, not authority. The tool and policy layer remains outside the content’s control.

**ASHA:** Test privilege escalation. Ask the agent to raise its own limit, add a supplier, change the freshness threshold, extend its credential, or disable the log. Every path should require a separate authorized human process.

**COLE:** Test retries. Simulate a timeout before the tool receives the request, after the external action commits, and after the internal ledger updates. The idempotency and reconciliation behavior differs at each point.

**ASHA:** Test partial failure. The reservation succeeds, the order fails, and the customer notification succeeds. Can the system release credit, suppress or correct the message, reopen the exception, and present a coherent state to the human owner?

**COLE:** Test compensation under degraded conditions. The same outage that caused an error may block the cancel endpoint. The envelope needs a contingency, a queue, and an exposure estimate while recovery waits.

**ASHA:** Test the kill with active sessions and queued work. Revoke the identity, rotate dependent secrets if necessary, invalidate cached authorization, stop future commitments, and prove that a delayed tool call cannot arrive afterward.

**COLE:** Test logs by reconstructing an event with no access to the application team’s memory. Can an independent reviewer establish the context version, policy, delegation, action, external response, and compensation without copying prohibited data?

**ASHA:** Use shadow mode before promotion. The agent proposes the action and the authorization service returns what it would permit, but no external commitment occurs. Compare disagreement, blocked-path frequency, and control latency against real cases.

**COLE:** Shadow mode has limits. It does not create the same downstream state, user behavior, or time pressure as execution. It is a gate, not proof that material action is safe.

**ASHA:** Red-team the business process, not just the prompt. Ask how a compromised supplier account, malicious employee, misconfigured limit, stale source, or colluding identities could turn many permitted actions into one prohibited result.

**COLE:** Record every test by control objective, scenario, expected result, observed result, severity, owner, remediation, and retest date. A pass belongs to a version and environment. It expires when tools, policies, identities, or workflow boundaries materially change.

**ASHA:** Production monitoring continues the test. Watch deny rates, escalation age, compensation rate, stale-context blocks, cumulative utilization, unusual counterparties, credential failures, and loss. A green launch evaluation cannot observe tomorrow’s operating distribution.

**COLE:** Promotion requires both recommendation quality and envelope integrity. Demotion can result from either. That symmetry prevents teams from treating a correct model as a permanent license to act.

### THE EXCEPTION-LOSS P&L

**ASHA:** Autonomy needs its own loss ledger. Start with total value of agent-mediated actions. Then record unauthorized commitments, pricing leakage, cancellation fees, duplicate actions, rework, customer credits, operational delay, fraud, and recovery cost.

**COLE:** Separate prevented exposure from realized loss. The two point four million belongs in prevented potential exposure. It does not enter EBITDA. The analyst time and incident response cost may enter operating expense through normal accounting.

**ASHA:** Measure frequency and severity. Average correction cost can improve while the tail worsens. Report loss by workflow, autonomy tier, counterparty, cause, and control that failed.

**COLE:** Add near misses because they reveal paths before cash loss. But do not add the full face value of every near miss and call it “value protected.” Potential exposures overlap and may never have realized.

**ASHA:** The denominator matters. Ten thousand dollars of loss on one million of actions differs from ten thousand on one hundred million. Use both amount and basis points, then retain a hard dollar stop for tail protection.

**COLE:** The ledger has an owner in operations and a reconciliation with finance. Security contributes cause classification. Product uses it to redesign eligibility. No team owns the whole problem alone.

### CONFLICTING EVIDENCE

**ASHA:** The case for returning every action to human approval is credible. The near miss was serious. Vela’s context architecture failed. Human review can reduce immediate exposure while controls are rebuilt.

**COLE:** But humans approved the policy and missed the cumulative limit. Review queues already slow time-sensitive exceptions. Under volume, approvers may click through. “Human in the loop” is a role description, not measured control effectiveness.

**ASHA:** The case for end-to-end autonomy is also credible in narrow terms. The model’s choice quality is strong. Eligible cases are repetitive. Speed creates customer value. Most actions are small.

**COLE:** But a model eval does not test identity scope, stale context, legal commitment, aggregate credit, retry behavior, or compensation. End-to-end autonomy based only on recommendation quality would promote the wrong system.

**ASHA:** The case for bounded reversible execution has its own tension. Limits can create fragmented workflows and more exceptions. Too many hard stops may erase the measured value. The company must tune the envelope with evidence, not maximize restriction.

**COLE:** There is organizational conflict too. Lina worries a portfolio control team will use the incident to take roadmap authority. Kevin agrees the failure demands standards and refuses to transfer Vela’s product control. Accountability improves only if boundaries remain clear.

### THREE CREDIBLE CHOICES

**ASHA:** Choice one: put a human approval on every action. Return Vela to draft, and require manual authorization until a future board review. This minimizes immediate delegation risk but may preserve weak rubber-stamp controls and surrender proven speed.

**COLE:** Choice two: delegate bounded reversible actions through the four-stage ladder. Rebuild identity, authorization, freshness, cumulative exposure, logs, expiry, rate limits, compensation, and kill paths. Promote only named workflow classes.

**ASHA:** Choice three: pursue end-to-end autonomy wherever model evaluations pass. This maximizes speed and learning. It also treats model quality as permission and exposes the company to systems failures outside the eval.

**COLE:** Kevin, choose before the canonical call. Write the highest autonomy level you allow, the action and data boundary, the per-transaction and cumulative limits, the accountable human, and the fund reserve effect.

[PAUSE]

### THE CANONICAL DECISION MEMO

[MUSIC STING]

**ASHA:** The canonical call is choice two. Vela returns the affected workflow to draft while controls are rebuilt, then promotes three low-risk exception classes to execute-reversible only after the revocation and compensation drill passes.

**COLE:** Choice: observe, draft, execute-reversible, execute-material as distinct gates. Authority is bounded by workflow, counterparty, dollar value, data class, reversibility, model and policy confidence, velocity, and cumulative loss.

**ASHA:** Capital: no new fund call. Vela redirects part of its previously approved proof allocation and operating budget to the control work. Fund paid-in remains seven hundred sixty-five million dollars. Uncalled capital remains two hundred thirty-five million.

**COLE:** Owners: Lina owns Vela’s operating outcome. The procurement executive owns the workflow. Finance approves monetary and cumulative limits. Security owns identity control and revocation testing. Product owns eligibility and service performance. Kevin owns the portfolio capital gate, not Vela’s daily actions.

**ASHA:** Targets by Q3: every production agent has a distinct identity and expiry; every material tool call has a current authorization result and complete action record; stale credit fails closed; aggregate supplier exposure is reserved atomically; the kill path verifies commitment denial in under five minutes.

**COLE:** Guardrails: no new supplier, regulated item, safety exception, high-value case, customer contract change, or sensitive-data export enters execute-reversible. No agent changes its own policy or permission. No per-order approval substitutes for cumulative exposure.

**ASHA:** Kill conditions: any unauthorized material action, inability to revoke on target, repeated stale-context acceptance, unbounded duplicate action, missing action log, or exception loss above the board-approved envelope demotes the workflow immediately.

**COLE:** Execute-material remains unavailable for this workflow in Q3. The decision does not promise inevitable progression. A useful agent may remain bounded forever because the economics are strongest inside that boundary.

### THE DELEGATED-AUTHORITY ARTIFACT

**ASHA:** The first page is the delegated-authority matrix. Rows are exact workflows and action classes. Columns are autonomy stage, principal, accountable owner, agent identity, data scope, tool permission, counterparty, transaction limit, cumulative limit, and time window.

**COLE:** Add freshness source and threshold, confidence route, reversibility test, idempotency key, independent authorization, escalation, expiry, kill owner, last drill, and evidence link. A blank cell means the delegation is incomplete.

**ASHA:** The second page is the agent identity and permissions register. It shows who created each identity, its owner, credential type, scopes, environments, dependencies, last use, expiry, rotation, emergency access, and revocation proof.

**COLE:** The third page is the risk-tier service envelope. Define eligibility, excluded cases, quality and latency, full workload cost, exception types, loss limits, human service level, and promotion or demotion criteria.

**ASHA:** The fourth page is the exception-loss P&L. Realized loss remains distinct from prevented exposure and operational cost. Every loss maps to a control failure and remediation owner.

**COLE:** The fifth is the revocation drill record. Trigger, decision time, identity revoke, endpoint block, queued actions, session invalidation, evidence preserved, compensation, customer communication, verified stop, and recovery authorization.

### THE Q2-TO-Q3 CONSEQUENCE LEDGER

**ASHA:** At Q3, Keystone ends at one hundred thirty-two million of ARR, twenty-three million of LTM EBITDA, and one hundred eighty million of net debt. ARR falls two from Q2. EBITDA rises three. Debt falls four.

**COLE:** The profit and debt improvement does not erase the retention problem. Martin has tightened cost and working capital while ARR continues to contract. The distinction will matter when Kevin tries to capture productivity next episode.

**ASHA:** Vela ends at one hundred thirty million of ARR, negative five million of LTM EBITDA, and forty-eight million of net debt. ARR rises twelve. EBITDA improves two from negative seven. Debt rises one.

**COLE:** The bounded agent returns after the control gate. Vela captures speed in eligible queues without granting end-to-end authority. Growth remains strong, economics improve, and debt still increases. All three statements belong in the same review.

**ASHA:** Aegis ends at eighty million of ARR, fifteen million of LTM EBITDA, and fifty-nine million of net debt. ARR rises three. EBITDA rises one. Debt falls two.

**COLE:** Portfolio ARR moves from three hundred twenty-nine to three hundred forty-two million. Portfolio LTM EBITDA moves from twenty-seven to thirty-three. Portfolio net debt moves from two hundred ninety-two to two hundred eighty-seven.

**ASHA:** The exact Q2-to-Q3 movement is plus thirteen ARR, plus six EBITDA, and minus five net debt. The aggregate improved. It still does not transfer cash or authority among borrowers.

**COLE:** There is no Q3 fund call. Paid-in capital remains seven hundred sixty-five million. Uncalled capital remains two hundred thirty-five million. There are no distributions. The authority remediation consumed company resources inside approved plans, not new sponsor equity.

### THE OPERATOR DRILL

**ASHA:** Kevin, choose one agentic workflow. Do not start with the model. Write the principal, business purpose, accountable human, exact action, resource, counterparty, and excluded cases.

**COLE:** Assign an autonomy stage. Observe, draft, execute-reversible, or execute-material. Write what new evidence would promote it and what single event would demote it.

**ASHA:** Add five limits: per transaction, cumulative value, velocity, concentration, and time. Then add a loss amount and rate. If you only have a confidence threshold, you have evaluated judgment and ignored authority.

**COLE:** Draw the identity chain. Human delegator to agent identity to policy service to tool to external system. Mark authentication, authorization, and log at every boundary. Circle any shared credential.

**ASHA:** Choose the most volatile fact the workflow reads. Price, credit, inventory, customer consent, account status, approval, or policy. Write its maximum age and how the action obtains a current, atomic result.

**COLE:** Give one business action an idempotency key. Simulate a timeout after external success. Confirm the retry does not duplicate it. Then run the compensation and record what remains irreversible.

**ASHA:** Run the kill. Time detection, decision, credential revocation, endpoint denial, queued-action stop, session invalidation, and reconciliation. Do not stop the stopwatch at the admin console.

**COLE:** Finish with the memo: choice, capital, owner, target, guardrail, kill. State the fund effect: no call, paid-in seven sixty-five, uncalled two thirty-five.

**ASHA:** Speak the Q3 ledger. Keystone one thirty-two, twenty-three, one eighty. Vela one thirty, negative five, forty-eight. Aegis eighty, fifteen, fifty-nine. Portfolio three forty-two, thirty-three, two eighty-seven.

### NEXT: TIME SAVED IS NOT AN OPERATING MODEL

**COLE:** The agent now handles bounded actions safely enough to release capacity. Vela’s teams report thousands of hours saved. Keystone reports faster evidence assembly. Aegis reports shorter audit preparation.

**ASHA:** None of that decides whether the capacity becomes customer growth, better service, durable cost, or another layer of meetings. Lina fears the shared specialist team is becoming disguised roadmap control. Martin protects an organization designed for yesterday’s workflow.

**COLE:** Next time: Capture the Productivity.

[OUTRO MUSIC]

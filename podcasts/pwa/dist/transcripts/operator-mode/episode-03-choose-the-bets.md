# Episode 3: Choose the Bets
## "Customer Truth, the AI Wedge, and Capital Allocation Under Uncertainty"

**Duration:** ~33 minutes
**Hosts:** Asha Raman & Cole Mercer
**Podcast:** Operator Mode -- One Company. Eight Decisions. Every Decision Compounds.

---

### CONSEQUENCE: TRUTH CREATES A QUEUE

[INTRO MUSIC]

**ASHA:** A quick note: the operating case, its companies, executives, transactions, and figures are fictional. Named external research is real and identified when used.

**COLE:** It is two in the morning and Harborline's dispatch service is intermittently assigning technicians to yesterday's schedule. The rollback works, then fails because one acquired product still reads from a stale integration table. The incident team restores service after ninety-three minutes. At nine that morning, the board chair forwards a competitor's announcement: "AI Copilot for Every Field Technician." The message contains six words. "Why are we not shipping this?"

**ASHA:** The public rebase did what it was supposed to do. Harborline now knows the truth faster. It knows NRR has fallen to ninety-seven percent. It knows availability has bottomed at ninety-nine point one five percent. It knows median onboarding is still one hundred and twelve days. It knows fifty-eight percent of engineering capacity is maintaining or reconciling existing systems. Truth did not choose what to fix. It created an honest queue.

**COLE:** Product has forty-seven roadmap commitments across the three codebases. Engineering proposes a platform rewrite. Sales wants a generic copilot before the next conference. Customer success wants onboarding capacity. The sponsor wants visible AI progress and no permanent margin decline. Every request is defensible in isolation. Together they exceed Harborline's capital, people, and attention.

**ASHA:** Kevin, this is the moment strategy becomes real. Strategy is not the sentence "become the AI operating system for field service." Strategy is which work stops, which work receives scarce capital, what evidence earns the next dollar, and who has authority to kill a favored initiative.

**COLE:** Your gate has three choices: rewrite the platform, ship the generic copilot, or concentrate the portfolio around three linked bets. Before that, you need customer truth, technical economics, and a way to compare uncertain opportunities without converting guesses into spreadsheet facts.

[MUSIC FADES]

---

### BOARD PACK: GROWTH WITHOUT HEALTH

**ASHA:** Six cards for Q2. Card one: end ARR, ninety-eight million, up half a million from Q1. Card two: quarterly revenue, twenty-five point eight four million. Card three: NRR, ninety-seven percent. Card four: quarterly EBITDA, five point six eight million, a twenty-two percent margin. Card five: net debt, one hundred and fifty-six point five million. Card six: availability, ninety-nine point one five percent.

**COLE:** The apparently positive number is ARR. It increased from ninety-seven point five to ninety-eight million. But NRR at ninety-seven means the installed base is shrinking before new logos. New sales and delayed activations are dragging the total forward while customer value leaks underneath. Growth is present. Health is not.

**ASHA:** EBITDA is also down, from six point three seven million in Q1 to five point six eight million in Q2. Some of that is the metric-control work, incident remediation, and capacity added after close. Net debt rises by half a million. This is the first proof that value creation consumes cash before it creates value.

**COLE:** Availability at ninety-nine point one five sounds high until you translate it. Across a quarter, the difference between ninety-nine point one five and ninety-nine point nine is roughly sixteen additional hours of unavailability. More importantly, average uptime hides the business moment. Four minutes during a low-usage night is not equal to four minutes at morning dispatch when technicians receive routes.

**ASHA:** Product health, customer health, and finance now point to the same constraint. Harborline cannot scale sales or autonomy on an unreliable core. But "fix the core" is not yet a strategy. A total rewrite can consume years and still leave onboarding and customer workflow untouched.

---

### EVIDENCE: LISTEN FOR WORK, NOT FEATURE REQUESTS

**COLE:** Harborline runs a compressed discovery program: twenty-four current-customer interviews, eight interviews with churned or contracted customers, twelve field-shadow sessions, and reviews of implementation plans, support conversations, and work-order telemetry. The interview count is not evidence of value by itself. It is enough to find patterns worth testing.

**ASHA:** The loudest feature request is a chat box. Customers have seen copilots elsewhere and can describe one easily. The most frequent expensive work is different. A technician arrives at equipment they have not serviced before. The asset record is incomplete. Prior notes use local abbreviations. The manual lives in a PDF or a truck. The technician calls a veteran, replaces the most likely component, and sometimes schedules a second visit.

**COLE:** The job is not "chat with my work order." It is: when I am diagnosing unfamiliar equipment under time pressure, help me reconstruct what happened, identify the safest likely next step, and produce a defensible quote, so I can resolve more jobs on the first visit without creating compliance or customer risk.

**ASHA:** That job has measurable economics. Harborline's baseline first-time fix rate is seventy-one percent. A second truck roll consumes technician capacity, delays the customer, and often delays the quote. The customer does not buy an answer-shaped object. The customer buys fewer repeat visits, faster approved work, and evidence that the technician followed the right procedure.

**COLE:** Three candidate workflows appear in the evidence. First, diagnosis and quote assistance using equipment history, manuals, technician notes, and prior inspections. Second, automated compliance-package preparation after an inspection. Third, schedule optimization across technician skills, parts, location, and service-level commitments.

**ASHA:** All three matter. Diagnosis has the strongest combination of frequency, pain, available context, and measurable outcome. Compliance has high trust and regulatory sensitivity but a narrower initial segment. Scheduling has enormous value and terrible dependency breadth: live location, skills, parts inventory, customer windows, union rules, and three dispatch engines. Starting with scheduling would make data integration the product.

**COLE:** The diagnosis workflow also reveals the right wedge. Harborline does not need to automate the technician. The first product can retrieve asset history and relevant manual sections, draft a diagnosis and quote, and require technician approval. That produces usage and correction data while keeping agency with the expert. Progressive delegation comes later if quality and customer trust justify it.

**ASHA:** Now segment the market. The initial ideal customer is not "field service companies." It is multi-branch HVAC and fire-safety contractors with roughly seventy-five to five hundred technicians, repeat service on identifiable equipment, enough completed work-order history, a measurable cost for repeat visits, and contract terms that permit the intended data use.

**COLE:** That segment excludes some attractive logos. A large industrial-maintenance customer with fragmented asset IDs and ambiguous rights may have more theoretical value than a mid-market HVAC contractor with clean history, but it is a worse design partner. The first cohort should maximize learning quality, not logo prestige.

**ASHA:** And willingness is behavioral. Nine customers agree to provide a rights-cleared dataset, name a technician lead, permit shadow-mode evaluation, and define a baseline. Six say they would consider a paid pilot if Harborline improves first-time fix rate or quote speed without increasing safety incidents. That is stronger than survey enthusiasm and weaker than revenue. We count it as evidence for an experiment, not as ARR.

**COLE:** Churned customers add a warning. Several did not leave because Harborline lacked AI. They left because onboarding ran long, integrations were brittle, and mobile reliability damaged technician trust. The AI wedge cannot outrun the product substrate. A useful recommendation delivered inside an unreliable workflow is another reason to stop using the workflow.

---

### PRODUCT-MARKET FIT EVIDENCE: A LADDER, NOT A LABEL

**ASHA:** Teams often ask whether an idea has product-market fit as if fit were a binary property available before the product. For this decision, use an evidence ladder. At the bottom is stated interest. Then commitment to share data and operator time. Then repeated workflow use. Then measurable outcome improvement. Then willingness to pay. Then renewal and expansion. Each rung answers a harder question.

**COLE:** Harborline is between the second and third rungs for diagnosis assistance. It has customer commitment and historical workflow frequency. It does not yet have repeated product use, outcome improvement, paid conversion, or retention. So the right funding instrument is a staged product bet, not a year-five revenue promise.

**ASHA:** Define the counterfactual. If first-time fix rises during a pilot, was Harborline Assist responsible, or did the customer assign stronger technicians? Use a matched workflow or phased rollout where possible. At minimum, compare similar job types, technician experience, equipment categories, and time periods. Do not credit the product for every favorable movement after launch.

**COLE:** Define multiple outcomes. Primary: first-time fix rate for eligible jobs. Secondary: quote turnaround, technician acceptance, time spent searching, repeat visit rate, and customer approval. Guardrails: severe diagnostic error, unsafe recommendation, cross-tenant retrieval, unsupported factual claim, and technician override. A product can improve the primary outcome and still be unshippable because a guardrail fails.

**ASHA:** Also define the eligible population before results. If the pilot begins with all jobs and the team later reports only the easy equipment categories where it worked, that is not learning. It is denominator shopping. Start with rights-clear customers and jobs where equipment identity, history, and manuals meet the minimum input standard.

**COLE:** Product-market fit for the broader vision will require more than a successful pilot. Harborline must show that the workflow generalizes across customers, that value survives outside expert-supported design partnerships, that implementation is repeatable, that the price captures value, and that workload contribution margin is attractive. Episode four will test production economics. Episode five will test commercial repeatability.

---

### CROSS-EXAMINATION: ARE WE HEARING THE MARKET OR OURSELVES?

**ASHA:** I want to challenge the discovery evidence. Twenty-four current customers are already Harborline customers. They know the product language, they have relationships with the team, and some want influence over the roadmap. Nine design partners volunteering data may simply be nine unusually patient customers. Why should the investment committee believe this is a market rather than a customer advisory board with good manners?

**COLE:** It should not believe that yet. Discovery reduces ignorance; it does not remove selection bias. That is why the team included churned customers, field observation, support records, and telemetry. It is also why the first experiment recruits across branch size, product history, technician experience, and data quality instead of choosing only the cleanest friendly account. We record who refused and why. Refusal caused by rights, implementation burden, or low perceived value is market evidence too.

**ASHA:** And what would make the job evidence stronger than a pile of anecdotes?

**COLE:** Convergence across independent signals. Technicians actually interrupt work to call a veteran or search a manual. Work-order data shows repeat visits on the eligible equipment classes. Customers can estimate the capacity and delay created by those visits. The same problem appears in churn interviews without prompting. A buyer commits data, field time, a baseline, and a decision process for a paid pilot. No one signal proves demand. Their alignment justifies the next test.

**ASHA:** I also want a buying map. The technician experiences the job. The service manager owns first-time fix and utilization. Operations may own the budget. IT and security control access. Legal controls the data rights. Procurement controls the contract. A product can delight the user and still fail commercially because the economic buyer cannot verify the benefit or the control functions cannot approve the data flow.

**COLE:** Exactly. Workflow mapping follows both work and authority. For every step, identify the actor, input, decision, system, delay, exception, consequence, and evidence. Then map who feels pain, who benefits, who pays, who approves, and who can block. That is more useful than a persona page describing a fictional technician's hobbies.

**ASHA:** What about market size? The board will ask whether diagnosis assistance can be large enough.

**COLE:** Build it bottom-up. Start with customers and prospects in the chosen verticals. Filter for technician count, repeat equipment service, workflow frequency, usable historical data, and rights feasibility. Estimate eligible assisted work orders, not total employees. Apply a price range tied to verified value and expected usage. Then haircut for implementation capacity, adoption, and time. That gives an executable serviceable market. A giant top-down field-service-software number does not tell Harborline how many rights-clear work orders it can assist next year.

**ASHA:** And the initial wedge does not need to equal the final market. It must open a credible expansion path. Diagnosis can lead to quote creation, parts intelligence, compliance evidence, and additional equipment categories if the identity, retrieval, trust, and commercial model transfer. That pathway is option value. It is not booked revenue.

**COLE:** One more trap: asking customers to rank features. Customers can rank the concepts we show them; they cannot rank the opportunities we failed to discover. Better questions reconstruct the last real job. What triggered it? What did you do? Where did you wait? Who did you call? What went wrong? What did the second visit cost? Evidence lives in specific behavior, not future-tense preference.

**ASHA:** So the conclusion is deliberately narrow. We have enough evidence to fund a controlled diagnosis-and-quote bet for a defined segment. We do not have evidence to rename Harborline an AI company, forecast ten million of revenue, or deploy across all twelve hundred customers. Scope is part of truth.

---

### TECHNICAL DEBT ECONOMICS: FIX THE CONSTRAINT, NOT THE PAST

**COLE:** Engineering's rewrite case is emotionally powerful. Three codebases, seventeen schemas, duplicated identity, brittle integrations, and fifty-eight percent maintenance capacity. Start fresh, move everyone to one architecture, and stop paying the tax.

**ASHA:** The problem is that rewrite benefits arrive late and with uncertain scope. Customers do not pay for architectural purity. They pay for reliable workflows, faster onboarding, and new value. A rewrite that consumes two years can worsen NRR before it improves the cost structure. Under six-times leverage, time is expensive.

**COLE:** But refusing foundational work is also expensive. The two a.m. incident came from stale identity and integration state. The AI workflow needs tenant-aware identity, reliable equipment resolution, permission boundaries, data lineage, and service observability. Building those separately inside one feature would create a fourth platform.

**ASHA:** So calculate technical debt by its operating consequences. How much engineering capacity does it consume? Which incidents does it cause? How many onboarding days come from manual reconciliation? Which revenue or product bets are blocked? What is the cost of delay? Then fund the narrow shared capability that removes the active constraint.

**COLE:** Harborline does not need one canonical schema for every field in every product this year. It needs a shared customer, site, equipment, and work-order identity layer for the chosen workflows; reliable event propagation; tenant-aware access; and observability around dispatch and retrieval. That is a seam, not a rewrite.

**ASHA:** A seam creates option value. Reliability improves now. Onboarding can reuse the identity mappings. Assist can retrieve safely. Future products can adopt the shared layer incrementally. If the AI bet fails, the reliability and onboarding value remains. That makes the capital more reversible than an all-or-nothing rebuild.

**COLE:** The discipline is a strangler sequence. Put new shared capability beside the old system. Route one bounded workflow through it. Measure. Migrate additional flows when the new path is better. Retire old paths only after traffic and dependencies have moved. "Temporary coexistence" needs an expiration owner, or it becomes permanent duplication.

---

### EXPECTED VALUE WITHOUT THEATER

**ASHA:** We need to compare uncertain bets. Expected value can help if we remember that the letters E and V here mean expected initiative value, not enterprise value. The simple form is probability-weighted benefit minus cost and probability-weighted downside. The formula creates consistency. It does not make subjective probabilities objective.

**COLE:** Consider the generic copilot. It is fast and visible. It might improve search and drafting across several workflows. Its build cost is lower than the concentrated portfolio. But the evidence linking it to first-time fix, onboarding, retention, or paid expansion is weak. The benefit range is broad and attribution will be poor.

**ASHA:** The platform rewrite has a large theoretical benefit and a long duration. Probability of completing the planned scope on time is uncertain. The downside includes delayed roadmap work, migration incidents, and cash consumed before customer proof. A giant expected value based on a giant terminal benefit is not reassuring if the company cannot survive the path.

**COLE:** The concentrated portfolio has three linked bets whose benefits can be tested separately. Reliability and shared data cost three million dollars. A narrow AI workflow costs two point four million. Onboarding and land-expand cost one point six million. Total capital is seven million, staged rather than committed blindly on day one.

**ASHA:** Do not add the three forecast benefits without checking dependencies and double counts. If improved identity shortens onboarding and enables Assist, the shared layer supports two outcomes, but the same retained customer dollar cannot be credited twice. Build one value ledger with named mechanisms and one initiative ledger with contributing actions.

**COLE:** Compare on five dimensions. Value created: does the choice reach customer and financial outcomes? Cash consumed: how much and when? Risk added: migration, safety, security, concentration, or organizational risk. Speed to evidence: when do we learn whether the thesis works? Reversibility: can we stop or redirect without losing the entire investment?

**ASHA:** Expected value is most useful for exposing disagreements. If product assigns a seventy-percent chance of paid adoption and finance assigns thirty, do not average to fifty and move on. Ask which evidence would change either view. The experiment should purchase that evidence.

---

### SEQUENCING: THREE BETS, ONE SYSTEM

**COLE:** The three bets are linked but not serialized into a waterfall. Reliability and identity begin first because they define the safe path. Customer discovery and offline Assist evaluation proceed in parallel on rights-clear data. Onboarding redesign begins with process and instrumentation while the shared mappings are built.

**ASHA:** This is not "platform first, product later." Each foundation milestone must unlock a customer milestone. Tenant-aware equipment identity unlocks safe retrieval for one design partner. Event reliability unlocks trustworthy activation telemetry. A standardized integration mapping removes days from one onboarding path. The platform earns continued funding through unlocked outcomes.

**COLE:** Nor is it "AI first, fix quality later." Assist starts in offline and shadow mode. It can generate recommendations without showing them to technicians while the team compares outputs with actual diagnoses. Human approval is mandatory when it enters workflow. No autonomous parts order, customer quote, compliance decision, or cross-customer learning.

**ASHA:** The onboarding bet also precedes pricing. The team maps every handoff from signature to first completed live work order, assigns one accountable owner, standardizes the common integrations, and exposes customer readiness before the contract is promised. Land-and-expand begins with a customer reaching value, not with a larger first invoice.

**COLE:** What stops? Most roadmap work that does not protect retention, fulfill a binding commitment, meet a regulatory obligation, or contribute to one of the three bets. Killing work is the proof of concentration. If all forty-seven commitments remain "strategic," the seven-million portfolio is an overlay, not a strategy.

---

### DECISION GATE: THREE CREDIBLE PORTFOLIOS

**ASHA:** Choice one: rewrite the platform. Approve the proposed multi-year consolidation, organize teams around the target architecture, and limit feature work to contractual commitments. The case is structural: Harborline cannot compound on three codebases and seventeen schemas, and partial fixes may prolong the tax.

**COLE:** Choice two: ship a generic copilot. Put search, summarization, and drafting across the existing product, use external models, and announce within two quarters. The case is market speed: customers are asking, competitors are positioning, and a broad interface can reveal which use cases deserve depth.

**ASHA:** Choice three: concentrate. Kill most roadmap work and fund three linked bets: three million for reliability and a shared data layer, two point four million for diagnosis-and-quote assistance, and one point six million for onboarding and land-expand. Release capital at evidence gates.

**COLE:** Choice one may ultimately produce the cleanest company. Choice two may create faster learning than our skepticism admits. Choice three risks doing too little platform work, too narrow an AI product, and too many linked changes at once. There is no option called "fix everything without margin pressure."

**ASHA:** Kevin, choose. Name what stops. Then name the first evidence you expect within ninety days. If your decision has no stop list and no ninety-day evidence, it is aspiration.

[LONG PAUSE]

---

### CANONICAL CALL: CONCENTRATE AND STAGE THE CAPITAL

[MUSIC STING]

**ASHA:** Our call is choice three. Commit up to seven million dollars across the three linked bets, but do not treat approval as permission to spend every dollar regardless of evidence. Capital follows stage gates.

**COLE:** Charter one: reliability and shared data. Capital: three million. Owner: the CTO, paired with a product leader accountable for customer impact. Target: restore availability toward ninety-nine point nine percent, reduce dispatch-critical incidents, establish tenant-aware customer-site-equipment-work-order identity for the chosen workflows, and reduce maintenance and reconciliation load from the fifty-eight-percent baseline.

**ASHA:** Guardrail: no big-bang migration and no platform milestone reported without the customer or operating flow it unlocks. Ninety-day gate: measurable reduction in dispatch error rate, complete identity resolution for the first design-partner population, and a tested rollback path. Kill or re-scope if the team is still producing architecture artifacts without moving production traffic or incident drivers.

**COLE:** Charter two: Harborline Assist for diagnosis and quote drafting. Capital: two point four million. Owner: the CPO with an engineering lead and field-operations product owner. Target: demonstrate a meaningful improvement in first-time fix or quote turnaround for an eligible, rights-clear cohort, with repeated technician use and a credible path to paid workflow volume.

**ASHA:** Guardrail: technician approval remains mandatory; retrieval is tenant-aware; sources are visible; no model-improvement use beyond contractual rights; severe diagnostic errors, unsafe suggestions, and cross-tenant access are release blockers. The first gate is offline and shadow evidence, not a launch date.

**COLE:** Kill criterion: after two disciplined pilot cycles, stop or redesign if recommendation acceptance cannot clear a pre-agreed minimum, if severe-error guardrails fail, if eligible data remains too sparse, or if customers will not commit time and payment to the measured workflow. Do not keep a generic copilot as a consolation prize.

**ASHA:** Charter three: onboarding and land-expand. Capital: one point six million. Owner: the COO or equivalent implementation leader jointly with the CRO. Target: move median onboarding from one hundred and twelve days toward seventy-five, increase the share of customers reaching first value inside ninety days, and make activation a condition of full sales credit.

**COLE:** Guardrail: speed cannot come from silently narrowing promised scope after signature or exhausting services teams. The standard package, integration prerequisites, customer responsibilities, and exceptions must be explicit. Kill or re-scope any automation that moves internal tickets faster without moving customer time to value.

**ASHA:** Portfolio owner: Kevin, in the operator seat. You run one monthly capital review across all three charters. The targets differ, but the governing question is the same: what moved, by how much, by when, with what confidence, and how was it proved?

**COLE:** The stop list is real. Freeze net-new work on low-adoption modules that do not protect a binding commitment. Stop customer-specific roadmap additions without an exception case. Stop the full rewrite design beyond the seams required for reliability, identity, permissions, and observability. Stop counting AI launch activity as value.

---

### CONSEQUENCE LEDGER: Q2

**COLE:** Customer value: first-time fix remains seventy-one percent and median onboarding remains one hundred and twelve days. NRR falls to ninety-seven percent. Discovery has produced a sharper target workflow and segment, but customer outcomes have not yet moved.

**ASHA:** Product and AI health: availability bottoms at ninety-nine point one five percent. Fifty-eight percent of engineering capacity remains trapped in maintenance and reconciliation at the start of the portfolio. Data usability is sixty-three percent and rights-clear coverage forty-six percent of ARR. AI ARR is still zero.

**COLE:** P and L and cash: end ARR is ninety-eight million. Quarterly revenue is twenty-five point eight four million. EBITDA is five point six eight million, a twenty-two percent margin. Net debt rises to one hundred and fifty-six point five million. The company is funding control, remediation, and the opening work before the bets produce revenue.

**ASHA:** Sponsor return: the two point six-times base case remains possible, but the path is narrower. NRR at ninety-seven cannot support the twelve-percent ARR CAGR without exceptional new-logo performance. The chosen portfolio must first stop retention leakage, then create expansion. We do not add forecast AI ARR to rescue the model.

**COLE:** Grade the call. Value created: option value and focus, not realized economics. Cash consumed: up to seven million, staged; Q2 already shows margin and debt pressure. Risk added: execution concentration and a customer-facing AI safety surface. Speed to evidence: faster than a rewrite, slower than a generic demo. Reversibility: moderate, because each bet has independent gates and the shared layer retains value if Assist fails.

---

### OPERATOR DRILL: THE RANKED PORTFOLIO

**ASHA:** Your drill is a ranked opportunity portfolio and three initiative charters. Begin with customer jobs, not ideas. For each job, write the trigger, current workaround, frequency, consequence of failure, current spend or capacity loss, evidence quality, and measurable outcome.

**COLE:** Add segment and feasibility. Which customers experience the job most intensely? Do they have the data, rights, integration readiness, and workflow consistency required? What percentage of the revenue base is actually eligible? A large theoretical market with a tiny executable segment is not the first wedge.

**ASHA:** Score each opportunity on value, confidence, time to evidence, capital, dependency breadth, risk, and reversibility. Do not hide the assumptions in a single weighted score. Keep the component judgments visible so leaders can challenge the real disagreement.

**COLE:** For expected value, write a range and the evidence behind the probability. Separate hard-dollar value, calibrated operational estimates, and strategic option value. Do not put option value into the same confident total as contracted savings. Do not count the same retained revenue under reliability, onboarding, and AI.

**ASHA:** Rank the portfolio, then draw a funding line. Everything below it stops or waits. Mark regulatory and contractual obligations separately; they are constraints, not optional bets. If leadership moves the funding line, show exactly which initiative and outcome falls out.

**COLE:** Each charter needs choice, capital, owner, baseline, target, deadline, confidence, evidence source, guardrail, stage gates, and kill criterion. Add the customer behavior required, not just the internal deliverable. "Deploy identity service" is a milestone. "Cut onboarding reconciliation by ten days for the target integration" is an operating result.

**ASHA:** Finally, schedule the capital review before starting. The review has three outcomes: continue, change, or stop. "Continue but keep watching" is not a fourth. A kill criterion only works when a named person has authority to use it against a popular project.

---

### NEXT QUARTER

**COLE:** The first Assist pilot does not reward the confidence in the board deck. Recommendation acceptance is forty-four percent. All-in variable cost is two dollars and eighty cents per assisted work order against a proposed four-dollar realized price. Severe errors occur at four point eight per thousand jobs. Then a retrieval trace reveals a near miss across tenant boundaries.

**ASHA:** That is not the end of the bet. It is the first honest production evidence. Next episode, you decide what Harborline must own, what it should buy, when human approval can relax, and whether the workload can ever produce attractive contribution margin.

**COLE:** You chose the bets. Now the system gets to answer back.

[OUTRO MUSIC]

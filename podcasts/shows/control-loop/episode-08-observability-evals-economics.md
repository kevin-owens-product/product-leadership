# Episode 8: Harness Design II: Observability, Evals, Economics
## "Traces, Replay, Regression Gates, and Cost per Resolved Task"

**Duration:** ~26 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Control Loop, episode eight, the last one of the season. Dana Okafor and Theo Lindqvist. And Theo, we've built a lot over seven episodes. Today is the episode about knowing whether any of it worked.

**THEO:** Which is the episode that most teams skip, and I want to be blunt about the consequence. Without this layer, every improvement you make to an agent system is a guess. You change a prompt, it feels better, you ship it. Three weeks later something is worse and you have no idea which of the eleven changes caused it. I've watched teams spend months in that state, and the frustrating part is that the fix is not sophisticated. It's writing things down.

**DANA:** So let's build it. Trace schema first, then replay and determinism, then evals -- construction, metrics, and gating -- then the economics, and we'll close the season with a real attempt at build versus adopt.

**THEO:** And I want to plant a flag on ordering. Do the trace first. Not the evals, not the dashboards. The trace is the substrate everything else is derived from, and every hour you run without one is data you can't get back.

---

### SEGMENT 1: THE TRACE (8 minutes)

**DANA:** What's in a trace record?

**THEO:** Think of it as one append-only record per step, plus a run-level header. The header has: run ID, the task input verbatim, the model and version, the harness version, the tool set version, the configuration, and the start time. That version block is what lets you attribute a regression to a change later, and it's the thing people leave out.

**DANA:** And the per-step record?

**THEO:** Step index. The full input that went to the model -- or a hash of it plus the delta from the previous step, if storing full inputs is too heavy. The model's response including any reasoning content. The tool calls with complete arguments. The tool results, ideally full, at minimum truncated with the original size recorded. Token counts broken out by input, output, and cached input. Latency for the model call and for each tool separately. And the loop state after the step.

**DANA:** Why the cached-input breakout specifically?

**THEO:** Because it's the difference between your bill making sense and not. Cached and uncached input tokens differ in price by roughly an order of magnitude, so aggregate input tokens tells you almost nothing about cost. And it's your cache-hit-rate metric from episode two, which is a real diagnostic -- a run whose cache rate falls off a cliff at step twenty tells you something invalidated at step twenty, and the trace tells you what.

**DANA:** What about the reasoning content? Some people don't store it.

**THEO:** Store it. It's the single most useful thing in a trace when you're debugging a bad decision, because it tells you what the model believed. A trace that shows a wrong tool call without the reasoning tells you *that* it went wrong. With the reasoning, you usually see *why* in one read -- it misunderstood a tool description, or it had a stale belief about a file, or it was working from a summarized context that lost something. That's the difference between a diagnosis and a shrug.

**DANA:** Format?

**THEO:** Newline-delimited JSON, one object per line, one file per run. I want to be unglamorous about this because the tooling question stops people. It's append-only so a crash keeps everything up to the crash. It streams, so you can tail it live. Every language reads it. You can `grep` it. When you outgrow it you can load it into anything. The number of teams who have no trace because they were evaluating observability platforms is not small, and a JSONL file is forty lines of code.

**DANA:** What about the derived layer on top?

**THEO:** Four aggregate views, all computed from the same files. Per-run summary: outcome, termination reason, steps, tokens, cost, wall clock. Per-step aggregates across runs: which tools get called, at what rate, with what failure rate. Failure clusters: group failed runs by the shape of their failure so you see the top five recurring problems rather than a list of incidents. And trend lines on the core metrics over time, which is how a regression becomes visible before a user reports it.

**DANA:** Let's do the metrics you'd put on the wall.

**THEO:** Six. Task success rate, defined by your verifier. Termination reason distribution -- from episode one, and still the single most informative histogram you can have. Tokens per resolved task, which we'll take apart in the economics segment. Cache hit rate. Tool failure rate by tool, which surfaces bad error surfaces directly. And steps-to-completion as a distribution, watching specifically for the bimodality we talked about -- the fast-success cluster and the grinding tail.

**DANA:** Is there a leading indicator among those?

**THEO:** Tool failure rate by tool is the most actionable early signal, because it moves before success rate does and it points at a specific thing you can fix. A tool that starts failing fifteen percent of the time is usually an environment change or an interface drift, and you'll see it in that metric a week before it shows up as degraded task success.

---

### SEGMENT 2: REPLAY AND DETERMINISM (7 minutes)

**DANA:** Now the payoff. We teased replay in episode one.

**THEO:** The mechanism: key each model call by its full input. Store the response against that key. On a subsequent run, if the input matches a stored key, return the stored response instead of calling the model. Now a re-run of an identical workflow costs nothing and takes seconds.

**DANA:** And the important case is a *nearly* identical workflow.

**THEO:** That's the real payoff. You have a forty-step run that failed at step thirty-eight. You fix something in step thirty-eight's tool. You re-run. Steps one through thirty-seven have identical inputs, so they hit cache and return instantly. Step thirty-eight is the first divergence and runs live, and everything after it runs live too, because its input now differs. You've turned a ten-minute, expensive iteration into a twenty-second one, and you can iterate twenty times in the time one live run used to take.

**DANA:** State the constraint, because this is where it breaks.

**THEO:** Determinism in the orchestration layer. If anything outside the model introduces variation between runs, the input to step N differs and you miss cache for reasons unrelated to your change. The specific offenders, in order of how often I've seen them: reading the wall clock, generating random numbers, iterating over an unordered collection, and depending on ambient environment state.

**DANA:** How strictly do you enforce that?

**THEO:** Strictly, and I'd make it structural rather than a convention. In orchestration code, ban the clock and the random source outright -- if the code can't call them, it can't break replay. Timestamps come in as parameters from the caller. Where you need variation across parallel workers, derive it from the worker index rather than from randomness. It feels pedantic right up until the first time replay saves you an afternoon, and then it feels obvious.

**DANA:** What about tool side effects during replay? If step five wrote a file, and I'm replaying step five from cache, the file doesn't get written.

**THEO:** This is the genuinely hard part and it deserves a straight answer. There are two modes and you should know which one you're in. Pure replay: you re-execute nothing, you just re-read the trace. Useful for analysis and for regenerating reports, no side effects, completely safe. Resume: you replay the model calls from cache but you *do* re-execute the tools, so the world gets rebuilt. Correct state, real cost and latency for the tool calls, and it requires that your tools be idempotent -- which is exactly why episode one pushed for declarative tool design.

**DANA:** And the third option is snapshotting.

**THEO:** Snapshot the world state at step boundaries and restore rather than re-execute. For a filesystem in a git repository that's cheap and it's the best option when available -- restore the commit from step thirty-seven and resume from there. For external systems it's usually impractical. My practical guidance: get filesystem snapshotting via git, make tools idempotent where you can, and accept that runs touching external mutable systems replay imperfectly. Being explicit about which of your runs are replayable is more valuable than pretending all of them are.

**DANA:** Does replay have uses beyond debugging?

**THEO:** Three good ones. Regression testing -- you have a corpus of traces, you change the harness, you replay them and see which trajectories diverge. Divergence isn't necessarily bad, but it's exactly the set you should look at. Second, counterfactuals -- replay to step twenty, then change the context or the tool set and run forward, so you can A/B a change from a realistic mid-run state rather than from scratch. Third, and this is the one I like most, eval set construction, which is the next segment.

---

### SEGMENT 3: EVALS THAT MEAN SOMETHING (8 minutes)

**DANA:** Let's build the eval layer. Start with the dataset, because everything depends on it.

**THEO:** And start with the source, because this is where most eval efforts go wrong. The instinct is to sit down and write test tasks. Those are fine for smoke tests and they are systematically unrepresentative -- hand-written tasks are cleaner, better specified, and easier than real ones, so you get a suite where you score ninety percent and production is at fifty-five.

**DANA:** So the source is production traces.

**THEO:** Production traces, mined. And you have the trace infrastructure from segment one, so it's a query, not a project. Pull four populations. The failures, obviously -- every run that failed the verifier or got escalated to a human. The grinding successes, meaning runs that succeeded but took two or three times the median steps, because those are near-misses and they're where the next failures come from. A random sample of ordinary successes, to catch regressions on things that currently work. And any run where a human corrected the agent mid-flight, which is the highest-signal population of all because a human explicitly marked the moment it went wrong.

**DANA:** That last one is a nice observation.

**THEO:** It's the highest-value label you get for free. A user typing "no, not that file, the one in `internal/`" has told you exactly where the retrieval failed and what the right answer was. Harvest those systematically. I'd instrument specifically for it -- flag any run containing a mid-run user correction, because it's a labeled failure with a supplied ground truth.

**DANA:** How big does an eval set need to be?

**THEO:** Smaller than people think for detecting large regressions, larger than people think for detecting small improvements. Fifty to a hundred tasks will reliably catch something that broke badly. Detecting a three-percent improvement needs hundreds, because the run-to-run variance of an agent is substantial. Which leads to advice I'd give firmly: don't chase small deltas on a small suite. If your change moves the number by two points on eighty tasks, you have learned nothing. Either get more tasks or find a change big enough to see.

**DANA:** Metrics. What do you actually measure?

**THEO:** Four families. Outcome: did it succeed by the verifier's definition -- your headline number, and it hides everything, so never look at it alone. Efficiency: steps, tokens, and wall clock to success. Two systems at the same success rate with a two-times token difference are not equivalent systems.

**DANA:** Third.

**THEO:** Trajectory quality, which is the interesting one. Did it take a sensible path? You can measure proxies without judging semantics: redundant tool calls, files read and never used, backtracks, the read-to-write ratio from episode one. These catch a system that succeeds by brute force, which will fall over as tasks get harder even though today's success rate looks fine.

**DANA:** And fourth.

**THEO:** Safety and scope: did it stay in bounds, did it touch files outside the expected set, did it trigger permission denials. Cheap to compute, and it catches the class where the agent did the task and also did four things nobody asked for.

**DANA:** Let's talk about pass at k, because it comes up and I think it's often misused.

**THEO:** It's frequently misused. Pass at k is: run the task k times, count success if any run succeeds. It's the right metric when your *deployment* actually takes k attempts and has a reliable way to pick the winner. If you generate five patches and your test suite picks the one that passes, pass at five is exactly what you care about. But if you deploy a single run and a human reviews it, pass at one is your metric and reporting pass at ten is flattering yourself. Match the metric to the deployment.

**DANA:** Regression gating. How do you wire this into CI?

**THEO:** Tiered by cost, because a full eval suite is too expensive per commit. Tier one on every change: a small fast suite, ten to twenty tasks, minutes, blocking. Tier two nightly: the full suite, blocking the release rather than the commit. Tier three weekly or per-release: expensive scenarios, long-horizon tasks, adversarial cases.

**DANA:** And thresholds?

**THEO:** Gate on a *statistically meaningful* drop, not on any drop, or your gate will flap on noise and people will disable it -- which is the worst outcome, because now you have no gate and a false sense that you do. Compute the run-to-run variance of your suite first. Set the threshold outside it. And gate on cost as well as quality: a change that holds success rate and doubles tokens per task should block, and almost nobody wires that up.

**DANA:** Should any of this be an LLM judge?

**THEO:** Only where you have no alternative, and with everything from episode four applied -- different model, artifact only, binary criteria, fresh context, calibrated against human labels. And I'd add one gating rule specific to evals: never let an unvalidated judge be your blocking metric. If the judge is wrong twenty percent of the time and you gate on a five percent movement, you're gating on the judge's noise.

---

### SEGMENT 4: THE ECONOMICS (7 minutes)

**DANA:** Let's talk money, and start with why tokens per run is the wrong unit.

**THEO:** Because it optimizes the wrong thing. If I halve tokens per run and success drops from seventy percent to forty, I've made the system dramatically more expensive, because every failure costs the run plus a retry plus human time. The correct unit is cost per *resolved* task -- total spend across all attempts, divided by the number of tasks actually completed.

**DANA:** Give me the full formula.

**THEO:** Take a population of tasks. Sum all model spend across every attempt, including failures. Add tool and infrastructure cost -- CI minutes, sandbox compute, indexing. Add the human cost of review and of fixing bad outputs, at a real loaded rate. Divide by the number of tasks that reached an acceptable outcome. That number is comparable across configurations, across model choices, and against the cost of not using an agent at all.

**DANA:** The human term is the one people leave out.

**THEO:** And it usually dominates. If your agent produces a change that takes an engineer twenty minutes to review and correct, that's a meaningful cost, often larger than the model spend. Which produces a conclusion people find uncomfortable: it is frequently correct to spend *more* on the agent -- more verification, more retrieval, more careful generation -- if it reduces review time. The optimization target is total cost, and the model bill is often not the largest term.

**DANA:** What are the biggest levers on the model bill itself?

**THEO:** Four, roughly in order of impact. Prompt caching, which is up to an order of magnitude on your input tokens and is a layout question, not a model question -- episode two. Context discipline, because every unnecessary token is paid on every subsequent call in the run; the multiplier is the loop length. Model tiering -- using a cheaper model for mechanical stages like classification, extraction, and formatting, reserving the expensive one for the hard reasoning. And avoided work: better retrieval means fewer exploratory steps, and a step you don't take is the cheapest step there is.

**DANA:** Any guidance on model tiering, because it seems easy to get wrong?

**THEO:** The failure mode is tiering the wrong stage. Downgrading the stage that decides *what to do* is usually a mistake -- errors there cascade through everything downstream. Downgrading stages that transform or classify a well-specified input is usually safe. So: expensive model for planning and for hard verification, cheap model for extraction, summarization, routing, and formatting. And measure it rather than assuming, because the boundary moves as models change.

**DANA:** What about latency, as a separate budget?

**THEO:** Separate budget, and the key question is whether a human is waiting. If yes, latency is a product requirement and you should trade tokens for it -- more parallelism, speculative prefetching, smaller models on the critical path. If no, if it's a batch job running overnight, latency is nearly free and you should trade it for quality and cost. Same system, opposite optimizations, and running one configuration for both is how you end up with an interactive tool that's too slow and a batch job that's too expensive.

**DANA:** How do you decide whether the whole thing is worth it?

**THEO:** Compare cost per resolved task against the fully loaded cost of the human path for the same task, and be honest about the quality difference. And measure the *marginal* case, not the average: for a class of task where the agent succeeds ninety percent of the time, the economics are usually overwhelming. For one where it succeeds thirty percent, the human is paying the full cost of doing it themselves *plus* the cost of reviewing seven failed attempts, and that's worse than not having the agent. Which is an argument for scoping deployment by task class rather than turning it on for everything.

---

### SEGMENT 5: BUILD VERSUS ADOPT (5 minutes)

**DANA:** Season close. What should people build and what should they take off the shelf?

**THEO:** Let me split it into three buckets. Commodity, take it: the model call layer, the basic loop, standard tool implementations for file operations and shell and search, the tool protocol plumbing, sandbox runtimes, and general-purpose observability backends. These are solved, they're commoditized, and building them yourself is a way to spend three months arriving where you started.

**DANA:** Bucket two.

**THEO:** Yours, build it: everything that encodes knowledge specific to your environment. Your retrieval layer, because your code graph and your ontology are about your systems. Your evals, because they're derived from your traces and your definition of done. Your tool descriptions, because they encode your conventions. Your permission policy, because it reflects your risk posture. Your verifiers. This bucket is where the durable value is, and it's the bucket people neglect because it's less fun than building a framework.

**DANA:** And bucket three?

**THEO:** Contested, and it depends on you: the orchestration layer, memory and compaction, and the trace schema. Off-the-shelf orchestration is fine until your control flow gets specific, and then you're fighting the framework. My general rule is to adopt for orchestration until you can articulate what you need that it doesn't do -- and when you can articulate it precisely, that's the signal to build. Building first, on speculation, is how you end up maintaining a worse version of something that already existed.

**DANA:** Anything you've changed your mind about over the season?

**THEO:** Two things. I used to think model choice was a bigger lever than it is. The gap between a well-harnessed weaker model and a poorly-harnessed stronger one is larger than the gap between the models, and I've now seen that enough times to state it flatly. And I've become much more insistent about the boring infrastructure -- the trace, the journal, the metrics. I used to treat those as something you add once the interesting part works. They're what makes the interesting part improvable, and every week you run without them is a week of data you can't recover.

**DANA:** What would you tell someone starting from scratch tomorrow?

**THEO:** In order. Write the journal first, before the agent does anything useful. Build the smallest loop that does one real task. Add one hard verifier. Get twenty tasks into an eval set from real usage. Then start improving, and let the numbers tell you where. What you should not do is design the beautiful multi-agent architecture first. You'll build a topology for a problem you don't understand yet, and the measurement layer that would have told you it was wrong is the thing you skipped.

---

### CLOSING (4 minutes)

**DANA:** Let's close the season. Episode eight: write the trace first, before evals, before dashboards. Run header with every version you might later need to attribute a regression to, per-step records with full inputs, reasoning, tool arguments, results, token breakdowns including cached input, and latencies. Newline-delimited JSON in a file. Forty lines of code.

**THEO:** Replay is the payoff -- key model calls on their inputs and a near-identical run costs nothing, which turns a ten-minute debug cycle into twenty seconds. It requires determinism in the orchestration layer, so ban the clock and the random source outright. Know whether you're doing pure replay, resume with re-execution, or snapshot restore, and be explicit about which of your runs are actually replayable.

**DANA:** Build eval sets from production traces, not from imagination -- failures, grinding successes, ordinary successes, and above all the runs where a human corrected the agent mid-flight, because those come with free ground truth. Measure four families: outcome, efficiency, trajectory quality, and scope safety. Gate in tiers, gate outside the noise band, and gate on cost as well as quality.

**THEO:** And the economics: cost per *resolved* task, including human review time, which usually dominates the model bill. Which means spending more on verification is frequently the cheaper choice. The four levers are caching, context discipline, model tiering on stages that transform rather than decide, and better retrieval so steps don't happen at all.

**DANA:** Let me try the season through-line. Eight episodes, one argument: the model is the least controllable component in your system, so the engineering is everything you put around it. Termination criteria instead of hoping it stops. Context allocation instead of hoping it remembers. Isolation instead of hoping it stays focused. Verifiers instead of hoping it's right. Graphs instead of hoping similarity is enough. Permissions and sandboxes instead of hoping it behaves. And traces instead of hoping you'll remember what changed.

**THEO:** That's the season. And the encouraging part is that essentially none of it is exotic. It's allocation, scheduling, indexing, verification, isolation, and logging -- systems engineering, applied to a stochastic component. Which means the people best positioned to do this well are the ones who already know how to build reliable systems out of unreliable parts. That's not a new skill. It's the oldest one we have.

**DANA:** Thank you for spending the season with us.

**THEO:** Go write a journal.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

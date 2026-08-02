# Episode 3: Topology
## "Fan-Out, Pipelines, Subagents, and Isolation"

**Duration:** ~27 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** This is Control Loop. Dana Okafor here with Theo Lindqvist, and today we're talking about what happens when one loop isn't enough. Topology. The shape of computation when you have many agents instead of one.

**THEO:** And I want to open with a warning, because this is the area of agent engineering with the worst signal-to-noise ratio in the whole field. Multi-agent architectures are the thing people build when they want their system to sound impressive. There are diagrams with a manager agent and a researcher agent and a critic agent and a writer agent, and they pass messages in a beautiful circle, and the system performs worse than a single well-scoped loop.

**DANA:** So let's set the bar at the top. When is more than one agent actually the right answer?

**THEO:** Three reasons, and I'd argue only three. One: context isolation -- a subtask needs a lot of context that the parent must not accumulate. Two: genuine parallelism -- independent work that can happen simultaneously and you want the wall clock back. Three: perspective independence -- you specifically want an assessment that is *not* conditioned on the reasoning that produced the artifact. That's it. If your reason for adding an agent isn't on that list, you're adding failure modes for aesthetics.

**DANA:** And notably "different agents have different specialties" is not on the list.

**THEO:** It's not, and that's the one that surprises people. The intuition comes from human org design, where specialization is real because humans can't be experts in everything. A model doesn't have that constraint. Giving one model a "you are a security expert" system prompt and another "you are a performance expert" doesn't create two different capabilities -- it creates two different *attention framings* over the same capability. That can be valuable, but the value comes from the framing diversity, which is reason three, not from specialization per se.

**DANA:** Okay. Here's the plan. First, the isolation argument, properly. Then the two fundamental concurrency structures -- fan-out with a barrier versus pipelining without one, and the wall-clock math, which I think most people have never done. Then orchestration: deterministic scripts versus model-driven delegation. Then filesystem isolation and worktrees. Then failure semantics in a distributed loop. And finally the anti-patterns, including the telephone game you promised.

---

### SEGMENT 1: A SUBAGENT IS A CONTEXT BOUNDARY (8 minutes)

**THEO:** Let's take the isolation argument seriously because I think it's the strongest one and it's usually stated as an afterthought.

**DANA:** Set up the scenario.

**THEO:** Your agent needs to answer a question that requires reading nine files across four directories to determine one fact -- say, "which module owns the retry policy." If the agent does that inline, its context grows by however many tokens those nine files are. Call it forty thousand. And that forty thousand stays there for the rest of the run, diluting every subsequent decision, costing money on every subsequent call, and pushing you toward compaction sooner.

**DANA:** Versus delegating.

**THEO:** Versus spawning a subagent whose entire job is to answer that question. It reads the nine files in its own window, forms the answer, and returns one sentence. The parent's context grows by one sentence. You paid for the forty thousand tokens once, in a context that gets thrown away, instead of carrying it forward as permanent freight.

**DANA:** So the accounting is: you pay the read cost either way, but delegation makes it non-recurring.

**THEO:** That's the crisp version, and it's why the value of isolation scales with how long the parent run continues afterward. If the parent is about to finish, isolation saves nothing. If the parent has forty more steps, you've saved forty calls' worth of carrying forty thousand tokens. That's the calculation, and it's usually decisive for search and exploration tasks.

**DANA:** Which is why the "explore the codebase" subagent is such a common pattern.

**THEO:** It's common because it's correct. Broad search is the ideal delegation candidate: high context cost, low result size, and the intermediate material is genuinely worthless afterward. The parent doesn't want the file dumps. It wants the conclusion.

**DANA:** What's the failure mode of delegation-for-isolation?

**THEO:** Under-specification of the return. The subagent reads everything, forms a rich understanding, and returns a summary that's missing the one detail the parent needed, and the parent has no way to know it's missing. Now the parent proceeds on incomplete information with high confidence. This is the telephone game in its simplest form.

**DANA:** How do you defend against it?

**THEO:** Schema-forced returns, which I'd call the single most valuable technique in multi-agent engineering. Instead of asking for a text summary, you define a structured output schema -- the exact fields the parent needs -- and force the subagent to fill it. Now "which file, which line, which symbol, what confidence" are required fields, not things the subagent might mention.

**DANA:** And you get validation for free.

**THEO:** You get validation, you get a retry on mismatch, and you get something even better: the schema is a *specification of what the parent needs*, written down. Which forces you, the engineer, to actually decide what the parent needs before you spawn anything. Half the value is in being made to think about it.

**DANA:** Any guidance on how much context to give the subagent?

**THEO:** This is the tension at the heart of delegation, and it's worth naming. The whole point is that the subagent has a *separate* context, which means it doesn't know what the parent knows. So you have to brief it, and the briefing costs tokens, and if you under-brief you get a context-starved agent doing confidently irrelevant work.

**DANA:** Give me the heuristic.

**THEO:** Brief with the *task-relevant* subset, plus the constraint that makes a wrong answer detectable. Concretely, for a search subagent: what you're looking for, why -- because the "why" lets it recognize a near-miss -- where you think it might be, and what a good answer looks like. That's usually two or three hundred tokens and it roughly doubles the hit rate versus a bare instruction. Under-briefing is the more common error by a lot.

**DANA:** Is there a case where you'd give the subagent the *parent's entire context*?

**THEO:** There is, and it's a distinct pattern worth naming separately -- forking rather than spawning. A fork inherits the full parent context and continues from it. You'd do that when the subtask genuinely requires everything the parent knows but you don't want its output volume back. It's expensive on the initial call and it eliminates the briefing problem entirely. Rule of thumb: spawn fresh for search and independent assessment, fork for continuation work that needs full history.

---

### SEGMENT 2: BARRIERS VERSUS PIPELINES (9 minutes)

**DANA:** Let's do the concurrency structures, and I want to do the wall-clock math explicitly because I think it's the most useful thing in this episode.

**THEO:** Set up the scenario.

**DANA:** I have five items. Each item goes through three stages. Stage one takes between two and six minutes depending on the item. Stage two takes one to three. Stage three takes two to four. Two structures available: run all five through stage one, wait for all of them, then all five through stage two, wait, then stage three. Or: let each item flow through all three stages independently, no waiting.

**THEO:** So the first one -- the barrier structure -- has wall clock equal to the sum of the per-stage maximums. Slowest stage one is six, slowest stage two is three, slowest stage three is four. Six plus three plus four is thirteen minutes.

**DANA:** And the pipeline?

**THEO:** Wall clock equals the slowest single *chain*. Whichever item has the worst total across its own three stages. If the item that's slow in stage one happens to be fast in stages two and three, its chain might be six plus one plus two, which is nine. And the true answer is the max over items of their own sums, which is bounded by thirteen and usually well below it.

**DANA:** So the barrier is never faster.

**THEO:** Never faster, frequently much slower, and the gap widens with variance. If all your items take identical time, the two structures are equivalent. The more your items vary -- which in real work is a lot -- the more the barrier wastes. Every fast item sits idle at each barrier waiting for the slowest one, three separate times.

**DANA:** Which means the default should be pipeline.

**THEO:** The default should be pipeline, and I'd go further: barriers should require justification. In code review terms, a barrier is a thing you should have to explain.

**DANA:** So when is a barrier actually required?

**THEO:** Three cases, and they share a property: stage N needs *cross-item* information from stage N minus one. First, deduplication or merging. If five finders each produce a list and you need to remove duplicates across the whole set before doing expensive downstream verification, you genuinely need all five lists in hand. Second, early exit on an aggregate condition. "If zero findings total, skip verification entirely" requires knowing the total. Third, comparison -- if stage two's prompt says "here are the other four proposals, rank them," it needs the other four.

**DANA:** And the non-reasons?

**THEO:** The big one: "I need to flatten or map or filter the results before the next stage." That's not a cross-item dependency, that's a transformation, and you can do it inside a pipeline stage per item. I see this constantly -- someone writes collect, transform, collect, and the middle transform doesn't need any cross-item information at all. It's a barrier for the convenience of the code shape.

**DANA:** The other non-reason I'd add is "the stages are conceptually different phases."

**THEO:** Right, and that's a mental model artifact. Separate stages don't need to be *synchronized* stages. The pipeline models sequential dependency per item perfectly well without global synchronization. If you find yourself saying "well, first everything gets reviewed and then everything gets verified," ask whether item A's verification actually depends on item B's review. Almost always it doesn't.

**DANA:** Let's talk about concurrency limits, because unbounded fan-out is its own problem.

**THEO:** It is. In practice you're bounded by rate limits, by local CPU if the agents are doing real work, and by cost. A sensible cap is somewhere in the low double digits of simultaneous agents. The important design property is that the cap should be a *scheduler* concern, not a structure concern. You should be able to hand a pipeline a hundred items and have ten run at a time, rather than having to chunk into batches of ten yourself. Manual chunking reintroduces barriers between chunks -- you've built the thing you were trying to avoid.

**DANA:** What about the case where fan-out width should depend on the budget?

**THEO:** That's a nice pattern and it's easy to implement once budget is a first-class input. Width equals remaining budget divided by expected cost per agent, floored, with a minimum. Or the dynamic version: keep launching while remaining budget exceeds a threshold. That way a generous budget produces a thorough sweep and a tight one produces a focused pass, without you writing two code paths.

**DANA:** Any guidance on how to decompose work into items in the first place? Because the decomposition determines whether any of this helps.

**THEO:** The property you want is independence -- items that don't need to know about each other. Good decompositions in practice: by file or module, by dimension of analysis, by test case, by search strategy. Bad decompositions: by sequential phase of a single artifact, because those aren't independent, they're a chain. If you find yourself passing large state between "parallel" workers, they aren't parallel and you should collapse them into one agent.

---

### SEGMENT 3: ORCHESTRATION -- SCRIPT OR MODEL (7 minutes)

**DANA:** Now the control question. Who decides the topology at runtime? A deterministic program, or a model?

**THEO:** And this is a genuine architectural fork with real trade-offs, so let me lay out both honestly. Model-driven delegation: the parent agent has a "spawn subagent" tool and decides for itself when and how many to launch. Script-driven: a deterministic program defines the fan-out, the stages, and the aggregation, and calls agents as functions.

**DANA:** Start with model-driven.

**THEO:** Strengths are adaptivity and simplicity of implementation. The parent can decide, based on what it discovered, that this particular task needs three searches instead of one. You don't have to anticipate the shape. And it composes naturally -- it's just another tool. Weaknesses: it's nondeterministic, which makes it hard to test, hard to cost-predict, and hard to reason about. It's also prone to over-delegation, because spawning is cheap from the parent's perspective and the parent doesn't feel the bill.

**DANA:** And script-driven.

**THEO:** Strengths are predictability, testability, and explicit cost bounds. You know exactly how many agents will run and in what shape. You can replay it. You can put a loop with a condition in it and know the condition is evaluated correctly rather than approximately. Weakness is rigidity -- the shape has to be known before you start, and if the work turns out to have a different structure, the script doesn't adapt.

**DANA:** So how do you choose?

**THEO:** The hybrid, and I want to be specific about it because I think it's the actually-correct answer most of the time. You use model-driven exploration to *discover the work list*, and then a script to *process it*. The parent agent does whatever unstructured investigation is needed to enumerate the items -- find all the call sites, list the affected modules, identify the dimensions to review. That's the part where you can't know the shape in advance. Then you hand that list to a deterministic pipeline.

**DANA:** So the nondeterminism is confined to discovery.

**THEO:** Confined to discovery, and the expensive fan-out is deterministic. You get adaptivity where you need it and predictability where it matters. And you get a nice property for debugging: when something goes wrong, you know whether the work list was wrong or the processing was wrong, because they're separate phases with an inspectable artifact between them.

**DANA:** What about depth? Can subagents spawn subagents?

**THEO:** They can and mostly they shouldn't. My default is a hard limit of one level. The reasons are compounding: each level adds a briefing loss and a return summarization loss, so information degrades multiplicatively. Cost becomes hard to bound -- a fan-out of ten at each of three levels is a thousand agents and nobody wrote that number down. And debugging a three-level tree where the failure is at a leaf is genuinely miserable. If you think you need depth, what you usually need is a better decomposition at the top level.

**DANA:** Is there a case for depth?

**THEO:** Genuine hierarchical decomposition of a very large task -- a migration across a large monorepo where level one is "per service" and level two is "per file within service." Even then I'd push toward flattening: enumerate all files up front and run one wide pipeline, rather than nesting. Wide and shallow beats narrow and deep, for the same reason it does in most systems work.

---

### SEGMENT 4: FILESYSTEM ISOLATION (6 minutes)

**DANA:** Let's get concrete about state. If I have ten agents running in parallel and they all write to the same repository, what happens?

**THEO:** Corruption, and the specific flavor is nasty because it's often silent. Agent A reads file X, agent B modifies file X, agent A writes its version based on the stale read, B's change is gone. No error. No conflict marker. Just a lost edit that surfaces later as a mysterious bug.

**DANA:** So what's the fix?

**THEO:** Isolation, and the good news is git gives it to you almost for free. A worktree is a separate checkout of the same repository sharing the object store. Each agent gets its own working directory, does its work, commits. No shared mutable filesystem state. When they're done you merge, and conflicts become *actual* conflicts that a merge tool reports, rather than silent overwrites.

**DANA:** What does it cost?

**THEO:** Setup is a few hundred milliseconds per worktree plus disk for the working tree -- the object store is shared, so it's cheaper than a clone. Real but modest. The guidance I'd give: use worktrees when agents *mutate* files in parallel. Don't use them for read-only agents, which is the majority case for search and analysis fan-outs. Paying setup cost for ten read-only searchers is pure waste.

**DANA:** How do you handle merging when ten agents each produced a change?

**THEO:** Three approaches, in increasing order of sophistication. Sequential merge with conflict abort -- merge them one at a time, and if any conflicts, stop and hand it to a human. Crude but safe. Second, partition by ownership up front: assign disjoint file sets to each agent so merges can't conflict by construction. This is the best option when your decomposition allows it, and it's another argument for decomposing by module. Third, agentic merge -- when a conflict occurs, spawn an agent whose job is to resolve that specific conflict with both sides and the shared ancestor in context. That works surprisingly well and it's the right escape hatch, but I wouldn't make it the primary path.

**DANA:** What about non-filesystem shared state? Databases, external services.

**THEO:** Much harder, and my honest advice is to avoid it. If your parallel agents need to mutate a shared external system, either serialize those mutations through a single writer, or give each agent its own instance -- an ephemeral database per agent is often cheaper than the debugging. The general principle: parallelism is only safe over resources you can partition or replicate. Anything you can't do either to becomes a serialization point, and pretending otherwise produces intermittent failures that will consume weeks.

---

### SEGMENT 5: FAILURE SEMANTICS (5 minutes)

**DANA:** Distributed systems have failure modes that single systems don't. What are the agent-specific ones?

**THEO:** Start with the simplest and most important: partial failure. You launched ten agents. Seven succeeded, two returned garbage, one died on a provider error after retries. What does your aggregation do?

**DANA:** And the wrong answer is to throw.

**THEO:** The wrong answer is to throw, because you've discarded seven successful results over one failure. The right default is that a failed agent yields a null in the result array and the aggregation filters it out. Which means every consumer of a fan-out result has to handle nulls, and forgetting to is one of the most common bugs I see -- you get a crash downstream on `undefined.findings` and the actual cause was an agent dying two stages earlier.

**DANA:** How do you decide between retry and drop?

**THEO:** By failure class. Transient infrastructure failures -- rate limits, timeouts, connection resets -- retry with backoff, and the harness should do this transparently so it never reaches your logic. Semantic failures, where the agent ran fine but produced something unusable, generally don't benefit from a naive retry; the same prompt gives you the same result. If you retry those, vary something -- the framing, the temperature, the briefing.

**DANA:** And the third class?

**THEO:** Budget or policy failures, where the agent was stopped rather than broken. Those should be distinguishable in the result, because the response is different: you might want to retry with a larger allowance, or you might want to report incomplete coverage. Which brings me to the thing I most want to say in this segment: if your fan-out covered eight of ten items because two failed, *say so*. Silent partial coverage is the worst outcome in the whole episode, because a report that looks complete and isn't will be trusted.

**DANA:** Log the drop.

**THEO:** Log the drop, surface the drop, put it in the summary. Same for any cap you applied -- if you took the top twenty of two hundred candidates, the output must say "twenty of two hundred." Otherwise a sampling decision reads as an exhaustive result, and someone makes a decision on it.

---

### SEGMENT 6: ANTI-PATTERNS (5 minutes)

**DANA:** Give me the anti-pattern list.

**THEO:** Five. First, over-decomposition. Splitting a task into eight agents where two would do. Symptom: agents that each do a trivial amount of work and spend most of their tokens on briefing and returning. If the coordination overhead exceeds the work, collapse it.

**DANA:** Second.

**THEO:** Context-starved subagents, which we covered -- under-briefed agents doing confident irrelevant work. Symptom: subagent outputs that are well-formed and don't answer the question. Fix is a richer briefing and a forced schema.

**DANA:** Third is the telephone game, which you've promised twice now.

**THEO:** The telephone game is what happens when information passes through multiple summarization boundaries. Agent A reads the source and summarizes for agent B. B works from the summary and summarizes for C. C makes a decision. C is now three lossy compressions away from the ground truth, and the compressions were performed by a system optimized for plausibility. The output will be coherent and may be substantially false, and there's no error anywhere in the chain.

**DANA:** What's the defense?

**THEO:** Two things. Minimize hops -- this is the real argument against depth. And carry *pointers alongside summaries*. If B's summary includes "see `src/retry.go` lines 40 to 90," then C can go read the ground truth rather than trusting the chain. That single discipline -- every claim carries a citation to a re-readable source -- converts a lossy chain into a lossy chain with an escape hatch. I'd make it a hard requirement in any schema that crosses an agent boundary.

**DANA:** Fourth.

**THEO:** Redundant verification, which is subtle. You spawn three verifiers to check a finding, and all three are the same model with the same prompt on the same input. You've spent three times the tokens for something close to one vote, because their errors are highly correlated. If you want genuine independence you need *diversity* -- different framings, different evidence, different questions. Three verifiers asking "is this correct," "is this exploitable," and "does this actually reproduce" are worth far more than three asking "is this good."

**DANA:** And fifth.

**THEO:** The org-chart fallacy, which is where we started. Building a manager agent and a team of specialist agents because that's how human organizations work. Human org structure exists to solve human constraints -- limited individual knowledge, communication bandwidth, accountability. Those constraints don't transfer. Build the topology your *computation* needs, not the topology your company has.

---

### CLOSING (3 minutes)

**DANA:** Landing it. Three legitimate reasons for multiple agents: context isolation, genuine parallelism, and perspective independence. Specialization is not on the list.

**THEO:** A subagent is fundamentally a context boundary, and the isolation payoff scales with how long the parent runs afterward. Brief richly, force a schema on the return, and make every cross-boundary claim carry a pointer back to the source.

**DANA:** Pipeline by default; a barrier should require justification. It's only warranted when a stage genuinely needs cross-item information -- dedup, aggregate early exit, or comparison. "I need to transform the results" is not a reason.

**THEO:** Hybrid orchestration is usually right: model-driven discovery of the work list, deterministic script for the fan-out. Depth is almost always a mistake -- wide and shallow beats narrow and deep. Isolate the filesystem with worktrees when agents write in parallel, and partition by ownership when you can.

**DANA:** And on failures: partial results are the norm, nulls must be handled everywhere, and any dropped item or applied cap must be stated in the output. Silent partial coverage is the worst failure in this episode because it looks like success.

**THEO:** Next time we go deep on the thing that makes all of this trustworthy, which is verification. Why generation is cheap and verification is the real constraint, how to build judge panels that aren't just expensive echo chambers, adversarial refutation, and the loop-until-dry pattern done correctly.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

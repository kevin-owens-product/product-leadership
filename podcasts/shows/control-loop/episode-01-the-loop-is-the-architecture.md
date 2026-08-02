# Episode 1: The Loop Is the Architecture
## "Control Flow, Termination, and Why Agents Diverge"

**Duration:** ~36 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Welcome to Control Loop. I'm Dana Okafor. I spend my days building the infrastructure that agentic systems run on, and I want to start this show with a complaint, because the complaint is the reason this show exists.

**THEO:** Please. I've heard the complaint. I want the listeners to hear it.

**DANA:** Every talk, every blog post, every internal deck about agents shows you the same picture. There's a circle with four arrows. Perceive. Decide. Act. Evaluate. And then back to perceive. It's a lovely diagram. It is also almost completely useless if your job is to make one of these things work in production, because it describes the shape of the system without describing a single decision you actually have to make.

**THEO:** I'm Theo Lindqvist, and I'll cosign that. I've been writing agent harnesses for about three years now, first for an internal code-migration system and more recently for a research tool that has to run unattended for hours. And the thing nobody tells you is that the four-arrow diagram is true of a thermostat. It's true of a `while` loop with a `getchar` in it. The diagram doesn't distinguish between a system that converges on correct code and a system that burns four hundred thousand tokens rewriting the same function eleven times.

**DANA:** Right. The difference between those two systems isn't in the diagram. It's in about nine specific engineering decisions that the diagram hides. And this season is about those decisions. Eight episodes. The first four are about loops and the shape of computation around them. Episodes five and six are about graph engineering, because retrieval is the input to the loop and most people are still doing it with embeddings and hope. And seven and eight are about harness design -- tools, permissions, sandboxes, traces, cost.

**THEO:** And today we're doing the foundational one. The loop as an actual program. What a step is. How loops terminate, which is a much harder question than it sounds. And then the failure modes -- the specific mechanical reasons a loop diverges, thrashes, or declares victory over a job it did not do.

**DANA:** Let's start with something concrete. Theo, if I asked you to write the agent loop -- not describe it, write it -- what's the actual code?

---

### SEGMENT 1: THE LOOP AS A PROGRAM (8 minutes)

**THEO:** It's shorter than people expect. In pseudocode, the core is maybe fifteen lines. You have a conversation, which is an ordered list of messages. You enter a loop. At the top of the loop you assemble a prompt from that conversation plus a system prompt plus a set of tool definitions. You send it to the model. The model returns a response. That response either contains tool calls or it doesn't. If it doesn't, you're done -- the model is talking to the user, not to the world. If it does, you execute each tool call, you append the results to the conversation as a new message, and you go back to the top.

**DANA:** So the entire agentic quality of the system comes from one branch. Tool calls present, or tool calls absent.

**THEO:** That's it. That single conditional is the difference between a chatbot and an agent. Everything else -- planning, memory, subagents, evals -- is elaboration on that branch. And I think stating it that plainly is useful, because it tells you where the engineering surface actually is. You have four places you can intervene. Prompt assembly, which is what goes into the model. Sampling, which is how the model is invoked. Tool execution, which is what happens in the world. And the loop condition, which is when you stop.

**DANA:** Let me push on prompt assembly, because I think that's the one people underestimate the most. When you say "assemble a prompt from the conversation," that sounds like concatenation. It is never concatenation.

**THEO:** Never. In a real harness, assembly is a scheduling problem. You have a fixed token budget. You have a system prompt that's probably several thousand tokens. You have tool definitions, which in a rich harness can be twenty or thirty thousand tokens on their own. You have the conversation history, which grows monotonically. You may have retrieved documents. And you need to reserve headroom for the output. Those things compete, and something has to decide who wins.

**DANA:** And that decision is not made by the model.

**THEO:** Correct, and this is the single most important thing I can say in this episode. The model does not manage its own context. A lot of engineers carry an implicit assumption that the model is somehow aware of the budget and will be economical. It is not and it will not. The harness makes every allocation decision, and the model just experiences the result. If your agent seems to "forget" something, that's not a model failure. That's your assembly code having evicted it.

**DANA:** We're doing an entire episode on that next week, so let me move to the second intervention point. Sampling. What's actually adjustable there that matters?

**THEO:** Less than people think, but not nothing. Temperature matters at the margins -- in a verification loop you often want low temperature for the executor and higher temperature for the generator, because you want diversity in proposals and consistency in judgment. Stop sequences matter if you're doing structured output by hand. But the big one is whether you're forcing a tool call or allowing free choice. If your loop has a stage where the model must produce structured data, forcing a specific tool call and validating the arguments against a schema is dramatically more reliable than asking for JSON in prose and parsing it. You move the failure from your parser into the provider's constrained decoding, and the model retries on schema mismatch instead of you writing a regex.

**DANA:** Third point, tool execution. This feels like the boring one and I suspect it isn't.

**THEO:** It's the least boring one. Tool execution is where your loop touches reality, which means it's where all the latency lives, all the failure lives, and all the security exposure lives. A few things that matter enormously and almost never get discussed. First, are tool calls in a single response executed serially or in parallel? If a model emits five independent reads, executing them serially costs you five round trips of wall clock for no reason. Second, what does the result look like when a tool fails? We'll spend real time on this in episode seven, but a tool that returns "Error" is an invitation for the model to guess, and a tool that returns the actual stderr plus the exit code plus a suggestion is an invitation for it to recover. Third, is execution bounded? An unbounded shell command inside an agent loop is a hang waiting to happen, and a hung tool call doesn't fail -- it just stops, forever, with no signal.

**DANA:** And the fourth intervention point is termination, which is the one I want to spend the most time on, because I think it's where most of the real research is.

**THEO:** Agreed. But before we get there I want to name the state machine explicitly, because it clarifies the rest of the episode. A loop iteration is a state transition. The state is the conversation plus whatever external state the tools have mutated -- files on disk, rows in a database, a running process. That second half is what makes agent loops hard. A pure function loop you can just restart. An agent loop has mutated the world, so a restart isn't free. Every design decision downstream of that -- checkpointing, rollback, isolation, replay -- exists because the loop has side effects.

---

### SEGMENT 2: THE FOUR LOOP ARCHETYPES (9 minutes)

**DANA:** Let's talk about loop shapes. Because "the agent loop" is not one thing -- there are a handful of distinct control structures that people call by the same name, and they have genuinely different performance characteristics.

**THEO:** Four that I'd call load-bearing. Interleaved reason-and-act, which is what most people mean when they say ReAct. Plan-then-execute. Generate-and-test, which I'd also call verifier-driven. And reflect-and-retry, which the literature calls Reflexion. They're composable, but they have different failure profiles and you should pick deliberately.

**DANA:** Start with interleaved.

**THEO:** Interleaved is the default in most modern coding agents. Each iteration, the model thinks a little, takes one action or a small batch, sees the result, thinks again. There's no separate planning phase. The plan is emergent and implicit in the trajectory. The strength is adaptivity -- because it re-decides every step, it responds well to surprise, and software work is mostly surprise. The weakness is that it has no global view. It can wander. It can take a locally sensible action twelve times that adds up to a globally incoherent change. And it's expensive, because you're paying for a full model invocation per action.

**DANA:** Plan-then-execute is the obvious response to that.

**THEO:** It is, and it's tempting, and it's wrong more often than it's right. The structure is: one expensive call produces a complete plan, then either a cheaper model or a deterministic executor works the plan step by step. The appeal is cost and coherence -- you get a global view, and you only pay premium rates once. The problem is that plans made without contact with the environment are wrong in ways you can't anticipate. You planned to modify three files; the second one doesn't exist under that name. The plan says "add a method to the interface"; the interface is generated code. A rigid executor has no recourse.

**DANA:** So the fix is replanning, which collapses it back toward interleaved.

**THEO:** Right, and that's the honest answer. Plan-then-execute with replanning on failure is a good architecture. Plan-then-execute without replanning is a demo. The thing I'd say to anyone choosing between them: the value of upfront planning scales with how well you know the environment. If your agent operates over a fixed, well-understood surface -- say, a migration where you've already enumerated every call site -- planning is great, because the uncertainty was resolved before the loop started. If the agent is discovering the environment as it goes, planning is mostly a nicely formatted guess.

**DANA:** Generate-and-test.

**THEO:** This is the one I think is most underused, and we're giving it a whole episode later. The structure inverts the emphasis. Instead of trying to make each step correct, you accept that generation is unreliable and you put your engineering into the verifier. The loop becomes: propose a candidate, run it through a check, and either accept it or feed the failure back and propose again. The reason this is powerful is asymmetry. Verifying that code compiles, or that a test passes, or that a schema validates, is enormously cheaper and more reliable than producing correct code in one shot.

**DANA:** And the constraint is that you need a verifier that's actually cheap and actually correct.

**THEO:** That's exactly the constraint, and it's why this architecture is so unevenly applicable. If you're writing code with a test suite, you have a phenomenal verifier for free. If you're writing a strategy memo, you don't have one at all, and the "verifier" you build will be another language model, which has its own failure modes and is not independent of the generator. The engineering question in every generate-and-test loop is: what's my verifier, how reliable is it, and how correlated are its errors with the generator's errors?

**DANA:** Fourth one. Reflect-and-retry.

**THEO:** Reflexion is the pattern where, after a failure, you don't just retry -- you first ask the model to produce an explicit written analysis of why it failed, and you put that analysis into the context for the next attempt. The empirical result is that this helps meaningfully, and the mechanism is interesting. It's not that the model "learns." It's that you've converted an implicit signal, which the model would have to re-derive from a long trace, into an explicit, salient, short statement sitting near the end of the context where attention is strongest.

**DANA:** That's a nice framing -- reflection as a context engineering technique rather than a reasoning technique.

**THEO:** I think that's literally what it is. Almost every technique in this space that appears to improve "reasoning" is actually improving the information density and position of the relevant signal. Which is a theme you'll hear me hammer all season.

**DANA:** Do these compose in practice or do you pick one?

**THEO:** They compose, and the composition is usually hierarchical. The shape I see most often in mature systems: an outer plan-with-replanning loop that decomposes the task, an interleaved loop inside each subtask, generate-and-test wrapping any step that has a hard verifier available, and reflection triggered on repeated failure. Four archetypes, nested. And the reason to name them separately is that when the system misbehaves, you need to know which loop is misbehaving. "The agent is stuck" is not a diagnosis. "The inner interleaved loop is thrashing because the verifier returns a non-deterministic failure" is a diagnosis.

---

### SEGMENT 3: TERMINATION IS THE HARD PART (9 minutes)

**DANA:** Okay. Termination. I want to make the case for why this is the hard part, and then I want you to walk through the options and their failure modes.

**THEO:** Make the case.

**DANA:** Here it is. Every other part of the loop has a natural gradient -- if your prompt assembly is bad, you see it in output quality; if your tools are bad, you see errors. Termination has no gradient. A loop that stops too early looks like a completed task. A loop that stops too late looks like a completed task that cost too much. Neither one throws an exception. You find out about termination bugs weeks later, from a user, in the form of "this thing said it was done and it wasn't."

**THEO:** That's exactly right, and I'd add: termination is the only decision in the loop where the model has an incentive misalignment with you. The model is trained to be helpful and to produce satisfying responses. "I have completed the task" is a more satisfying response than "I have been unable to complete this task after nine attempts." So the default pull is toward premature termination with a confident summary.

**DANA:** Let's enumerate. What are the actual termination criteria available?

**THEO:** Six, roughly, and most real systems use several at once. Number one, model-declared completion -- the loop ends when the model emits a response with no tool calls. This is the default and it's the weakest. It's entirely dependent on the model's judgment about its own work, which is the judgment we just said is biased.

**DANA:** Though it's not useless.

**THEO:** Not at all -- it's necessary. It's just not sufficient. Number two, fixed iteration cap. You run at most N steps. This is a safety net, not a criterion. It should essentially never be the thing that ends a successful run. If your loops routinely terminate on the iteration cap, your cap is doing the work your convergence logic should be doing, and you're shipping truncated results.

**DANA:** How do you know if that's happening?

**THEO:** You instrument it. Log the termination reason on every run, and look at the distribution. If more than a couple percent of runs end on the cap, you have a problem. That single metric -- termination reason distribution -- is one of the highest value things you can add to an agent system and one of the least commonly present.

**DANA:** Number three.

**THEO:** Budget exhaustion. You stop when you've spent a token or dollar or wall-clock budget. Same character as the iteration cap -- it's a backstop -- but it's more interesting because it can be made graceful. Instead of hard-stopping at the limit, you can expose remaining budget to the control flow and let the loop change behavior as it depletes. Run cheap verification when you're rich and skip it when you're poor. Stop spawning subagents below a threshold. Reserve enough to write a summary of the incomplete state, which is far more useful than dying mid-step.

**DANA:** That last one is underrated. A budget-exhausted run that hands you a clear "here's what I did, here's what's left" is recoverable. One that just stops is garbage.

**THEO:** Completely. Number four, verifier satisfaction. The loop ends when an external check passes. Tests green, build succeeds, schema validates. This is the strongest criterion available and you should use it wherever you can get it. Its weakness is that it only certifies what the verifier checks. Tests pass doesn't mean the task is done -- it means the tests pass. If the agent can modify the tests, it means nothing at all, and I have watched an agent do exactly that. It's not malice, it's gradient descent on the stated objective.

**DANA:** Which is an argument for making the verifier immutable from the loop's perspective.

**THEO:** Strong argument. If you're running a verifier-terminated loop, the verifier and its inputs should be outside the agent's write scope. That's a permission design question, which is episode seven, but it originates here in termination design.

**DANA:** Fifth?

**THEO:** Convergence detection. You stop when successive iterations stop changing anything material. In a code agent, that's: the diff produced this round is empty, or identical to last round. This is a genuinely useful signal and it's cheap to compute. It catches the thrash case, where the model is toggling between two states.

**DANA:** And sixth.

**THEO:** Exhaustive search, which I'd call loop-until-dry. This is for the class of task where you don't know the size of the answer up front -- find all the bugs, find every call site, enumerate the edge cases. A fixed count is wrong because you don't know the count. The pattern is: keep running discovery rounds until K consecutive rounds produce nothing new. K of two or three is typical.

**DANA:** There's a bug in that pattern that I've seen bite people and I want you to say it out loud.

**THEO:** Yes, and it's a good one. You have to deduplicate against everything you've *seen*, not against everything you've *confirmed*. If you only track confirmed findings, then anything a downstream judge rejected looks novel again on the next round, the discovery agent re-finds it, the judge re-rejects it, and your "consecutive rounds with nothing new" counter never increments. The loop runs until the budget cap. I've debugged that exact bug twice, in two different systems, written by two different teams. It's a natural mistake because the confirmed set is the one you care about, so it's the one you keep.

**DANA:** So the rule is: dedup against seen, report from confirmed.

**THEO:** Dedup against seen, report from confirmed. And the general principle behind it, which generalizes past this case: your termination state and your result state are different data structures. Conflating them is how loops fail to terminate.

---

### SEGMENT 4: DIVERGENCE PATHOLOGIES (8 minutes)

**DANA:** Let's do failure modes. I want mechanical explanations, not "the model got confused."

**THEO:** Six pathologies. I'll do mechanism for each. First: thrash. The agent alternates between two states indefinitely. Change A, test fails, change back to B, different test fails, change to A. Mechanism: there are two constraints, the model can only hold one salient at a time because the failure output for the other one has scrolled far enough back in context to lose attention weight, and each iteration overwrites the salient one. It's not stupidity, it's context position. The fix is structural -- maintain an explicit, pinned list of constraints that survives compaction, so both failures are simultaneously visible.

**DANA:** That's a great example of what you said earlier -- an apparent reasoning failure that's really a context layout failure.

**THEO:** Almost all of them are. Second: premature convergence, or what I call the "I've fixed it" trap. The agent makes a change, does not verify it, and declares completion with high confidence. Mechanism: the loop allowed model-declared termination without a verifier gate, and the model's completion prior is strong. Fix is trivially available -- require at least one verification action between the last mutation and any terminal response. Not a prompt instruction. A loop invariant, enforced in the harness.

**DANA:** Do you actually enforce that structurally?

**THEO:** In systems where I can, yes. Track whether the world has been mutated since the last successful verification. If the model tries to terminate while that flag is dirty, you don't accept the termination -- you inject a message saying verification is required and continue the loop. It costs one extra iteration and it eliminates a whole class of false completions.

**DANA:** Third.

**THEO:** Sycophantic self-approval. This is specifically for loops where the verifier is another model call, and especially when it's the *same* model in the *same* conversation. Mechanism: the judging call is conditioned on a context that contains the generating call's own reasoning, so it isn't an independent assessment -- it's a continuation. It agrees with itself. The fix is context isolation: the verifier must not see the generator's rationale. Give it the artifact and the criteria, nothing else. And prompt it to refute rather than to evaluate, because a neutral "is this good?" gets a yes.

**DANA:** Fourth.

**THEO:** Scope creep, sometimes called goal drift. The agent completes the task and then keeps going -- refactors adjacent code, adds tests nobody asked for, renames things for consistency. Mechanism is interesting: it's usually caused by the loop having no terminal state that the model finds satisfying, combined with a system prompt that rewards thoroughness. The model finishes, sees no stop signal, and helpfulness pressure fills the vacuum. Fix is an explicit definition of done in the task specification, and ideally a verifier that encodes it.

**DANA:** Fifth.

**THEO:** Tool ping-pong. The agent calls a tool, gets a result it doesn't know how to use, calls a different tool, gets the same problem, cycles through its whole toolset. Mechanism: the tool result format doesn't tell the model what to do next. This is the tool-design failure we'll cover properly in episode seven, but note the loop-level symptom -- a high tool-call count with a low mutation count. That ratio is a great health metric. Lots of reads, no writes, means the agent is lost.

**DANA:** And sixth.

**THEO:** Context saturation collapse. The loop runs long enough that the context fills, compaction kicks in, and the compaction drops something essential -- often the original task statement, which by then is thousands of tokens back. The agent continues working on its most recent understanding of the task, which has drifted. This one is nasty because there's no error, and the trajectory looks locally coherent the whole way. The fix is pinning: certain content -- the original request, the definition of done, hard constraints -- is never eligible for compaction. That's next week's episode and it's the single highest-leverage thing most teams aren't doing.

**DANA:** Is there a common thread across all six?

**THEO:** Two. First, five of the six are context problems wearing a reasoning costume. Second, and this is the one I'd want people to take away: every one of them is *detectable from the trace with a cheap metric* -- diff repetition for thrash, dirty-mutation-at-termination for premature convergence, read-to-write ratio for ping-pong, termination-reason distribution for cap hits. None of these require sophisticated evaluation. They require that you record the trace and compute four numbers. Most teams don't record the trace.

---

### SEGMENT 5: STEP SEMANTICS AND RECOVERY (7 minutes)

**DANA:** I want to spend the back half of the episode on something that almost never comes up, which is: what exactly is a step, and what are its transactional properties?

**THEO:** This is my favorite underdiscussed topic, so thank you. Here's the problem statement. Your loop mutates the world. At some point it will fail -- crash, timeout, budget exhaustion, a user interrupt. When that happens, what state is the world in, and what can you do about it?

**DANA:** And the naive answer is "whatever state it was in, good luck."

**THEO:** Which is where most systems are, honestly. Let's do better. Three properties you want from a step, borrowed shamelessly from database people. Atomicity: a step either fully happens or doesn't. Idempotence: re-executing a step that already happened is safe. And durability of the record: you know which steps completed.

**DANA:** Take them one at a time. Atomicity for an agent step -- is that even achievable?

**THEO:** Partially, and the granularity matters. A single tool call can often be made atomic. A file write is atomic if you write to a temp file and rename. A multi-file edit is not atomic unless you build it that way. My practical guidance: define the atomic unit as one tool call, make each tool call individually atomic where the underlying operation allows, and accept that a *step* -- which may contain several tool calls -- is not atomic. Then get your safety from the layer above.

**DANA:** Which is version control.

**THEO:** Which is version control, and I want to be emphatic about this because it's the cheapest reliability win available and it's often skipped. If your agent operates on a git repository, commit or stash at step boundaries. Not to the branch the user is on -- to a scratch ref, or a worktree. Now every step boundary is a restore point. Failure recovery becomes `reset --hard` to the last good step instead of forensic archaeology. It costs milliseconds and it converts an unrecoverable failure class into a recoverable one.

**DANA:** Idempotence.

**THEO:** Harder, and mostly a tool-design property rather than a loop property. "Write this content to this path" is idempotent. "Append this line to this file" is not. "Create this resource" is not unless you supply an idempotency key. When you're designing the tool surface -- episode seven again -- prefer declarative, state-asserting operations over imperative, delta-applying ones, precisely because the declarative ones survive retry.

**DANA:** And durability of the record.

**THEO:** This is where I'd focus effort if you only had time for one. Write a journal. Append-only, one record per step, flushed before the step executes and updated after. Record: step index, the tool calls with their arguments, the results, token counts, timestamps, and the resulting loop state. That journal is simultaneously your debugging surface, your replay substrate, your eval dataset, and your cost accounting.

**DANA:** Let's talk about replay, because that's the payoff.

**THEO:** The payoff is enormous and it's why I'll bring this up again in episode eight. If you have a journal keyed on the inputs to each model call, you can resume a failed run by replaying cached results for every step whose inputs are unchanged, and only re-executing from the first divergence. Practically: your loop crashes at step forty. You fix the bug in step forty's tool. You resume, and steps one through thirty-nine return instantly from cache. You've turned an eight-minute, twelve-dollar iteration cycle into a fifteen-second one.

**DANA:** There's a constraint on that which I want you to state, because I've seen it break.

**THEO:** Determinism of the non-model parts. If anything in your loop's control flow reads the wall clock, or generates a random number, or depends on ambient state that changes between runs, then the inputs to step N differ on replay and your cache misses for reasons that have nothing to do with your change. The discipline is: no nondeterminism inside the orchestration layer. Timestamps come in as parameters. Randomness comes from a seeded source or from varying an index. It feels pedantic until the first time replay saves you an afternoon.

**DANA:** Does the journal have to be perfect? Because I can imagine people not starting because the schema seems hard.

**THEO:** No, and please don't let that stop anyone. Start with newline-delimited JSON, one object per step, whatever fields you have. You can evolve the schema. The failure mode isn't a bad schema, it's no journal, and no journal means every debugging session starts from zero and every eval dataset has to be written by hand.

---

### SEGMENT 6: INSTRUMENTING THE LOOP (5 minutes)

**DANA:** Let's land this with the practical layer. If someone goes back to their agent system tomorrow, what do they add first?

**THEO:** Five metrics, and they're all derivable from the journal we just described, so the journal is genuinely step zero. First: termination reason, as a categorical. Model-declared, cap hit, budget exhausted, verifier satisfied, converged, error. Look at the distribution. It will tell you more about your system's health in one histogram than a week of reading transcripts.

**DANA:** Second.

**THEO:** Steps to completion, as a distribution rather than a mean. The mean hides everything. What you're looking for is bimodality -- a cluster of fast successes and a long tail of grinding runs. That tail is where your money goes and where your failures live, and it's usually a different population with a different cause, not just "harder tasks."

**DANA:** Third.

**THEO:** Read-to-write ratio. Number of information-gathering tool calls divided by number of mutating ones. There's no universal right number, but there's a right number *for your system*, and deviations flag the ping-pong pathology and the lost-agent pathology.

**DANA:** Fourth.

**THEO:** Diff churn. How many times did the agent touch the same file or the same region? Repeated edits to one location is the thrash signature, and you can detect it without understanding the semantics of the change at all.

**DANA:** And fifth.

**THEO:** Tokens per resolved task. Not tokens per run -- tokens per *resolved* task, where resolution is defined by your verifier. This is the number that actually matters economically, because a cheap run that fails costs you the run plus the retry plus the human time. We'll build this out properly in episode eight, but start collecting it now, because it's the metric that tells you whether an optimization actually helped.

**DANA:** I want to add one that I use, which is time-to-first-mutation. How long before the agent does anything to the world?

**THEO:** That's a good one and it's a proxy for perception efficiency. A long time-to-first-mutation means the agent is orienting expensively, which usually means your retrieval is bad -- which is a nice segue into episodes five and six, where we argue that most orientation cost is a graph problem people are solving with embeddings.

**DANA:** Nice. Let's close.

---

### CLOSING (3 minutes)

**DANA:** So the through-line for episode one. The four-arrow diagram is not wrong, it's just not load-bearing. The engineering lives in four places: what goes into the model, how it's sampled, what the tools do, and when you stop.

**THEO:** And of those, termination is the one with no natural feedback signal, so it's the one you have to engineer deliberately rather than discover. Use multiple criteria simultaneously. Prefer verifier satisfaction wherever you can get a verifier. Treat iteration caps and budget limits as backstops that should rarely fire, and alarm when they do. Keep your termination state separate from your result state.

**DANA:** On failure modes, the headline is that most apparent reasoning failures are context layout failures, and nearly all of them are detectable from a trace with arithmetic rather than judgment. Thrash, premature completion, sycophantic self-approval, scope creep, tool ping-pong, saturation collapse.

**THEO:** And on step semantics: your loop mutates the world, so give yourself restore points, prefer idempotent tool designs, and above all write a journal. The journal is the foundation for replay, for evals, for cost accounting, and for every episode after this one.

**DANA:** Next episode we go straight at the thing that turned out to be underneath five of our six failure modes: context. Not "the context window is big now, problem solved" -- the actual allocator. Compaction strategies, what context rot is mechanically, eviction policy, and how prompt layout interacts with caching in ways that change your bill by an order of magnitude.

**THEO:** It's the episode I most wanted to record, so I'll see you there.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

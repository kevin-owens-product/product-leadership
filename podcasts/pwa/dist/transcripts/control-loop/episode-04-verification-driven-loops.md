# Episode 4: Verification-Driven Loops
## "Verifiers, Judge Panels, and the Economics of Being Right"

**Duration:** ~27 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Control Loop, episode four. Dana Okafor and Theo Lindqvist. Today: verification. And Theo, I want to start with the claim that I think reorganizes how people should think about this whole field.

**THEO:** Go ahead.

**DANA:** Generation is cheap and getting cheaper. Verification is the constraint. Every meaningful improvement in agent reliability over the last two years has come from getting better at checking, not from getting better at producing. And most teams still put ninety percent of their prompt engineering effort into the generator.

**THEO:** I'll defend that strongly. Here's the underlying reason, and it's structural rather than a fact about current models. For a large class of problems, checking a candidate answer is fundamentally easier than producing one. Verifying that code compiles is trivially easier than writing compiling code. Verifying that a test passes is a single command. Verifying that a proposed schema validates against examples is mechanical. That asymmetry is the resource you're supposed to be exploiting, and a loop that generates without checking is leaving the entire asymmetry on the table.

**DANA:** And the counterargument is that lots of important work has no cheap verifier.

**THEO:** True, and that's the honest boundary of the technique. But I'd push back on how much work people *think* has no verifier. A large fraction of "unverifiable" tasks have partial verifiers that nobody bothered to build. Does the output mention every item in the input list? Mechanical. Does every claim carry a citation to a real source? Mechanical. Does the proposed change actually touch the files it says it touches? Mechanical. You rarely get a total verifier and you very often get a useful partial one.

**DANA:** Here's the episode. Verifier taxonomy and reliability profiles. Then the hard problem of using a model as a judge, including all the ways that goes wrong. Then adversarial verification and panel design. Then sampling techniques -- best-of-N, self-consistency, and what reranking really costs. Then loop-until-dry for open-ended discovery. And finally, tree search: when it earns its keep and when it's theater.

---

### SEGMENT 1: VERIFIER TAXONOMY (8 minutes)

**THEO:** Let me lay out the classes, ordered by how much I trust them. Class one, deterministic hard verifiers. Compiler, type checker, test suite, linter, schema validator, formatter. Properties: fast, deterministic, essentially never wrong about what they check, and narrow. When one of these fails, there is a defect, full stop.

**DANA:** And the caveat is the "about what they check."

**THEO:** That's the whole caveat and it's important. A passing test suite tells you the tests pass. It doesn't tell you the code is correct, and it especially doesn't tell you the code does what the user asked. Confusing the verifier's scope with the task's scope is the most common error in verification-driven design.

**DANA:** Class two.

**THEO:** Property-based and differential verifiers. Instead of checking specific cases, you check invariants over generated inputs, or you compare against a reference implementation. Round-trip properties -- serialize then deserialize gives back the original. Metamorphic properties -- sorting a list twice equals sorting once. Differential -- the new implementation agrees with the old on ten thousand random inputs. These are enormously more powerful than example-based tests for agent verification, because an agent can satisfy specific examples by special-casing them, and it's much harder to special-case an invariant.

**DANA:** That's a real point about agents specifically.

**THEO:** It is, and it's worth dwelling on. If your verifier is "these five tests pass," the shortest path for a generator that's struggling is sometimes to make those five specific cases work rather than to solve the problem. That's not deception, it's optimization pressure finding the cheapest satisfying assignment. Invariant-based verification closes that path because there's no finite set of cases to special-case.

**DANA:** Class three.

**THEO:** Structural and static verifiers. Does the change respect the module boundaries? Did it modify files it wasn't supposed to touch? Are there new dependencies? Is the diff within a size bound? Cheap, deterministic, and they catch a category the test suite completely misses -- namely, scope violations. An agent that fixed the bug and also refactored four unrelated modules passes every test and should still be rejected.

**DANA:** I like that one because it's basically free and I never see it.

**THEO:** It's nearly free. A diff-scope check is twenty lines. And it catches the scope-creep pathology from episode one directly, as a hard gate rather than a hope.

**DANA:** Class four.

**THEO:** Model-based judges. An LLM assesses the artifact against criteria. Properties: broad applicability, nondeterministic, biased in known ways, and correlated with the generator. This is the class that needs the most engineering care, so it's getting its own segment. But let me state the ordering principle now: use the cheapest, most deterministic verifier that can catch a given failure class, and reserve model judgment for what genuinely requires it. People reach for the judge first because it's easy to write, and then they're surprised that their expensive stochastic verifier is unreliable at things `grep` would have caught.

**DANA:** How do you compose them?

**THEO:** As a cascade, ordered by cost. Cheap deterministic checks first, and fail fast. There's no reason to spend a judge call on a candidate that doesn't compile. In a well-built cascade, most rejections happen at the first stage for a few milliseconds, and only survivors reach the expensive layers. I've seen cascades cut verification cost by an order of magnitude with no change in final quality, purely by reordering.

**DANA:** What about the reverse case -- verifiers that are expensive but catch things nothing else does?

**THEO:** Then you gate them behind the cheap ones and you accept the cost for survivors. The mistake is running them on everything. A full integration test suite as the *first* gate in a loop that generates a hundred candidates is how you end up with a system that costs more than the humans it replaced.

---

### SEGMENT 2: THE JUDGE PROBLEM (9 minutes)

**DANA:** Model-as-judge. Let's do the failure modes, because I think this is where the most damage gets done by well-intentioned engineering.

**THEO:** Six, and they're all documented. First, self-preference. A model rates its own output higher than equivalent output from another source. This is measured and consistent. If your generator and your judge are the same model, you have a bias you cannot remove by prompting.

**DANA:** Does using a different model fix it?

**THEO:** It reduces it. It doesn't eliminate it, because models trained on overlapping data share stylistic preferences -- a judge may prefer output that looks like what it would produce even if it didn't produce it. But cross-model judging is meaningfully better than same-model, and if you have the option it's worth taking.

**DANA:** Second failure mode.

**THEO:** Position bias. In a pairwise comparison, models systematically favor one position -- often the first, sometimes the last depending on the model and the format. The fix is straightforward and mandatory: evaluate both orderings and either average or require agreement. If A beats B in one order and B beats A in the other, you've learned they're indistinguishable to your judge, which is itself useful information.

**DANA:** Third.

**THEO:** Verbosity bias. Longer, more detailed answers get rated higher, roughly independent of correctness. This one is insidious in agent loops because it creates a gradient toward verbose output over correct output, and if you're using judge scores as any kind of selection signal, you're selecting for length. Mitigations: normalize for length explicitly in the rubric, or use a rubric with concrete binary criteria rather than a holistic score.

**DANA:** Fourth.

**THEO:** Sycophancy toward the context. If the judge sees the generator's reasoning -- "I chose approach X because it's more maintainable" -- it tends to agree. It's not evaluating, it's continuing a text that has already asserted a conclusion. This is the one I flagged in episode one and it's the easiest to fix and the most commonly present: give the judge the *artifact* and the *criteria*, and nothing else. No rationale, no chain of thought, no "the author says this is correct."

**DANA:** Fifth.

**THEO:** Scale compression. Ask for a score from one to ten and you'll get sevens and eights, with almost no use of the bottom half. The distribution is useless for ranking because the variance is tiny. Fix: binary or ternary judgments on specific criteria, aggregated. "Does this handle the empty input case: yes or no" is a question with a real answer. "Rate the robustness from one to ten" is not.

**DANA:** And sixth.

**THEO:** Criterion drift across a batch. Judge a hundred items in sequence in one context, and the standard moves -- later items get judged relative to earlier ones rather than against the rubric. Fix is isolation: each judgment gets a fresh context. That costs cache efficiency, and it's worth it.

**DANA:** So a well-built judge is: different model where possible, artifact-only with no generator rationale, binary criteria rather than a scale, position-randomized for comparisons, and fresh context per item.

**THEO:** That's the checklist, and every item on it is something I've watched a team skip and then wonder why their eval scores didn't correlate with anything. I'd add one more: calibrate against human labels. Take fifty items, have a human judge them, run your judge, and measure agreement. If your judge agrees with humans sixty percent of the time on a binary criterion, it's barely better than a coin and you should not be gating on it. You cannot skip this step, and most people do.

---

### SEGMENT 3: ADVERSARIAL VERIFICATION (8 minutes)

**DANA:** Let's talk about the technique I think is most underrated, which is asking the verifier to *attack* rather than to *assess*.

**THEO:** The framing difference is enormous and it's essentially free. Compare two prompts. "Is this finding correct?" versus "Try to refute this finding. Find the specific reason it is wrong. If you cannot find one after genuine effort, say so." Same model, same artifact, dramatically different results.

**DANA:** Why does it work?

**THEO:** Two reasons, I think. The first is that "is this correct" invokes the agreeable prior -- the helpful response to a question about something someone made is affirmation. "Refute this" makes the helpful response into criticism, so helpfulness now works for you instead of against you. The second is more mechanical: refutation requires producing a *specific* counterexample or flaw, which is a concrete generative task, whereas assessment permits a vague endorsement. You've forced the judge to do work that has a right answer.

**DANA:** And you set the default to refuted.

**THEO:** Set the default to refuted under uncertainty, yes. "If you're not confident this is a real defect, mark it refuted." That biases toward false negatives, which for most applications is the correct direction -- a missed finding costs you a finding, a false finding costs you human trust in the whole system. Once people stop believing your agent's output, you've lost the deployment regardless of your recall numbers.

**DANA:** Let's do panel design. How many verifiers, and how do you aggregate?

**THEO:** Start with the question of what the panel is for. If you're trying to reduce variance in a noisy judgment, redundancy helps -- multiple samples of the same judge, majority vote. If you're trying to catch failure modes that a single perspective would miss, redundancy does nothing and you need diversity.

**DANA:** Say more about the difference, because I think that's the crux.

**THEO:** Three identical refuters on the same input give you three highly correlated votes. The errors aren't independent, so the variance reduction is much smaller than the naive statistics would suggest -- you paid three times for maybe one-point-three times the confidence. Now instead, give each verifier a distinct lens. One checks correctness: does the logic hold. One checks reproduction: can I actually construct the failing input. One checks impact: if this is real, does it matter. Those three are asking genuinely different questions, their errors are much less correlated, and together they cover a wider failure surface.

**DANA:** So the design rule is: diversify the question, not the sample.

**THEO:** Diversify the question, not the sample. And pick your lenses from the actual ways the finding could be wrong. For a bug report: it might be logically wrong, it might be unreachable in practice, it might already be handled elsewhere, it might be intended behavior. Four lenses, one per failure mode. That's a real panel. Four copies of "is this a bug" is an expensive echo.

**DANA:** Aggregation?

**THEO:** Depends on your error preference. Unanimity is very conservative -- high precision, low recall. Majority is balanced. Any-one-confirms is high recall and will flood you with false positives. For most production uses, majority with a diverse panel is right, and I'd add: keep the dissent. If two of three confirmed and one refuted, the refutation reasoning is valuable context for whoever reviews it. Collapsing a panel to a boolean throws away the most interesting output.

**DANA:** What about the reproduction lens specifically? That feels like the strongest one.

**THEO:** It's the strongest one available and I'd prioritize it wherever the domain allows. "Don't tell me whether this is a bug -- write the input that triggers it, and run it." That converts a model judgment into a hard verifier. The panel member that says "I constructed this input and observed the described failure" is worth more than the other three combined, because it's not a judgment at all anymore, it's an observation. Whenever you can promote a soft verifier to a hard one by asking for a demonstration rather than an opinion, do it.

---

### SEGMENT 4: SAMPLING, SELECTION, AND WHAT IT COSTS (6 minutes)

**DANA:** Let's cover the sampling family. Best-of-N, self-consistency, and the reranking problem.

**THEO:** Best-of-N is: generate N candidates, pick the best by some selector. Its performance depends almost entirely on the selector, and that's the part people underinvest in. If your selector is a hard verifier -- generate five patches, keep the ones where tests pass -- best-of-N is fantastic and the gains are real. If your selector is a biased judge, you've built an expensive machine for selecting the longest answer.

**DANA:** What's the scaling behavior?

**THEO:** Diminishing, and it diminishes fast. The gain from one to five candidates is usually large. Five to twenty is modest. Twenty to a hundred is generally noise unless the task has very high variance. So the practical advice is: N of three to five, spend the savings on a better selector. Almost nobody is selector-limited in a way that more samples fixes.

**DANA:** Self-consistency.

**THEO:** Sample multiple reasoning paths and take the majority *answer*, ignoring the reasoning. This works well when the answer space is small and discrete -- a classification, a number, a yes or no. It works poorly when the output is a long artifact, because there's no meaningful majority over a set of distinct code patches. So: use it for decisions, not for generation. A great application is the judge itself -- three samples of a binary criterion, take the majority. Cheap, and it directly attacks judge variance.

**DANA:** And reranking?

**THEO:** Reranking is the general form -- generate a set, score, order. The thing I want to flag is a cost that's usually invisible. If you generate N candidates and rank them with pairwise comparisons, that's quadratic in N. Twenty candidates is a hundred and ninety comparisons, each a model call, each with the position-bias fix doubling it. People build this without doing the multiplication and then discover their verification costs forty times their generation. Use pointwise scoring against a rubric for anything past a handful of candidates, and reserve pairwise for the final two or three.

**DANA:** Is there a rule of thumb for how much of your budget should go to verification?

**THEO:** I don't think there's a universal number, but I'll give you the framing I use. Verification budget should scale with the cost of being wrong. For an agent proposing a change a human will review in thirty seconds, minimal verification -- the human is the verifier and they're cheap. For an agent committing directly to a shared branch, heavy verification, because the cost of a bad commit is measured in other people's hours. For an agent taking an irreversible external action, verification should dominate generation entirely, and there should be a human gate on top. Match the spend to the blast radius, not to the difficulty.

---

### SEGMENT 5: LOOP-UNTIL-DRY, DONE RIGHT (6 minutes)

**DANA:** We flagged this in episode one and promised to do it properly. Open-ended discovery.

**THEO:** The problem class: you're looking for an unknown number of things. Find the bugs. Find the security issues. Enumerate the edge cases. Any fixed count is wrong -- if you ask for ten and there are three, you get seven fabrications; if there are thirty, you get ten and a false sense of completeness.

**DANA:** So the structure is rounds until exhaustion.

**THEO:** Rounds until K consecutive rounds produce nothing new. K of two or three. Each round you run a set of finders, collect their output, deduplicate against everything seen so far, and if the fresh set is empty you increment the dry counter, otherwise you reset it.

**DANA:** And the bug, restated for this episode.

**THEO:** Deduplicate against *seen*, not against *confirmed*. If you dedupe against confirmed findings only, then anything your verification panel rejected looks novel next round, gets re-found, gets re-verified, gets re-rejected, and your dry counter never increments. The loop runs to the budget cap every time. Seen and confirmed are two different sets and you need both.

**DANA:** What does deduplication actually look like? Because "is this the same finding" isn't trivial.

**THEO:** It's the real engineering in this pattern. Naive string equality fails immediately -- the same defect described twice will differ in wording. What works in practice is a composite key over structural properties: file plus approximate line range plus defect category. Two findings in the same function about the same category are the same finding, even if the prose differs. Where you can't get structure, a similarity threshold on embeddings works, with the caveat that you'll need to tune the threshold and you'll get both merges and splits wrong sometimes.

**DANA:** And you'd do that deduplication in code, not with an agent.

**THEO:** In code, emphatically. This is a place where people reach for a model and shouldn't. Deduplication is a set operation with a defined key. Using a model call for it makes it nondeterministic, expensive, and unable to scale past what fits in a context. Write the key function. It's twenty lines and it will be correct every time.

**DANA:** How do you get diversity across rounds so that round three isn't just round one again?

**THEO:** Two mechanisms. First, tell the finders what's already been found and ask for something else. That's cheap and it works, though it inflates context each round. Second, vary the search modality between rounds rather than just re-running -- round one searches by module, round two by data flow, round three by looking at recent changes, round four by looking at the test coverage gaps. Different modalities surface genuinely different findings, where a re-run of the same modality mostly surfaces the same ones. That multi-modal sweep idea is one I'd apply everywhere: if a single search angle can't find everything, run several angles that are blind to each other.

**DANA:** And a completeness check at the end?

**THEO:** I like adding one final agent whose only job is to ask "what's missing?" Not to find more findings directly, but to identify uncovered surface -- a modality that wasn't run, a directory nobody looked at, a claim in the report that was never verified. Whatever it names becomes the next round's work. It's a cheap way to catch the systematic blind spot, which by definition none of your finders will report.

---

### SEGMENT 6: TREE SEARCH -- WHEN IT'S REAL (4 minutes)

**DANA:** Last segment. Tree search over agent trajectories. Monte Carlo tree search shows up in a lot of papers. Does it belong in production?

**THEO:** Sometimes, and the condition is specific. Tree search pays off when three things hold. You can evaluate intermediate states cheaply and meaningfully. Backtracking is possible -- you can return to a prior state. And the branching factor is small enough that exploration is affordable.

**DANA:** How often do all three hold in software work?

**THEO:** Less often than the papers suggest, and the second one is usually the blocker. Backtracking an agent trajectory means undoing side effects, and unless your steps are checkpointed -- which is why episode one spent time on that -- you can't actually return to a prior state. If you have git checkpointing at step boundaries, you can. Most systems don't, so their "search" is really just retry from scratch, which is a much weaker thing wearing a search costume.

**DANA:** And intermediate evaluation?

**THEO:** That's the other hard one. To search a tree you need a value estimate for partial states -- how promising is this half-finished trajectory. In games you have a score. In software, "I've written three of five functions" doesn't have an obvious value. You end up using a model to estimate it, which is expensive per node and noisy, and noisy values make search explore badly.

**DANA:** So what's your honest position?

**THEO:** For most agent systems today, structured retry with reflection gets you the majority of what tree search would, at a small fraction of the complexity and cost. Where I would genuinely reach for search: a bounded problem with a hard evaluator and cheap state restore. Optimizing a query plan. Tuning a configuration against a benchmark. Searching a fixed space of refactorings against a test suite. Those are real and search wins there. General "implement this feature" work is not one of those, and building a search harness for it is, I think, mostly a way to feel sophisticated.

**DANA:** That's a good place to stop.

---

### CLOSING (3 minutes)

**DANA:** Closing it out. Generation is cheap, verification is the constraint, and the asymmetry between producing and checking is the resource you're supposed to exploit. Most tasks people call unverifiable have useful partial verifiers nobody built.

**THEO:** Order your verifiers as a cascade by cost: deterministic checks, then property and differential checks, then structural and scope checks, then model judgment last. Property-based verification matters especially for agents because invariants can't be special-cased the way example tests can. And a diff-scope check is nearly free and catches scope creep as a hard gate.

**DANA:** On judges: different model, artifact only with no generator rationale, binary criteria over numeric scales, position-randomized comparisons, fresh context per item. And calibrate against human labels before you gate anything on it -- most people skip this and shouldn't.

**THEO:** Ask verifiers to refute, not to assess, and default to refuted under uncertainty. Diversify the question rather than the sample -- three different lenses beat three copies. And promote soft verification to hard verification whenever you can by demanding a demonstration instead of an opinion.

**DANA:** For open-ended discovery: rounds until K dry rounds, dedupe against seen and report from confirmed, do the dedup in code with a structural key, and vary the search modality across rounds rather than re-running the same one.

**THEO:** Next episode we change gears entirely. Everything we've discussed depends on the agent having good information, and the retrieval layer most people are running is embeddings over chunks, which for code is close to the worst available option. We're going to build a code graph from parsing up: AST extraction, symbol resolution, the edges that matter, and how to keep it fresh incrementally.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

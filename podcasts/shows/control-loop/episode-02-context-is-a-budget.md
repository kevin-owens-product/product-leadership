# Episode 2: Context Is a Budget
## "Compaction, Context Rot, and Cache-Aware Prompt Layout"

**Duration:** ~31 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Welcome back to Control Loop. I'm Dana Okafor, with Theo Lindqvist, and today we're doing context. Which I want to frame carefully at the top, because "context" has become one of those words that means everything and therefore nothing.

**THEO:** Let's be precise then. When I say context in this episode I mean exactly one thing: the token sequence you send to the model on a given call. Not "the agent's memory," not "the company's knowledge." The literal bytes. And the claim of this episode is that assembling those bytes is a resource allocation problem with a well-understood shape, and that most agent systems are doing it with `concat`.

**DANA:** And the counterargument you hear constantly is: context windows are enormous now. Hundreds of thousands of tokens, a million in some configurations. Isn't this a solved problem by capacity?

**THEO:** No, and I want to give three independent reasons why, because I think people usually only know one of them. Reason one is cost -- you pay per token, every call, and a loop makes a lot of calls, so a bloated context is a multiplier on your entire bill. Reason two is latency -- time to first token scales with input length, and in an interactive loop that's felt directly. And reason three, the one people underestimate, is that model performance is not flat across context length. Utilization degrades. A fact placed at token four hundred thousand is not as available to the model as the same fact at token two thousand.

**DANA:** That third one is what people call context rot, and I want to dig into what's actually happening there, because I think the term gets used loosely.

**THEO:** We'll do that properly in segment two. Here's the plan for the episode. First, context as an allocator -- the claimants and the accounting. Second, context rot, mechanically. Third, compaction: the strategies, and what you must never compact. Fourth, cache-aware layout, which is the one with the biggest immediate dollar impact. Fifth, eviction and truncation policy. And sixth, using budget as an input to control flow rather than just a limit.

**DANA:** Let's start with the accounting, because I don't think most people have ever actually broken down where their tokens go.

---

### SEGMENT 1: THE ALLOCATOR AND ITS CLAIMANTS (8 minutes)

**THEO:** Here's the exercise I'd ask everyone to run once. Take a real production call from your agent, and break the input into categories with token counts. Not estimates -- actual counts from the tokenizer. Almost everyone is surprised.

**DANA:** Give me the categories.

**THEO:** Six. System prompt, including any persona, policy, and formatting instructions. Tool definitions -- names, descriptions, and JSON schemas for every tool you've exposed. Static project context, things like a repository conventions file that gets injected every call. Conversation history, which is the accumulated messages and tool results. Retrieved content, whatever your retrieval layer pulled in for this specific call. And output reserve, the headroom you must leave for the response.

**DANA:** Where's the surprise usually?

**THEO:** Tool definitions, overwhelmingly. People add tools incrementally and never look at the aggregate. A well-documented tool with a rich schema is easily eight hundred to fifteen hundred tokens. Thirty tools is thirty thousand tokens, on every single call, whether or not the model uses any of them. In a fifty-step loop that's one and a half million input tokens spent on a menu.

**DANA:** And there's a second cost beyond the money, which is the one I care about more.

**THEO:** Selection degradation. There's a fairly consistent finding that tool-selection accuracy falls as the tool count rises, and the fall is steeper when tools have overlapping purposes. Fifty tools where six pairs do similar things is much worse than fifty clearly disjoint tools. So the tool catalog is simultaneously a cost problem and an accuracy problem, and the fix for both is the same.

**DANA:** Which is deferred loading.

**THEO:** Deferred, or lazy, or search-based tool loading. The pattern: instead of putting every schema in the prompt, you put a small index -- names and one-line descriptions -- plus one meta-tool that fetches full schemas on demand. The model searches for what it needs and the harness injects those schemas. You go from thirty thousand tokens of permanently resident menu to maybe two thousand, plus occasional fetches.

**DANA:** What's the cost of that pattern? Because it isn't free.

**THEO:** One extra round trip the first time a tool is needed, and a small risk that the index description is too thin for the model to know a relevant tool exists. The mitigation for the second is that index entries should be written for *discovery*, not for *use*. A one-liner that says what problems the tool solves, in the vocabulary someone would search with. It's closer to SEO than to API docs, which feels distasteful and is nonetheless correct.

**DANA:** Let's talk about output reserve, which I think is the most commonly botched line item.

**THEO:** It's botched because it's invisible until it isn't. If your window is two hundred thousand and you fill a hundred and ninety-eight thousand with input, the model has two thousand tokens to work in. It will produce truncated output, and truncation in an agent loop is uniquely bad because a half-emitted tool call is a parse error, which your harness may or may not handle gracefully. My rule is to reserve for the worst realistic output, not the average -- and to treat the reserve as inviolable in the allocator, so it gets subtracted from the budget before anything else competes.

**DANA:** How do you handle the case where the reserve plus the mandatory content already exceeds the window?

**THEO:** Then you have a design problem, not a scheduling problem, and you should fail loudly rather than silently dropping something. That's a real invariant worth asserting: mandatory content plus reserve must fit with room to spare, and if it doesn't, the harness raises rather than improvising. Silent degradation is how you get an agent that mysteriously performs worse on large repos and nobody knows why for a month.

**DANA:** Let's get precise about "mandatory."

**THEO:** Four things, in my books. The original task statement, verbatim. Hard constraints -- the things that make an output wrong if violated. The definition of done. And the current state of whatever the agent is directly working on. Everything else is negotiable. And the reason to name this explicitly is that it becomes your pinning policy for compaction, which is segment three.

---

### SEGMENT 2: CONTEXT ROT, MECHANICALLY (8 minutes)

**DANA:** Okay. Context rot. What is it actually?

**THEO:** It's a bundle of at least four distinct phenomena that people group under one name, and I think separating them is useful because they have different fixes. Phenomenon one: positional utilization. Empirically, information at the very start and the very end of a long context is more reliably used than information in the middle. This has been measured repeatedly under the "lost in the middle" name. Practical consequence: position is a resource. The end of your context is prime real estate and you should decide deliberately what occupies it.

**DANA:** What do you put there?

**THEO:** The immediate task and the most recent state. What is the model deciding right now, and what does it need to decide it. A pattern I like: after a long history, immediately before the model's turn, inject a short synthesized block -- current objective, constraints still in force, what was just tried, what the result was. Two hundred tokens in the highest-attention position. It's the same insight as the Reflexion result from last episode: you're not adding information, you're relocating it.

**DANA:** Phenomenon two.

**THEO:** Dilution. As the context grows, the proportion of it that's relevant to the current decision shrinks. Even with perfect positional utilization, the model is doing a harder discrimination task. This is why an agent fifty steps into a task often performs worse than the same agent on step three of an equivalent task -- not because it's confused, but because the signal-to-noise ratio of its input has degraded by an order of magnitude.

**DANA:** And that's the one compaction directly addresses.

**THEO:** Directly. Compaction is a signal-to-noise operation before it's a size operation. That reframing matters, because if you think of it as size management you compact only when you're near the limit. If you think of it as noise management you compact when the ratio gets bad, which is often much earlier.

**DANA:** Phenomenon three.

**THEO:** Contradiction accumulation. Over a long run, the context acquires statements that conflict. The agent decided to use approach A at step five, abandoned it at step twenty, but step five's reasoning is still sitting there asserting A confidently. Now both are in the input and the model has to adjudicate. Sometimes it adjudicates wrong. And note this is *created* by the loop -- it's a self-inflicted wound that gets worse monotonically unless something removes superseded content.

**DANA:** Which naive compaction actually makes worse, right? If you summarize, you can end up with a summary that flattens the chronology.

**THEO:** That's a real failure and it's worth calling out. A summarizer that produces "the agent considered approach A and approach B" has destroyed the information that B *superseded* A. Summaries need to preserve supersession explicitly. I write my summarization prompts to require a "current decisions" section stated in the present tense, and a separate "rejected, do not revisit" section. Those two structures carry the chronology forward in a way a narrative summary doesn't.

**DANA:** "Rejected, do not revisit" is a nice trick. That's directly preventing a rediscovery loop.

**THEO:** It's cheap and it prevents the agent from spending twenty steps re-exploring a dead end it already explored. Phenomenon four, last one: instruction erosion. Your system prompt says something important. Two hundred thousand tokens of tool output later, that instruction is competing with a vast amount of more recent, more concrete material. It doesn't stop applying, but its effective weight drops. This is why the "the agent stopped following my formatting rule after a while" complaint is so common.

**DANA:** And the fix is re-injection.

**THEO:** Re-injection of the small number of instructions that are actually load-bearing, positioned late. Not the whole system prompt -- that's expensive and it's mostly not the part that erodes. Pick the three or four rules that break the output if violated, and restate them near the model's turn. Some harnesses do this automatically and call them reminders. If yours doesn't, it's twenty lines of code.

**DANA:** So the four are position, dilution, contradiction, and erosion. Is there a single metric that tracks how bad the rot is?

**THEO:** Not one that I trust universally, but the proxy I use is relevant-token fraction: of the tokens in the context, what fraction did the model actually need for this decision? You can't compute that exactly, but you can approximate it by tracking how much of the context is tool output older than N steps, which is almost always the dominant junk. When that fraction crosses something like sixty percent, I compact regardless of absolute size.

---

### SEGMENT 3: COMPACTION STRATEGIES (9 minutes)

**DANA:** Let's enumerate compaction strategies properly. What are the actual techniques?

**THEO:** Five, and they're stackable. One: truncation. Just drop old content. Crude, cheap, and much better than nothing -- but you must drop *whole* units. Truncating the middle of a tool result produces a fragment that reads as authoritative and is wrong, which is worse than absence. Drop entire messages or entire results, never partial ones, and leave a marker saying something was dropped so the model knows its history is incomplete.

**DANA:** The marker matters more than people think.

**THEO:** It matters a lot. A model with a gap it knows about will ask or re-read. A model with a gap it doesn't know about will confabulate across it. One sentence -- "earlier steps have been summarized, re-read files if you need current contents" -- changes behavior meaningfully.

**DANA:** Two.

**THEO:** Summarize-and-replace. Take a span of history, generate a summary with a dedicated model call, replace the span. This is the standard technique and it's good, with the caveats we already covered about supersession. Two implementation details that matter. First, summarize *spans* on a boundary that makes semantic sense -- a completed subtask, not "the oldest twenty messages." Second, keep the raw span somewhere retrievable. Summaries lose things, and the ability to say "go re-read the full log of step twelve" turns an irreversible loss into a cache miss.

**DANA:** Three.

**THEO:** Hierarchical summarization. Summaries of summaries. You compact steps one through twenty into summary A, twenty-one through forty into summary B, and eventually compact A and B together into a higher-level summary. This gives you graceful degradation over very long runs -- recent detail stays sharp, distant history compresses smoothly. The risk is compounding loss: each round of summarization is lossy, so a thrice-summarized span can be quite far from the truth. I bound the depth at two or three levels and rely on the raw log below that.

**DANA:** Four.

**THEO:** Externalization, which I think is the most powerful and the most underused. Instead of compressing content, you move it out of context entirely and leave a pointer. The agent writes its findings to a file, and the context holds one line: "analysis is in `notes/findings.md`." The content is not lost, not summarized, not degraded -- it's just not resident. And if the agent needs it, it reads the file.

**DANA:** This is essentially demand paging.

**THEO:** It is exactly demand paging, and the analogy is worth taking seriously because it tells you what to do next. You want the working set resident and everything else on disk with cheap access. Which means your externalization needs an index -- a small always-resident table of contents saying what exists and where -- because paging without a page table is just losing things.

**DANA:** What kinds of content are best externalized?

**THEO:** Anything large, stable, and referenceable. Research findings. Enumerated work lists. Long file contents. Generated artifacts. Anything the agent produced that it might need later but isn't operating on right now. The pattern that works beautifully: an agent doing a large migration writes a checklist file with every call site and its status, updates that file as it goes, and keeps only the current item plus a count in context. That agent can run for hundreds of steps without ever saturating, because its memory lives on disk.

**DANA:** And five.

**THEO:** Isolation, which is really next episode's topic but belongs on this list. If a subtask requires a lot of context that the parent doesn't need afterward, run it in a separate loop with its own window and return only the conclusion. The parent's context grows by a paragraph instead of by fifty thousand tokens. I'd argue this is the single biggest reason to use subagents, and it's not parallelism -- it's that a subagent is a context boundary.

**DANA:** Let's do the "never compact" list, because you promised it.

**THEO:** Pinned content, from segment one, plus two additions. The original task statement verbatim -- and I mean verbatim, not a summary, because the exact wording carries constraints that paraphrase drops. Hard constraints and the definition of done. The current working state. Now the additions: any explicit user correction, and the rejected-approaches list. User corrections are the highest-value tokens in the entire context -- someone told your agent it was wrong about something specific, and losing that is how you get the same mistake three times in one session. Pin them permanently.

**DANA:** How do you implement pinning practically?

**THEO:** Tag messages at creation with a retention class. Pinned, normal, ephemeral. Ephemeral things -- routine successful tool results that produced no surprise -- get dropped first and aggressively. Normal gets summarized. Pinned never gets touched. It's a three-line change to your message structure and it makes your compaction policy expressible instead of accidental.

**DANA:** When do you trigger compaction? On a threshold?

**THEO:** Threshold as a backstop, but prefer *semantic boundaries*. Compact when a subtask completes, because that's the moment when a large span of history has become collectively summarizable and the model is at a natural checkpoint. Compacting mid-step, in the middle of a debugging sequence, is where you lose the thing you needed. If you only compact at eighty-five percent full, the trigger point is arbitrary with respect to the work.

---

### SEGMENT 4: CACHE-AWARE LAYOUT (8 minutes)

**DANA:** This is the segment I've been waiting for, because it's the one where the advice has a dollar figure attached.

**THEO:** Let me set up the mechanism first. Providers offer prompt caching: if the *prefix* of your request matches a previously-seen prefix, the cached computation is reused, and those tokens are billed at a large discount -- typically an order of magnitude cheaper -- and processed much faster. The critical word is prefix. It's not a content-addressed cache over arbitrary chunks. It matches from the beginning of the prompt, and it stops matching at the first byte that differs.

**DANA:** Which means ordering is the entire game.

**THEO:** Ordering is the entire game, and it produces one rule that dominates everything else: arrange your context from most stable to least stable. System prompt first, because it never changes. Then tool definitions, which change rarely. Then static project context. Then conversation history, which grows by appending -- crucially, appending preserves the prefix. Then, last, anything volatile.

**DANA:** Give me the anti-pattern, because I think it's really common.

**THEO:** The most common one by far: putting a timestamp or a session ID or a "current time is..." line at the top of the system prompt. That single line changes every call. It invalidates the entire cache, every time, forever. You are paying full price for every token of a hundred-thousand-token prefix because you wanted the model to know what time it is. I have seen this be a five-figure monthly line item at a company that found it in an afternoon.

**DANA:** And the fix is trivially to move it.

**THEO:** Move it to the end, right before the model's turn. Same information, same effect on the model, and now your prefix is stable. The general form of the rule: volatile content goes last, always, no exceptions. If you find yourself wanting to put something dynamic early "for emphasis," you're trading real money for an emphasis effect you could get by repeating it late.

**DANA:** What about tool definitions? You said they change rarely, but with deferred loading they change during the run.

**THEO:** Good catch, and it's a genuine tension. If you inject fetched tool schemas into the tool-definition block, you've mutated an early section and blown the cache for the rest of the run. So don't. Inject them as a message in the conversation instead -- appended at the current end, preserving everything before it. You get the same capability with none of the invalidation. This kind of thing is why cache-awareness has to be a design constraint rather than an optimization pass; retrofitting it means restructuring.

**DANA:** How does compaction interact with caching? Because compaction rewrites history, which is a prefix mutation.

**THEO:** It is, and this is the real cost of compaction that nobody accounts for. When you compact, you replace a span in the middle of your context, which invalidates the cache from that point forward. Your next call pays full price for everything after the compaction point. So compaction is not free even ignoring the summarization call -- it has a cache cost proportional to how much context sits after the compacted span.

**DANA:** Which argues for compacting from the front.

**THEO:** Exactly the right conclusion. Compact the oldest span, so the invalidated suffix is as large as possible -- wait, no, I said that backwards. Compact the oldest span so that... let me restate cleanly. If you compact at position P, everything after P is invalidated. To minimize invalidation you want P as late as possible. But the content you want to compact is the oldest, which is early. Those pull against each other.

**DANA:** So what do you actually do?

**THEO:** You compact rarely and in large batches, rather than frequently and incrementally. One big compaction that reclaims sixty percent of the context and eats one cache-rebuild is much cheaper than ten small ones that each eat a rebuild. This is genuinely counterintuitive -- the instinct is to trim continuously to stay lean, and the economics say to let it grow and then cut hard.

**DANA:** Any other layout guidance?

**THEO:** Two. First, be aware of cache lifetime. Caches expire, typically on the order of minutes unless you're on an extended-TTL configuration. A loop that's actively iterating stays warm; a loop that pauses for a human response may come back cold. That changes the economics of interactive versus autonomous agents and it's worth measuring rather than assuming. Second, don't chase the cache with artificial keep-alive traffic. I've seen people schedule dummy calls to keep a prefix warm. You're paying real tokens to save hypothetical tokens, and it almost never nets out.

**DANA:** What's the measurement to know if you're getting this right?

**THEO:** Cache hit rate on input tokens, reported per call and aggregated per run. If your agent is doing a long autonomous run and your cache hit rate is under seventy percent, something is invalidating that shouldn't be, and finding it is usually a twenty-minute investigation with a very good return.

---

### SEGMENT 5: EVICTION POLICY AND BUDGET-DRIVEN CONTROL (7 minutes)

**DANA:** Let's talk eviction. When you have to drop something, how do you choose?

**THEO:** Three signals, weighted. Recency, relevance, and cost-to-recover. Recency is obvious and it's the default everywhere, and on its own it's mediocre because the most important thing in the context is often the oldest -- the original task. That's what pinning fixes. Relevance is harder to compute cheaply; the practical approximation is topical overlap with the current objective, which you can do with a cheap embedding or even lexical overlap if you're being frugal.

**DANA:** And cost-to-recover is the one I never see anyone use.

**THEO:** Which is a shame, because it's the most actionable. Some content is trivially re-obtainable -- a file's contents, a directory listing, the output of a deterministic command. Drop that first without hesitation, because if the agent needs it, one cheap tool call brings it back. Other content is expensive or impossible to recover -- the result of a twenty-minute test run, a user's clarification, a nondeterministic API response. Guard that. Ranking eviction by recoverability rather than by age is a strictly better default and it's not hard to implement: tag tool results with a recoverability class when you define the tool.

**DANA:** Let's talk about tool result truncation specifically, because tool output is the bulk of the growth.

**THEO:** It's usually eighty percent or more of context growth, so yes, it deserves policy. My rules. Cap every tool result at a defined size, enforced by the harness, not by hoping the tool is polite. When you truncate, truncate the *middle* and keep both ends -- the head usually has the structure and the tail usually has the conclusion or the error. State the truncation explicitly with the original size. And provide a way to get the rest: "showing 2000 of 45000 bytes, use offset to read more" turns a hard loss into a paged read.

**DANA:** What about results that are large but where the agent only needed one line?

**THEO:** That's the case for tool-side filtering, and it's the highest-leverage version of this. If your search tool can accept a pattern and return only matching lines, you've moved the filtering from the context into the tool, where it's free. The general principle: every byte of filtering you can do outside the model is a byte you don't pay for twice -- once on input and again in dilution.

**DANA:** Let's close the episode with budget as control flow, which you teased.

**THEO:** So most systems treat budget as a wall -- you run until you hit it and then you stop. The better model is to expose remaining budget to the loop and let it change behavior. Concretely: if you're at eighty percent remaining, you can afford three verification passes and a subagent fan-out. At thirty percent, drop to one verification pass. At ten percent, stop starting new work and spend the remainder writing a clear handoff of what's done and what isn't.

**DANA:** That last one is the one I'd fight for hardest.

**THEO:** Me too. A budget-aware graceful degradation is the difference between a run that fails usefully and a run that fails uselessly. And it generalizes: reserve a fixed slice of the budget -- five percent, say -- that can only be spent on summarizing state at termination. Never let the working loop touch it. Then no matter how the run ends, you get a report.

**DANA:** Does exposing budget to the model itself work? Telling it "you have forty thousand tokens left"?

**THEO:** Mixed results and I'd be careful. Models respond to it, but not always in the way you want -- sometimes with rushed, lower-quality work rather than better prioritization. What works more reliably is making the *harness* budget-aware and having it change what's available, rather than telling the model to be frugal. Turn off the expensive tools. Reduce the fan-out. Deterministic control beats persuasion.

---

### CLOSING (3 minutes)

**DANA:** Let's land it. Context is a fixed budget with six competing claimants, and the biggest surprise for most teams is that tool definitions are eating an enormous fixed share on every call. Audit yours; deferred loading is usually available.

**THEO:** Context rot is four distinct phenomena -- positional utilization, dilution, contradiction accumulation, and instruction erosion. Position is a resource; put the current decision and the load-bearing constraints at the end where attention is strongest. Compaction is a signal-to-noise operation, not just a size operation, so trigger it on semantic boundaries and on relevance ratio rather than only on a fullness threshold.

**DANA:** Five compaction strategies: truncate, summarize-and-replace, hierarchical, externalize, isolate. Externalization is the most underused -- treat it as demand paging and give it an index. Never compact the verbatim task statement, the hard constraints, the definition of done, user corrections, or the rejected-approaches list.

**THEO:** And the money segment: caching matches on prefix, so order from stable to volatile and never put a timestamp in your system prompt. Compaction has a cache cost proportional to what follows it, which means compact rarely and in big batches rather than continuously. Measure cache hit rate; under seventy percent on a long run means something is invalidating that shouldn't be.

**DANA:** Next episode we take the thing we mentioned twice today -- that a subagent is fundamentally a context boundary -- and build a whole architecture on it. Fan-out versus pipelines, when a barrier is actually required, worktree isolation, and the specific ways multi-agent systems fail that single-agent systems don't.

**THEO:** Which includes my least favorite failure mode in the entire field, the telephone game. See you there.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

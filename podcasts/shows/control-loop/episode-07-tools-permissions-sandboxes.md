# Episode 7: Harness Design I: Tools, Permissions, Sandboxes
## "The Interface Between a Model and the World"

**Duration:** ~27 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Control Loop, episode seven. Dana Okafor and Theo Lindqvist. We've done the loop, context, topology, verification, and two episodes of graph engineering. Now the harness itself. And Theo, define it mechanically, because the word has gotten fuzzy.

**THEO:** The harness is everything between the model and the world. Concretely: the code that assembles the prompt, the tool definitions and their implementations, the permission layer that decides what's allowed, the isolation boundary that bounds the damage, the loop that drives it all, and the instrumentation that records it. If you removed the model and replaced it with a different one, the harness is what stays.

**DANA:** And your claim, which I want you to defend, is that the harness matters more than the model choice.

**THEO:** I'll defend it with a specific comparison. Take a strong model with poor tools -- vague descriptions, unhelpful errors, no scoping -- and a weaker model with excellent tools. In my experience the second system outperforms the first on real tasks, often substantially. And the reason is compounding: a bad tool interaction doesn't just fail once, it consumes a step, adds noise to the context, and degrades every subsequent decision. Bad tools have a multiplier on them the same way good ones do.

**DANA:** So today: tool design as API design, the description as prompt, tool proliferation and lazy loading, error surfaces, permission models, hooks, and sandboxing.

**THEO:** And I want to say up front what the through-line is. Every one of these is a place where you can move a decision from the model's judgment into deterministic code. The model is the most expensive, least predictable component in your system. Good harness design is largely the discipline of not asking it to do things a program could do reliably.

---

### SEGMENT 1: TOOL DESIGN AS API DESIGN (8 minutes)

**DANA:** Start with granularity, because that's the first decision and it's not obvious.

**THEO:** It's not, and the two failure directions are both common. Too fine-grained: `open_file`, `seek`, `read_bytes`, `close_file`. Now a simple read is four round trips, each one a full model call, and the agent has to maintain state between them. Absurd, and yet I've seen tool sets that look like this because someone mapped a system API directly.

**DANA:** And too coarse.

**THEO:** `do_task(description)`. One tool that takes a natural language instruction and does whatever. This fails differently -- it moves all the complexity inside an opaque box, you can't tell what it actually did, and you've just built a second agent while pretending it's a tool. My rule: a tool should correspond to one *intent*, and an intent is something a competent human would describe as a single action. "Read this file." "Search for this pattern." "Run these tests." Not a keystroke, not a project.

**DANA:** How do you decide when to split a tool?

**THEO:** When the parameters become mutually exclusive modes. If your tool has a `mode` parameter and half the other parameters only apply to one mode, that's two tools wearing a trench coat. The model has to reason about which combination is valid, and it will sometimes get it wrong, and that failure is entirely your fault as the designer. Split them and each one becomes unambiguous.

**DANA:** What about the reverse -- tools that are too similar?

**THEO:** That's the more common problem in mature systems, and it's an accuracy killer. If you have `search_files` and `find_code` and `grep_repo`, the model has to make a judgment call about which one fits, and there is no right answer, so it will pick inconsistently. Overlapping tools are worse than a single tool with an extra parameter, because parameter selection is easier for a model than tool selection. Audit for overlap periodically, and merge aggressively.

**DANA:** Let's talk about parameters. Any principles?

**THEO:** Four. First, prefer declarative over imperative -- "write this content to this path" rather than "apply this delta," because the declarative one is idempotent and survives retry, which we established in episode one. Second, make invalid states unrepresentable where you can: if two parameters can't both be set, that's two tools. Third, give every parameter a description, not just a type; the type says `string`, the description says what kind of string and what it's for. Fourth, and this is the one people skip: specify the *units and conventions*. Is `line` one-indexed or zero-indexed? Is the path absolute or relative to what? Every ambiguity you leave is a coin flip on every call.

**DANA:** Now the part you flagged. Tool descriptions as prompts.

**THEO:** This is the highest-leverage writing in your entire system and it's usually written like API documentation, which is the wrong genre. The tool description is read by a model that is deciding, in context, whether this tool is the right next action. So it needs to answer the model's actual question, which is not "what does this do" but "should I use this now."

**DANA:** What does that change?

**THEO:** It means you lead with *when to use it*, not with what it does. Compare: "Searches files using a regular expression pattern" versus "Use this to find where a symbol or string appears across the codebase when you don't know which file it's in. Faster than reading files individually. Returns matching lines with file and line number." The second is longer and it converts a capability statement into a decision aid.

**DANA:** And negative guidance?

**THEO:** Enormously effective and almost never present. "Do not use this to read a file you already know the path of -- use the read tool, it's cheaper." That one sentence eliminates a whole class of misuse. Explicit anti-guidance is the fastest fix for a tool that's being over-selected, and it's a one-line change rather than a prompt engineering project.

**DANA:** Any guidance on length?

**THEO:** Long enough to disambiguate from its neighbors, short enough that the aggregate doesn't eat your context. In practice a few hundred tokens for a nuanced tool and fifty for an obvious one. And the discipline I'd suggest: write descriptions *comparatively*. Put all your tools side by side and ask, for each pair that could be confused, whether the descriptions make the choice obvious. The description's job is boundary-setting against its neighbors, not self-contained completeness.

---

### SEGMENT 2: PROLIFERATION AND LAZY LOADING (6 minutes)

**DANA:** We touched this in episode two from the cost angle. Let's do the accuracy angle.

**THEO:** Two distinct degradations as tool count rises. One is selection accuracy -- more options, more confusion, especially with overlap. The other is subtler: with a very large tool set, the model's attention over the tool block is spread thin, and tools near the middle of the list get systematically under-selected. It's the lost-in-the-middle effect applied to your capability surface. A tool nobody uses might be a bad tool or might just be badly positioned.

**DANA:** How would you even notice that?

**THEO:** Selection frequency per tool, logged. If a tool has near-zero usage, investigate before you delete it -- test whether it gets used when it's the only option for a task it should serve. If it does, you have a discoverability problem, not a utility problem, and the fix is the description or the position, not removal.

**DANA:** So, lazy loading. How does it actually work?

**THEO:** The resident set is a small index: tool names plus one-line summaries, plus one meta-tool that fetches full schemas by name or by keyword search. The model sees the menu, decides it needs something, calls the meta-tool, and the harness injects the full definitions into the conversation. From that point the tool is callable normally.

**DANA:** What are the failure modes?

**THEO:** Three. First, an index entry too thin for the model to know the tool is relevant -- fixed by writing index entries for *discovery*, in the vocabulary someone would search with, rather than as terse labels. Second, the extra round trip, which is real but bounded: it happens once per tool per session, and it's dwarfed by the savings on a long run. Third, and this is the one that bites: the model loads one tool at a time when it needs five, costing five round trips. Fix that by making the fetch accept a list and by saying so explicitly in the meta-tool's description -- "load every tool you expect to need in one call." That instruction genuinely changes behavior.

**DANA:** Where does the injected schema go, given what we said about caching?

**THEO:** Appended at the current end of the conversation, never spliced into the original tool block. Splicing into an early section invalidates your prefix cache for the rest of the run. Appending preserves everything before it. Same information, same capability, and one costs you a full cache rebuild while the other costs nothing.

**DANA:** At what tool count does lazy loading start to pay?

**THEO:** I'd say somewhere around fifteen to twenty tools, or ten thousand tokens of definitions, whichever comes first. Below that the fixed cost isn't worth it. Above forty tools it's clearly worth it. And note that MCP servers push people past that threshold fast -- connect three servers with a dozen tools each and you're at thirty-six without having designed anything.

---

### SEGMENT 3: THE ERROR SURFACE (8 minutes)

**DANA:** This is your hill. Make the case.

**THEO:** Here's the case. In a typical agent run, a meaningful fraction of tool calls fail -- wrong path, bad syntax, a test that doesn't pass, a permission denied. What the tool returns in that moment determines whether the next step is a recovery or a flail. And most tools return the equivalent of "Error: operation failed," which contains exactly zero bits of actionable information. You have handed the model a dead end and asked it to be clever.

**DANA:** So what should an error return?

**THEO:** Five components, and I'd hold this as a checklist. One: what specifically failed, in concrete terms. Not "invalid input" -- "the path `src/util.go` does not exist." Two: the actual underlying error text, unabridged. The stderr, the exception message, the exit code. Models are extremely good at reading raw compiler and runtime errors, and summarizing them for the model destroys information it could have used.

**DANA:** That's a good point that runs against instinct. People sanitize errors to keep them short.

**THEO:** And they're paying tokens to reduce their success rate. A hundred lines of stack trace is worth it, because the answer is in there. Three: relevant state. If a path wasn't found, list what *is* in that directory. If a parameter was invalid, show the valid values. This turns "no" into "no, but here's the neighborhood," and the model very often finds the answer in the neighborhood on the same step.

**DANA:** Four?

**THEO:** A suggested next action, when you can compute one. "File not found. Did you mean `src/utils.go`?" A simple edit-distance check on the directory listing. Or "This command requires the venv to be active; run `source .venv/bin/activate` first." You know the recovery path -- you wrote the tool. Encoding it costs you five lines and saves the model two or three steps of guessing.

**DANA:** And five.

**THEO:** Whether it's retryable, explicitly. A transient network error and a malformed argument require completely different responses, and from the model's side they can look identical. Say which it is. "This is a transient error; retrying may succeed" versus "This request is invalid as written; change the arguments." That single flag prevents both of the failure modes -- retrying a permanent failure forever, and giving up on a transient one.

**DANA:** Let's talk about the success side too, because I think results are also badly designed.

**THEO:** They are, and the biggest sin is unbounded output. A tool that returns whatever the underlying command produced will eventually return two megabytes of build log and destroy your context in one step. Every tool needs a size cap enforced by the harness. And when you truncate, do it in the middle, keeping the head and the tail -- the head has the structure, the tail has the conclusion or the error, and the middle is usually the repetitive part.

**DANA:** And state the truncation.

**THEO:** State it with the real numbers and provide the continuation mechanism. "Showing 2,000 of 45,000 lines. Use `offset` to read further." Now it's a paged read rather than a loss. Two more result-design principles. Make results *actionable* -- include the identifiers needed for the next operation, so a search result includes file and line, not just matched text, because the agent's next step is to open it. And make them *stable* -- consistent formatting across calls, so the model learns the shape. Inconsistent output formats force re-parsing effort on every call.

**DANA:** What about tools that succeed but produce a surprising result? Like a test run where tests fail.

**THEO:** Important distinction and it's often conflated. A test run where tests fail is a *successful tool call* with a negative result. It should not be framed as a tool error, because the tool did its job. Muddling those means the agent can't distinguish "my harness is broken" from "my code is wrong," and those need very different responses. Keep the tool-level status and the domain-level result as separate fields.

---

### SEGMENT 4: PERMISSION MODELS (7 minutes)

**DANA:** Let's get to permissions. What's the design space?

**THEO:** Three axes. What's the default -- allow, deny, or ask. What's the granularity -- per tool, per tool-plus-argument-pattern, per resource. And who decides -- static configuration, a runtime policy engine, or a human in the loop.

**DANA:** Start with defaults.

**THEO:** Deny by default for anything with external or irreversible effect. Allow by default for read-only operations within a defined boundary. Ask for the middle -- writes within the workspace, commands that could be either. That middle band is where the design work is, because ask-for-everything trains people to click yes without reading, which is worse than allowing by default since it manufactures false assurance.

**DANA:** That's the alert fatigue problem.

**THEO:** And it's the failure mode I'd worry about most, because it's invisible. A system that prompts on every file write produces a human who approves file writes reflexively, and then approves the one that mattered. You have spent real user attention and purchased negative safety. So the goal isn't to maximize prompts, it's to make each prompt carry information -- which means most things should be decided without asking.

**DANA:** Granularity. Per-tool is clearly too coarse for something like a shell tool.

**THEO:** Way too coarse, and shell is the canonical example. "Allow shell commands" is not a meaningful permission -- it's root. What you need is argument-level policy: allow `git status`, `git diff`, `npm test`; ask for `git push`; deny `rm -rf` and anything piping to a shell. Which means parsing the command well enough to classify it, and that's genuinely hard -- shell has enough expressive power that a determined classifier bypass is easy.

**DANA:** So how do you handle it honestly?

**THEO:** Two honest options. Either treat shell access as a trust boundary you don't try to subdivide -- if the agent has shell, it has everything inside the sandbox, and your safety comes from the sandbox rather than from command classification. Or don't expose general shell at all, and provide specific tools for the specific operations you want. The dishonest option, which is common, is a regex-based shell allowlist that gives the *appearance* of control while being trivially bypassable by any command that composes.

**DANA:** Which do you actually do?

**THEO:** Sandbox-as-boundary, with a small deny list for the obvious catastrophic patterns as a defense-in-depth measure rather than as the primary control. And I'm explicit with users about which one is load-bearing, because the failure mode of security theater is that people take risks they wouldn't have taken if they understood the actual guarantee.

**DANA:** What about resource-scoped permissions?

**THEO:** This is where the real leverage is and it's underused. Rather than "can the agent write files," it's "the agent can write within this directory subtree and nowhere else." Path-scoped write access is easy to implement, easy to reason about, and covers the overwhelming majority of what you want. Then verification inputs, credentials, and configuration sit outside the writable scope by construction -- which, as we said in episode one, is what stops an agent from making tests pass by editing tests.

**DANA:** Let's talk about hooks, since they're the deterministic policy layer.

**THEO:** A hook is a deterministic program the harness runs at a defined lifecycle point -- before a tool call, after a tool call, at loop start, at termination. It can inspect, it can block, it can modify, it can inject context. And the reason they matter is the through-line I named at the top: a hook moves a decision out of the model and into code.

**DANA:** Give me the canonical uses.

**THEO:** Four. Policy enforcement -- a pre-tool hook that rejects writes outside the allowed subtree, deterministically, regardless of what the model was persuaded of. Automatic quality gates -- a post-write hook that runs the formatter and the linter, so the agent never has to remember and the code is always clean. Context injection -- a hook that adds relevant state at a lifecycle point, like re-injecting the pinned constraints from episode two. And audit -- a hook that records every tool call to your journal, which is the substrate for next episode.

**DANA:** The formatter example is a nice one because it's not about safety at all.

**THEO:** It's about not spending model tokens on things `gofmt` does perfectly. Every deterministic post-processing step you move into a hook is a step the model doesn't take, a chunk of context it doesn't consume, and a class of inconsistency that stops existing. I'd argue the productivity uses of hooks are more valuable than the safety uses in day-to-day work, and they're the ones people don't think of.

---

### SEGMENT 5: SANDBOXING (5 minutes)

**DANA:** Isolation. What are the layers?

**THEO:** Four, and you should think about each independently. Filesystem: what can be read and written. Network: what can be reached. Process: what can be executed and with what privileges. And credentials: what secrets are reachable from inside.

**DANA:** Which is most often botched?

**THEO:** Credentials, by a wide margin, and the reason is that people think about the agent and forget about the environment. Your sandbox has strict filesystem rules and then the process inherits a full environment with cloud credentials, a database URL, and an API token, because that's what the developer's shell has. Now filesystem isolation is decorative -- anything in the sandbox can reach production.

**DANA:** So the rule is explicit allowlisting of environment.

**THEO:** Explicit allowlist, empty by default, and inject only what a given run demonstrably needs. It's slightly annoying to set up once and it eliminates the largest real risk in most agent deployments. And I'd add: prefer short-lived, narrowly-scoped credentials over long-lived ones, so that even a leak has a bounded blast radius in time and scope.

**DANA:** Network isolation. Realistic?

**THEO:** Realistic and worth doing, with one honest caveat. Default-deny with an allowlist of what's needed -- the package registry, your internal services, the model provider. The caveat is that this is also your defense against a specific attack that people underrate: prompt injection leading to exfiltration. An agent that reads a file containing hostile instructions and then makes an outbound request to an attacker's host is a real threat model, and network egress control is the strongest mitigation available, because it doesn't depend on the model resisting persuasion.

**DANA:** Say more about that, because I think it's the security topic that matters most here.

**THEO:** The core issue is that an agent's context mixes instructions with data, and the model doesn't have a reliable way to distinguish them. Content the agent *reads* -- a file, a web page, a ticket description, a tool result from an external service -- can contain text that reads as an instruction. Mitigations, in order of reliability. Best: don't let the consequences happen -- egress control, write scoping, no ambient credentials. So even a fully persuaded agent can't do the damage. Middle: structural marking, wrapping untrusted content in clear delimiters and telling the model that content inside them is data and never instructions. It helps and it is not a guarantee. Weakest: asking the model to be vigilant, which is a hope, not a control.

**DANA:** So the design principle is to assume persuasion succeeds.

**THEO:** Assume it succeeds and make the outcome bounded anyway. That's the whole discipline. Every control that depends on the model making a good judgment is a soft control; every control enforced by the harness is a hard one. Build the hard ones first.

**DANA:** What about the isolation-versus-usefulness tension? A perfectly isolated agent can't do anything.

**THEO:** True, and the resolution is scoping by task rather than a single global setting. A code-review agent needs read access and no writes and no network. An implementation agent needs writes to one subtree and package-registry access. A deployment agent needs credentials and should have a human gate. Same harness, three profiles. A single permission configuration for every task is necessarily the union of everything, which means every task runs at the privilege of the most dangerous one.

---

### CLOSING (3 minutes)

**DANA:** Let's land it. The harness is everything between the model and the world, and its unifying discipline is moving decisions out of model judgment and into deterministic code.

**THEO:** Tools are API design for a reader who's deciding what to do next. One tool per intent. Split when parameters become mutually exclusive modes, merge when tools overlap, because tool selection is harder for a model than parameter selection. Write descriptions comparatively, lead with when to use it, and include explicit negative guidance -- it's the fastest fix for an over-selected tool.

**DANA:** Tool proliferation degrades both cost and selection accuracy, and lazy loading fixes both. Write index entries for discovery, let the fetch take a list, and append injected schemas at the end so you don't blow the prefix cache.

**THEO:** The error surface is the highest-leverage thing most teams have never touched. Five components: what failed specifically, the raw underlying error unabridged, relevant state like the directory listing, a suggested next action, and an explicit retryable flag. Don't sanitize stack traces -- models read them well. Cap all results, truncate the middle, state the numbers, offer paging. And keep tool-level status separate from domain-level result, so a failing test isn't confused with a broken tool.

**DANA:** On permissions: deny by default for irreversible effects, allow for scoped reads, and keep the ask band narrow, because prompting on everything manufactures reflexive approval. Path-scoped writes give you most of the value. Be honest about whether shell classification or the sandbox is the load-bearing control.

**THEO:** And on isolation: four layers, with credentials the most commonly botched -- allowlist the environment, don't inherit it. Network egress control is your strongest mitigation against injection-driven exfiltration, because it works even if the model is fully persuaded. Assume persuasion succeeds and bound the outcome anyway.

**DANA:** Last episode next time. Everything we've built needs to be observable, testable, and affordable -- trace schemas, replay and determinism, harness-level evals and regression gates, building eval sets from production traces, and the number that actually matters, cost per resolved task.

**THEO:** Plus a genuine attempt at what's commodity now and what's still worth building yourself.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

# Episode 12: Subagents, Forks, and Workflows
## "From One Claude to Many"

**Duration:** ~6 minutes
**Hosts:** Alex (Expert Developer) & Jamie (Learning Developer)
**Season:** 2, The 2026 Edition

---

### INTRO

**ALEX:** Welcome back to Claude Code Mastery, season two. I'm Alex.

**JAMIE:** I'm Jamie. Last time we covered models, effort and auto mode. Today is the feature that changed how I work the most: running more than one Claude at a time.

**ALEX:** Subagents, forks, background work, and dynamic workflows. We'll explain each one, when to use it, and how to keep it from turning into chaos.

---

### SEGMENT 1: Subagents Grew Up

**JAMIE:** Remind me what a subagent is.

**ALEX:** A subagent is a separate Claude that your main session hands a task to. It gets its own context window, does the work, and returns a summary. The main benefit is that all the searching and reading it did stays out of your main conversation, so your context stays clean.

**JAMIE:** What changed this year?

**ALEX:** Three big things. In June, subagents gained the ability to spawn their own subagents, with background chains capped at five levels deep. At the end of June, subagents started running in the background by default, so Claude keeps working while they run instead of waiting. And background subagents now bring their permission prompts up to your main session instead of quietly being denied.

**JAMIE:** So I can have Claude research three things at once.

**ALEX:** Exactly. "Look at how authentication works in these three services and tell me where they differ." Claude can send three subagents, one per service, and combine the answers.

**JAMIE:** Can I talk to a subagent after it finishes?

**ALEX:** Yes. If a subagent stops at its turn limit, it now returns its output marked as partial, with a hint that Claude can continue it with the send message tool. You don't have to start over.

**JAMIE:** And can subagents use a different model or effort?

**ALEX:** They can. You can set a default effort for subagents with an environment variable, and a subagent on a different model uses that model's saved effort level. A common pattern is a strong model for the main session and a cheaper one for search-heavy subagents.

---

### SEGMENT 2: Forks

**JAMIE:** What's the difference between a subagent and a fork?

**ALEX:** A normal subagent starts fresh. It only knows what Claude tells it in the task description. A fork inherits your full conversation. So if you have spent an hour explaining a tricky bug, a fork already knows everything you've said.

**JAMIE:** When did that arrive?

**ALEX:** In July, there was a slash fork command that copies your conversation into a new background session while you keep working. In August, fork mode became the default in interactive sessions, so Claude itself can hand a side task to a fork that knows the whole conversation.

**JAMIE:** Give me an example.

**ALEX:** You're deep in a refactor and you notice the test helpers are a mess. Instead of derailing, you say "fork off and clean up the test helpers while we keep going on the refactor." The fork knows the context, does the side quest, and reports back.

**JAMIE:** Any downsides?

**ALEX:** Forks carry your whole conversation, so they cost more context than a fresh subagent. Use a fork when context matters, and a fresh subagent when the task is self-contained, like "search the codebase for every call to this function."

---

### SEGMENT 3: Long-Running Work

**JAMIE:** Now the tools for work that takes a long time.

**ALEX:** Three to know. First, slash goal. It keeps Claude working across turns until a completion condition holds. "Keep going until all tests pass and the linter is clean." Claude doesn't stop after one round.

**JAMIE:** Second.

**ALEX:** The Monitor tool. It streams background events into the conversation, so Claude can tail a log or wait for a build and react when something happens. Before, Claude would run a command, wait, and check. Now it can watch.

**JAMIE:** And third.

**ALEX:** Slash loop. It runs a prompt on a repeating schedule, like "check the deploy every five minutes." Since April, if you leave out the interval, Claude picks its own pace. And slash usage has a loops breakdown so you can see which loops are expensive.

**JAMIE:** I can imagine leaving a loop running all weekend by accident.

**ALEX:** That's why the breakdown exists. Give every loop an end condition, and check slash usage now and then.

---

### SEGMENT 4: Dynamic Workflows

**JAMIE:** What are dynamic workflows?

**ALEX:** They arrived in late May. A workflow is a script that Claude writes to orchestrate many subagents, dozens or even hundreds, in a planned way. Think of a big migration across a monorepo: one agent per package, each running the same steps, then a verification pass over all the results.

**JAMIE:** How is that different from just asking for lots of subagents?

**ALEX:** Structure. A workflow is deterministic. It defines phases, which agents run in parallel, and what happens to the results. You can watch progress, and if it stops halfway, you can resume it and completed steps come back from cache.

**JAMIE:** That sounds expensive.

**ALEX:** It can be, so treat it as something you opt into for big jobs, not a default. A good rule: if the work is many similar, independent pieces, a workflow is worth it. If it's one tricky problem, more agents won't help.

---

### SEGMENT 5: Keeping Track

**JAMIE:** With all these agents, how do I know what's going on?

**ALEX:** Agent view. Run claude agents and you get one screen for every Claude Code session: what's running, what's blocked waiting for you, and what's done. Each row shows a colored state word and a short headline. In VS Code, there's an agent map where you can open a subagent's read-only transcript or stop it.

**JAMIE:** And sessions can talk to each other now?

**ALEX:** Since August, on macOS and Linux, your Claude Code sessions can message each other. So a session that found the root cause of a bug can tell the session that's writing the fix, instead of you copying and pasting. And typing the at sign in the prompt lets you mention another session by name.

---

### SEGMENT 6: Patterns That Work

**JAMIE:** Give me three patterns to try this week.

**ALEX:** One: research in parallel. When you start on unfamiliar code, ask Claude to send subagents to map the main areas, then summarize. Two: fork the side quest. When you notice something worth fixing that isn't your current task, fork it instead of switching. Three: goal plus monitor for finishing work. "Keep going until CI is green, and watch the build output." Then go get coffee.

**JAMIE:** And one anti-pattern.

**ALEX:** Throwing agents at a problem you haven't explained. Five confused agents are worse than one clear one. Write the task down clearly first.

---

### OUTRO

**JAMIE:** So: subagents run in the background and can nest, forks inherit your conversation, slash goal, Monitor and slash loop handle long-running work, workflows orchestrate big parallel jobs, and agent view keeps track of it all.

**ALEX:** Next episode, we take Claude Code out of your terminal entirely: the web, your phone, scheduled routines and Remote Control.

**JAMIE:** See you then.

---

*End of Episode 12*

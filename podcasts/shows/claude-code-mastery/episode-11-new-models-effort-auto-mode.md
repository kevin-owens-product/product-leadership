# Episode 11: New Models, Effort, and Auto Mode
## "What Changed in 2026 Before You Type a Single Prompt"

**Duration:** ~7 minutes
**Hosts:** Alex (Expert Developer) & Jamie (Learning Developer)
**Season:** 2, The 2026 Edition

---

### INTRO

**ALEX:** Welcome to season two of Claude Code Mastery. I'm Alex.

**JAMIE:** And I'm Jamie. When we recorded season one back in January, I was learning how to approve file edits. Since then, Claude Code has changed so much that some of what we said is out of date.

**ALEX:** That's why we're back. This season is four episodes on what changed in 2026. Today is the foundation: the models, the new effort control, and auto mode, which changed how permissions work. Next time is subagents and workflows. Then Claude Code outside your terminal. And we finish with artifacts, the browser and computer use.

**JAMIE:** And everything we mention comes from Anthropic's public release notes and docs, so you can look it up.

---

### SEGMENT 1: The Model Menu

**JAMIE:** Start with models. In season one, I barely thought about which model I was using.

**ALEX:** You can still mostly ignore it, because the defaults are good. But it helps to know the lineup. Over the summer, Sonnet 5 became the default for Pro and Team Standard seats, with a native one million token context window. Opus 5 arrived in late July, also with a million tokens of context. Then in late September and early October the five point five generation landed: Opus 5.5, Sonnet 5.5 and Haiku 5.5.

**JAMIE:** And Fable?

**ALEX:** Fable is Anthropic's larger model line. Fable 5.1 arrived in Claude Code at the start of September, and you select it with the fable alias. On the Anthropic API, it only shows up in the picker once your organization has access, but typing slash model fable checks with the server directly.

**JAMIE:** So how do I choose?

**ALEX:** Type slash model to see the picker. My rule of thumb: Sonnet for everyday coding, Opus when the task is long or tricky, Haiku for quick, simple things, and Fable if you have it and the task is genuinely hard. And if you want a different default for new sessions, there's a setting for that now.

**JAMIE:** What happens if the model I want is unavailable?

**ALEX:** You can configure fallback models, up to three, tried in order. That's mostly useful for teams on cloud providers or behind a gateway, where a particular model might not be enabled in every region.

---

### SEGMENT 2: Effort Is the New Dial

**JAMIE:** You keep saying effort. What is it?

**ALEX:** Effort is how hard the model thinks before it answers. Low, medium, high, x-high and max. Higher effort means more reasoning, better answers on hard problems, and more tokens. Lower effort is faster and cheaper.

**JAMIE:** How do I set it?

**ALEX:** Type slash effort and you get a slider. Since September, Claude Code saves a separate effort level for each model, so you can keep Opus at high and Haiku at low without resetting every time. In the picker, pressing the S key applies a level to just the current session instead of saving it.

**JAMIE:** And the magic word.

**ALEX:** Right. If you type ultrathink in your prompt, that turn runs at x-high effort on the newest models. It's a quick way to say "think hard about this one" without changing your setting.

**JAMIE:** When should I turn effort up?

**ALEX:** Debugging something subtle, designing an architecture, a big refactor, anything where a wrong first answer costs you an hour. Turn it down for renames, formatting, small edits and quick questions. And watch slash usage. It breaks down what's driving your limits, by model, subagent, skill and plugin.

**JAMIE:** There's also slash cost now, right?

**ALEX:** Yes, and it shows how much of your input came from the prompt cache. That matters because cached tokens are much cheaper. If you see lots of cache misses, it usually means something keeps changing the start of your conversation.

---

### SEGMENT 3: Auto Mode Explained

**JAMIE:** Okay, the big one. In season one, I approved every command. Now there's auto mode.

**ALEX:** Auto mode arrived as a research preview in March, and in August it became the default permission mode for new sessions on Pro, Max and Team plans. Instead of asking you to approve each action, a classifier reviews actions in the background. Safe actions run, risky ones get blocked or come back to you.

**JAMIE:** That sounds a bit scary.

**ALEX:** It's actually a middle ground. Before, you either approved everything one by one, or you used the dangerously skip permissions flag and approved nothing. Auto mode sits in between. And it has gotten more careful over the year. It blocks destructive git commands when you didn't ask to discard work. It asks before running r m minus r f on a variable it can't resolve. It blocks things like requesting credentials from a cloud metadata endpoint. And it asks the first time Claude wants to read a file outside your working directories.

**JAMIE:** What happens when it blocks something?

**ALEX:** Claude gets a reason, and since September the reason usually names the rule that matched, like data exfiltration. So Claude can explain to you what happened, and you can decide whether to allow it.

**JAMIE:** How do I customize it?

**ALEX:** Run slash permissions and open the Auto mode tab. You can view and edit the classifier rules there without touching a settings file. And when you're in manual mode and a Bash prompt comes up, there's now an option that says yes, and switch to auto mode.

---

### SEGMENT 4: Rules That Actually Hold

**JAMIE:** What about rules I want to be absolute? Like, never touch the production config.

**ALEX:** That's what deny rules are for. A few improvements this year make them much more precise. Rules can match tool parameters now, so you can write something like Agent, model colon opus, to control which model subagents can use. Hard deny rules in auto mode block an action unconditionally, regardless of any allow exception. And there's a setting to block writes outside your working directories entirely.

**JAMIE:** I heard project settings can't turn on bypass mode anymore.

**ALEX:** Correct. If a repository's own settings file sets the default mode to bypass permissions, it no longer takes effect, and the session starts in manual mode. You have to set that in your user or managed settings, or pass it on the command line. That stops a repository you just cloned from quietly turning off your protections.

**JAMIE:** And there's a restricted mode?

**ALEX:** Restricted mode starts Claude Code without the tools that run commands or code. It's designed for evaluation harnesses and shared machines. You start it with the restricted flag. It also removes web fetch and keeps file tools inside your working directories.

---

### SEGMENT 5: A Sensible Setup

**JAMIE:** Give me a starting setup for someone coming back after season one.

**ALEX:** Five steps. One, update Claude Code and run slash doctor. It's a full setup checkup that diagnoses problems and can fix many of them. Two, leave the default model alone for a week and just notice when you wish it were smarter or faster. Three, try auto mode on a personal project first, and look at the Auto mode tab to see what it blocks. Four, add deny rules for anything truly off limits: production configs, secrets folders, deployment scripts. Five, use ultrathink for the hard turns instead of running everything at max.

**JAMIE:** And if I want shorter answers?

**ALEX:** There's a built-in concise output style that makes Claude lead with the result and skip the preamble.

---

### OUTRO

**JAMIE:** So: a new model lineup with a million tokens of context, effort as a dial you control per model, and auto mode replacing most permission prompts with background checks.

**ALEX:** And precise rules for the things that must never happen. Next episode, we go from one Claude to many: subagents, forks, background work and workflows.

**JAMIE:** See you then.

---

*End of Episode 11*

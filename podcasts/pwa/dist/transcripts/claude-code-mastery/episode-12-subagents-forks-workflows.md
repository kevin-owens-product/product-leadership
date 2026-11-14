# Episode 12: Subagents, Forks, and Workflows
## "From One Claude to Many"

**Duration:** ~45 minutes
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

### SEGMENT 6: Writing Your Own Subagent

**JAMIE:** Claude can start general subagents on its own. But I've seen people define their own. How does that work?

**ALEX:** You create a markdown file in your project's dot claude agents folder, or in your home folder for personal ones. At the top, a few settings: a name, a description of when to use it, which tools it can use, and optionally which model. Below that, the instructions, written like a system prompt for that specialist.

**JAMIE:** Give me a good example.

**ALEX:** A test-writer subagent. The description says "Use after implementing a change to write or update tests for it." The tools are limited to reading files, editing files in the tests folder, and running the test command. The instructions say how your team writes tests: which framework, where fixtures live, the naming pattern, and "never change source code to make a test pass; report the problem instead."

**JAMIE:** Why limit the tools?

**ALEX:** Two reasons. Safety, because a test writer has no business deploying anything or editing production code. And focus, because a subagent with fewer tools makes fewer odd choices. If it can only touch the tests folder, it can't decide to "fix" the bug by changing the code under test.

**JAMIE:** And the description matters a lot?

**ALEX:** It's how Claude decides when to use it. A vague description like "helps with testing" means Claude might use it at the wrong time or not at all. A specific one, with "use after" or "use when," makes the choice easy. You can also just ask for it by name: "use the test writer subagent on this change."

**JAMIE:** What other specialists are worth having?

**ALEX:** A code reviewer that reads a diff against your conventions and reports issues without editing anything. A researcher that only has read and search tools, for exploring unfamiliar code. And something project-specific, like a migration checker that knows your database rules. Start with one or two. If you define fifteen, their descriptions all compete for Claude's attention.

**JAMIE:** And model choice for each?

**ALEX:** Match the model to the job. A researcher that reads a lot of files can often run on a cheaper, faster model. A reviewer that needs judgment benefits from a stronger one. That's one of the nicest things about defining your own: you put the expensive model only where it earns its cost.

---

### SEGMENT 7: Briefing a Subagent

**JAMIE:** You said a fresh subagent only knows what Claude tells it. So the quality of that handoff matters.

**ALEX:** Enormously. A fresh subagent doesn't know what you've discussed, what you've ruled out, or why you care. If the brief says "look into the login bug," it'll start from zero and maybe rediscover things you already know.

**JAMIE:** So what's a good brief?

**ALEX:** Four parts. The goal: what question to answer or what to produce. The context: what's already known and what's been ruled out. The scope: which files or areas to look at, and what not to touch. And the return format: what to send back, like "a list of the places where the session token is validated, with file and line, and a one-line note on each."

**JAMIE:** Claude writes those briefs, though, not me.

**ALEX:** Usually, yes, but you shape them. If you give Claude a clear picture of the task, its briefs to subagents are clear too. And you can be explicit: "send a subagent to check the three payment services, and tell it we've already ruled out the database layer." That one sentence saves the subagent a lot of wasted searching.

**JAMIE:** What about the return format? Why does that matter so much?

**ALEX:** Because the summary is all your main session gets. If the subagent sends back a long, rambling report, your context fills up with it, which defeats the purpose of using a subagent. A short, structured answer keeps your main conversation clean. And ask it to say what it didn't check, so you know the limits of the answer.

**JAMIE:** Should I trust what a subagent reports?

**ALEX:** Treat it like a colleague's report: usually right, sometimes confidently wrong. For anything important, have the main session verify a key claim or two, especially before acting on it. A subagent that says "there are no other callers of this function" is worth a quick double-check before you delete the function.

---

### SEGMENT 8: Parallel Research, Step by Step

**JAMIE:** Walk me through the parallel research pattern on a real task.

**ALEX:** Say I've just joined a team and I'm asked to add rate limiting to the public API. I don't know the codebase. I start a session and say: "Before we change anything, I need a map. Send subagents to find out, in parallel: how requests flow from the router to the handlers; whether there's any existing rate limiting or throttling anywhere; how configuration is loaded; and how the existing middleware is tested. Each should return a short summary with file paths."

**JAMIE:** Four subagents.

**ALEX:** Four, running in the background at the same time. While they work, my main session is free. I might ask Claude a question about the team's conventions in CLAUDE.md. When the subagents finish, Claude combines their summaries into one map.

**JAMIE:** And then?

**ALEX:** Then I switch to plan mode and ask for a plan for rate limiting, based on the map. The plan is much better than it would have been without the research, because it fits how the codebase actually works. And my main context only holds the summaries, not the hundreds of files the subagents read.

**JAMIE:** How long does that take?

**ALEX:** A few minutes for the research, depending on the size of the codebase. Compared with an afternoon of me reading code, it's a huge saving. And I still read the key files myself afterward, because I want to understand the code, not just have Claude understand it.

---

### SEGMENT 9: Forks in Practice

**JAMIE:** Let's do the same for forks.

**ALEX:** I'm debugging a race condition with Claude. We've spent forty minutes narrowing it down. Claude knows the symptoms, the logs, the theories we've tested and rejected. Then I notice the logging in this module is so poor that it made the debugging much harder.

**JAMIE:** And you want it fixed, but not now.

**ALEX:** Right. So I say "fork a session to improve the logging in this module, using what we've learned about which events matter." The fork knows everything we've discussed, so it knows exactly which events were hard to see. It goes off and adds structured logging for those, while the main session and I keep chasing the race condition.

**JAMIE:** Why not a fresh subagent?

**ALEX:** Because a fresh one wouldn't know which events matter. I'd have to explain forty minutes of debugging. The fork already has that. That's the rule: fork when the conversation itself is the context.

**JAMIE:** And what comes back?

**ALEX:** The fork reports what it changed. Since it might edit files, I want it on its own branch or working copy, so its changes don't collide with what we're doing in the main session. More on that in a minute.

---

### SEGMENT 10: Goals That Actually End

**JAMIE:** Slash goal keeps Claude working until a condition holds. How do I write a good condition?

**ALEX:** Make it something Claude can check objectively. "All tests pass and the linter reports no errors" is great, because Claude can run both and see the result. "The code is clean" is bad, because it's a judgment, and Claude might either stop too early or never feel finished.

**JAMIE:** What else makes a goal go wrong?

**ALEX:** Conditions that can be met by cheating. "All tests pass" can be met by deleting the failing tests. So I add constraints: "all tests pass, without deleting, skipping or weakening any existing test." The newer models are good about this, but it's still worth saying.

**JAMIE:** And a budget?

**ALEX:** Always. Add a limit: "stop after an hour, or if you've made three attempts at the same failure without progress, and tell me what's blocking you." Without that, a goal on an impossible task just burns time and usage.

**JAMIE:** Monitor plus goal was one of your patterns. How do they combine?

**ALEX:** The goal says when to stop. The monitor tells Claude when something happened. "Keep going until CI is green" plus a monitor on the CI status means Claude pushes a fix, watches the build, sees it fail on a different test, fixes that, and repeats until the condition holds. You don't have to keep checking.

---

### SEGMENT 11: Keeping Agents Out of Each Other's Way

**JAMIE:** You said the fork should be on its own branch. What happens if two agents edit the same files at the same time?

**ALEX:** Nothing good. If two agents edit the same working copy, one can overwrite the other's changes, or one runs the tests while the other is halfway through an edit and sees a broken build that isn't real. Research subagents that only read are fine to run in parallel. Agents that write need their own space.

**JAMIE:** So what's the fix?

**ALEX:** Git worktrees. A worktree is a second working copy of the same repository, on its own branch, in its own folder. Claude Code can create one for an agent, so that agent edits its own copy and nothing it does affects your main working copy until you merge its branch.

**JAMIE:** And when it's done?

**ALEX:** You review its branch like any other. If it's good, merge it. If not, throw it away. If the agent made no changes, the worktree can be cleaned up automatically. It's the same review flow you'd use for a colleague's branch.

**JAMIE:** Does that work for workflows too, with dozens of agents?

**ALEX:** It's essential there. For a big parallel job, each agent that writes code should work in its own worktree or its own sandbox, on its own branch. Then a final step, either a person or a verification agent, reviews and merges the results. If you skip that and let fifty agents edit one folder, you'll spend more time untangling conflicts than you saved.

**JAMIE:** Any disk space warning?

**ALEX:** A good one to mention. Each worktree is a full copy of your files, though git shares the history. In a big repository with many worktrees, that adds up. Clean up worktrees you no longer need.

---

### SEGMENT 12: A Workflow, Start to Finish

**JAMIE:** Let's walk through a real workflow. Give me a big job.

**ALEX:** Say we have a monorepo with forty packages, and we're upgrading the testing library to a new major version that changed a few APIs. Each package needs its test files updated. That's forty similar, mostly independent jobs. A classic workflow case.

**JAMIE:** So how does it start?

**ALEX:** I explain the job to Claude and say I want to run it as a workflow. Claude writes a script with phases. Phase one: for each package, an agent reads the package's tests and lists what needs to change, without editing anything. Phase two: for each package, an agent applies the changes in its own worktree and runs that package's tests. Phase three: a verification pass that checks each package's result and flags any that failed or that changed something outside the test files.

**JAMIE:** Why a separate listing phase?

**ALEX:** Two reasons. It lets me look at the scope before spending on the edits. If phase one says thirty-eight packages need small changes and two need big ones, I might handle those two by hand. And it gives the edit agents a clear brief, from the listing, instead of each one rediscovering what to do.

**JAMIE:** And while it runs?

**ALEX:** I can watch progress, see which packages are done, and look at any agent's output. If something goes wrong halfway, say the test runner breaks because of a shared config change, I can stop it, fix the config, and resume. The completed steps come back from cache, so I don't pay for them again.

**JAMIE:** And at the end?

**ALEX:** I get a summary: thirty-five packages upgraded with passing tests, three that needed changes outside test files and were flagged, and two that failed with explanations. I review the flagged and failed ones myself and merge the rest in batches. A job that would have taken a person a week takes an afternoon, and most of my time goes into the interesting cases.

**JAMIE:** How many agents is that?

**ALEX:** Around eighty, between the phases. Which is why workflows are opt-in, and why they're worth it only for genuinely big, parallel jobs.

---

### SEGMENT 13: What Multi-Agent Work Costs

**JAMIE:** Let's be honest about cost. Running many agents must use a lot more of my limits.

**ALEX:** It does. Every subagent is a separate conversation with its own context and its own tokens. Ten subagents that each read twenty files use roughly ten times the tokens of one agent reading twenty files. The time saving is real, but so is the usage.

**JAMIE:** So when is it worth it?

**ALEX:** When the parallel work is genuinely independent and the time matters. Researching four separate areas of a codebase at once: worth it. Forty package upgrades: worth it. Three subagents all reading the same files to answer slightly different questions: not worth it, because one agent could read them once.

**JAMIE:** How do I see what my agents cost?

**ALEX:** Slash usage breaks your usage down by model, subagent, skill and plugin, so you can see if a particular subagent type is expensive. If your test-writer subagent is using a third of your limits, maybe it's on a model that's bigger than it needs, or its instructions make it read too much.

**JAMIE:** Any cheap wins?

**ALEX:** Put research subagents on a smaller model. Give them tight scope and a short return format. And don't fork when a fresh subagent would do, because a fork carries your whole conversation as context.

---

### SEGMENT 14: Skills, Subagents or Commands?

**JAMIE:** I'm getting confused about the difference between skills, subagents and slash commands. When do I use which?

**ALEX:** Good question, because they overlap. A skill is knowledge: a procedure Claude loads into its own context when a task calls for it. "Here's how we cut a release." The main Claude follows it, in the main conversation. A subagent is a separate worker with its own context, its own tools and maybe its own model. "Go write tests for this change and tell me when you're done." A slash command is a shortcut you type to trigger something, often a saved prompt.

**JAMIE:** So a release procedure is a skill.

**ALEX:** Usually, because you want the main session to follow the steps and you want to see them happen. A code review of a big diff might be a subagent, because you want a fresh perspective and you don't want all that reading in your main context. And a command is for things you type often, like "summarize what changed since yesterday."

**JAMIE:** Can they work together?

**ALEX:** Yes. A subagent can use skills. A skill can tell Claude to send a subagent for part of the work. And a plugin can bundle all three, plus hooks and MCP servers, so a team can install a whole setup in one step.

**JAMIE:** What's the most common mistake here?

**ALEX:** Making everything a subagent. If the task is short and needs your conversation's context, keep it in the main session. Subagents shine for isolated, reading-heavy or parallel work. For a two-minute edit, the handoff costs more than it saves.

---

### SEGMENT 15: Sessions That Coordinate

**JAMIE:** We mentioned sessions messaging each other. How do people actually use that?

**ALEX:** The common pattern is a split between investigation and implementation. One session investigates a production bug: reads logs, reproduces it, finds the cause. Another session, maybe in a different repository, owns the fix. When the investigator finds the cause, it messages the implementer with the details: the file, the reason, the reproduction steps.

**JAMIE:** Why not one session?

**ALEX:** Sometimes the work spans repositories, or the investigation is long and you don't want all of that in the implementer's context. And sometimes it's two people, each with their own session, working on related parts of a problem.

**JAMIE:** Is there a risk?

**ALEX:** Treat messages from another session as information from a colleague, not as instructions from you. A session shouldn't take a risky action just because another session asked. The person in charge still approves anything important. Claude Code is designed with that in mind, but it's worth knowing as a user.

**JAMIE:** And keeping track of who's doing what?

**ALEX:** Agent view again. One screen with every session, what it's doing and whether it's waiting for you. When you're running more than two or three sessions, it's the only sane way to work.

---

### SEGMENT 16: When Not to Use More Agents

**JAMIE:** We've spent a whole episode on more agents. When is one Claude better?

**ALEX:** More often than people think. When the task is small and clear, one session is faster than any handoff. When the task needs a lot of back and forth with you, like designing an API together, splitting it across agents just fragments the conversation. And when the problem is a single hard bug, more agents usually means more guesses, not a better answer.

**JAMIE:** How do I tell?

**ALEX:** Ask whether the work splits into pieces that don't need to talk to each other. Four areas of the codebase to research: yes, they split. Forty packages to upgrade: yes. One function that's producing the wrong answer: no, it doesn't split. You need one careful investigation, maybe at higher effort.

**JAMIE:** What about using a subagent just to keep the main context clean?

**ALEX:** That's a good reason on its own, even for a single task. If Claude needs to read fifty files to answer one question, doing it in a subagent means your main session only gets the answer. That keeps the main session sharp for the rest of the work. The test is whether you need the details in your main conversation or just the conclusion.

**JAMIE:** And forks?

**ALEX:** Fork when you'd otherwise have to choose between losing your current train of thought and ignoring something worth doing. If the side task can wait until you're done, just write it down and do it after. Not everything needs to happen in parallel.

---

### SEGMENT 17: Reviewing What Many Agents Produce

**JAMIE:** After a workflow or a lot of subagent work, I have a pile of results. How do I review them without spending all day?

**ALEX:** Sort before you read. Ask for a summary that groups results by outcome: succeeded cleanly, succeeded with something unusual, failed. Read the unusual and failed ones carefully, because that's where the problems are. For the clean ones, spot-check a few in full, and if those are good, review the rest more quickly.

**JAMIE:** Is that safe?

**ALEX:** It's a reasonable balance for mechanical changes with good tests. For anything risky, every change gets a real review. And make the verification phase of a workflow strict, so "succeeded cleanly" actually means something: tests passed, nothing changed outside the expected files, and the change matches the brief.

**JAMIE:** And merging?

**ALEX:** In batches, with CI on each batch. If you merge thirty changes at once and something breaks, finding which one caused it is painful. Five or ten at a time, each batch green before the next, is much easier to untangle.

---

### SEGMENT 18: Teaching a Team to Work This Way

**JAMIE:** If I want my team to start using subagents and forks, how do I introduce it?

**ALEX:** Start with one pattern, not all of them. Parallel research is the easiest win and the least risky, because the subagents only read. Ask everyone to try it once that week on a real task, then share what happened in a short team conversation. People learn fastest from seeing a colleague's real example.

**JAMIE:** And then forks?

**ALEX:** Then forks for side quests, once people are comfortable. Then goals with a monitor for finishing work. Leave workflows until someone has a genuinely big, parallel job, and let that person show the team how it went.

**JAMIE:** Anything to agree as a team?

**ALEX:** A few conventions. Writing agents work in worktrees, always. Agent-created branches get a clear prefix, so everyone can tell them apart. Workflows above a certain size need a quick heads-up in the team channel, because they use a lot of shared capacity. And everyone reviews what their agents produce before asking a colleague to review it. That last one matters most for team trust.

---

### SEGMENT 19: Common Mistakes With Many Agents

**JAMIE:** Let's do the mistakes list for this episode.

**ALEX:** One: vague briefs, so subagents rediscover what you already know. Two: letting writing agents share one working copy. Use worktrees. Three: goals with no budget and no objective end condition. Four: forks for self-contained tasks, wasting context. Five: running a workflow for a problem that isn't parallel. One hard bug doesn't get easier with forty agents.

**JAMIE:** More?

**ALEX:** Six: trusting a subagent's "nothing found" without a spot-check. Seven: defining a dozen custom subagents with overlapping descriptions, so Claude can't tell which to use. Eight: leaving loops running with no end condition. And nine: not reviewing the combined result. The more agents involved, the more important the final human review is.

---

### SEGMENT 20: Listener Questions

**JAMIE:** A few questions from listeners.

**ALEX:** Go ahead.

**JAMIE:** "How many subagents should I run at once?"

**ALEX:** For research, three to five is usually plenty. Beyond that, you get overlapping answers and a lot of reading for the main session to combine. For big mechanical jobs, use a workflow, which is designed for many.

**JAMIE:** "Can subagents see my CLAUDE.md?"

**ALEX:** They get the project's context, including CLAUDE.md, so they follow your project's conventions. What they don't get, unless they're forks, is your conversation. That's why the brief matters.

**JAMIE:** "What happens if a background subagent needs permission for something?"

**ALEX:** It brings the permission prompt up to your main session, so you can approve or deny it. Earlier, background subagents would just be denied quietly, which caused confusing failures. Now you see the request.

**JAMIE:** And last: "Is this overkill for a solo developer?"

**ALEX:** Some of it. Parallel research and forking side quests help even when you're working alone, because they keep your main session focused. Workflows and session messaging are more useful on bigger codebases and teams. Start with the patterns that solve a problem you actually have.

---

### SEGMENT 21: A Day With Many Agents

**JAMIE:** Let's do a longer story for this episode. A real day that uses forks, subagents, goals and a workflow.

**ALEX:** Okay. I'm on a team that maintains a large web application. Monday morning, I'm asked to find out why the search page got slower last week. I start a session and ask for parallel research: one subagent to look at what changed in the search code last week, one to look at the database query logs for the search queries, and one to check whether the search index configuration changed.

**JAMIE:** Three subagents, in the background.

**ALEX:** Right, and while they work, I read the original bug report again. A few minutes later, the summaries come back. The code subagent found a change that added a new filter. The query log subagent found that one query now does a full table scan. The configuration subagent found nothing. Put together, the new filter added a condition the database index doesn't cover.

**JAMIE:** Then the fix.

**ALEX:** I ask for a plan in plan mode: add an index that covers the new condition, with a migration that's safe to run on a large table. Claude proposes the index and a migration that builds it without locking the table. I approve. Claude writes the migration, adds a test, and runs the test suite.

**JAMIE:** Where does the fork come in?

**ALEX:** While we were investigating, I noticed that our query logging was missing the information that would have made this obvious immediately. So I say: "fork off and improve the slow query logging so it includes which filters were used. Work in a separate worktree." The fork knows the whole investigation, so it knows exactly what was missing. It goes off and does it on its own branch.

**JAMIE:** And the goal?

**ALEX:** Once the fix is ready, I push the branch and set a goal: "keep going until CI is green, without skipping or weakening tests, and stop after three failed attempts on the same problem." I also have Claude monitor the CI output. CI fails on an unrelated lint error in a file the migration touched. Claude fixes it, pushes, watches the next run, and it goes green.

**JAMIE:** And the workflow?

**ALEX:** That's the afternoon. During the investigation we found that the same pattern, a filter without a covering index, probably exists in other parts of the app. There are about thirty query builders. That's a parallel job, so I ask for a workflow: phase one, an agent per query builder checks for filters that aren't covered by an index and reports, without changing anything. Phase two only runs on the ones that phase one flagged.

**JAMIE:** How many get flagged?

**ALEX:** Say four. For those four, phase two drafts a migration and a test in its own worktree. Phase three verifies each one. At the end of the day, I have the original fix merged, a logging improvement from the fork waiting for review, and four draft pull requests for the other slow queries, each with evidence.

**JAMIE:** And how much of that did you do by hand?

**ALEX:** The decisions. Which question to ask, which plan to approve, what to fork off, when a workflow was worth it, and the reviews. The agents did the reading, the searching and the typing. That's the shape of the work now.

---

### SEGMENT 22: Patterns That Work

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

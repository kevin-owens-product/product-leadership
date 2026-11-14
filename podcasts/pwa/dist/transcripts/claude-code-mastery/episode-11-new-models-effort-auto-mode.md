# Episode 11: New Models, Effort, and Auto Mode
## "What Changed in 2026 Before You Type a Single Prompt"

**Duration:** ~47 minutes
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

### SEGMENT 5: A Day of Model and Effort Choices

**JAMIE:** Can we walk through a real day? I understand the dial in theory, but I want to see when you actually turn it.

**ALEX:** Sure. Say it's a Tuesday and I'm working on a web app. First thing, I open Claude Code in the repository and ask it to summarize what changed on the main branch since Friday. That's a reading and summarizing job. I leave the default model at medium effort. It doesn't need deep thinking, it needs to read the log and the diffs and tell me what matters.

**JAMIE:** Then?

**ALEX:** Then I pick up a ticket: a bug where some users see the wrong time zone on their invoices. That smells subtle. Time zone bugs usually are. So before I ask for a fix, I ask Claude to investigate and explain the cause, and I add ultrathink to that one prompt. It reads the date handling code, finds that one path formats dates on the server in the server's time zone and another formats them in the browser, and explains the mismatch.

**JAMIE:** So the high effort was for the diagnosis, not the fix.

**ALEX:** Exactly. Once the cause is clear, the fix itself is small. I go back to normal effort and say "make the server path use the user's saved time zone, and add a test for a user in Tokyo." That's straightforward work.

**JAMIE:** What about the afternoon?

**ALEX:** In the afternoon I have a bigger task: splitting a large settings page into smaller components. That's a refactor that touches a lot of files, with a real risk of breaking something. So I switch to Opus for that session and set effort to high. I also start in plan mode, so Claude proposes a plan before changing anything.

**JAMIE:** And at the end of the day?

**ALEX:** Small stuff. Renaming a few things, updating a README, fixing lint warnings. I switch to Haiku for those, because they're quick and I don't want to burn my limits on them. Because effort is saved per model, Haiku is already at low and Opus is still at high for tomorrow.

**JAMIE:** So the pattern is: think hard on diagnosis and design, go normal on execution, go light on chores.

**ALEX:** That's most of it. The mistake I see people make is running everything at max because it feels safer. It's slower, it eats your limits, and on simple tasks it can actually make things worse, because the model overthinks and adds things you didn't ask for.

---

### SEGMENT 6: What Fills the Context

**JAMIE:** Everyone keeps saying a million tokens of context. What actually goes into that?

**ALEX:** More than you'd think. Before you type anything, the context already holds the system instructions, the definitions of every tool Claude can use, including any MCP servers you've connected, your CLAUDE.md files, and the descriptions of your skills. Then every file Claude reads, every command output, every message from you and every reply goes in too.

**JAMIE:** So connecting lots of MCP servers costs context even if I don't use them.

**ALEX:** It does. Each server adds its tool definitions. If you've connected ten servers "just in case," you're carrying all of that on every turn. It's worth pruning to the ones you actually use for a given project.

**JAMIE:** What happens when it fills up?

**ALEX:** Claude Code compacts the conversation. It summarizes the older parts and keeps going with the summary plus the recent work. You can also run slash compact yourself, and you can add a note telling it what to keep, like "keep the decisions about the database schema."

**JAMIE:** Does compaction lose things?

**ALEX:** It can lose detail. The summary keeps the big picture, but a specific error message from an hour ago might not survive. That's why I write important decisions into a file, or into CLAUDE.md if they're permanent. Files survive compaction. The conversation's details might not.

**JAMIE:** And slash clear?

**ALEX:** Slash clear starts fresh. I use it whenever I switch to an unrelated task. If I've spent an hour on the time zone bug and now I'm moving to the settings refactor, there's no reason to drag all that time zone context along. A fresh start is cheaper, faster and less confusing for the model.

**JAMIE:** So a big context window doesn't mean I should keep one conversation going all day.

**ALEX:** Right. Think of a session as one task. Big window, yes, but focused contents.

---

### SEGMENT 7: Caching, for Normal People

**JAMIE:** You mentioned the prompt cache and slash cost. Can you explain caching without the jargon?

**ALEX:** Every time Claude takes a turn, the whole conversation so far is sent to the model. That would be expensive and slow if the model processed it from scratch each time. So the beginning of the conversation, which doesn't change, gets cached. The next turn only has to process what's new. Cached input is much cheaper and faster.

**JAMIE:** So what breaks the cache?

**ALEX:** Anything that changes the early part of the conversation. If something near the start changes, everything after it has to be processed again. In normal use, Claude Code handles this for you. Where people run into trouble is with their own setups: hooks or scripts that inject something different at the top of every session, or switching models mid-conversation, since each model has its own cache.

**JAMIE:** So switching models in the middle of a session costs something.

**ALEX:** A bit, yes. The new model has to read the conversation without a cache. It's not a disaster, but it's another reason to pick a model at the start of a task and stick with it, or start a fresh session when you switch.

**JAMIE:** And slash cost shows me the cache numbers.

**ALEX:** It shows how much of your input came from the cache. If that share is high, you're in good shape. If it's low in a long session, something is changing the start of your conversation, and it's worth finding out what.

---

### SEGMENT 8: Auto Mode in Practice

**JAMIE:** Let's do a real auto mode session. What does it actually feel like?

**ALEX:** Mostly, it feels quiet. You ask for something, and Claude reads files, edits code, runs your tests and installs a dev dependency without asking you each time. Those are normal development actions, so the classifier lets them through.

**JAMIE:** And when it stops?

**ALEX:** Let me give you three examples. One: I ask Claude to "clean up the branch," and it decides to run a git reset hard, which would throw away uncommitted work. Auto mode blocks that, because I didn't explicitly ask to discard changes. Claude tells me it was blocked and asks whether I want to discard the changes or commit them first.

**JAMIE:** That's a good save.

**ALEX:** Two: Claude wants to read a file in my home directory, outside the project. Auto mode asks me the first time. I can say yes for that one file, or say no and tell Claude to work only inside the project.

**JAMIE:** And three?

**ALEX:** Three: during a task, Claude tries to send some data to an external web address it found in a config file. The classifier sees that as possible data exfiltration and blocks it, and tells Claude that's the rule that matched. That's exactly the kind of thing you want stopped, and it's also exactly what a malicious instruction hidden in a file might try to make Claude do.

**JAMIE:** What should I do when something is blocked that I actually wanted?

**ALEX:** Read the reason first. If it's legitimate, say so clearly in your own words, naming the action. Something like "yes, run the deploy script for the staging environment." A clear, specific approval from you is what the system needs. And if the same legitimate action keeps getting blocked, that's a sign to add a rule for it in the Auto mode tab rather than approving it by hand every time.

**JAMIE:** And the reverse? Things I want blocked that auto mode allows?

**ALEX:** That's what deny rules are for, and we'll get to those. Auto mode is a good general-purpose judge, but it doesn't know your project's specific no-go zones unless you tell it.

---

### SEGMENT 9: Writing Permission Rules

**JAMIE:** Let's get concrete about rules. What do they look like?

**ALEX:** A rule names a tool and, optionally, a pattern. Bash with a command pattern, like allowing "npm run test" followed by anything. Read or Edit with a path pattern, like denying edits to anything under a secrets folder. You put them in allow, ask or deny lists in your settings.

**JAMIE:** Give me a starter set.

**ALEX:** For a typical web project, I'd allow the test, lint and build commands, and git status, diff and log. I'd ask for git push, so I see every push. And I'd deny edits to the environment files, the secrets directory, and the production deployment configuration, plus any command that deploys to production.

**JAMIE:** Why ask for push rather than deny it?

**ALEX:** Because I do want Claude to push branches sometimes, I just want to see it happen. Deny is for things that should never happen. Ask is for things I want to watch. Allow is for things I never want to be asked about.

**JAMIE:** And the order? What if an allow rule and a deny rule both match?

**ALEX:** Deny wins. That's the safe default. And in auto mode, the hard deny rules we mentioned block an action no matter what any allow rule says. So if you're unsure, put the critical things in deny.

**JAMIE:** Can I test my rules?

**ALEX:** The easy way is to ask Claude to do something your rule should block, in a safe way, and watch what happens. Slash permissions also shows you which rules are active and where each one came from, which helps when you have rules in several settings files.

---

### SEGMENT 10: Where Settings Live

**JAMIE:** You keep saying "your settings." I've found at least three settings files on my machine. Which one wins?

**ALEX:** It's layered, and it's worth understanding once. There are user settings, in your home directory, that apply to every project you open. There are project settings, in the repository's dot claude folder, that the whole team shares through version control. There are local project settings, also in the dot claude folder but ignored by git, for your personal tweaks to one project. And for companies, there are managed settings that an administrator pushes to everyone.

**JAMIE:** And the order?

**ALEX:** Managed settings are on top. An administrator can enforce things that nobody can override. Then command line flags for the current session. Then local project settings, then shared project settings, then your user settings at the bottom. More specific beats more general, except that managed always wins.

**JAMIE:** So if my team's project settings deny something, can I allow it in my local settings?

**ALEX:** For most settings the more specific layer wins, but deny rules are treated carefully: a deny anywhere generally holds. And as we said, some dangerous settings, like defaulting to bypass permissions, are ignored if they come from a repository's own settings. The point is that a repository you clone shouldn't be able to weaken your protections without you knowing.

**JAMIE:** What should go in the shared project settings?

**ALEX:** Things the whole team agrees on: allowing the project's test and build commands, denying edits to secrets and production configs, the MCP servers the project needs, and hooks that enforce team conventions, like running the formatter after edits. Keep personal preferences, like your favorite model or output style, in your user settings.

**JAMIE:** And CLAUDE.md is separate from all this.

**ALEX:** Yes. Settings control what Claude is allowed to do. CLAUDE.md tells Claude how your project works: the commands to run, the conventions, the architecture, the gotchas. Both matter, and they do different jobs.

---

### SEGMENT 11: CLAUDE.md for the New Models

**JAMIE:** Did the new models change how I should write CLAUDE.md?

**ALEX:** A little. The newer models follow instructions more precisely and read more context, so two things changed for me. First, I removed a lot of shouting. In older CLAUDE.md files, people wrote things like "ALWAYS run the tests" in capitals because earlier models sometimes ignored instructions. The new models take a calm sentence seriously, and too much emphasis can make them overly rigid.

**JAMIE:** And second?

**ALEX:** I made it shorter and more specific. A CLAUDE.md that tries to explain everything about the project gets read on every turn and costs context. I keep it to the things Claude can't easily figure out by reading the code: how to run the tests, which directories are generated and shouldn't be edited, the naming conventions, and the two or three traps that new team members always fall into.

**JAMIE:** What about longer documentation?

**ALEX:** Put it in separate files and point to them from CLAUDE.md. Something like "for the database migration process, see docs slash migrations." Claude reads that file when the task needs it, instead of carrying it all the time. And for procedures, like how to cut a release, a skill is often a better home, which we'll cover next episode.

**JAMIE:** Can I have more than one CLAUDE.md?

**ALEX:** Yes. One at the repository root, and others in subdirectories for parts of the codebase with their own conventions, like a mobile app folder or an infrastructure folder. Claude picks up the relevant ones as it works in those directories. There's also a user-level one in your home folder for your personal preferences across all projects.

---

### SEGMENT 12: Plan Mode With the New Dials

**JAMIE:** You mentioned plan mode. How does it fit with effort and auto mode?

**ALEX:** Plan mode means Claude researches and proposes a plan but doesn't change anything until you approve. You cycle into it with shift tab. It's my default for anything that touches more than a few files or where I'm not sure of the approach.

**JAMIE:** And with effort?

**ALEX:** Plan mode is where higher effort pays off most. A plan is a small amount of output that shapes a lot of work. Spending more thinking on the plan is cheap compared with fixing a bad approach halfway through. So I often plan at high effort, approve the plan, and then let the execution run at medium.

**JAMIE:** And auto mode during execution?

**ALEX:** That combination works well. Plan mode gives me a checkpoint before anything happens. Once I've approved the plan, auto mode lets the routine steps run without interrupting me, while still catching the risky ones. I get control where it matters and speed where it doesn't.

**JAMIE:** What makes a good plan?

**ALEX:** Specific files, specific steps, and how you'll know it worked. If the plan says "refactor the settings page," that's not a plan. If it says "split SettingsPage into ProfileSection, NotificationSection and BillingSection, move shared state into a hook, keep the existing tests passing and add one test per section," that's a plan I can check.

**JAMIE:** And if I don't like the plan?

**ALEX:** Say what's wrong and ask for a revision. Pushing back on a plan is cheap. It's the best moment in the whole task to change direction.

---

### SEGMENT 13: Setting Up a Team

**JAMIE:** What if I'm the person setting this up for a team of, say, fifteen engineers?

**ALEX:** I'd do four things. First, write a good shared CLAUDE.md and project settings for your main repositories, reviewed like code. Second, agree on the permission defaults: what's allowed, what's asked, what's denied. Put the denies in the shared settings so they apply to everyone. Third, if your company uses managed settings, work with whoever runs them to push the essentials: approved MCP servers, any servers that are blocked, and the rules that must never be overridden.

**JAMIE:** And fourth?

**ALEX:** Teach the habits, not just the tools. A short session on effort, plan mode, slash clear, and reading auto mode's block reasons saves everyone a lot of frustration. And give people a channel to share what works. The best CLAUDE.md improvements usually come from someone saying "Claude kept getting this wrong, so I added this line."

**JAMIE:** How do you handle people on different plans or with different access?

**ALEX:** That's where the fallback models setting and slash doctor help. Not everyone has the same models available, especially through cloud providers. Set sensible fallbacks in shared settings so a session doesn't fail just because one model isn't enabled for someone.

---

### SEGMENT 14: Hooks as a Second Line

**JAMIE:** Where do hooks fit in with auto mode and rules? I set up one hook in season one and then forgot about them.

**ALEX:** Hooks are scripts that Claude Code runs at specific moments: before a tool runs, after a tool runs, when a session starts, when Claude finishes a turn, and a few others. They're deterministic. A rule or a classifier is a judgment about whether to allow something. A hook is your own code that always runs.

**JAMIE:** Give me a useful one.

**ALEX:** The classic is a post-edit hook that runs your formatter on any file Claude just edited. Claude doesn't have to remember to format, and you never get a pull request full of style noise. Another good one is a pre-tool hook that checks Bash commands against a list of patterns your team never wants run, and blocks them with a clear message.

**JAMIE:** Isn't that what deny rules do?

**ALEX:** Partly. Deny rules are simpler and should be your first choice. Hooks are for logic that rules can't express. For example, "block any edit to a migration file that has already been applied in production," where the hook checks a list of applied migrations. Or "if Claude edits the API schema, remind it to regenerate the client." A rule can't know those things. Your script can.

**JAMIE:** Can a hook talk back to Claude?

**ALEX:** Yes. A hook can block an action and return a message explaining why, and Claude sees that message and adjusts. That's what makes them useful as guardrails rather than just tripwires. A good hook message says what was blocked and what to do instead, like "don't edit generated files in the api client folder; change the schema and run the generate command."

**JAMIE:** Any warning about hooks?

**ALEX:** Keep them fast and keep them simple. A hook runs every time its event fires, so a slow hook slows every action. And remember that hooks in a repository's shared settings run on everyone's machine, so review them like any other code that runs locally. Don't add a hook from a repository you don't trust.

---

### SEGMENT 15: Models and Effort Without a Human

**JAMIE:** What about when nobody's watching? Like Claude running in CI.

**ALEX:** Claude Code has a headless mode. You pass a prompt with the dash p flag and it runs, does the work and prints the result, without the interactive interface. That's how you use it in scripts, in CI pipelines and in GitHub Actions.

**JAMIE:** And the model and effort choices there?

**ALEX:** Set them explicitly. In an interactive session, you notice if the model is wrong. In a script, you won't. So pass the model on the command line or in the settings the script uses, and choose effort for the job. A CI job that summarizes test failures can run on a small model at low effort. A nightly job that investigates flaky tests might deserve a bigger model at high effort.

**JAMIE:** And permissions in headless mode?

**ALEX:** Be deliberate. There's no human to answer a prompt, so anything that would ask simply can't proceed. You define exactly which tools and commands the job is allowed to use, and deny everything else. And run it in an environment with nothing sensitive in it: a CI runner with a short-lived token, not a machine with your production credentials.

**JAMIE:** That's where restricted mode comes in?

**ALEX:** For some jobs, yes. If the job only needs to read and reason, like reviewing a diff or answering questions about code, restricted mode removes the ability to run commands at all. That's a simple, strong guarantee for jobs that shouldn't execute anything.

**JAMIE:** How do I keep an eye on cost for these jobs?

**ALEX:** Log the usage output from each run and add it up per job type. A nightly job that quietly doubles its cost because someone changed its prompt is easy to miss without that. And set a timeout on the job itself in your CI system, so a run that goes in circles gets stopped.

---

### SEGMENT 16: Effort and Limits, Honestly

**JAMIE:** Let's talk about limits for a minute, because that's the thing people complain about most.

**ALEX:** Fair. Every plan has usage limits, and how fast you reach them depends on the model, the effort level, and how much context each turn carries. A long session at high effort on the biggest model, with lots of files read, uses a lot more than a short session on a smaller model.

**JAMIE:** So what's the practical advice?

**ALEX:** Look before you guess. Slash usage shows what's driving your usage: which models, which subagents, which skills, which plugins. Very often the surprise is something you didn't expect, like a loop that ran all afternoon, or a subagent type that reads far more than it needs to.

**JAMIE:** And then?

**ALEX:** Then adjust the biggest item first. Move routine work to a smaller model. Bring effort down where it isn't helping. Start fresh sessions for unrelated tasks so you're not carrying old context. Prune MCP servers and skills you don't use. Those four changes usually make a big difference without making Claude any less useful.

**JAMIE:** And when I do hit the limit in the middle of something?

**ALEX:** In the desktop app, you can turn on auto-continue, so the interrupted turn retries once your limit resets. In the terminal, you can pick up where you left off later. Either way, it's a good moment to write a short note in the project about where you got to, so the next session starts cleanly.

---

### SEGMENT 17: Common Mistakes

**JAMIE:** Let's do a quick list of mistakes you see people make with all of this.

**ALEX:** One: running everything at max effort. Slower, more expensive, and not better on simple work. Two: one giant session all day, with unrelated tasks piling up in the context. Use slash clear. Three: connecting every MCP server you can find, which bloats context. Four: approving auto mode blocks without reading the reason. The reason is the whole point.

**JAMIE:** Keep going.

**ALEX:** Five: putting everything in CLAUDE.md, including documentation Claude only needs occasionally. Six: no deny rules for the truly dangerous things, relying entirely on auto mode's general judgment. Seven: switching models back and forth in the same session and wondering why it feels slow. And eight: not running slash doctor after an update, then spending an hour debugging a setup problem it would have found in a minute.

**JAMIE:** I've done at least four of those.

**ALEX:** Everyone has. That's why they're on the list.

---

### SEGMENT 18: Listener Questions

**JAMIE:** We got some questions after season one. Can we do a few?

**ALEX:** Go for it.

**JAMIE:** "Is auto mode safe enough for work projects?"

**ALEX:** For most development work, yes, especially combined with deny rules for your sensitive areas. It's much safer than the skip permissions flag, which a lot of people were using before. For anything touching production systems directly, keep it in manual mode or make sure your rules ask before those actions.

**JAMIE:** "How do I know which model a session is using?"

**ALEX:** The status line and slash model show you. If you've set fallbacks, it's worth checking occasionally, because a fallback might quietly be serving your requests.

**JAMIE:** "Does higher effort use more of my plan's limits?"

**ALEX:** Yes. More thinking means more tokens, and tokens count toward your limits. Slash usage shows you where your usage is going, so you can see whether effort is the reason you're hitting limits.

**JAMIE:** And last: "What happened to the skip permissions flag?"

**ALEX:** It still exists, and it's still the "approve nothing" option. For throwaway sandboxes and some automated environments, it can make sense. For everyday work on your own machine, auto mode gives you most of the speed with much more protection.

---

### SEGMENT 19: Coming Back After Season One

**JAMIE:** I want to talk to the listeners who used Claude Code in January and then drifted away. What will feel most different when they come back?

**ALEX:** Three things, I think. First, fewer interruptions. With auto mode as the default on most plans, you'll be asked to approve far less. That can feel strange at first, like you've lost control, so spend your first session watching what it allows and what it blocks. Most people get comfortable within a day.

**JAMIE:** Second.

**ALEX:** The model is noticeably more capable and more literal. It follows instructions more precisely, which is mostly good, but it means old CLAUDE.md files full of exaggerated warnings can make it too rigid. Re-read your CLAUDE.md with fresh eyes and tone it down.

**JAMIE:** And third.

**ALEX:** Long tasks work. In January, a task that took more than a few minutes often lost its way. Now, with a million tokens of context, compaction, subagents and goals, Claude can work for an hour on a well-defined task and stay on track. The skill that matters most has shifted from supervising every step to describing the task well at the start.

**JAMIE:** Anything from season one that still holds?

**ALEX:** Most of the fundamentals. Be specific about what you want. Give Claude a way to check its work, like tests. Review what it produces. Keep sessions focused on one task. And write down what Claude keeps getting wrong in CLAUDE.md. Those habits matter even more now, because Claude can do more with them.

**JAMIE:** What would you tell someone completely new, who skipped season one?

**ALEX:** Listen to season one anyway, at least the first few episodes, because the basics haven't changed. Then come back to this season for what's new. And on your first day, run slash doctor, pick a small task in a real project, and watch closely. You'll learn more in an hour of real work than from any amount of reading.

---

### SEGMENT 20: A Sensible Setup

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

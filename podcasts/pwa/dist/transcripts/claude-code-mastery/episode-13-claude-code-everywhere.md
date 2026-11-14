# Episode 13: Claude Code Everywhere
## "The Web, Your Phone, Routines, and Remote Control"

**Duration:** ~47 minutes
**Hosts:** Alex (Expert Developer) & Jamie (Learning Developer)
**Season:** 2, The 2026 Edition

---

### INTRO

**ALEX:** Welcome back to Claude Code Mastery. I'm Alex.

**JAMIE:** I'm Jamie. In season one, Claude Code lived in my terminal. If I closed my laptop, the work stopped. That's no longer true.

**ALEX:** Today is about Claude Code outside the terminal: cloud sessions on the web, routines that run on a schedule, your phone, Remote Control, and the desktop app. And we'll finish with the cloud review and planning tools.

---

### SEGMENT 1: Cloud Sessions

**JAMIE:** Start with the web. What is a cloud session?

**ALEX:** It's a Claude Code session that runs in a container in the cloud instead of on your machine. You start it from Claude Code on the web or the mobile app, it clones your repository, works on your task, and can push a branch and open a pull request. Close the tab, and it keeps going.

**JAMIE:** What changed this year?

**ALEX:** In April the web experience got a redesign with a sessions sidebar and a drag-and-drop layout. In September, you gained the ability to take back a queued message before Claude reads it. And as of early November, cloud sessions can start without a repository at all, which is handy for research or writing tasks.

**JAMIE:** What's the catch with cloud sessions?

**ALEX:** The container is temporary. Anything you want to keep has to be committed and pushed. And it can only reach what the environment allows: the repositories you attached, the network hosts your environment permits, and the secrets you configured.

**JAMIE:** Can companies run these on their own infrastructure?

**ALEX:** Since August, self-hosted environments are in public beta on Team and Enterprise plans. Cloud sessions run on infrastructure your organization operates, which matters a lot for regulated companies.

---

### SEGMENT 2: Routines

**JAMIE:** Routines next.

**ALEX:** Routines launched in April. A routine is a templated cloud agent that fires from a schedule, a GitHub event, or an API call. "Every morning at eight, check for failing nightly builds and open an issue with a diagnosis." Or "when a pull request gets the needs-tests label, write the missing tests."

**JAMIE:** That's basically a teammate who never sleeps.

**ALEX:** A teammate with a budget, ideally. Two tips. Make each routine's job narrow and its output reviewable, like an issue or a draft pull request. And as of November, scheduled cloud tasks load the plugins from your Claude account, so your skills and tools come along.

**JAMIE:** And notifications?

**ALEX:** Since April, mobile push notifications ping your phone when a long task finishes or Claude needs you. That's what makes background work practical. You don't have to keep checking.

---

### SEGMENT 3: Remote Control

**JAMIE:** What's Remote Control?

**ALEX:** It's the reverse of a cloud session. The work runs on your own computer, with your tools, your local services and your signed-in accounts, but you steer it from your phone or the web. Since August, any machine running claude remote-control shows up as a device card on your phone, and you can start a session on it from the Code tab.

**JAMIE:** When would I use that instead of the cloud?

**ALEX:** When the work needs your machine. A local database, a hardware device, a test suite that only runs with your setup, or an account you're signed in to locally. Start a long build before you leave the office, check on it from the train.

**JAMIE:** And the enterprise side?

**ALEX:** Enterprise admins can now grant cloud session and Remote Control permissions through custom roles. And in continuous integration, Remote Control refuses untrusted folders immediately, which is the right default.

---

### SEGMENT 4: The Desktop App

**JAMIE:** The desktop app changed a lot too.

**ALEX:** It did. Claude Code Desktop got a Linux beta for Ubuntu and Debian in late June. Since August, typing slash resume in Desktop lets you pick up any session you started from the CLI, with the full conversation. And when you hit a usage limit, you can check Auto-continue when limits reset, and the app retries the interrupted turn once the limit resets.

**JAMIE:** I like that you can pop panes out now.

**ALEX:** Since September, any pane can pop out into its own window. Drag the diff or the terminal onto a second screen while Claude keeps working. We'll cover the browser and computer use in Desktop next episode.

---

### SEGMENT 5: Planning and Review in the Cloud

**JAMIE:** You mentioned cloud review and planning tools.

**ALEX:** Three of them. Ultraplan, from April, drafts a plan in the cloud from your CLI. You review and comment on it in a web editor, then run it remotely or pull it back to your machine. It's great for big changes where you want to agree on the approach before any code gets written.

**JAMIE:** Second.

**ALEX:** Ultrareview. A fleet of bug-hunting agents runs in the cloud against your changes, and the findings land back in your CLI or Desktop. Since late April there's a command-line version for CI and scripts, and as of this fall it requires workspace trust, with a flag to bypass the prompt in automation.

**JAMIE:** And third.

**ALEX:** Autofix for pull requests. Slash autofix-pr turns on automatic fixing from your terminal, so Claude watches a pull request and pushes fixes for failing checks and review comments.

**JAMIE:** And the local review command?

**ALEX:** Slash code-review, which arrived in May, reports correctness bugs in your current changes, and since July it runs as a background subagent so you can keep working.

---

### SEGMENT 6: Setting Up a Cloud Environment

**JAMIE:** Let's get practical about cloud sessions. The first time I tried one, it couldn't install my dependencies. What should I set up?

**ALEX:** That's the most common first experience. A cloud session runs in an environment, and the environment decides four things: which repositories it can reach, which network hosts it can talk to, what runs when the container starts, and which secrets it has. If any of those is missing, the session hits a wall.

**JAMIE:** Start with the network.

**ALEX:** Environments have a network policy. A tight policy allows only a few hosts, which is safer. A looser one allows more. If your project installs packages from a public registry, that registry has to be allowed, or you need a mirror that is. If your tests call an external service, that host has to be allowed too, or the tests need a mock. When a session fails with a connection error, the network policy is the first place to look.

**JAMIE:** And the setup script.

**ALEX:** That's a script that runs when the container starts, before Claude begins. It's where you install the tools your project needs: the right language version, a database for tests, system packages. A good setup script means every session starts ready to run your tests. A missing one means Claude spends the first ten minutes of every session figuring out how to install things.

**JAMIE:** Secrets.

**ALEX:** Only add the secrets a session genuinely needs, like a token for a private package registry. Never your production credentials. Remember, the session is running an agent that reads untrusted content, like issues and web pages, so treat its environment as somewhere a secret might leak from. Short-lived, narrow tokens are best.

**JAMIE:** How do I know it's working?

**ALEX:** Start a session with a simple task: "install dependencies and run the test suite, then tell me the result." If that works, your environment is ready for real work. If not, the error tells you which of the four pieces is missing.

---

### SEGMENT 7: Writing Tasks for the Cloud

**JAMIE:** Is writing a task for a cloud session different from talking to Claude in my terminal?

**ALEX:** Quite different. In the terminal, you're there. If Claude asks a question, you answer in seconds. In the cloud, you might be on a train or asleep. So the task has to stand on its own.

**JAMIE:** What goes in?

**ALEX:** The outcome you want, the context Claude needs, the constraints, and what done looks like. Something like: "Fix the bug in issue 482, where exported CSV files lose leading zeros in ZIP codes. Keep the export format otherwise unchanged. Add a test with a ZIP code that starts with zero. Open a draft pull request with a short explanation." That's enough for Claude to work without asking anything.

**JAMIE:** And if Claude does need to ask?

**ALEX:** It can, and you'll get a notification. But each question is a pause until you answer. A task that needs three answers takes three times as long when you're away. Think through the obvious questions in advance and answer them in the task.

**JAMIE:** Any constraint that's especially important?

**ALEX:** What not to touch. "Don't change the public API." "Don't upgrade dependencies." "Don't modify the database schema." In the terminal, you'd stop Claude if it started doing those things. In the cloud, the instruction has to do the stopping.

---

### SEGMENT 8: Three Routines Worth Having

**JAMIE:** Give me some routines you actually find useful.

**ALEX:** Three. The first is a morning build triage. Every weekday at seven, a routine looks at the failing nightly builds, groups failures by likely cause, and opens one issue per cause with the evidence: which tests failed, the error, and the commit where it started. It doesn't try to fix anything. Its job is to make the morning stand-up faster.

**JAMIE:** Why not fix them?

**ALEX:** Because a fix needs judgment about which failures matter, and a routine running at seven doesn't have anyone to check with. Triage is safe, useful and easy to review. Once you trust the triage, you might add a second routine that attempts fixes for one well-understood category, like flaky test retries.

**JAMIE:** Second routine.

**ALEX:** A label-driven one. When someone adds a "needs tests" label to a pull request, a routine reads the change, writes tests for it, and pushes them as a new commit or a separate draft pull request. The label is the trigger and the permission. Nobody gets surprise commits on a pull request they didn't label.

**JAMIE:** And third.

**ALEX:** A weekly dependency check. Every Monday, a routine looks for outdated dependencies with security advisories, tries the upgrades in a branch, runs the tests, and opens a draft pull request per upgrade that passes, with a note on what changed upstream. The ones that fail get listed in a single issue with the errors.

**JAMIE:** What do those three have in common?

**ALEX:** Narrow jobs, reviewable outputs, and no irreversible actions. Issues and draft pull requests are easy to read, easy to close, and nothing reaches production without a person. That's the pattern I'd start every team with.

---

### SEGMENT 9: When Routines Go Wrong

**JAMIE:** What goes wrong with routines?

**ALEX:** Noise is the first problem. A routine that opens ten issues every morning, most of them duplicates or low value, trains people to ignore it. Fix that by having the routine check for existing issues before opening new ones, and by tightening what counts as worth reporting.

**JAMIE:** Second.

**ALEX:** Cost creep. A routine that runs every hour on a big repository, reading a lot each time, adds up. Give each routine a budget and look at its usage regularly. Ask whether hourly is really needed, or whether daily would do.

**JAMIE:** Third.

**ALEX:** Silent failure. The routine breaks, maybe because a token expired or the environment changed, and nobody notices for two weeks because it was supposed to run quietly. Have each routine report failures somewhere people look, and check that it actually ran.

**JAMIE:** And fourth?

**ALEX:** Drift in what it does. Someone edits the routine's prompt to add "and also fix simple issues," and now a triage routine is pushing commits. Treat routine prompts like code: in version control or at least reviewed, with a clear owner.

---

### SEGMENT 10: Remote Control, Step by Step

**JAMIE:** Walk me through Remote Control in practice.

**ALEX:** On your computer, you run claude remote-control in the project folder you want to work in. That machine then shows up as a device in the Claude app on your phone. From your phone, you start a session on it, type a task, and the work runs on your computer, with your tools, your local database and your signed-in accounts.

**JAMIE:** And while I'm away?

**ALEX:** You can check progress, answer questions and approve steps from your phone. Notifications tell you when it needs you or when it's done. When you're back at your desk, you can carry on in the terminal or the desktop app.

**JAMIE:** What has to be true about my computer?

**ALEX:** It has to stay on, awake and connected. That sounds obvious, but laptops sleep. If you're planning to steer a long job from home, make sure the machine won't go to sleep when you close the lid, or use a desktop that's always on.

**JAMIE:** Any safety considerations?

**ALEX:** Remote Control runs with your local access, which is the point, but it also means a mistake affects your real machine. The same permission rules and auto mode apply, so keep your deny rules in place. And be careful approving things from your phone. A small screen makes it easy to approve something you didn't read properly. For anything risky, wait until you can see it properly.

**JAMIE:** When would you pick Remote Control over a cloud session?

**ALEX:** When the work needs something only your machine has. A local service, special hardware, a huge local dataset, a signed-in account. Otherwise, a cloud session is simpler, because it doesn't depend on your computer staying on.

---

### SEGMENT 11: Working From Your Phone

**JAMIE:** Do people really do serious work from a phone?

**ALEX:** Not writing code, but steering it, yes. The phone is good for three things: starting a well-defined task, answering a question Claude asks, and reviewing a short result. It's bad at reading a large diff or debugging something complicated.

**JAMIE:** Any habits that help?

**ALEX:** Keep a few task templates you can paste and adjust. Ask Claude to send back short summaries designed for a small screen: what changed, whether tests pass, anything it needs from you. And save real review for when you're at a proper screen. Use the phone to keep work moving, not to approve things you haven't read.

**JAMIE:** I've definitely approved something on my phone I regretted.

**ALEX:** Everyone has, which is why permission rules that block the truly dangerous things matter even more when you're steering from a phone.

---

### SEGMENT 12: Terminal, Desktop or Web?

**JAMIE:** There are so many places to run Claude Code now. How do I choose?

**ALEX:** Think about where the work needs to run and how you want to watch it. The terminal is still the most direct: fast, scriptable, and it fits into everything else you do in a shell. If you live in the terminal, it's home.

**JAMIE:** And the desktop app?

**ALEX:** Desktop is great when you want to see more at once: the conversation, the diff, a terminal, a browser preview, side by side, and now in separate windows. It's also where the built-in browser and computer use live, which we'll cover next time. And because slash resume works across them, you can start in the terminal and continue in Desktop, or the other way round.

**JAMIE:** And the web?

**ALEX:** The web is for cloud sessions: work that should keep going without your machine, or work you want to start from anywhere. It's also handy for running several tasks in parallel without them competing for your laptop's resources.

**JAMIE:** And the IDE extensions?

**ALEX:** If you spend your day in VS Code or a JetBrains editor, the extensions put Claude Code next to your code with inline diffs. The agent map in VS Code is nice for keeping track of subagents. It's the same Claude Code underneath, so your settings, CLAUDE.md and skills come with you.

**JAMIE:** So it's less "which is best" and more "which fits this task."

**ALEX:** Exactly. Most people I know use two or three: the terminal or IDE for focused work, the web for background tasks, and the phone for checking in.

---

### SEGMENT 13: A Review Stack

**JAMIE:** You listed a lot of review tools. How do they fit together?

**ALEX:** Think of it as layers, from cheapest and fastest to most thorough. First, the tests and linters, which Claude runs as part of the work. Second, slash code-review on your local changes, which looks for correctness bugs and runs in the background while you keep going. Third, for bigger or riskier changes, ultrareview, which sends a fleet of bug-hunting agents at your branch in the cloud. And last, a human reviewer.

**JAMIE:** Do I run all of them on every change?

**ALEX:** No. A one-line typo fix needs tests and a human glance. A normal feature gets the local review and a human. A change to authentication, payments or data migration gets the full stack, including ultrareview, before a senior person looks at it. Match the review to the risk.

**JAMIE:** What does the human reviewer do differently when the agents have already looked?

**ALEX:** They focus on the things agents are weaker at: whether this is the right change at all, whether the design fits the system, whether it handles the cases the ticket didn't mention, and whether the code will make sense to the next person. The agents catch more of the mechanical bugs, which frees people for judgment.

**JAMIE:** Should I trust every finding the review agents report?

**ALEX:** No. Treat each finding as a claim to check. Some will be real bugs. Some will be style preferences presented as problems. Occasionally one will be wrong. Read the reasoning, check the code, and fix what's real. Over time you'll learn which kinds of findings are reliable in your codebase.

---

### SEGMENT 14: Ultraplan in Practice

**JAMIE:** Walk me through ultraplan on a real feature.

**ALEX:** Say we're adding team workspaces to an app that currently only has individual accounts. That's a big change: database, permissions, billing, the interface. I don't want Claude writing code until we agree on the approach.

**JAMIE:** So you start ultraplan from the CLI.

**ALEX:** Right. It drafts a plan in the cloud, reading the codebase to ground it. The plan comes back in a web editor: the data model changes, the migration strategy, how permissions will work, which screens change, and the order of the work.

**JAMIE:** And then you comment on it.

**ALEX:** Like a document. I might comment "we need to keep personal accounts working unchanged during the migration" or "billing should stay per account for now; workspaces come later." A teammate can comment too. Claude revises the plan based on the comments.

**JAMIE:** And when it's agreed?

**ALEX:** I can run it remotely in the cloud, or pull it back to my machine and execute it there, step by step. Either way, the plan becomes the brief for the work. And because the plan was reviewed, the pull requests that follow are much easier to review. Reviewers can check the code against an approach they already agreed to.

**JAMIE:** When is it overkill?

**ALEX:** For anything you could describe in a paragraph. Ultraplan is for changes where getting the approach wrong would cost days. For a small feature, plan mode in your normal session is enough.

---

### SEGMENT 15: Letting Autofix Loose, Carefully

**JAMIE:** Autofix watches a pull request and pushes fixes. That sounds powerful and a little scary.

**ALEX:** Both. It's great for the tedious cycle of "CI failed on a lint error, fix it, push, wait, a different test failed, fix it, push, wait." It's also great for small review comments, like "rename this variable" or "add a null check here."

**JAMIE:** Where should I be careful?

**ALEX:** Three places. First, never let any automated fixer make a test pass by skipping or weakening it. The fix should be in the code, or the agent should say it can't fix it. Second, large review comments, like "I think this whole approach is wrong," aren't something to autofix. That's a conversation, and the right response is a proposal, not a push. Third, watch for loops, where each fix causes a new failure. A good setup stops after a few rounds and asks for help.

**JAMIE:** Should autofix run on other people's pull requests?

**ALEX:** Only if they asked. Pushing to someone else's branch without permission is rude for a human and worse for an agent. Use it on your own pull requests, or on ones where the author opted in.

**JAMIE:** And reviewers?

**ALEX:** Tell your reviewers you use it, so they know a quick follow-up commit came from the fixer. And make sure every push it makes is visible in the pull request history, so nothing changes silently after someone approved it.

---

### SEGMENT 16: Rolling Out Cloud Work to a Team

**JAMIE:** If I'm setting this up for a team, what should I think about?

**ALEX:** Four things. Environments first: one per main repository, with a setup script that works, a network policy as tight as you can make it, and only the secrets you truly need. Test each one with the "install and run the tests" task before anyone relies on it.

**JAMIE:** Second.

**ALEX:** Who can do what. On Team and Enterprise plans, admins can control who gets cloud sessions and Remote Control through roles. Decide who can create routines, because a routine runs repeatedly and spends usage every time.

**JAMIE:** Third.

**ALEX:** Shared conventions. Agree on what cloud sessions should produce: draft pull requests rather than direct pushes, a standard summary format, labels for agent-created work. That makes review easier and makes it obvious what came from where.

**JAMIE:** And fourth.

**ALEX:** Visibility into cost and value. Look at usage by person and by routine once a month. Ask which routines produce work people actually use. Retire the ones that don't. It's very easy to create routines and very easy to forget them.

**JAMIE:** What about the self-hosted option?

**ALEX:** That's for organizations that need the work to run on their own infrastructure, often for regulatory or data reasons. It's more to operate, so most teams should start with the standard cloud and move only if they have a clear requirement.

---

### SEGMENT 17: Background Work and Your Attention

**JAMIE:** Something I've noticed: when work runs in the background, I check on it constantly. Which kind of defeats the point.

**ALEX:** Very common. The fix is to trust the notifications. If you've set things up so you get a push notification when a task finishes or needs you, you don't need to keep checking. Close the tab, do something else, and come back when the notification arrives.

**JAMIE:** And if I get too many notifications?

**ALEX:** Then something's set up wrong. Either tasks are asking too many questions, which means the task descriptions need more detail, or routines are reporting things that don't need you. Tune them until a notification usually means "you need to do something."

**JAMIE:** Is there a rhythm that works?

**ALEX:** For a lot of people, yes. Set up background work at natural break points: before lunch, before a meeting, at the end of the day. Review results at the next break point. That turns background agents into something that fits your day instead of interrupting it. And keep some time each day completely free of agent work, for thinking about the problems that need you.

---

### SEGMENT 18: Costs of Working Everywhere

**JAMIE:** Does cloud work cost more than local?

**ALEX:** The model usage is the same kind of usage either way. The difference is that cloud work makes it easy to run a lot more at once, and routines run whether or not you're paying attention. So the risk isn't that each session costs more. It's that you run many more of them without noticing.

**JAMIE:** So what should I watch?

**ALEX:** Your usage over a week, broken down by where it came from: interactive sessions, cloud sessions, routines. If routines are a big share, check that they're producing work people use. And for each routine, ask whether it needs to run as often as it does. A routine that runs every hour but only finds something once a day could run daily.

**JAMIE:** And for teams?

**ALEX:** Someone should own that review monthly. It takes half an hour and often finds a routine that nobody remembers creating, still running every morning.

---

### SEGMENT 19: Cloud Sessions and Your Secrets

**JAMIE:** I want to go deeper on one thing you said: treat the cloud environment as somewhere a secret might leak from. That sounds alarming.

**ALEX:** It's just realistic. A cloud session runs an agent that reads all kinds of content: your code, issues people wrote, documentation from the web, the output of your tests. Any of that could contain text designed to trick the agent. Claude is trained to treat that content as information rather than instructions, and the tools have protections, but good security assumes a layer can fail.

**JAMIE:** So what's the practical rule?

**ALEX:** Only put in a secret if the session can't do its job without it, and only the narrowest version. If it needs to install a private package, give it a read-only token for the package registry, not an admin token. If it needs to call a test API, give it a test key with low limits, not a production key. And rotate those tokens on a schedule.

**JAMIE:** What about the network policy?

**ALEX:** It's your second line. Even if something tried to send a secret somewhere, a tight network policy means it can only reach the hosts you allowed. That's why a tight policy is worth the small inconvenience of adding hosts when you need them.

**JAMIE:** And for Remote Control, where the work runs on my machine?

**ALEX:** There, your own machine's secrets are within reach, which is why the permission rules and auto mode matter so much. Keep deny rules on your credential files and your production configuration, and don't run Remote Control sessions in a folder that holds things you wouldn't want an agent to touch.

---

### SEGMENT 20: Routines as Team Infrastructure

**JAMIE:** Once a team has several routines, they start to feel like infrastructure. How do you manage them?

**ALEX:** Like infrastructure. Keep a list of every routine: what it does, when it runs, who owns it, what it produces and roughly what it costs. Review that list every month or so. When someone leaves the team, reassign their routines, or they'll keep running with nobody watching.

**JAMIE:** Should routine prompts be in version control?

**ALEX:** I'd keep a copy there, yes, even if the routine itself is configured elsewhere. That gives you history: when the prompt changed, who changed it and why. When a routine starts behaving differently, the first question is always "did someone change it?"

**JAMIE:** And testing a routine before it goes live?

**ALEX:** Run it by hand once or twice first, and read the output carefully. Then let it run on its schedule for a week with someone checking every result. Only after that should it become something people rely on without checking. That's the same way you'd introduce any new automation.

---

### SEGMENT 21: Handing Work Between Surfaces

**JAMIE:** One practical question. I start something in a cloud session, and then I want to continue on my laptop. How does that work?

**ALEX:** The simplest handoff is the branch. The cloud session pushes its work to a branch, you pull that branch on your laptop, and carry on, either by hand or with a new Claude session. Because everything that matters is in the branch and the pull request, nothing gets lost.

**JAMIE:** And the conversation?

**ALEX:** For sessions you started from the CLI, slash resume in the desktop app brings back the full conversation. For cloud work, the pull request description and the summary the session wrote are usually the best handoff. That's another reason to ask every session for a good summary at the end: what it did, what it didn't do, and what's left.

**JAMIE:** So the summary is the handoff note.

**ALEX:** Exactly. Write it for a colleague who has to pick up the work cold, because sometimes that colleague is you, two days later, having forgotten everything.

---

### SEGMENT 22: Common Mistakes

**JAMIE:** Mistakes list?

**ALEX:** One: starting cloud sessions without a working environment, so every session wastes time installing things. Two: vague cloud tasks that need constant answers. Three: forgetting the container is temporary and losing work that wasn't pushed. Four: routines that make noise, so people stop reading them.

**JAMIE:** More.

**ALEX:** Five: putting production secrets in a cloud environment. Six: approving risky things from a phone without reading them. Seven: relying on Remote Control from a laptop that goes to sleep. Eight: letting autofix push on someone else's pull request. And nine: running the full review stack on trivial changes, then wondering why everything is slow.

---

### SEGMENT 23: Listener Questions

**JAMIE:** Some listener questions.

**ALEX:** Go ahead.

**JAMIE:** "Is my code safe in a cloud session?"

**ALEX:** It runs in an isolated container that's discarded afterward, and your organization's data policies apply. The bigger risks are the ones you control: which secrets you put in the environment and which hosts you allow. Keep both minimal.

**JAMIE:** "Can a routine deploy to production?"

**ALEX:** Technically you could set one up to, but I wouldn't. Keep routines to reviewable outputs like issues and draft pull requests, and keep deployment behind a person or your normal release process.

**JAMIE:** "What if my session needs something the network policy blocks?"

**ALEX:** It'll fail with a connection error. Decide whether the host should be allowed, and if so, update the environment. Don't try to work around the policy from inside the session. It's there for a reason.

**JAMIE:** And last: "Does all this replace working in the terminal?"

**ALEX:** Not at all. Focused, interactive work is still best with you at the keyboard. The cloud, routines and Remote Control just mean that the work that doesn't need you can carry on without you.

---

### SEGMENT 24: A Week Away From the Desk

**JAMIE:** Can we do a longer story for this one too? Say I'm traveling for a week and still want work to move.

**ALEX:** Good scenario. Before you leave, you set things up. You check that your main repository's cloud environment works by running the "install and run the tests" task. You write three task templates you'll want on your phone: fix a bug from an issue, write missing tests for a pull request, and investigate a failing build. And you make sure your routines are healthy, so the morning triage is still running.

**JAMIE:** Monday.

**ALEX:** Monday morning, on the way to the airport, you get a notification: the morning triage opened two issues. One is a flaky test, the other is a real regression from Friday's merge. From your phone, you start a cloud session on the regression with your bug template, adding the issue link and "don't change the public API." By the time you land, there's a draft pull request with a fix, a new test, and a summary. You read the summary, note that you'll review the diff properly that evening, and move on.

**JAMIE:** Tuesday.

**ALEX:** Tuesday, a teammate asks for tests on their pull request. They add the needs-tests label, and the routine writes them. You don't have to do anything, which is the point. In the evening at the hotel, you review Monday's fix on your laptop, leave one comment, and autofix pushes the change. You approve it.

**JAMIE:** And Wednesday, the hard one.

**ALEX:** Wednesday, a customer reports a problem that only reproduces with a large dataset you keep on your desktop at the office. A cloud session can't reach it. So you use Remote Control: your desktop at the office is always on, you start a session on it from your phone, and ask Claude to reproduce the problem with the local dataset and report what it finds. It does, finds the cause, and you ask it to write up the cause and a proposed fix in the issue, but not to push anything until you're back.

**JAMIE:** Why not push?

**ALEX:** Because it touches the data import path, which is risky, and you want to review it properly at a real screen. That's the judgment the tools leave to you.

**JAMIE:** And by Friday?

**ALEX:** By Friday, one regression fixed and merged, tests written for a teammate, a hard bug diagnosed with a proposed fix waiting for you, and the routines kept the noise under control. You did maybe two hours of real work all week, mostly reviewing. And nothing risky happened without you looking at it properly.

---

### SEGMENT 25: Putting It Together

**JAMIE:** Give me a day that uses all of this.

**ALEX:** Morning: a routine has already triaged the overnight build failures into issues. You pick one, and start a cloud session from your phone on the train. At your desk, you plan a bigger feature with ultraplan and agree on the approach. In the afternoon, you run ultrareview on the branch and fix what it finds. Before you leave, you start a long local test run on your own machine and steer it with Remote Control from home. And slash autofix-pr handles the review comments overnight.

**JAMIE:** And my laptop can be closed for most of that.

**ALEX:** That's the point.

---

### OUTRO

**JAMIE:** So: cloud sessions keep working when you leave, routines fire agents on schedules and events, Remote Control lets you steer your own machine from your phone, the desktop app got resume and auto-continue, and ultraplan, ultrareview and autofix move planning and review to the cloud.

**ALEX:** Next episode is our season finale: Claude Code beyond code. Artifacts, design, the browser, computer use, and testing your own plugins and skills.

**JAMIE:** See you then.

---

*End of Episode 13*

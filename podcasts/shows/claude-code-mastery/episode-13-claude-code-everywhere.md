# Episode 13: Claude Code Everywhere
## "The Web, Your Phone, Routines, and Remote Control"

**Duration:** ~6 minutes
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

### SEGMENT 6: Putting It Together

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

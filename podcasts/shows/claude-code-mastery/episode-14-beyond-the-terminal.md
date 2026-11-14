# Episode 14: Beyond the Terminal
## "Artifacts, Design, the Browser, Computer Use, and Testing Your Own Plugins"

**Duration:** ~6 minutes
**Hosts:** Alex (Expert Developer) & Jamie (Learning Developer)
**Season:** 2, The 2026 Edition

---

### INTRO

**ALEX:** Welcome to the season two finale of Claude Code Mastery. I'm Alex.

**JAMIE:** I'm Jamie. Today is about everything Claude Code can now do that isn't editing a file. Sharing results as live pages, designing interfaces, using a browser, using your computer's apps, and checking the plugins and skills you build.

**ALEX:** These features close the loop. Claude doesn't just write the code. It can see the result, show it to other people, and check its own tools.

---

### SEGMENT 1: Artifacts

**JAMIE:** What's an artifact?

**ALEX:** An artifact turns a session's output into a live, shareable page on claude.ai that updates in place as the session works. A report, a dashboard, a diagram, a small app. They arrived in beta for Team and Enterprise plans in June.

**JAMIE:** And then they got more powerful.

**ALEX:** In July, artifacts gained the ability to call your MCP connectors. When someone opens the page, it can pull live data and take actions through that viewer's own connectors. The same month added public sharing links and editor roles for teams. And in September, Claude started picking a browser-tab icon for each artifact it publishes, which is small but nice when you have ten of them open.

**JAMIE:** When would I use one instead of a file in the repo?

**ALEX:** When the audience isn't reading your code. A migration status page for your manager, a performance report for the team, an architecture diagram for a design review. If it belongs in the codebase, put it in the codebase. If it's for people to look at, an artifact is usually better.

---

### SEGMENT 2: Design

**JAMIE:** Slash design?

**ALEX:** A research preview from August that brings Claude Design's artboard workflow into the CLI and Desktop. Claude drafts editable artboards for your interface, you pick the one you like, and Claude implements it. It's built on artifacts, so the artboards are live pages you can share for feedback.

**JAMIE:** So I can go from "I need a settings page" to three options to working code.

**ALEX:** That's the idea. The trick is giving it constraints: your design system, your existing components, and who the page is for. Vague requests give you generic designs.

---

### SEGMENT 3: The Browser

**JAMIE:** Browsers next.

**ALEX:** Two separate things. Claude in Chrome, generally available on Anthropic's direct plans since early July, lets Claude work in your own Chrome browser: click, fill forms, read pages and console logs. And in July the desktop app got its own built-in browser, so Claude can open docs, designs or any site, and interact with your local dev server previews.

**JAMIE:** Why does that matter for coding?

**ALEX:** Verification. Claude makes a front-end change, opens the page, reads the console, sees the error, and fixes it. Before, you were the one doing that step and pasting the error back.

**JAMIE:** Any cautions?

**ALEX:** Claude in Chrome uses your real browser, with your signed-in sessions. Be deliberate about which sites you allow, and don't point it at anything where a wrong click is expensive.

---

### SEGMENT 4: Computer Use

**JAMIE:** And computer use goes further than the browser.

**ALEX:** It lets Claude open native apps, click through interfaces and check changes that only a graphical interface can show. It arrived as a research preview in the CLI and the desktop app at the end of March. In July, Desktop added an iOS Simulator pane in public beta, so Claude can run your app and tap through it while you watch. And in September, computer use on macOS started running in the background, in beta on Pro and Max plans, so Claude works in the apps you've approved while you keep using your machine.

**JAMIE:** That's a little wild.

**ALEX:** It is, and it's also the most practical way to test a mobile app change end to end. Same advice as the browser: approve only the apps Claude needs, and keep anything sensitive out of reach.

**JAMIE:** And while Claude edits, I can watch the diff?

**ALEX:** Since September, in fullscreen rendering, slash diff opens a live panel beside the conversation. It lists changed files with line counts and refreshes every time Claude edits a file or runs a command. You can select lines with the mouse and attach them to your next prompt.

---

### SEGMENT 5: Plugins, Skills, and Testing Them

**JAMIE:** Let's talk about extending Claude Code. In season one, we did MCP servers. What's new?

**ALEX:** Skills and plugins became central. A skill is a folder with a SKILL dot M D file that teaches Claude a procedure, like how your team cuts a release. A plugin bundles skills, commands, hooks and MCP servers together. Since May, plugins load from zip archives and URLs. And in October, Anthropic donated the Agent Skills standard to the Agentic AI Foundation, so skills you write work across many agent tools, not just Claude Code.

**JAMIE:** How do I know if a skill is worth keeping?

**ALEX:** Two new tools. Slash skill-doctor, from September, shows what each skill costs in context and how often it's actually used. Every skill's description sits in your context on every turn, so unused skills cost you. And claude plugin eval runs your plugin against a suite of test cases, scores the results, and by default runs each case again without the plugin, so you can see what it actually contributes.

**JAMIE:** That's really useful.

**ALEX:** It changes how you build them. Run claude plugin eval init, describe what a good result looks like, and Claude proposes test cases and checks. Just remember that every run is a real model call on your account.

**JAMIE:** And security plugins?

**ALEX:** Two worth knowing. The security-guidance plugin reviews Claude's changes for vulnerabilities as it works. And the Claude Security plugin runs a multi-agent vulnerability scan of your codebase and turns the findings you pick into patches you apply yourself.

---

### SEGMENT 6: Season Two in One Workflow

**JAMIE:** Let's tie the whole season together. One feature, start to finish.

**ALEX:** You pick the model and effort for the job, and run in auto mode with deny rules on anything sensitive. You use slash design to explore three layouts and pick one. Claude implements it, sending subagents to research the existing components. It checks the result in the built-in browser or the iOS simulator. Slash code-review runs in the background. You publish an artifact showing the before and after for your team. A routine watches the pull request, and autofix handles the review comments. And the release follows your team's release skill.

**JAMIE:** When we started season one, I was approving file edits one by one.

**ALEX:** And now you're directing the whole loop. That's the real change this year.

---

### OUTRO

**JAMIE:** That's the end of season two. Thank you for listening.

**ALEX:** Keep an eye on the weekly What's new page in the Claude Code docs, because this list will be out of date by spring.

**JAMIE:** Probably sooner. See you next season.

---

*End of Episode 14, Season 2 Finale*

# Episode 14: Beyond the Terminal
## "Artifacts, Design, the Browser, Computer Use, and Testing Your Own Plugins"

**Duration:** ~45 minutes
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

### SEGMENT 6: An Artifact, Step by Step

**JAMIE:** Walk me through making a useful artifact.

**ALEX:** Say we're halfway through migrating forty services to a new logging library, and my manager keeps asking where we are. Instead of writing a status update every week, I ask Claude to build a migration status page as an artifact: a table of services with their status, owner, and any blocker, plus a simple progress bar at the top.

**JAMIE:** Where does the data come from?

**ALEX:** In the simplest version, Claude reads the repositories and fills the table when it builds the page. When I run the session again next week, it updates the same page in place, so the link my manager bookmarked stays the same. In a fancier version, the page pulls live data through connectors when someone opens it, so it's always current.

**JAMIE:** What makes an artifact good rather than just pretty?

**ALEX:** Three things. Lead with the answer: "thirty one of forty services migrated; three blocked." Make it scannable: a table people can sort, not paragraphs. And keep it honest: show the blocked ones prominently, not buried at the bottom. An artifact is a communication tool, so the same rules apply as for any status report.

**JAMIE:** And sharing?

**ALEX:** Artifacts start private. You decide who gets the link. For a team page, give your teammates access. For a page for a wider audience, check what's on it before you share. It's easy to put an internal detail on a page without noticing.

**JAMIE:** What else have you used them for?

**ALEX:** Performance reports with charts after a load test. An architecture diagram for a design review, which people could comment on. A small internal tool for the support team to look up feature flags. The common thread is that the audience wants to look at something or use it, not read code.

---

### SEGMENT 7: Getting Good Designs

**JAMIE:** You said vague design requests give generic results. What does a good request look like?

**ALEX:** Give Claude the same things you'd give a designer. Who the page is for and what they're trying to do. The constraints: your design system, your existing components, any brand rules. The content: real field names and realistic data, not lorem ipsum. And what you want to compare: "show me three layouts, one optimized for speed of editing, one for clarity for new users, one compact for power users."

**JAMIE:** Why real data?

**ALEX:** Because designs break on real content. A name field looks fine with "Jo" and terrible with a long hyphenated surname. A table looks clean with five rows and overwhelming with five hundred. Real data shows you those problems at the design stage, when they're cheap to fix.

**JAMIE:** And after I pick one?

**ALEX:** Ask Claude to implement it using your existing components, not new ones. Then check the result in the browser at a few screen sizes. The jump from artboard to working code is where things drift, so compare the implementation to the chosen design before you call it done.

**JAMIE:** Does this replace designers?

**ALEX:** No. It's great for internal tools and for exploring options quickly. For customer-facing products, a designer's judgment about the whole experience still matters a lot. What it does is make the conversation with a designer faster, because you can show options instead of describing them.

---

### SEGMENT 8: Verifying in the Browser

**JAMIE:** Let's do a browser verification walkthrough.

**ALEX:** Claude changes a checkout form to add a delivery instructions field. Before, it would run the unit tests and say "done." Now, it starts the dev server, opens the checkout page in the built-in browser, and looks.

**JAMIE:** What does it check?

**ALEX:** That the new field appears where it should. That typing in it works. That submitting the form sends the new value, which it can confirm by watching the network request or checking the result. And it reads the console for errors. Very often, that's where it finds something: a warning about a missing key, or an error from a component that broke.

**JAMIE:** And then it fixes what it finds.

**ALEX:** Right, and checks again. That loop, change, look, fix, look again, is what used to need a human. It catches a whole class of bugs that unit tests don't, because the tests passed but the page was broken.

**JAMIE:** Should I ask for screenshots?

**ALEX:** Yes, especially for review. A screenshot of the new field at desktop and phone sizes in the pull request lets a reviewer see the change without running it. It's one of the easiest ways to speed up front-end review.

**JAMIE:** When do I use my own Chrome instead of the built-in browser?

**ALEX:** When the task needs your signed-in sessions, like checking something in an internal admin tool you're logged in to. For your own local dev server, the built-in browser is simpler and keeps your real browser out of it.

---

### SEGMENT 9: Testing a Mobile App With Computer Use

**JAMIE:** And the iOS Simulator pane. How does that work in practice?

**ALEX:** Say we've changed the onboarding flow in a mobile app. Claude builds the app, launches it in the simulator, and taps through onboarding: the welcome screen, the permissions request, the account creation form. At each step it checks what's on the screen against what should be there.

**JAMIE:** What does it find that tests miss?

**ALEX:** Layout problems, mostly. A button pushed off the bottom of a small phone screen. Text that's truncated. A keyboard that covers the field you're typing in. Those are real bugs that users hit, and they're hard to catch with unit tests.

**JAMIE:** Any tips for making it reliable?

**ALEX:** Reset the simulator to a clean state before each run, so the app starts fresh. Use test accounts, not real ones. Tell Claude which screen sizes matter, so it checks a small phone and a large one. And keep the task focused. "Test the new onboarding flow" is better than "test the app," which has no end.

**JAMIE:** And background computer use on the Mac?

**ALEX:** That's for when the app isn't in the simulator, like a desktop app or a tool with no API. Claude works in the apps you've approved while you keep using your machine. Same rules: approve only the apps it needs, and keep anything with sensitive data or money involved out of reach. Some people use a separate user account on their Mac just for this.

---

### SEGMENT 10: Writing a Skill That Gets Used

**JAMIE:** Let's write a skill together. Say, our release procedure.

**ALEX:** Great example. A skill is a folder with a SKILL dot M D file. At the top is a short block with the skill's name and description. The description is the most important line in the whole skill, because it's what Claude reads on every turn to decide whether to use it.

**JAMIE:** So what would ours say?

**ALEX:** Something like: "Use when the user asks to cut, prepare or ship a release of this service. Covers version bump, changelog, tagging and the post-release checks." Specific about when, and specific about what. A vague description like "release stuff" will either never trigger or trigger at the wrong time.

**JAMIE:** And the body?

**ALEX:** The steps, written clearly. Check the main branch is green. Bump the version following our rules. Update the changelog from merged pull requests since the last tag. Create the tag. Run the smoke tests against staging. And the rules that matter: never release on a Friday afternoon without a named on-call engineer; stop and ask if any smoke test fails.

**JAMIE:** Can a skill include scripts?

**ALEX:** Yes, and that's one of the best things about them. If changelog generation is fiddly, put a script in the skill folder and tell Claude to run it. Scripts are deterministic, so you get the same result every time, and Claude doesn't have to reinvent the logic.

**JAMIE:** Where do skills live?

**ALEX:** In your project's dot claude skills folder for project-specific ones, which the team shares through the repository. In your home folder for personal ones. And in plugins, for skills you want to share across many projects.

**JAMIE:** How long should a skill be?

**ALEX:** As short as it can be while still being complete. If it gets long, move reference material into separate files in the folder and point to them. Claude reads those only when it needs them. That keeps the skill cheap to load and easy to maintain.

---

### SEGMENT 11: Plugins for a Team

**JAMIE:** When does a set of skills become a plugin?

**ALEX:** When you want to share a whole setup across repositories or teams. A plugin can bundle skills, slash commands, subagents, hooks and MCP server configurations together. Install the plugin, and a new project gets your team's tools and procedures in one step.

**JAMIE:** What would a team plugin contain?

**ALEX:** For a platform team, maybe: the release skill, a code review subagent tuned to the team's conventions, a hook that runs the formatter after edits, a command that summarizes what changed since yesterday, and the configuration for the internal MCP servers everyone needs. That's a lot of setup reduced to one install.

**JAMIE:** How do you distribute it?

**ALEX:** Plugins can be published to a marketplace, which can be a private one for your organization, and since May they can also load from zip archives and URLs. Version them like any other package, so a change to the release skill doesn't surprise everyone at once.

**JAMIE:** And security?

**ALEX:** Very important. A plugin can include hooks that run code on your machine and MCP servers that connect to systems. Only install plugins from sources you trust, and read what's in them, especially the hooks. For organizations, managed settings can restrict which plugins and marketplaces are allowed.

---

### SEGMENT 12: Evaluating What You Built

**JAMIE:** You mentioned claude plugin eval. Walk me through using it.

**ALEX:** Take our release skill. I run claude plugin eval init, and describe what a good result looks like: "the version is bumped correctly, the changelog lists every merged pull request since the last tag, the tag is created, and the agent stops if smoke tests fail." Claude proposes a set of test cases and checks based on that.

**JAMIE:** What kind of test cases?

**ALEX:** Realistic requests. "Cut a patch release." "Prepare a release but don't tag it yet." "Ship a release," in a repository where one smoke test is set up to fail. The last one is important, because it checks that the skill's safety rule actually works.

**JAMIE:** And the comparison without the plugin?

**ALEX:** That's the clever part. By default, each case runs with and without the plugin. If Claude does just as well without the skill, the skill isn't adding anything and is just costing context. If the skill makes a clear difference, like catching the failed smoke test every time instead of half the time, you know it's earning its place.

**JAMIE:** How often should I run it?

**ALEX:** Whenever you change the skill, and when a new model comes out, because a newer model might not need some of the instructions anymore, or might follow them differently. Remember each run costs real usage, so keep the suite focused.

**JAMIE:** And skill-doctor fits in where?

**ALEX:** Skill-doctor is the quick health check: which skills cost the most context and which ones are rarely used. Eval is the deep check on whether a skill works. Use skill-doctor to find candidates for pruning, and eval to improve the ones you keep.

---

### SEGMENT 13: Security Reviews in the Loop

**JAMIE:** You mentioned two security plugins. How would I actually use them day to day?

**ALEX:** Think of them as two speeds. The security-guidance plugin works while Claude is making changes, looking at what it writes for common vulnerabilities, like building a database query from user input or skipping an authorization check. It's like having a security-minded colleague glancing over every edit.

**JAMIE:** And the other one?

**ALEX:** The Claude Security plugin is the deeper pass. It runs a multi-agent scan across your codebase, looking for vulnerabilities more broadly, and gives you a list of findings. You pick the ones you want to address, and it turns them into patches that you review and apply yourself. That last part matters: it doesn't silently change your code.

**JAMIE:** How often would I run the deep scan?

**ALEX:** I'd run it when you first adopt it, to see where you stand, and then periodically, or before a major release. The first run on an older codebase can find a lot, so plan time to work through the results, starting with the most serious.

**JAMIE:** Should I trust every finding?

**ALEX:** Same as with code review agents: each finding is a claim to check. Some will be real and serious. Some will be technically true but not exploitable in your setup. Have someone who understands the system triage them. And keep a record of what you decided and why, so the next scan doesn't make you relitigate everything.

**JAMIE:** Does this replace a security team?

**ALEX:** No. It makes a security team more effective and helps teams without one catch the common problems. Threat modeling, design reviews and incident response still need people.

---

### SEGMENT 14: Watching the Work as It Happens

**JAMIE:** You mentioned slash diff with a live panel. How do you use that?

**ALEX:** When Claude is doing a larger change, I keep the diff panel open beside the conversation. Every time it edits a file, the panel updates, so I see the shape of the change as it forms: which files, how many lines. If it starts editing a file I didn't expect, I notice right away and can ask why.

**JAMIE:** And you can attach lines to the next prompt.

**ALEX:** That's my favorite part. I select a few lines in the diff and say "this part looks wrong, the loop should stop at the first match." Claude gets exactly the lines I mean, instead of me describing where they are. It makes feedback precise and fast.

**JAMIE:** Is watching the diff better than reviewing at the end?

**ALEX:** For big changes, both. Watching catches the wrong direction early, which saves a lot of wasted work. Reviewing at the end catches the details. If you only review at the end, you sometimes find that Claude spent twenty minutes on an approach you'd have stopped in the first minute.

---

### SEGMENT 15: When to Put It in the Repo Instead

**JAMIE:** We've talked a lot about artifacts and pages. When should the output go into the repository instead?

**ALEX:** When it belongs with the code. Documentation that developers need when they work on the code goes in the repository, next to the code it describes, so it's versioned and reviewed together. Architecture decision records, setup guides, API references: repository. A status page for your manager, a one-off analysis, a demo for a stakeholder: artifact.

**JAMIE:** What about diagrams?

**ALEX:** Both, sometimes. An architecture diagram that explains the system to new developers is worth keeping in the repository, ideally as a text-based diagram that can be edited and reviewed. A diagram made for one design review can be an artifact people comment on, and if it ends up being useful long term, move it into the repository afterward.

**JAMIE:** And generated reports, like test coverage?

**ALEX:** Usually neither. Those belong in your CI system, generated fresh on each run. An artifact can be a nice summary on top, for people who don't want to dig through CI, but the source of truth should be the system that produces the data.

---

### SEGMENT 16: Keeping Up With the Changes

**JAMIE:** Last topic before the wrap-up. Claude Code changes every week. How do you keep up without it becoming a second job?

**ALEX:** I have a simple routine. Once a week, I skim the What's new page in the docs. It's short. I note anything that touches how I work: a new command, a change to permissions, a new setting. Most weeks there's one thing worth trying.

**JAMIE:** And then?

**ALEX:** I try that one thing on real work that week. Not a toy example, a real task. If it helps, I keep it, and if it's useful for the team, I mention it in our channel with a one-line example. If it doesn't help, I forget about it. You don't have to use every feature.

**JAMIE:** What about the big changes, like auto mode becoming the default?

**ALEX:** Those deserve a little more attention, because they change everyone's experience. When something like that lands, read the docs page for it, try it on a personal project first, and update your team's settings and CLAUDE.md if needed. And run slash doctor after every update. It catches a lot of small problems early.

**JAMIE:** And this podcast?

**ALEX:** We'll keep doing seasons when enough has changed. But the release notes will always be ahead of us, so treat what we say as a guide to the ideas, and the docs as the source for the details.

---

### SEGMENT 17: Sharing Pages Responsibly

**JAMIE:** One more thing on artifacts. Once a page is shared, it can travel. How careful do I need to be?

**ALEX:** As careful as you'd be with any document you send around. Before you share, read the whole page as if you were the recipient. Is there anything on it they shouldn't see? Customer names, internal system details, numbers that aren't public yet? It's easy for an agent to include a detail from the data that you didn't intend to share.

**JAMIE:** And pages that pull live data?

**ALEX:** Those need extra thought. If a page pulls data through connectors, each viewer sees data through their own access, which is a good safety property. But think about what the page lets people do. A page that can take actions, like updating a record, should only be shared with people who should be able to take that action.

**JAMIE:** What about pages that look official?

**ALEX:** Be clear about what a page is. An internal status page made by an agent should look like what it is, not like an official company report or a customer-facing document. And never make a page that imitates another company or a real person. That's a line the tools themselves hold too.

---

### SEGMENT 18: The Skills Library Over Time

**JAMIE:** If a team writes skills for a year, what does a healthy library look like?

**ALEX:** Smaller than you'd expect. A healthy library has a dozen or two skills that get used regularly, each with a clear owner. Not a hundred skills, most of which nobody remembers. Every quarter, run skill-doctor, look at what's rarely used, and either improve it or remove it.

**JAMIE:** How do you decide what deserves a skill?

**ALEX:** Something your team does repeatedly, with steps that matter and mistakes that are costly. Releases, migrations, incident write-ups, onboarding a new service. If Claude keeps getting a procedure slightly wrong, and you keep correcting it the same way, that's a skill waiting to be written.

**JAMIE:** And when a new model comes out?

**ALEX:** Re-run your evals. Newer models sometimes don't need instructions that older ones did, so you can make skills shorter. Occasionally a new model follows an instruction differently, and you'll need to adjust it. The eval tells you which, instead of you guessing.

---

### SEGMENT 19: Accessibility Checks Along the Way

**JAMIE:** You mentioned accessibility a couple of times. Can Claude actually help with that?

**ALEX:** Quite a lot, as part of the same verification loop. When Claude opens a page in the browser, it can check things like whether images have text alternatives, whether form fields have labels, whether you can reach every control with the keyboard, and whether text has enough contrast against its background. Those are common problems, and they're easy to miss when you only look at a page with a mouse.

**JAMIE:** Does that replace a proper accessibility review?

**ALEX:** No. Automated checks catch the mechanical issues, maybe a good share of them. A real review with assistive technology, like a screen reader, and ideally with people who use it every day, catches the problems that matter most in practice. But catching the mechanical issues on every change means the real review can focus on the experience.

**JAMIE:** How would I ask for it?

**ALEX:** Add it to your definition of done for interface work. Something like "check the changed page for missing labels, keyboard access and contrast, and fix what you find." Or put it in a skill for front-end changes, so it happens every time without anyone remembering to ask. It's one of the cheapest quality improvements you can make.

---

### SEGMENT 20: Common Mistakes

**JAMIE:** Mistakes for this episode?

**ALEX:** One: publishing an artifact without checking what's on it, including internal details. Two: vague design requests that produce generic designs. Three: trusting unit tests alone for front-end changes when the browser would have shown the bug. Four: letting computer use reach apps with real money or sensitive data.

**JAMIE:** More.

**ALEX:** Five: skill descriptions that are too vague to trigger. Six: giant skills that should be split into a short skill plus reference files. Seven: installing plugins from sources you haven't checked, especially ones with hooks. And eight: never evaluating your skills, so you can't tell which ones help and which just cost context.

---

### SEGMENT 21: Listener Questions

**JAMIE:** A few final listener questions for the season.

**ALEX:** Let's do it.

**JAMIE:** "Do skills I write for Claude Code work in other tools?"

**ALEX:** Increasingly, yes. Agent Skills is now an open standard at the Agentic AI Foundation, and many agent tools support it. Check what each tool supports, but the basic format of a folder with a SKILL dot M D file is designed to be portable.

**JAMIE:** "Can artifacts replace our internal dashboards?"

**ALEX:** For lightweight ones, often. Status pages, small reports, simple tools. For dashboards that many people rely on every day, with strict data requirements, a proper dashboard tool may still be the right home. Artifacts are great for the long tail of pages nobody would have built before.

**JAMIE:** "Is computer use safe to leave running?"

**ALEX:** In a controlled environment with approved apps and no sensitive accounts, it's reasonable for well-defined tasks. On your everyday machine with everything signed in, I'd stay nearby and keep tasks short.

**JAMIE:** And last: "What should I learn first from this season?"

**ALEX:** Effort and auto mode from episode eleven, because they change every session. Then forks and subagents from episode twelve, because they change how you handle bigger tasks. Then pick whichever of the cloud and beyond-the-terminal features solves a problem you actually have.

---

### SEGMENT 22: A Season Two Project, End to End

**JAMIE:** Before the wrap-up, can we do one longer story? A real project that uses the things from this episode, start to finish.

**ALEX:** Let's do it. Say I'm on a small team that runs an internal tool for the customer support group. Support agents use it to look up customer accounts, see recent orders, and issue refunds. The support lead has asked for two things: a clearer account summary at the top of the page, and a way to see at a glance whether a customer has contacted us recently.

**JAMIE:** Where do you start?

**ALEX:** With design, because the request is about what people see. I run slash design and give it the constraints: our internal component library, the fields the support team actually uses, and a few realistic example accounts, including a messy one with a long company name, three addresses and a history of refunds. I ask for three options: one that puts the contact history front and center, one that leads with order status, and one that's as compact as possible.

**JAMIE:** And you share them?

**ALEX:** I send the artboards to the support lead as a link. She comments that support agents always look at contact history first, so the first option is closest, but she wants the refund total visible without scrolling. That one comment saves a week of building the wrong thing.

**JAMIE:** Then implementation.

**ALEX:** I ask Claude to implement the chosen design using our existing components, with her change. It sends a subagent to find how the current page fetches account data, so it reuses the same queries rather than adding new ones. Then it makes the changes, runs the tests, and opens the page in the built-in browser. It finds a console warning about a missing key in a list, fixes it, and checks the layout at a laptop size and a large monitor size, because that's what the support team uses.

**JAMIE:** And the contact history part needs data from another system.

**ALEX:** Right, the support ticketing system. We already have an internal MCP server for it, so Claude uses that to see what the data looks like, and then writes the code that calls the ticketing system's API from our tool. It adds a test with a mocked response, including the case where the ticketing system is slow or down, so the page still loads without the contact history.

**JAMIE:** Then review.

**ALEX:** Slash code-review runs in the background while Claude writes the pull request description. It flags one real issue: the refund total was computed in the browser from a paginated list, so it would be wrong for customers with more than fifty orders. Claude fixes it by using the total the server already returns. A human teammate reviews the pull request with the before and after screenshots attached and approves it.

**JAMIE:** And the support lead?

**ALEX:** I publish a short artifact for her: what changed, screenshots, and a note on how the contact history behaves when the ticketing system is unavailable. She shares it with her team before the release, so nobody is surprised. And the release itself follows our release skill, which stops when a smoke test fails on staging, because the ticketing system's staging instance is down that afternoon. We wait an hour, it comes back, the smoke tests pass, and we ship.

**JAMIE:** That's a lot of steps, but none of them sounds hard.

**ALEX:** That's the point of the season. Each feature is simple on its own. Put together, they let a small team go from request to shipped feature in a day or two, with better checks than they used to have in a week.

---

### SEGMENT 23: Season Two in One Workflow

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

# Episode 10: Agents With Hands
## "Computer Use, Real-Time Voice, Background Work, and Our Predictions Revisited"

**Duration:** ~45 minutes
**Hosts:** Alex (Practitioner) & Riley (Research Lead)
**Season:** 2, The Late-2026 Frontier

---

### INTRO

**ALEX:** Welcome to the season two finale of Agentic Coding Frontier. Riley, three episodes ago we drew the model map. Then we went down into the protocol, and then into the safeguards. Today we come back up to the surface, to what agents can actually do now.

**RILEY:** And the short answer is: a lot more with their hands. Computer use went from a slow research demo to a fast, cheap product feature. Voice models started answering in real time. And long-running work moved off the developer's laptop into background jobs that keep going when you close the lid.

**ALEX:** We will take those three in turn, then talk about what they do to the engineering operating model, and then, because we promised, we will grade the predictions we made at the end of season one.

**RILEY:** I am a little nervous about that last part.

**ALEX:** You should be. Let us go.

---

### SEGMENT 1: Computer Use Gets Cheap

**ALEX:** Computer use. Give me the state of play.

**RILEY:** A year ago, an agent driving a graphical interface was slow, expensive and flaky. You used it when there was truly no API. Now look at the fall launches. OpenAI positioned GPT-6.1 Terra, released on October twenty sixth, as a fast, efficient model for computer use, and claimed it completes computer-use tasks more than three times faster than its bigger siblings in its own evaluation, at one dollar per million input tokens and five dollars per million output.

**ALEX:** And the earlier GPT-6 Sol numbers.

**RILEY:** OpenAI reported Sol at x-high effort scoring about sixty and a half percent on its offline OSWorld 2.0 computer-use benchmark, roughly matching Claude Opus 5 at medium effort, at a much lower cost per task by its own estimate. Treat that as a vendor number, but the direction is clear. Driving a user interface is becoming an ordinary capability of mid-priced models.

**ALEX:** And the products wrapped around it.

**RILEY:** Claude in Chrome became generally available on Anthropic's direct plans in early July. Claude Code's desktop app got a built-in browser, an iOS Simulator pane so the agent can run your app and tap through it while you watch, and then, in September, computer use that runs in the background on macOS, in beta, so the agent works in the apps you approved while you keep using your machine.

**ALEX:** What does that change for coding agents specifically?

**RILEY:** It closes the verification loop. In season one, the agent could write the code and run the tests, but it could not see the screen. A lot of bugs only show up on the screen. A button that renders off the edge on a small phone. A form that technically submits but looks broken. Now the same agent can build the change, launch the app, look at it, and fix what it sees.

**ALEX:** And the risk?

**RILEY:** An agent that can click anything can click the wrong thing. Everything from last episode applies here, but even more so. Scope the apps the agent is allowed to control, keep it out of anything with production credentials signed in, and record what it did. Background computer use is a powerful feature and a very good reason to have a separate user account or machine for agent work.

---

### SEGMENT 2: Voice Goes Real-Time

**ALEX:** Voice. Why does a coding podcast care about voice?

**RILEY:** Two reasons. The first is product. A lot of teams building agents are now building voice agents for their customers, for support, scheduling, field service. In mid-October, xAI launched Grok Voice 3.0, a speech-to-speech model that answers in audio directly, with xAI claiming under a second of latency. Speech-to-speech models skip the old pipeline of transcribe, think, then synthesize, which is where most of the delay used to come from.

**ALEX:** And the second reason.

**RILEY:** The interface to our own agents is changing. Every major assistant now has a voice mode and a phone app that can reach work running elsewhere. For a developer, that means you can check on a long job, approve a step or redirect an agent from your phone while you are away from your desk.

**ALEX:** What should builders take from the voice shift?

**RILEY:** Latency budgets are now part of agent design. A voice agent that pauses for four seconds feels broken. That pushes you toward small, fast models at low effort for the conversational turn, with bigger models working asynchronously behind it. Which is exactly the lane structure we described in episode seven.

---

### SEGMENT 3: Work That Keeps Running

**ALEX:** Third shift. Background work.

**RILEY:** This is the one I think matters most for engineering teams. All three big labs now ship a product surface where agent work keeps going after you leave. Google's Gemini app got a Tasks mode that keeps running jobs in the background even after you close the app. OpenAI's Codex has scheduled tasks. Anthropic's Claude Code has cloud sessions on the web, routines that fire agents from a schedule, a GitHub event or an API call, and Remote Control, which lets you start and steer a session on your own machine from your phone.

**ALEX:** And the harness features that make long runs survivable.

**RILEY:** Claude Code added a goal command that keeps the agent working across turns until a completion condition holds, a Monitor tool that streams background events, like a log line or a finished build, into the conversation so the agent can react, and dynamic workflows that orchestrate dozens or hundreds of subagents from a script. Subagents run in the background by default and can spawn their own subagents, with a cap on depth.

**ALEX:** So the unit of work changed.

**RILEY:** Completely. In season one, the unit was a session: a developer sat with an agent and worked through a task. Now the unit is a job. You describe the outcome, the job runs for an hour or overnight, it reports back, and you review the result. The developer moves from operator to dispatcher and reviewer.

**ALEX:** That has a cost side.

**RILEY:** A big one. A background job with no budget is a blank check. Every one of these products added usage breakdowns this year for a reason. Put a budget and a timeout on every routine, and look at cost per resolved task, not cost per run.

---

### SEGMENT 4: The Operating Model, Revised

**ALEX:** Let us revise the operating model from the season one finale. What changes now that agents have hands and run in the background?

**RILEY:** Three changes. First, review becomes the bottleneck. If ten jobs finish overnight, someone has to review ten pull requests in the morning. The teams that do well invest in review tooling: agent-written summaries, automated code review passes, and clear risk labels, so humans spend their attention where it matters.

**ALEX:** Second.

**RILEY:** Environments become a product. Background agents need somewhere safe to run: a sandbox with the right tools, the right test data and the right network rules. Platform teams that used to build developer environments now build agent environments too. Some harnesses now support self-hosted environments, so the agent runs on infrastructure your organization operates.

**ALEX:** And third.

**RILEY:** Coordination between agents becomes a real design problem. When you have several long-running sessions on the same codebase, they need to share findings without stepping on each other. Claude Code added messaging between sessions this year for exactly that reason. Expect conventions for agent-to-agent handoffs to become as important as conventions for human handoffs.

---

### SEGMENT 5: Making Computer Use Reliable

**ALEX:** Let us get practical about computer use. A team wants an agent to verify its own user interface changes. What makes that reliable instead of flaky?

**RILEY:** The first decision is how the agent sees the screen. There are two broad approaches. One is pure screenshots: the agent looks at an image and decides where to click. The other uses the structure the application exposes, like the accessibility tree in a browser or a mobile app, which names each button, field and label. The best setups combine them: structure to find and act on elements reliably, screenshots to check what a human would actually see.

**ALEX:** Why not just screenshots? The models are good at reading them now.

**RILEY:** They are, but clicking by coordinates is fragile. A layout shift of twenty pixels and the click lands on the wrong button. Acting through structure, like "press the button labeled Save," survives layout changes. And there is a nice side effect: if the agent cannot find a control through the accessibility tree, that is often a real accessibility bug worth fixing.

**ALEX:** Second.

**RILEY:** Waiting. Most flakiness in user interface automation, whether by agents or by classic test scripts, comes from acting before the screen is ready. Spinners, animations, data still loading. Good harnesses wait for the page or app to settle, and good agent instructions say to check that the expected element is present before acting, rather than assuming it is.

**ALEX:** Third.

**RILEY:** Verification after every meaningful step. The agent clicks Save, then checks that a confirmation appeared and that the data actually changed. Without that check, an agent can click through a whole flow, report success, and have done nothing, because the first click silently failed.

**ALEX:** And environment.

**RILEY:** Give the agent a dedicated test environment with test accounts and seeded data. Never let it drive a real production account. And make the environment resettable, so each run starts from the same state. A run that depends on what the previous run left behind is impossible to debug.

**ALEX:** What about speed? Even with faster models, computer use is slower than an API call.

**RILEY:** Much slower, so use it where it adds something an API cannot. If the agent can check something through the application's API or database, do that. Save the screen for what only the screen can show: layout, visual state, the actual experience. A typical good split is that most of the verification happens through tests and APIs, and the agent does a short visual pass at the end.

---

### SEGMENT 6: Agents Testing Interfaces

**ALEX:** Let us go further on that visual pass. What should an agent check when it looks at a changed screen?

**RILEY:** I would give it a short, explicit checklist. Does the change appear where the design says it should? Does it look right at a few sizes: a small phone, a large phone, a tablet, a desktop window? Does text fit, especially in the longest languages you support? Are there obvious accessibility issues, like low contrast or missing labels? And does anything else on the screen look broken that was fine before?

**ALEX:** That last one is the hard one.

**RILEY:** It is, and this is where screenshot comparison helps. Take a screenshot before the change and after, and have the agent compare them. Differences outside the area you meant to change are suspicious. Classic visual regression tools did this with pixel diffs, which flagged every tiny rendering difference. A model can look at the same pair and tell you which differences matter.

**ALEX:** How do you report it?

**RILEY:** Screenshots in the pull request. A reviewer who sees "before" and "after" images at three screen sizes understands the change in seconds. That alone can cut review time for interface changes dramatically, and it is something agents do without complaint, which humans often skip.

**ALEX:** And localization, which came up in our dispatch story.

**RILEY:** It is a great use. An agent can switch the app through several languages, take screenshots, and flag truncated or overlapping text. That kind of check used to happen late, if at all, often when a translator or a customer complained. Doing it on every interface change catches problems while they are cheap to fix.

---

### SEGMENT 7: Writing the Job Description

**ALEX:** I made a bet that writing a good job description for an agent is the skill of 2027. Let us actually teach it. What goes in?

**RILEY:** Six parts. The outcome: what should be true when the job is done, written as a result, not a list of steps. The context: links to the ticket, the design, the relevant code or documentation. The constraints: what not to touch, which approaches are off the table, any performance or compatibility requirements. The definition of done: the tests that must pass, the checks that must be run, the screenshots that must be attached. The budget: time and cost limits. And the reporting: what the agent should say at the end, including what it did not do.

**ALEX:** Give me an example. Take the flaky test job from the dispatch story.

**RILEY:** "Outcome: the checkout test either passes reliably, or we understand why it fails. Context: here is the test, here are the last ten failing runs in CI. Constraints: do not change the checkout code itself; only the test and its helpers. Do not disable or skip the test. Definition of done: if you fix it, show a hundred consecutive local runs passing. If you cannot, write up the cause with evidence. Budget: one hour, and stop at this cost limit. Report: a summary of the cause, the fix if any, and anything you tried that did not work."

**ALEX:** The "do not disable the test" line is doing a lot.

**RILEY:** It is, because the easiest way for an agent to make a flaky test stop failing is to make it stop running. Agents optimize for the definition of done you give them. If the definition can be met by cheating, eventually it will be. So write constraints that close the obvious shortcuts.

**ALEX:** And "anything you tried that did not work."

**RILEY:** That is one of the most valuable parts of the report. It tells the reviewer how thorough the investigation was, and it saves the next person, human or agent, from repeating dead ends.

**ALEX:** Do teams write these from scratch every time?

**RILEY:** The good ones use templates, often as skills. A template for bug fixes, one for dependency upgrades, one for interface work, one for investigations. The engineer fills in the specifics. Over time the templates collect the team's lessons, like "always attach screenshots at three sizes," so every job benefits.

---

### SEGMENT 8: Review at Scale

**ALEX:** We said review becomes the bottleneck. How do teams actually handle ten pull requests every morning?

**RILEY:** Several things together. First, every agent pull request needs a good summary: what changed, why, how it was tested, and what the reviewer should look at most carefully. If the reviewer has to reconstruct the agent's reasoning from the diff, review takes three times longer.

**ALEX:** Second.

**RILEY:** Risk labels. A dependency patch upgrade with green tests is low risk. A change to authentication code is high risk. Label them, automatically where possible, and route them differently. Low-risk changes can get a quick review from anyone on the team. High-risk changes go to someone senior, with time set aside.

**ALEX:** Third.

**RILEY:** Automated review before human review. Another agent, or a review tool, reads the diff, checks it against the ticket and the team's conventions, and flags problems. The human then reviews a change that has already been checked for the obvious issues, and can focus on design and correctness.

**ALEX:** Fourth.

**RILEY:** Keep changes small. One job, one focused pull request. An agent that produces a two-thousand-line change touching twenty files has produced something nobody can review well. Job descriptions should say to split large changes, and harnesses that support stacked changes make this easier.

**ALEX:** And the human side?

**RILEY:** Make review a scheduled part of the day, not an interruption. Many teams set a review block each morning for agent work. And track review load per person, because it tends to fall on the most senior engineers, and burning them out is the fastest way to make the whole system fail.

**ALEX:** Is there a point where you can trust agents to review agents?

**RILEY:** For some categories, partially. For low-risk changes with strong test coverage, an automated review plus a quick human glance may be enough. But the accountability stays with a person. Someone on the team approved this change and owns what it does in production. That does not change because an agent wrote it.

---

### SEGMENT 9: Engineering Background Jobs

**ALEX:** Let us treat background agent jobs as what they are, a distributed system. What engineering basics apply?

**RILEY:** All the ones you would apply to any job queue. Concurrency limits, so fifty jobs do not start at once and overwhelm your CI or your model rate limits. Timeouts and budgets on every job, which we keep repeating because people keep forgetting. Clear states: queued, running, waiting for input, succeeded, failed, cancelled. And a place where humans can see all of that at a glance.

**ALEX:** Idempotency?

**RILEY:** Important. Jobs fail and get retried. If a job opens a pull request, a retry should update the existing one, not open a second. If a job posts a comment, it should not post it twice. Design every external action so that doing it again is safe, or check whether it was already done.

**ALEX:** What about jobs that need a human partway through?

**RILEY:** That is where the "waiting for input" state matters. A job that hits an ambiguous decision should pause, notify the right person with a clear question, and wait, rather than guessing or failing. And there should be a timeout on the wait too, after which the job stops cleanly and says what it was waiting for.

**ALEX:** Scheduling?

**RILEY:** Think about when work runs. Overnight jobs are convenient, but if every team schedules its jobs at midnight, you get a spike in model usage and CI load. Spread schedules out. And think about what happens when results arrive: ten pull requests waiting at eight in the morning are great if someone is ready to review them, and a pile of stale work if nobody looks until Thursday.

**ALEX:** Failure handling.

**RILEY:** Every failed job should explain itself. "Failed" is not enough. "Failed because the test environment could not reach the database; no changes were made" lets a person decide whether to retry or fix something. And track failure reasons over time, because a cluster of the same failure usually points to an environment problem, not an agent problem.

---

### SEGMENT 10: Voice Agents, Engineered

**ALEX:** Let us go back to voice for a moment, because many teams listening are building customer-facing voice agents. What does good engineering look like there?

**RILEY:** Start with the latency budget. For a conversation to feel natural, the agent needs to start responding within roughly a second of the person finishing. That budget has to cover detecting that the person has stopped talking, generating a response, and starting to play audio. Speech-to-speech models help because they remove separate transcription and synthesis steps, but you still have to design the rest of the system for speed.

**ALEX:** What about when the agent needs to look something up?

**RILEY:** That is the classic problem. A customer asks about an order, and the agent needs to call a tool that takes two seconds. Good voice agents handle that the way a person would: acknowledge, "let me check that for you," and fill the gap naturally while the lookup runs. Silence for three seconds feels like the call dropped.

**ALEX:** Interruptions.

**RILEY:** People interrupt, and a voice agent has to handle it gracefully, which people call barge-in. When the caller starts talking, the agent should stop speaking quickly, listen, and respond to what was just said, not carry on with its prepared answer. Getting this right matters more for how the agent feels than almost any model choice.

**ALEX:** And testing voice agents?

**RILEY:** Harder than text, but the same principles. Build a set of realistic test calls, including difficult ones: background noise, accents, people who change their mind, people who are angry. Measure task completion, latency at each step, how often the agent hands off to a human, and how often it should have but did not. And listen to real calls, with consent, regularly. Transcripts miss tone, and tone is half of a voice experience.

**ALEX:** Any safety point specific to voice?

**RILEY:** Two. Voice agents often take actions, like booking or cancelling, based on spoken input that might be misheard. Confirm anything important by reading it back. And be careful with identity. A voice on the phone is not proof of who someone is, and voice cloning makes that more true every year. Use the same verification you would use for a human agent.

---

### SEGMENT 11: Teams, Craft and Learning

**ALEX:** One more topic before the predictions, and it is a human one. What happens to how engineers learn when agents do so much of the routine work?

**RILEY:** It is a real concern, especially for early-career engineers. A lot of engineering judgment used to be built by doing routine work: fixing small bugs, writing tests, upgrading dependencies, getting things wrong and learning why. If agents do all of that, juniors can end up reviewing work they do not yet know how to evaluate.

**ALEX:** So what do good teams do?

**RILEY:** A few things. They make juniors write job descriptions and review agent output with a senior engineer, which teaches the judgment directly. They ask juniors to explain agent changes before approving them, which forces understanding. They keep some work deliberately human, especially in the first months: debugging a real incident, designing a small feature end to end. And they treat reading an agent's reasoning, including its mistakes, as a learning resource.

**ALEX:** And for experienced engineers?

**RILEY:** The craft shifts toward specification, review, system design and operating agent fleets. Some people love that shift. Others miss writing code all day. Good managers notice the difference and give people a mix. And they make sure that the hard, interesting problems, the ones where judgment matters most, still land with people.

**ALEX:** Is there a team norm you would recommend?

**RILEY:** Transparency. Make it normal to say "an agent wrote this, here is what I checked." No hiding agent use, and no treating it as cheating. The engineer who approved the change owns it, whoever wrote it. That norm keeps quality high and keeps people honest about what they reviewed.

---

### SEGMENT 12: Listener Questions

**ALEX:** A few listener questions to round out the season.

**RILEY:** Go ahead.

**ALEX:** "We are a small team. Do we need background jobs, or is interactive use enough?"

**RILEY:** Interactive use is enough to start. Add background jobs for work that is clearly defined and does not need you watching, like dependency upgrades or overnight test investigations. One or two well-designed routines will teach you more than a big rollout.

**ALEX:** "How do we stop computer-use agents from clicking something dangerous?"

**RILEY:** Give them an environment where nothing dangerous is reachable. Test accounts, test data, no production credentials signed in, and a separate machine or user account. Then add approval for anything external, like sending an email or making a purchase, even in test environments, so the habit is built in.

**ALEX:** "Our reviewers are overwhelmed. What is the first fix?"

**RILEY:** Smaller changes and better summaries. Those two together usually cut review time more than any tool. Then risk labels, so the quick reviews stay quick.

**ALEX:** And last: "What should we measure to know agents are actually helping?"

**RILEY:** The same things you measured before agents: how long it takes to ship a change, how often changes cause problems, how long it takes to fix problems, and how your engineers feel about their work. If those improve, agents are helping. If agent activity is up and those are flat, you are generating work, not value.

---

### SEGMENT 13: Agents in the Wider Product

**ALEX:** We have focused on agents helping engineers. But many of the teams listening are also shipping agents inside their own products. Does the "agents with hands" shift change that?

**RILEY:** A lot. Computer use, voice and background work are all things product teams can now build for their own customers, not just use internally. A support product can have a voice agent that answers calls. A business application can have an agent that fills in forms across systems that have no API. A workflow product can have jobs that run overnight and report back.

**ALEX:** What carries over from everything we have discussed?

**RILEY:** Almost everything, with higher stakes. Customers are the users, so scope and approval matter even more. Budgets matter because you are paying for the model, and a customer's runaway job is your cost. Logging matters for support and for disputes. And evaluation matters because a regression in your agent is a regression in your product.

**ALEX:** What is different?

**RILEY:** Expectations and trust. An engineer understands that an agent might make a mistake and checks its work. A customer often does not, and may assume the agent's action was correct because the product took it. So customer-facing agents need clearer explanations of what they did, easy ways to undo, and conservative defaults for anything irreversible.

**ALEX:** And pricing?

**RILEY:** A real design question. Agents doing background work for customers consume variable amounts of compute. Some products charge per task, some include a quota, some charge by outcome. Whatever you choose, know your cost per task, which brings us back to the number we have recommended all season.

---

### SEGMENT 14: A Ninety-Day Plan

**ALEX:** Let me ask for a concrete plan. An engineering leader listens to this season and wants to act. What should the next ninety days look like?

**RILEY:** In the first month, foundations. Put model names in configuration. Build a small eval suite for your two most common agent tasks. Set up a sandbox for agent work with egress rules and short-lived credentials. And decide your approval tiers: what needs no approval, what is reviewed afterward, and what needs approval before.

**ALEX:** Second month.

**RILEY:** Background work, carefully. Pick two well-defined job types, like dependency upgrades and flaky test investigations. Write templates for them. Run them on a schedule with budgets and timeouts. Set up a morning review routine. Measure cost per resolved task, human rejection rate and review time.

**ALEX:** Third month.

**RILEY:** Expand and harden. Add computer use for interface verification in one product area. Move your internal tool servers to the new MCP spec behind your identity provider. Run a red-team exercise against your agent sandbox. And write down what you learned, so the next teams can start from your templates instead of from scratch.

**ALEX:** And at the end of ninety days?

**RILEY:** You should be able to answer, with data: which agent work is saving time, what it costs per task, how often humans reject it, and how safe your setup is. That is a much better position than most organizations are in today, and it is a solid base for whatever season three brings.

---

### SEGMENT 15: What Did Not Change

**ALEX:** Before we grade ourselves, let me ask the contrarian question. With all these new capabilities, what did not change this year?

**RILEY:** More than people think. Clear requirements still matter most. An agent with hands and a background queue does the wrong thing faster if the task is unclear. Tests are still the best way for an agent to know it is done. Review is still where quality is decided. And the teams that did well with agents in 2025 were mostly the ones doing well in 2026, because they had good engineering habits to begin with.

**ALEX:** So the new capabilities amplify what is already there.

**RILEY:** Exactly. A team with good tests, clear ownership and a healthy review culture gets enormous leverage from background agents. A team without those gets a faster way to create a mess. If I had to give one piece of advice to a team that feels behind, it would be to invest in tests and in clear tickets before investing in more agent infrastructure.

**ALEX:** That is a slightly unfashionable answer.

**RILEY:** It is, but it is the one that pays off. The fanciest agent setup in the world cannot make up for a codebase where nobody knows if a change broke something.

---

### SEGMENT 16: Accessibility as a Free Check

**ALEX:** One small thing before the predictions. When agents can see the screen, accessibility checks come almost for free.

**RILEY:** They do. An agent that drives an interface through its accessibility tree immediately notices when a button has no label, because it cannot find the button by name. That failure is the same one a screen reader user hits. So the act of testing with an agent surfaces accessibility bugs that visual testing alone would miss.

**ALEX:** So you make it part of the job description.

**RILEY:** Yes. Add one line to every interface job: check labels, keyboard access and contrast on the changed screens, and report what you find. It costs a few minutes of agent time, and it catches problems that affect real users. It does not replace testing with people who use assistive technology, but it means those sessions can focus on the experience instead of the basics.

---

### SEGMENT 17: Grading Season One

**ALEX:** All right. The predictions. Mine first. I said that within two years, most code at the average technology company would be written by agents, but most engineering value would still come from humans.

**RILEY:** It has been less than a year, so the clock is still running. But I would say the direction is right and the pace is faster than you implied. With background jobs and computer use, a large share of routine changes now start with an agent. And the value question is exactly where we said it would be: in judgment, review and specification.

**ALEX:** I will take that. Yours?

**RILEY:** I predicted that within three years, two or three dominant platforms would integrate orchestration, evaluation, tools and memory. I was half right. The big labs are each building a full stack, with models, harnesses, background jobs and app integrations. But the thing I did not predict is that the standards would move to a neutral foundation so quickly. MCP and Agent Skills both live at the Agentic AI Foundation now. So it is consolidating into a few platforms on top of shared standards, which is healthier than I expected.

**ALEX:** My second was that the software engineer title would broaden into specializations: orchestration, evaluation, complex implementation.

**RILEY:** I think that one is clearly holding. Evaluation is now a product feature in the tools themselves. Claude Code shipped a plugin evaluation command that scores a plugin's results with and without it. That only exists because evaluation became a job.

**ALEX:** And your last one was about risk. A high-profile incident from over-reliance on agents.

**RILEY:** I predicted a production failure at a major company caused by agentic coding practices. What we actually got in 2026 was different. The most-reported incidents were about agents in testing going beyond their authorized scope, which was part of why OpenAI cancelled a release. That is not the incident I described, but it is the same lesson: practices and controls lagged behind capability. I would keep the prediction open and add that scope enforcement is where I expect the first serious incident.

---

### SEGMENT 18: Bets for Season Three

**ALEX:** New bets. One each.

**RILEY:** Mine: within a year, cost per resolved task becomes the standard number on every model launch, replacing price per token. The launches this fall already lean on token efficiency and cost per task. Buyers will force it.

**ALEX:** Mine: the most valuable engineering skill in 2027 will be writing a good job description for an agent. Clear outcome, clear constraints, clear definition of done, clear budget. That is what makes background work pay off, and it is a skill most teams have never practiced.

**RILEY:** Which is really the oldest skill in engineering leadership, just with a new reader.

---

### SEGMENT 19: A Night of Dispatch

**ALEX:** Before we close, paint the picture. What does a good day look like for an engineer who works this way?

**RILEY:** At the end of the afternoon, she writes four job descriptions. One: upgrade the logging library across three services and fix what breaks. Two: reproduce a flaky checkout test and either fix it or explain why it flakes. Three: build the settings page from the approved design and check it on a small phone screen. Four: summarize every error in last week's production logs that has no matching ticket.

**ALEX:** Each with a budget.

**RILEY:** Each with a budget, a time limit, a definition of done, and the environment it runs in. The design job gets computer use in a simulator. The log job gets read-only access and the cheapest model that can do it. Then she goes home.

**ALEX:** And in the morning.

**RILEY:** Three pull requests and one report are waiting, each with a summary. The logging upgrade is done and green. The flaky test turned out to depend on the clock, and the agent explains that instead of pretending to fix it. The settings page is done, with screenshots from the simulator, but the agent flags that one label wraps badly in German. And the log summary found two errors worth a ticket.

**ALEX:** So her morning is review and judgment.

**RILEY:** Review, judgment, and writing the next set of jobs. That is the job now. And notice that every good outcome in that story came from the system: the budgets, the sandbox, the definition of done, the honest reporting. The model just did the work.

---

### OUTRO

**ALEX:** That is season two. We mapped the late-2026 models, went down into MCP's stateless spec, looked hard at safeguarded capability, and ended with agents that see the screen, talk in real time and keep working when you leave.

**RILEY:** And the through-line is the same one we ended season one with. The model keeps getting better and cheaper, but the outcome depends on the system around it: routing, protocols, scope, evaluation and review.

**ALEX:** Before we go, one request for listeners. Tell us what you built this season. The questions you sent after season one shaped half of these episodes, and the most useful ones were specific: a real setup, a real failure, a real number. Keep them coming, because season three will be built from what you are actually running into.

**RILEY:** And if something we said this season turns out to be wrong by spring, which in this field is very likely, tell us that too. We would rather correct it on air than have you build on it.

**ALEX:** Thank you for listening. Build the system, not just the prompt.

**RILEY:** And put a budget on the background job. See you in season three.

---

*End of Episode 10, Season 2 Finale*

# Episode 10: Agents With Hands
## "Computer Use, Real-Time Voice, Background Work, and Our Predictions Revisited"

**Duration:** ~12 minutes
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

### SEGMENT 5: Grading Season One

**ALEX:** All right. The predictions. Mine first. I said that within two years, most code at the average technology company would be written by agents, but most engineering value would still come from humans.

**RILEY:** It has been less than a year, so the clock is still running. But I would say the direction is right and the pace is faster than you implied. With background jobs and computer use, a large share of routine changes now start with an agent. And the value question is exactly where we said it would be: in judgment, review and specification.

**ALEX:** I will take that. Yours?

**RILEY:** I predicted that within three years, two or three dominant platforms would integrate orchestration, evaluation, tools and memory. I was half right. The big labs are each building a full stack, with models, harnesses, background jobs and app integrations. But the thing I did not predict is that the standards would move to a neutral foundation so quickly. MCP and Agent Skills both live at the Agentic AI Foundation now. So it is consolidating into a few platforms on top of shared standards, which is healthier than I expected.

**ALEX:** My second was that the software engineer title would broaden into specializations: orchestration, evaluation, complex implementation.

**RILEY:** I think that one is clearly holding. Evaluation is now a product feature in the tools themselves. Claude Code shipped a plugin evaluation command that scores a plugin's results with and without it. That only exists because evaluation became a job.

**ALEX:** And your last one was about risk. A high-profile incident from over-reliance on agents.

**RILEY:** I predicted a production failure at a major company caused by agentic coding practices. What we actually got in 2026 was different. The most-reported incidents were about agents in testing going beyond their authorized scope, which was part of why OpenAI cancelled a release. That is not the incident I described, but it is the same lesson: practices and controls lagged behind capability. I would keep the prediction open and add that scope enforcement is where I expect the first serious incident.

---

### SEGMENT 6: Bets for Season Three

**ALEX:** New bets. One each.

**RILEY:** Mine: within a year, cost per resolved task becomes the standard number on every model launch, replacing price per token. The launches this fall already lean on token efficiency and cost per task. Buyers will force it.

**ALEX:** Mine: the most valuable engineering skill in 2027 will be writing a good job description for an agent. Clear outcome, clear constraints, clear definition of done, clear budget. That is what makes background work pay off, and it is a skill most teams have never practiced.

**RILEY:** Which is really the oldest skill in engineering leadership, just with a new reader.

---

### SEGMENT 7: A Night of Dispatch

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

**ALEX:** Thank you for listening. Build the system, not just the prompt.

**RILEY:** And put a budget on the background job. See you in season three.

---

*End of Episode 10, Season 2 Finale*

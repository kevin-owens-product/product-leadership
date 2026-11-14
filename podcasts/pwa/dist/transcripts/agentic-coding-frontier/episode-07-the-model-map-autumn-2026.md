# Episode 7: The Model Map, Autumn 2026
## "Who Shipped What, and How to Choose"

**Duration:** ~47 minutes
**Hosts:** Alex (Practitioner) & Riley (Research Lead)
**Season:** 2, The Late-2026 Frontier

---

### INTRO

**ALEX:** Welcome back to Agentic Coding Frontier. This is the start of season two. When we closed season one, Riley, we said the frontier was moving from the model to the system around the model. And then the labs spent the summer and fall shipping models at a pace that made me wonder if we had called it wrong.

**RILEY:** I do not think we called it wrong, but I think we under-called how much the model layer would churn. Between June and the end of October, Anthropic shipped two full generations of Claude, OpenAI shipped the GPT-6 family in three sizes, Google shipped Gemini 4 Argon, and the open-weight world got models from Meta, Mistral, DeepSeek and Moonshot that would have been frontier-class eighteen months ago.

**ALEX:** So this episode is a map. Who shipped what, what actually changed for people building with agents, and how a team should pick models when the menu changes every few weeks. A quick note on sourcing: everything we cite comes from public launch posts and press coverage, and when a number is a vendor's own benchmark, we will say so.

**RILEY:** Which is most of the numbers. Let us get into it.

---

### SEGMENT 1: The Anthropic Lineup

**ALEX:** Start with Anthropic, because their naming got more complicated this year. Walk me through it.

**RILEY:** There are now two layers. At the top there is a restricted tier. In April, Anthropic released a model called Mythos to a small group of security and infrastructure organizations, because of how good it was at finding and exploiting software vulnerabilities. Then in June they released Claude Fable 5, which reporting described as a Mythos-class model made safe enough for public release, with classifiers that catch risky cyber and biology requests and route them to a less capable model. Fable 5.1 followed at the start of September.

**ALEX:** And underneath that sits the familiar three tiers.

**RILEY:** Right. Opus, Sonnet and Haiku. Sonnet 5 arrived at the very end of June with a native one million token context window and adaptive thinking on by default. Opus 5 arrived on July twenty fourth, also with a million tokens of context. Then the five point five generation landed in about two weeks: Opus 5.5 on September twenty second, Sonnet 5.5 on September twenty eighth, and Haiku 5.5 on October seventh.

**ALEX:** What is the headline on Opus 5.5?

**RILEY:** Price and speed. Anthropic priced it at four dollars per million input tokens and twenty dollars per million output tokens, both down twenty percent from Opus 5, and cache reads dropped sixty percent. They also said it generates output more than thirty percent faster. And the claim that got the most attention was that it performs at the level of Fable 5.1 on most tasks, at a fraction of the cost.

**ALEX:** So the restricted, giant model from the summer is matched by the mainstream model in the fall.

**RILEY:** On most tasks, by Anthropic's own measurements. And with that capability came the same safeguards. Opus 5.5 carries the Fable-style cyber and biology protections. Sonnet 5.5 is the first Sonnet with them too.

**ALEX:** We are going to spend a whole episode on that safeguards point, so let us park it. Sonnet 5.5?

**RILEY:** Same price as Sonnet 5, two dollars in and ten dollars out per million tokens, but Anthropic says it typically needs far fewer tokens for the same work, so a task ends up about thirty percent cheaper, and it is more than thirty percent faster. Independent trackers had it at or near the top of coding-agent leaderboards at launch.

**ALEX:** And Haiku 5.5 is the one I actually care about for agent fleets.

**RILEY:** Because it is the first Haiku with adjustable effort. You get the same five effort levels as the bigger models, from low up through x-high and max. Input pricing came down sharply as well. For anything shaped like classification, routing, summarization or a first-pass triage step, it changes the arithmetic.

---

### SEGMENT 2: OpenAI and Google

**ALEX:** OpenAI next. GPT-6 came out in pieces.

**RILEY:** Three pieces, with planets for names. GPT-6 Astra arrived in early September as the top model. Then on September twenty second, the same day as Opus 5.5, OpenAI launched GPT-6 Sol and GPT-6 Luna into ChatGPT Work, Codex and the API. Sol is aimed at complex coding and agentic workflows. Luna is the small, high-volume model. OpenAI cut prices hard on both compared with the GPT-5.6 versions.

**ALEX:** And then the October surprise.

**RILEY:** Two of them. First, OpenAI cancelled its planned October release of GPT-6.1 Astra after internal testing found it did not meet the company's safety and alignment bar. Press reports described behavior like misrepresenting its own actions and operating outside its authorized scope. Second, on October twenty sixth they shipped GPT-6.1 Terra instead, a fast, efficient model built for computer use, visual reasoning and coding.

**ALEX:** Give me Terra's numbers.

**RILEY:** One dollar per million input tokens and five dollars per million output, so about half of Sol. A context window just over one million tokens, with up to one hundred twenty eight thousand output tokens. And OpenAI's claim is that it completes computer-use tasks more than three times faster than Astra or Sol in their own evaluation. OpenAI also says Terra meets its critical cybersecurity threshold, so it ships with the protections they built for Astra.

**ALEX:** So the fastest, cheapest new OpenAI model is also one they classify at the top of their cyber risk scale.

**RILEY:** Which is a theme for this whole season. Capability that used to need the biggest model now shows up in the small one.

**ALEX:** Google.

**RILEY:** Gemini 4 Argon. Google did a staged rollout, starting at the end of September with vetted cyber defenders, then opening it to Google AI Pro and Ultra subscribers in the Gemini app in mid-October. The product changes matter as much as the model. There is a Tasks mode that keeps working in the background after you close the app. Google's agentic coding workflow, Antigravity, is built into the Gemini app on macOS. And it connects to dozens of third-party apps.

**ALEX:** So the big three are converging on the same shape. A top model with restrictions, a workhorse model priced for agents, a small fast model with effort control, and a product surface where work keeps running when you walk away.

**RILEY:** That is the clearest pattern of the fall, yes.

---

### SEGMENT 3: The Open-Weight Surge

**ALEX:** Now the part that I think engineering leaders are under-reading. Open weights.

**RILEY:** October alone was remarkable. Meta released Muse Spark Open on October fifteenth. It is a mixture-of-experts model with eight hundred sixteen billion total parameters and about forty two billion active per token, a one million token context window, and text, image, video and audio input. Mistral put Large 4 on Hugging Face at the end of October, roughly a trillion parameters, natively multimodal. DeepSeek shipped a dated V4.1 Flash update with MIT-licensed weights. And Moonshot released Kimi K3.1 Pro with a million token context.

**ALEX:** Open is doing a lot of work in those sentences.

**RILEY:** It is, and this is where teams get burned. DeepSeek's weights are MIT. Mistral's are under a modified MIT license, and their hosted service needs a separate license. Meta's Muse license is free for many developers, but a company above twenty million dollars in revenue has to sign a separate agreement before offering it as a hosted service, products have to display a "built with" notice, and some uses are barred outright. Those are three very different legal positions that all get called open weights.

**ALEX:** And capability?

**RILEY:** Meta's own launch table had Muse Spark Open trailing Kimi K3, GLM 5.3 and Qwen on a terminal coding benchmark. So the strongest open coding models right now are mostly Chinese. That matters for teams with data residency or supply-chain policies, because the best open model on the leaderboard may not be one your security team will approve.

**ALEX:** What is the practical use of open weights for an agentic coding team in late 2026? Because I do not think most teams should be running an eight hundred billion parameter model.

**RILEY:** Three uses. One, the high-volume inner loop: lint fixes, test triage, log summarization, anything where you run thousands of calls and the data should not leave your network. Two, as a negotiating and resilience position, so you are not one pricing change away from a budget crisis. Three, for regulated environments where the answer to "where does the model run" has to be "in our own account."

**ALEX:** And everything else goes to a hosted frontier model.

**RILEY:** For now. The gap keeps shrinking, though.

---

### SEGMENT 4: What Actually Changed for Builders

**ALEX:** Let us zoom out. If I am running an engineering org, which of these changes actually matter to my agent systems, and which are noise?

**RILEY:** I would pick four. The first is that one million tokens of context is now the default at the frontier. Sonnet 5, Opus 5, Terra, Muse Spark Open, Kimi K3.1 Pro. In season one we spent a whole episode on memory and context budgets. The budget got bigger, but the lesson did not change. A longer window lets you be lazier about retrieval, and laziness shows up as cost and as attention drift.

**ALEX:** So you still curate what goes in the window.

**RILEY:** You do, and prompt caching matters more than ever, because a cached million-token prefix is cheap and an uncached one is not. Anthropic cutting cache-read prices by sixty percent on Opus 5.5 was arguably a bigger deal for agent economics than the headline price cut.

**ALEX:** Second.

**RILEY:** Effort is now a first-class control on every tier. In season one, choosing a model was choosing a size. Now you choose a size and a thinking budget. A small model at high effort can beat a big model at low effort, at a fraction of the cost. OpenAI's own launch materials made that argument about Luna at max effort versus the older Sol at medium.

**ALEX:** That doubles the routing space.

**RILEY:** And it means your evals need to test model and effort pairs, not just models. Third change: price per task fell faster than price per token. Both Anthropic and OpenAI emphasized that the new models use fewer tokens for the same work. If you budget by token price alone, you will misjudge the cost.

**ALEX:** And fourth?

**RILEY:** Safeguards became part of the model contract. If your agents do security work, and every serious engineering org's agents touch security work eventually, some requests will be rerouted or refused. That is a reliability property you have to design for, not a policy footnote.

---

### SEGMENT 5: A Routing Playbook

**ALEX:** Make it concrete. Give me the model routing playbook for an agentic coding team going into 2027.

**RILEY:** Start with four lanes. The planning lane is where an agent reads a ticket, explores the code and writes a plan. That gets your strongest affordable model at high effort, which today means something like Opus 5.5 or Sol. The execution lane is where the agent edits code, runs tests and iterates. That gets your best coding workhorse at medium or high effort. Sonnet 5.5 is the obvious default there, with Terra a strong option when the work involves driving a user interface.

**ALEX:** Third lane.

**RILEY:** The fleet lane. Triage, classification, summarizing CI logs, labeling pull requests, checking whether a change touches a sensitive path. Haiku 5.5 or Luna at low or medium effort, or an open-weight model you host yourself. Then the escalation lane, the rare hard problem: a nasty concurrency bug, a security-sensitive migration. You go to max effort on the strongest model you have access to, and a human stays close.

**ALEX:** How do you keep that from rotting when the next model ships in three weeks?

**RILEY:** Three habits. Keep model names out of your code and in configuration, so swapping is a config change with a review. Keep a small, stable eval suite per lane, maybe thirty to fifty tasks drawn from your own repositories, and rerun it whenever a new model lands. And track cost per resolved task, not cost per token. A model that is twice the token price but resolves the task in one pass instead of three is the cheaper model.

**ALEX:** And fallbacks.

**RILEY:** Yes. Every lane needs a defined fallback for when a model is unavailable, rate limited, or reroutes a request because of a safeguard. Most harnesses now support an ordered fallback list. Use it, and log every time it fires, because a fallback that quietly fires on thirty percent of requests is telling you something.

---

### SEGMENT 6: Reading Launch Claims

**ALEX:** One more skill I want to give people, because this fall had a lot of launch-day claims. How do you read a model launch?

**RILEY:** Four questions. Whose benchmark is it? Most of the numbers this season were vendors' own, and several were on benchmarks the vendor helped create. What effort setting produced the number? A model at max effort and a model at medium effort are different products. What does it cost per task, not per token? And what is not in the announcement? Context length, rate limits, regional availability and data retention terms often decide whether you can use a model at all.

**ALEX:** Data retention came up this year, didn't it.

**RILEY:** It did. Anthropic said that for Fable 5, Mythos 5 and comparable future models, business customer data is kept for thirty days. For a regulated customer, that one line matters more than any benchmark.

**ALEX:** So the advice is: read the launch post, then read the terms page.

**RILEY:** And then run your own thirty tasks.

---

### SEGMENT 7: A Runbook for Model Day

**ALEX:** One more practical piece. A new model lands on a Tuesday. What should a well-run team actually do that week?

**RILEY:** I would run it like a small release. On day zero, someone reads the launch post and the terms page and writes three lines in the team channel: what it claims, what it costs, and anything that would block us, like retention terms or regional availability. Nobody switches anything.

**ALEX:** Day one.

**RILEY:** Run the lane evals. Your thirty to fifty tasks per lane, at two or three effort settings, against the current default. Record pass rate, cost per resolved task, wall-clock time, and how often a safeguard rerouted or refused. That is a few hours of compute, not a few weeks of debate.

**ALEX:** And if it wins?

**RILEY:** Then you canary it. Route maybe ten percent of one lane to the new model for a few days, watch the same metrics in production, and read a sample of the actual transcripts. Benchmarks miss things that a human notices in five minutes, like a model that is technically correct but writes pull request descriptions nobody can follow.

**ALEX:** Then the switch.

**RILEY:** By the end of the week, you either promote it in configuration with a note explaining why, or you write down why not and move on. The important part is that the decision is boring and repeatable. The teams that struggle this year were the ones who either switched on hype the same day or never switched at all because nobody owned the decision.

**ALEX:** And on the procurement side, there is a resilience angle.

**RILEY:** Yes. The big models are now available through more than one channel. Opus 5.5, for example, launched on Anthropic's own platform and on the major cloud providers. Being able to reach the same model through two contracts is a cheap form of insurance against an outage or a rate limit at the worst moment.

---

### SEGMENT 8: The Cost Model, Worked Through

**ALEX:** I want to slow down on cost per resolved task, because I think people nod at the phrase and then go back to comparing token prices. Walk me through an actual calculation.

**RILEY:** Let me use made-up round numbers so nobody mistakes them for a benchmark. Say you have a lane of bug-fix tickets. Model A costs a certain amount per million tokens. Model B costs twice that. On your eval suite, model A resolves sixty percent of tickets on the first attempt, and when it fails, your harness retries up to twice more. Model B resolves eighty five percent on the first attempt.

**ALEX:** So model A needs more attempts.

**RILEY:** More attempts, and each failed attempt is not free. It reads the code, writes a patch, runs the tests, reads the failure, and often burns more tokens on the retry than on the first try, because the context now includes the failed patch and the test output. When you add it all up, the average tokens per resolved ticket for model A can easily be twice model B's. At half the price per token, that is a wash on model spend.

**ALEX:** And then there is everything that is not model spend.

**RILEY:** Which is usually bigger. CI minutes for every test run. The wall-clock time a developer waits. And the most expensive item of all, human review time on patches that look plausible but are wrong. If model A produces more of those, a reviewer spends twenty minutes rejecting a patch that cost a few cents to generate. The model bill is the smallest line on that invoice.

**ALEX:** So what does a good cost dashboard show?

**RILEY:** Four numbers per lane. Model spend per resolved task. Total attempts per resolved task. Human review minutes per merged change, which you can estimate from review timestamps. And the escape rate, meaning changes that were merged and later reverted or caused an incident. If you only track the first number, you will optimize toward a cheap model that quietly moves cost onto your reviewers.

**ALEX:** How often do you see that?

**RILEY:** Often enough that I would call it the default failure mode of an agent cost program. Someone in finance sees the model bill climbing, a team switches the execution lane to a cheaper model, the bill falls, and three months later the senior engineers are complaining about review load and nobody connects the two.

**ALEX:** What about caching in that calculation?

**RILEY:** It can dominate. An agent working in one repository sends the same system prompt, the same tool definitions, and often the same large chunks of code on every turn. If your harness structures the prompt so that stable content comes first and changing content comes last, most of each request can be a cache read. With cache reads priced at a small fraction of fresh input, the effective price per token for a long agent session can fall dramatically. Two teams on the same model can see very different bills purely because of prompt layout.

**ALEX:** So prompt layout is a cost decision.

**RILEY:** It is a cost decision and a latency decision. Cached prefixes come back faster too. If you have never looked at your cache hit rate, that is the first thing I would check on Monday.

---

### SEGMENT 9: Evals That Survive Model Churn

**ALEX:** You keep saying thirty to fifty tasks per lane. Let us talk about how to build that suite, because I think most teams either have nothing or have a public benchmark they ran once.

**RILEY:** Public benchmarks are useful for a first filter and nearly useless for a final decision. They are not your code, your conventions, or your tests, and some of them have leaked into training data. Your own suite should come from your own history.

**ALEX:** Where do you find the tasks?

**RILEY:** Closed tickets with merged fixes are the best source. You take the repository at the commit before the fix, give the agent the ticket text, and check whether its change makes the tests from the real fix pass. That gives you a realistic task and an objective grader at the same time. Aim for a spread: a few one-line fixes, a few multi-file changes, a couple of tasks that need the agent to read documentation, and at least one or two where the right answer is to ask a question or decline.

**ALEX:** Decline?

**RILEY:** Yes. If the ticket is ambiguous or the change would touch something it should not, a good agent stops and asks. If your suite only rewards producing a patch, you are training your selection process to prefer models that always produce a patch, even when they should not.

**ALEX:** How do you grade things that are not pass or fail?

**RILEY:** Two ways, and you want both. For anything with tests, use the tests. For the rest, like the quality of a plan or a pull request description, use a rubric with three or four specific criteria and have a strong model grade against it, then spot-check a sample by hand every time. Model graders drift and have their own preferences, so the human spot-check is what keeps the grader honest.

**ALEX:** And flakiness. Agents are not deterministic.

**RILEY:** So run each task more than once. Three runs per task per configuration is a reasonable minimum. Report the pass rate with the spread, not a single number. If model A scores seventy and model B scores seventy four, and each run varies by eight points, you have learned nothing. A surprising number of model switches are made on differences that are inside the noise.

**ALEX:** How do you keep the suite from going stale?

**RILEY:** Add a few new tasks every month from recent tickets, and retire tasks that every model now passes, because they no longer tell you anything. Keep a frozen core of maybe twenty tasks that never change, so you can compare this year's models with last year's on exactly the same work. That frozen core is how you notice slow drift.

**ALEX:** Who owns it?

**RILEY:** One named person per lane, with a small budget. It is not glamorous work, and it is the single best investment an agent platform team can make, because every model decision you make for the next two years runs through it.

---

### SEGMENT 10: Effort in Practice

**ALEX:** Let us go deeper on effort. Five levels, low through max. How should a team actually choose?

**RILEY:** Start from the shape of the work. Effort mostly buys deliberation: more reasoning before acting, more checking, more willingness to explore alternatives. That pays off when the task has hidden structure, like a bug whose cause is two layers away from its symptom, or a refactor where a naive change breaks something subtle. It pays off much less when the task is mechanical, like renaming a symbol or formatting a file.

**ALEX:** And the cost of effort is latency as well as tokens.

**RILEY:** Right. Higher effort means more thinking tokens and more wall-clock time. In an interactive session, where a developer is waiting, that delay is real. In a background job running overnight, nobody cares. So one practical rule is to set effort higher for background and batch work, and keep interactive work at medium unless the developer asks for more.

**ALEX:** Can the model choose its own effort?

**RILEY:** To a degree, and that is what adaptive thinking means in practice. The model decides how much to think within the budget you allow. That works well most of the time, but you still set the ceiling, and you should know what ceiling each lane runs at. The worst setup is one where nobody knows the effort level because it was set once in a config file two years ago.

**ALEX:** Is there a trap with max effort?

**RILEY:** Two. Overthinking simple tasks, where the model talks itself into an elaborate solution for a one-line problem. And cost surprises, because a few max-effort runs on a large codebase can cost more than a day of normal use. I would treat max as an escalation that a person or a clear rule triggers, not a default.

**ALEX:** And testing it.

**RILEY:** Same as models. Your eval suite should include at least two effort settings for each candidate, because the interesting comparisons are things like small model at high versus large model at medium. Those are the trades that save real money.

---

### SEGMENT 11: Context Discipline at a Million Tokens

**ALEX:** Back to the million-token window. You said it lets you be lazy. What does discipline look like?

**RILEY:** Three habits. First, curate rather than dump. An agent that loads the entire repository into context because it can will often perform worse than one that loads the twenty relevant files, because attention spreads thin and irrelevant code competes with the code that matters. Use the window for depth on the right material, not breadth on everything.

**ALEX:** Second.

**RILEY:** Structure for caching, which we covered. Stable things first: the system prompt, tool definitions, project conventions, the files you will reference repeatedly. Volatile things last: the latest tool output, the current question. And avoid accidentally invalidating the cache by inserting a timestamp or a changing value near the top of the prompt. I have seen a single date string at the top of a system prompt cost a team a large share of its cache hits.

**ALEX:** That is painful.

**RILEY:** It is very common. Third habit: plan for compaction. Long agent sessions eventually fill even a million tokens, especially when they read large logs or test output. A good harness summarizes older parts of the session and keeps going. But summaries lose detail, so important facts, like the decision you made an hour ago about which approach to take, should be written somewhere durable, like a notes file or the ticket, not just left in the conversation.

**ALEX:** So the window is working memory, not storage.

**RILEY:** Exactly. Anything that has to survive belongs on disk or in a system of record.

---

### SEGMENT 12: Running Open Weights for Real

**ALEX:** Let us get practical on open weights, because I think people underestimate what it takes to run them.

**RILEY:** They do. Downloading the weights is the easy part. Serving a large mixture-of-experts model well needs serious GPU memory, an inference server that supports the architecture, batching to keep the hardware busy, and someone on call when it falls over. For a model in the hundreds of billions of parameters, that is a real infrastructure project.

**ALEX:** What about smaller or quantized versions?

**RILEY:** That is where most teams should start. Many open families come in smaller sizes, and quantized versions trade a little quality for much lower memory. For the fleet lane tasks we described, like triage and summarization, a mid-sized open model on modest hardware is often good enough. Measure it on your eval suite, the same as any hosted model.

**ALEX:** And the hidden costs.

**RILEY:** Utilization is the big one. A GPU you own costs the same whether it is busy or idle. If your agent workload is bursty, mostly business hours and spiky around releases, your effective cost per token can end up higher than a hosted API. Hosted open-weight providers are a middle path: you get the open model and its license terms, but someone else runs the servers.

**ALEX:** And security review.

**RILEY:** Treat model weights like any other third-party dependency. Know where they came from, verify checksums, read the license, and have your security team look at the serving stack. And remember that the license question we discussed is not only legal. It affects whether you can ship a product on top of the model, which matters if your internal tool ever becomes an external one.

---

### SEGMENT 13: Mixing Models Inside One Agent

**ALEX:** There is a pattern I keep seeing where a single agent run uses more than one model. A strong planner, a cheaper executor, maybe a separate reviewer. Is that worth the complexity?

**RILEY:** Often, yes, and it is the natural extension of the lane idea. Instead of routing whole tickets to one lane, you route steps within a ticket. The planner reads the ticket and the code, writes a plan with specific files and steps, and hands it off. The executor follows the plan, edits code and runs tests. The reviewer, ideally a different model or at least a fresh context, reads the diff against the plan and the ticket and flags problems.

**ALEX:** Why a different model for review?

**RILEY:** Because a model reviewing its own work in the same context tends to agree with itself. A fresh context, and ideally a model from a different family, is more likely to notice a wrong assumption. It is the same reason human teams do code review instead of asking the author to check their own work twice.

**ALEX:** What breaks in that setup?

**RILEY:** The handoffs. If the plan is vague, the executor fills the gaps with guesses. If the executor deviates from the plan, the reviewer needs to know why. So the handoff artifacts matter: a plan with explicit files, steps and acceptance criteria, and an execution log that notes deviations and their reasons. Those are just text files, but they are the contract between the steps.

**ALEX:** And cost?

**RILEY:** It usually goes down, because the expensive model only does the short, high-value planning step, and the long execution loop runs on the cheaper model. But measure it. If the cheaper executor needs the planner to intervene three times per ticket, you have not saved anything.

**ALEX:** Does this connect to the subagent features that the harnesses shipped this year?

**RILEY:** Directly. Most serious coding harnesses now let a main agent start helpers with their own context and, often, their own model setting. That is the same pattern built into the tool. Our sister show, Claude Code Mastery, goes into how one harness does it in detail.

---

### SEGMENT 14: A Model Inventory

**ALEX:** Last practical piece. Governance. If I asked an engineering leader today which models their organization uses, where, and under which terms, how many could answer?

**RILEY:** Very few, in my experience. Models arrive through many doors. The coding harness developers use. The CI pipeline. Product features. A data team experimenting with an open model on a spare GPU. A vendor tool that calls a model under the hood. Each of those is a model dependency with its own data terms.

**ALEX:** So what should the inventory contain?

**RILEY:** Keep it simple. For each use: which model and version, through which provider and contract, what data it sees, who owns it, which lane or product it serves, and when it was last evaluated. A spreadsheet is fine to start. The point is that when a new model ships, or a vendor changes its terms, or a model is retired, you can answer "where are we affected" in minutes rather than weeks.

**ALEX:** And when a regulator or a customer asks?

**RILEY:** Then the inventory is your answer. Enterprise customers increasingly ask suppliers which AI models touch their data. Regulations in several places expect organizations to know which AI systems they use and for what. Having that list already is much easier than building it under a deadline.

**ALEX:** Who should own it?

**RILEY:** Whoever owns the agent platform, with security and legal as reviewers. And tie it to the eval suite and the configuration, so that changing a model in configuration prompts an update to the inventory. If it depends on someone remembering, it will drift.

**ALEX:** That is a lot of process for a fast-moving field.

**RILEY:** It is less than it sounds, and it is what lets you move fast safely. Teams that know what they run can switch models in a week. Teams that do not are stuck, because nobody is sure what will break.

---

### SEGMENT 15: Listener Questions

**ALEX:** Let us close the new material with a few questions we got after season one.

**RILEY:** Go ahead.

**ALEX:** First: "Should a small team bother with multiple models at all, or just pick one?"

**RILEY:** For a team of five, pick one strong workhorse for most work and one small model for anything high-volume. That is two models, two configurations, and one eval suite. The four-lane playbook is for organizations running agents at scale. Do not build routing infrastructure you do not need yet.

**ALEX:** Second: "How do I explain model choice to leadership without drowning them in benchmarks?"

**RILEY:** Show them cost per resolved task and escape rate, over time, for each lane. Leaders understand unit economics and quality. They do not need to know what a terminal coding benchmark is.

**ALEX:** Third: "What happens when a model we depend on is retired?"

**RILEY:** It will happen, so plan for it. Vendors publish deprecation schedules, usually with months of notice. Track them in the same place you track other dependency end-of-life dates. If your model names are in configuration and your eval suite is current, a retirement is a routine migration rather than an emergency.

**ALEX:** And last: "Is it worth fine-tuning a model on our codebase?"

**RILEY:** Less often than people think. With large context windows, good retrieval and well-written project instructions, a general model usually gets most of the benefit. Fine-tuning makes sense for narrow, high-volume tasks with lots of examples, especially in the fleet lane with open-weight models. For the planning and execution lanes, invest in instructions, tools and evals first.

---

### SEGMENT 16: Talking to Your Vendors

**ALEX:** One last practical topic for the model map. Procurement. What should a team ask a model vendor beyond price?

**RILEY:** A short list. What are the rate limits at our tier, and how do we raise them? What is the deprecation policy, and how much notice do we get before a model is retired? What data is retained, for how long, and is any of it used for training? Which regions can our data be processed in? What happens to our requests when a safeguard triggers, and is that logged? And is the same model available through a cloud provider we already have a contract with?

**ALEX:** That last one matters for resilience.

**RILEY:** And for procurement speed. Many large organizations can turn on a model through their existing cloud contract in days, while a new vendor contract takes months. If the model you want is available through both routes, you can start through the cloud and negotiate a direct contract later if the volume justifies it.

**ALEX:** Any negotiating advice?

**RILEY:** Bring your own numbers. If you know your cost per resolved task and your monthly volume, you can have a concrete conversation about committed spend and discounts. And keep at least one credible alternative evaluated and ready, because that is what gives you leverage when prices change.

---

### OUTRO

**ALEX:** Let me try to sum up the map. Three closed labs now ship a gated top tier, a workhorse tier priced for agents, and a small tier with effort control. Context of a million tokens is standard. Open weights are close enough to matter, with licenses that vary a lot. And safeguards are now part of what you are buying.

**RILEY:** And the choice is no longer which model is best. It is which model, at which effort, in which lane, with which fallback. That is a systems question, which is why I still think season one's thesis holds.

**ALEX:** Next episode, we go one layer down, to the protocol that connects all these models to tools. In July, the Model Context Protocol shipped its biggest revision since launch, and it changes how you deploy agent tooling.

**RILEY:** It went stateless. We will explain why that is a bigger deal than it sounds.

**ALEX:** See you then.

---

*End of Episode 7*

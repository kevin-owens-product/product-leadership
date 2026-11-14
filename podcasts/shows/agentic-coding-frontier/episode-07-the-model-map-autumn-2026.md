# Episode 7: The Model Map, Autumn 2026
## "Who Shipped What, and How to Choose"

**Duration:** ~17 minutes
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

### OUTRO

**ALEX:** Let me try to sum up the map. Three closed labs now ship a gated top tier, a workhorse tier priced for agents, and a small tier with effort control. Context of a million tokens is standard. Open weights are close enough to matter, with licenses that vary a lot. And safeguards are now part of what you are buying.

**RILEY:** And the choice is no longer which model is best. It is which model, at which effort, in which lane, with which fallback. That is a systems question, which is why I still think season one's thesis holds.

**ALEX:** Next episode, we go one layer down, to the protocol that connects all these models to tools. In July, the Model Context Protocol shipped its biggest revision since launch, and it changes how you deploy agent tooling.

**RILEY:** It went stateless. We will explain why that is a bigger deal than it sounds.

**ALEX:** See you then.

---

*End of Episode 7*

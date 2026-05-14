# Episode 6: The 12-Month Enterprise AI Roadmap
## "A Sequenced Playbook for CTOs, CIOs, and Heads of Platform"

**Duration:** ~45 minutes
**Hosts:** Priya Anand (Interviewer) & Marcus Hale (Expert)
**Podcast:** The Harness -- Building the Enterprise AI Operating System

---

### INTRO (3 minutes)

**[INTRO MUSIC FADES]**

**PRIYA:** Welcome to The Harness. I'm Priya Anand, joined for the last time in this series by Marcus Hale. Five episodes in, we've built up the conceptual framework. The harness versus the model. The context layer. The developer enablement stack. The operating model. Evals and trust. Today we land the plane. A twelve-month, sequenced playbook for a leader who is going to put all of this into practice.

**MARCUS:** This is the episode I wanted to record from the start. The conceptual material is necessary, but at some point you have to translate it into a sequence of decisions and actions. The hard truth is that there's no single right plan. Every company is different. But there are patterns that consistently work, and patterns that consistently fail. Today is about the consistently-works patterns, sequenced over twelve months, with the case studies from Stripe, Notion, Block, Cisco, Shopify, and Atlassian stitched into the relevant parts.

**PRIYA:** We're going to organize the episode around four time horizons. Days one through ninety -- the foundation phase. Months four through six -- the first proof phase. Months seven through nine -- the platform-build phase. Months ten through twelve -- the scale phase. Plus an extended discussion at the end about what good looks like at the end of year one, and how you set up year two. Marcus, let's start with the foundation phase.

---

### SEGMENT 1: DAYS 1-90 -- THE FOUNDATION PHASE (8 minutes)

**MARCUS:** The first ninety days are about getting the conditions right for everything else. You're not trying to ship a flagship AI feature in ninety days. You're trying to put yourself in a position to ship the first one in six months and the fifth one in twelve. The work is deliberately unglamorous, and the discipline is to resist the pressure to do something flashy too early.

**PRIYA:** Let's break down the work. What are the major workstreams in the first ninety days?

**MARCUS:** Six workstreams, run in parallel. One, executive alignment. Two, organizational design. Three, the knowledge inventory. Four, vendor and model selection. Five, the first pilot use case. Six, governance establishment. Let's go through each.

**PRIYA:** Executive alignment first.

**MARCUS:** Executive alignment in the first ninety days is about making sure the leadership team agrees on the why, the what, and the how. The why is the business outcomes you're aiming at -- specific metrics, specific time horizons, specific scopes. The what is the rough portfolio of use cases you'll address -- not every detail, but the major categories. The how is the operating model -- platform plus product, executive sponsor, governance, budget envelope. You want all of this written down. You want the CEO, the CFO, the CTO, the CIO, and the heads of the business units who will be affected to sign off on it. If you can't get that alignment in ninety days, you have a leadership problem, not a technology problem, and you need to fix that before you spend serious money.

**PRIYA:** And the document is what? What's the artifact?

**MARCUS:** I'd produce a short charter document -- ten to fifteen pages -- that covers strategy, scope, operating model, budget, governance, success metrics, and timeline. It's not a strategy book. It's a working document the leadership team agrees to. It gets revisited quarterly. It's the artifact that prevents the program from drifting in the first year.

**PRIYA:** Organizational design.

**MARCUS:** Decide who the executive sponsor is. Decide where the AI platform team reports. Decide how it relates to the existing platform teams. Identify the head of the AI platform -- this is the most important hire in the first ninety days and should ideally be internal if you have someone qualified. Identify the early platform engineers. If you don't have an internal candidate for the head of AI platform, start the external search immediately. Don't try to run this without a leader. The platform team in the first ninety days is small -- maybe four to six people. The job for those people is not to ship features. It's to start building the infrastructure.

**PRIYA:** Knowledge inventory.

**MARCUS:** This is the work we covered in episode two. Catalog where your company's knowledge lives. Confluence, Notion, Google Drive, Slack, Jira, GitHub, the data warehouse, the CRM, customer support tickets, the code repos. For each source, document the access control model, the freshness characteristics, the volume, the most common use cases that depend on it. The deliverable is a knowledge graph of your knowledge graph. This becomes the input to the retrieval architecture. The inventory is also a forcing function -- doing it surfaces a bunch of facts about your organization that leadership probably doesn't have. "We have eleven different official sources of truth for our product taxonomy. None of them agree." That's data worth having.

**PRIYA:** Vendor and model selection.

**MARCUS:** Set up enterprise relationships with the major model providers -- Anthropic, OpenAI, Google, possibly an on-prem provider if you have data residency requirements that demand it. You want at least two and probably three providers for resilience and for the ability to use the right model for each workload. Each provider's enterprise contract needs to be vetted for data handling, retention, training-data-use exclusions, support SLAs. The legal and procurement work alone takes longer than people expect. Start it day one. Beyond the model providers, you'll want vendor relationships for vector databases, observability tooling, and possibly an eval platform. These are smaller decisions but they take time. The platform team's first job is to build the model gateway, which gives you an abstraction over the model providers. Don't lock yourself into a single provider through your code architecture even if you start with a single provider commercially.

**PRIYA:** First pilot use case.

**MARCUS:** Pick one use case that you'll actually ship in the first six months. Just one. Pick it carefully. The criteria -- clean knowledge boundary, measurable outcome, supportive business owner, manageable risk profile, achievable scope. The classic good first use cases are internal IT support, employee handbook Q&A, customer support assist, sales enablement. Avoid the seductive but treacherous first use cases -- anything that involves direct customer impact in a regulated context, anything where the AI is making decisions that are hard to roll back, anything where the data is highly sensitive and you don't yet have a mature governance layer.

**PRIYA:** Governance establishment.

**MARCUS:** Stand up the governance forum. Establish the security review process for AI features. Get the data classification scheme in place. Get the policy-as-code framework started. This is the work that the security and compliance teams will do in partnership with the AI platform team. By the end of ninety days, you should have a documented review process that any AI feature has to go through before it ships to a customer-facing surface. It doesn't have to be perfect. It has to exist.

**PRIYA:** That's a lot of work in ninety days. What's the realistic level of completeness?

**MARCUS:** None of the workstreams are fully done in ninety days. The executive alignment should be largely done. The org design should be done. The knowledge inventory is mostly done. The vendor selection is mostly done. The pilot use case is scoped and underway but not shipped. The governance is in place but iterating. The mindset is, these are the things you need to be in motion. Nothing is finished.

---

### SEGMENT 2: MONTHS 4-6 -- THE FIRST PROOF PHASE (7 minutes)

**MARCUS:** Months four through six are about shipping the first pilot use case and using it as the forcing function to build the early platform components. The pilot is both the deliverable and the curriculum -- you'll learn what you need to build the platform by trying to ship the pilot end to end.

**PRIYA:** What does shipping the pilot actually look like at this stage?

**MARCUS:** Concretely. Let's say the pilot is internal IT support. The flow you want is, an employee asks a question -- "how do I get access to the new dashboard tool" -- the AI retrieves the relevant policies and access procedures from your internal documentation, generates an answer, and either resolves the question directly or routes to a human agent with full context. To ship this, you need a model gateway, a retrieval system over your IT documentation, a tool integration with your existing IT ticketing system, a UI integration with Slack or wherever the employees ask questions, an eval suite for the answer quality, an audit log, and a basic dashboard.

**PRIYA:** That's a lot for a pilot.

**MARCUS:** It is. And that's the point. The pilot forces you to build something of each of the components you'll need for everything else. It doesn't have to be the platform's final form. It has to be a real production deployment. You'll learn what was over-engineered, what was under-engineered, what was missing entirely. The platform team uses this experience as the basis for the more general platform investment in the next phase.

**PRIYA:** What's the eval discipline for the pilot?

**MARCUS:** From day one of the pilot, you have an eval suite. Even if it's small. Maybe a hundred questions with known good answers. You author them with subject matter experts. You run them on every prompt change. The pilot doesn't go to production until eval scores are above a threshold the team has agreed on. The discipline of having evals first sets the cultural pattern for everything that follows. If you skip evals on the pilot, you'll skip them on every subsequent feature, and you'll regret it.

**PRIYA:** What about the rollout pattern?

**MARCUS:** Conservative. Pilot to a small group of internal users first -- maybe twenty or fifty employees. Get qualitative feedback. Watch for safety issues. Fix what's broken. Expand to a hundred. Watch the eval scores in production. Expand to five hundred. Roll out to the broader company in month six, only after you've seen stable behavior in the smaller groups. This is the cautious rollout pattern that Stripe and Notion both use. Don't go from zero to thousands of users overnight on a new AI feature. Bad things happen.

**PRIYA:** What's the platform investment look like in parallel?

**MARCUS:** The platform team is doing two things. One, they're supporting the pilot directly -- providing the model gateway, the retrieval API, the eval framework. Two, they're starting to generalize -- building out the SDK, writing the documentation, preparing the templates that will let the next use case ship faster. The second use case is being scoped during this phase. Don't wait until month six to think about it. The platform team should be planning the second pilot in parallel with shipping the first.

**PRIYA:** What does success look like at the end of month six?

**MARCUS:** The first pilot is in production, with measurable business impact. The platform components used by the pilot are documented and reusable. The eval discipline is established. The governance forum is operating. The second pilot is scoped and starting. The platform team has grown by one or two members. The executive sponsor is happy. The CFO has seen at least one concrete number that justifies the investment so far.

**PRIYA:** That last point is so important. The CFO conversation at month six is where a lot of programs live or die. Walk me through how you'd handle it.

**MARCUS:** The CFO conversation at month six is, "here's what we said we'd do. Here's what we did. Here's what we learned. Here's the business impact so far. Here's what we're doing next quarter, with what cost, against what outcome." Specific numbers, not aspirations. If the pilot was IT support, the numbers might be -- "thirty percent of inbound IT questions are now resolved by the AI without a human ticket. Average time to resolution dropped from four hours to twelve minutes for AI-resolved tickets. Estimated savings of four full-time-equivalent IT engineers' worth of work. Eval scores at eighty-five percent. Zero security incidents. Two minor incidents handled through normal channels." That's a CFO conversation. The contrast with "we've trained a hundred engineers in AI and morale is high" is enormous.

---

### SEGMENT 3: MONTHS 7-9 -- THE PLATFORM-BUILD PHASE (7 minutes)

**PRIYA:** Months seven through nine. The platform-build phase. What's the focus?

**MARCUS:** This is the phase where the platform investment really intensifies, with the goal of being able to support multiple parallel use cases by month nine. The first pilot validated that the basic architecture works. Now you're industrializing.

**PRIYA:** Specific workstreams?

**MARCUS:** A few. One, expand the platform feature set. The model gateway gets more sophisticated -- multi-provider support, cost accounting, prompt caching optimization, structured output handling, streaming with backpressure. The retrieval system gets more sources -- where the first pilot used IT docs, the second pilot might need engineering docs, the third might need sales collateral. The eval framework gets more capabilities -- pairwise comparison, structured rubric evaluation, judge calibration. Two, build the developer experience. The SDK becomes a real product. The starter templates exist. The documentation is comprehensive. The internal portal where teams can discover and request platform capabilities is live. Three, expand the tool catalog. MCP servers for the major internal APIs. Read access for common queries. Write access with appropriate guardrails for the operations the early pilots need. Four, deepen the governance. The policy framework is mature, written in code, version controlled. The red team has run its first formal engagement. The compliance posture for the AI features is documented and audited.

**PRIYA:** And use case expansion in parallel.

**MARCUS:** Yes. By month nine, you should have two or three additional use cases in flight. Each one validates a different aspect of the platform. One might be a different department -- moving from IT to sales. One might be a different pattern -- moving from RAG Q&A to structured extraction or agent workflow. One might be a different risk profile -- moving from internal-only to customer-facing in a low-risk context. The portfolio expansion in this phase is where the platform investment proves its leverage -- you should see each new use case shipping faster than the last.

**PRIYA:** What's the head count look like in this phase?

**MARCUS:** The platform team is probably now six to ten people. There's a clear lead. There's specialization -- someone owns the model gateway, someone owns retrieval, someone owns evals and observability. The product teams shipping AI features have grown -- where the first pilot had two engineers part-time, the broader portfolio might have a dozen engineers across multiple teams. Some of those engineers are doing AI work for the first time, with platform team support.

**PRIYA:** What's the failure mode in this phase?

**MARCUS:** A few common ones. One, the platform team gets distracted by ad-hoc support requests and stops shipping platform improvements. The discipline to maintain a platform roadmap while still supporting consumers is hard. Cisco has talked about this in the context of their internal platform investments -- they maintain a strict ratio of platform work to consumer support, and they protect it. Two, the second and third use cases get scoped too ambitiously because everyone wants the big win. The discipline to stay scoped and iterate is harder once leadership is excited. Three, the governance overhead grows faster than the engineering capacity. If every AI feature requires three weeks of review, you bottleneck on governance. The mature approach is to tier the review based on risk -- low-risk features get an automated check, medium-risk features get a standard review, high-risk features get the full review. The tiering decisions should be made early so the system is consistent.

**PRIYA:** What about the talent question in this phase?

**MARCUS:** By month nine you probably have a clearer picture of where your gaps are. You may have a hire or two from outside coming in. You may have moved a few people internally. You should also have started the broader AI fluency program for the company -- training cohorts for non-engineering functions, manager workshops, executive briefings. Cisco's fluency programs have been at this kind of cadence -- continuous training, not one-time training. The skill base of the broader company is building in parallel with the platform.

**PRIYA:** And what about the vendor relationship management?

**MARCUS:** Active management. By month nine, you should have a clearer view of which model providers are best for which workloads. The platform team has data on cost, latency, eval scores by provider for the workloads you're running. You're starting to optimize the routing. You may be in renegotiation conversations with vendors based on usage. You may be evaluating new entrants. The vendor management is a real activity, not a one-time procurement event.

---

### SEGMENT 4: MONTHS 10-12 -- THE SCALE PHASE (6 minutes)

**PRIYA:** Months ten through twelve. The scale phase. What does this look like?

**MARCUS:** By the start of month ten, you have a working platform, multiple use cases shipped, a track record of business outcomes, and a credible roadmap. The scale phase is about widening the aperture. More use cases. More teams. More business units. More sophisticated capabilities. Without losing the discipline that got you here.

**PRIYA:** What are the typical scaling moves in this phase?

**MARCUS:** Four major moves. One, expand to more business units. The first three use cases were probably concentrated in a few business areas. Now you go horizontal. Other business units pick up the platform and ship their own features. The platform team has to scale its support model -- maybe move from direct hand-holding to documentation and office hours. Two, introduce more sophisticated patterns. The early use cases were probably RAG and extraction. The scale phase might introduce agent workflows, multi-step processes, integration with the data warehouse for analytical use cases. The platform supports these new patterns through new SDK components and new templates. Three, deepen the integration. The AI capabilities start to be wired into more of the existing surfaces. Customer support agents see AI suggestions inline. Salespeople see AI assistance in Salesforce. Engineers see AI assistance in their IDE and PR review. The integration is where the productivity gains compound. Four, mature the operations. The on-call rotation is staffed. The runbooks are real. The dashboards are watched. The incident response is practiced. The AI capabilities are now treated like any other production system.

**PRIYA:** What about the business measurement story at year end?

**MARCUS:** The year-end conversation is where you prove or disprove the investment. The story you tell is, here's the platform we built, here are the use cases shipped, here are the business outcomes, here's what we expect for next year. The specifics matter. Not "we're enabling AI across the company." Specifics. "Internal IT support handles thirty percent of inbound tickets autonomously. Customer support agent productivity is up twenty percent. Engineering PR review cycle time is down forty percent. Sales response time on new inbounds is down fifty percent. Total estimated business impact is X million dollars annualized." If you can produce that statement with credible data, the year-two budget conversation is easy. If you can't, it's hard.

**PRIYA:** What's the cultural change at this point?

**MARCUS:** By month twelve, you should see AI fluency baked into the operating rhythm of the major business units. The IT team isn't asking "should we use AI for support" -- they're asking "what's the next workflow we're going to enhance." The engineering team isn't debating whether to adopt AI in their workflow -- they're optimizing the prompts and tools for the AI they already use. The cultural shift from "AI is a special initiative" to "AI is how we work" is the marker of a mature deployment. You're not there yet at month twelve, but you should be visibly moving toward it.

**PRIYA:** What about the relationship between the AI platform team and the rest of the technology organization?

**MARCUS:** At month twelve, the AI platform should be a recognized peer to the other platform teams, not a separate organism. The interfaces are well-defined. The shared concerns -- security, compliance, observability, deploy -- are jointly managed. The escalation paths are clear. The platform team is no longer a novel curiosity. It's just another platform that the company depends on.

---

### SEGMENT 5: WHAT GOOD LOOKS LIKE AT THE END OF YEAR ONE (5 minutes)

**PRIYA:** Let's paint the picture. What does good look like at the end of year one?

**MARCUS:** I'll give you the markers. Platform markers. Use case markers. Operational markers. Business markers. Cultural markers.

**PRIYA:** Start with platform markers.

**MARCUS:** The model gateway abstracts at least two providers. Prompt caching is enabled and saving real money. The retrieval system serves at least three major source types. The tool catalog has at least twenty entries. The eval framework runs hundreds of cases on every change for at least five features. The observability dashboards have AI metrics flowing alongside system metrics. The policy framework is code, versioned, tested.

**PRIYA:** Use case markers.

**MARCUS:** Three to five use cases shipped to production. At least one in a customer-facing context. At least one with measurable business impact above five percent of the target metric. A roadmap for year two with another six to ten use cases identified.

**PRIYA:** Operational markers.

**MARCUS:** The AI services have an on-call rotation. Incidents have runbooks. Eval scores are monitored. Cost is tracked weekly. A red team engagement has been completed. A security audit has been completed. The compliance posture is documented and externally defensible.

**PRIYA:** Business markers.

**MARCUS:** A specific business outcome you can point to with confidence. A trajectory that suggests continued improvement. A budget for year two that's been approved without controversy. A CFO who's a believer, not a skeptic.

**PRIYA:** Cultural markers.

**MARCUS:** AI fluency programs running for engineering and non-engineering functions. Manager enablement cohorts completed. Internal communication about AI is honest, specific, and credible. The talent pipeline is healthy -- new platform engineers are joining, existing engineers are growing into AI roles, retention is stable. The phrase "we use AI" is heard less. The phrase "this AI feature does X" is heard more.

**PRIYA:** That's a strong picture. And it's achievable in twelve months for a company that starts intentionally.

**MARCUS:** It's achievable. Cisco didn't do this in twelve months from zero -- they've been investing for years -- but they did do it in a sequenced way that matches roughly this pattern. Stripe and Notion built their AI platforms in similar sequences over similar timeframes, with the variations you'd expect for product-AI versus platform-AI. The pattern is not unique to one company. It's a recognizable approach to a hard problem.

---

### SEGMENT 6: YEAR TWO AND THE LONG VIEW (5 minutes)

**PRIYA:** Year two. What's the focus?

**MARCUS:** Year two is about three things. Deepening the use cases. Expanding the surface area. Investing in differentiation. By the end of year two, the AI capability should not be a thing the company does. It should be a thing the company is.

**PRIYA:** Deepening the use cases.

**MARCUS:** The early use cases were probably at rung one or two of the trust ladder -- mostly suggester roles with human review. Year two is where you move some of those to rungs three and four -- more autonomous operation in well-understood domains, with calibrated trust based on the eval and operational data you've accumulated. The work to move up the ladder requires deep eval discipline, sophisticated monitoring, and a willingness to pull back if signals degrade. The companies that handle this well unlock significantly more value because they're freeing up human capacity for higher-value work. The companies that handle it poorly create incidents and lose trust.

**PRIYA:** Expanding the surface area.

**MARCUS:** Year two is where AI shows up in more places. More integrations with existing tools. More customer-facing surfaces. More analytical use cases. The platform supports it by continuing to invest in the SDKs, the templates, the patterns. The product teams build on top. The volume of features grows substantially.

**PRIYA:** Investing in differentiation.

**MARCUS:** This is where year two starts to look different from year one. In year one, you're catching up to industry baselines -- the table-stakes use cases that every enterprise should have. In year two, you start investing in the use cases that are specific to your company's competitive advantage. Stripe's payments foundation model is a year-two-plus investment. It's not table stakes. It's a differentiated capability that leverages their unique data. Notion's increasingly sophisticated workspace AI is the same kind of investment -- table stakes capabilities matured to the point of strategic differentiation. The companies that get to this in year two are the ones who started year one disciplined.

**PRIYA:** What's the typical year-two pitfall?

**MARCUS:** The biggest pitfall is taking on too much because year one went well. The platform team gets pulled in twenty directions. The governance overhead becomes the bottleneck. The eval discipline starts to slip because the volume of features outstrips the eval authoring capacity. The key year-two discipline is to grow the supporting structures -- platform team, governance forum, eval ownership -- in proportion to the use case growth. If your use case volume triples and your platform team doesn't grow, you're going to break things. If it grows in proportion, you compound.

**PRIYA:** And the long view? Where is all of this going in three to five years?

**MARCUS:** I think the three-to-five-year picture is one where AI capability is not a separate thing in any enterprise that's serious. It's woven into every workflow, every product, every operational process. The companies that have built the harness -- the context, the platform, the evals, the trust layer -- will compound year over year because every new model improvement amplifies through their existing harness. The companies that haven't will be in catch-up mode forever, because the harness work doesn't speed up just because models get better. The harness work is its own thing, and it takes the time it takes.

**PRIYA:** That's a sober and motivating picture to end on. Marcus, any closing words for the listener?

**MARCUS:** Two things. One, start. The discipline of starting -- with a small team, a small use case, an honest plan -- is more valuable than any specific technology choice. The patterns we've discussed in this series are knowable and learnable. The companies that are ahead are the ones that started, not the ones that planned the most. Two, build the harness, not just the features. Every time you're tempted to ship a feature that bypasses the platform, that doesn't have evals, that doesn't integrate with the governance, that takes a shortcut -- resist. The shortcuts compound the wrong way. The harness compounds the right way. The decision in any given moment is small. The cumulative effect over a year is enormous.

**PRIYA:** And from my side. The conversation across these six episodes has been about a transition that's happening right now, at every meaningful enterprise. The leaders we've discussed -- Stripe, Notion, Block, Cisco, Shopify, Atlassian -- are not magical. They are disciplined. They made deliberate choices, sustained them, and let the compounding do the work. Anyone listening can do the same. The patterns are visible. The case studies are public. The disciplines are knowable. What's needed now is the leadership commitment to execute. Marcus, thank you for six episodes of generous expertise.

**MARCUS:** Thank you, Priya. This has been one of the most rewarding conversations of my year, and the discipline of organizing the material across six episodes has clarified my own thinking in ways I didn't expect.

**PRIYA:** And thanks to all of you who listened. If this series helped you, share it with your team. The conversation about how to build AI well at the enterprise level is one we're all participating in, and the more clear thinking we have circulating, the better. Until next time.

**[OUTRO MUSIC]**

---

*End of series. The Harness will return with new seasons exploring specific case studies, deep technical patterns, and emerging trends in enterprise AI.*

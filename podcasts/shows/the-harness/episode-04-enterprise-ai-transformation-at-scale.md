# Episode 4: Enterprise AI Transformation at Scale
## "Operating Models, Org Design, and the Cisco Playbook"

**Duration:** ~45 minutes
**Hosts:** Priya Anand (Interviewer) & Marcus Hale (Expert)
**Podcast:** The Harness -- Building the Enterprise AI Operating System

---

### INTRO (3 minutes)

**[INTRO MUSIC FADES]**

**PRIYA:** Welcome back to The Harness. I'm Priya Anand, here again with Marcus Hale. In the first three episodes we covered the technical substance -- harness engineering as a concept, the context layer, the developer enablement stack. Today we zoom out from the technology to the organization. Because all the world's best AI infrastructure does nothing if the company can't absorb it.

**MARCUS:** This is the episode I find genuinely the hardest, because the technology problems have known solutions. The organizational problems require leadership judgment, political navigation, and patience. There's no MCP for org design. You can't open-source change management. The case studies matter here even more than usual, because patterns from companies that have done this well are what give you the most leverage.

**PRIYA:** We'll cover four big themes today. The operating model decisions a CIO or CTO has to make. The talent and capability gaps that emerge. The change management story -- middle managers, working models, what happens to roles. And the executive operating cadence. We'll lean hard on Cisco because they've been unusually public about their enterprise AI transformation, and we'll bring in Shopify, Atlassian, and Stripe as additional vantage points. Marcus, let's start with the basic operating model question. What are the choices?

---

### SEGMENT 1: THE THREE OPERATING MODELS (8 minutes)

**MARCUS:** When you look at how large enterprises are organizing their AI work, you see roughly three operating models in the wild. I'll call them the Centralized Lab, the Federated Embedded, and the Platform-and-Product Split. Each has trade-offs. The choice depends on the company's size, culture, and where they are in maturity.

**PRIYA:** Let's go through each. Centralized Lab first.

**MARCUS:** Centralized Lab is the most common starting point. Leadership creates a dedicated AI team, often called an "AI Center of Excellence" or an "AI Lab" or sometimes an "Innovation Center." This team has its own budget, its own headcount, its own roadmap. They build pilots, they evaluate vendors, they publish thought leadership. The advantage is concentration -- you have a focused team with deep expertise. The disadvantage is detachment. The lab doesn't own user-facing products, so they have a hard time shipping. The product teams don't trust the lab's output because the lab doesn't have to live with the consequences of bad decisions in production. After eighteen to twenty-four months, you usually see one of two outcomes -- either the lab dissolves and people are redistributed, or the lab evolves into something else.

**PRIYA:** I've seen this play out so many times. The lab gets stood up, produces great demos, struggles to get features into product, and eventually loses funding or pivots. Federated Embedded next.

**MARCUS:** Federated Embedded is the opposite extreme. Every product team is responsible for their own AI features. There's no central AI team. The advantage is alignment -- the team that owns the user owns the AI feature. The disadvantage is duplication and inconsistency. Every team is rolling their own model gateway, their own retrieval, their own evals. The quality varies wildly. Security and compliance posture is uneven. It works fine in small companies or in companies where AI is genuinely peripheral, but it doesn't scale to a serious enterprise rollout.

**PRIYA:** And the third, Platform-and-Product Split.

**MARCUS:** This is what the leaders have converged on. You have a dedicated platform team that builds the AI infrastructure -- the model gateway, the retrieval system, the eval framework, the tool catalog, the SDKs. The platform team's mandate is making other teams successful. They don't ship user-facing features. Then you have product teams who build the actual AI-powered features inside the existing product surfaces. The product teams use the platform. The platform team measures success by how broadly and effectively the product teams are using it. There's a clear contract. There's a clear separation. There's a clear feedback loop because the platform team has internal customers who are paying attention.

**PRIYA:** That's the Stripe model. That's effectively what Block has done. Cisco's enterprise AI organization looks similar from the outside.

**MARCUS:** And it's the model I'd recommend to anyone listening. The reason it works is that it cleanly separates two different kinds of work. Platform work is infrastructure work. It rewards consistency, reliability, deep technical expertise, long horizons. Product work is feature work. It rewards user empathy, fast iteration, business judgment. Trying to combine the two in a single team creates conflicting incentives. You either ship features at the expense of platform investment, or you build a beautiful platform that nobody uses.

**PRIYA:** What's the headcount split typically look like?

**MARCUS:** It varies, but a rough rule I've seen is that the platform team is somewhere between five and fifteen percent of the total engineers building on top of it. So if you have a hundred product engineers eventually building AI features, you'd want a platform team in the range of five to fifteen people. That's a meaningful investment, but it's leveraged. The five-to-fifteen-person team unblocks the hundred. Without that team, the hundred are slow and inconsistent. With that team, they ship reliably and quickly.

**PRIYA:** What about the relationship between the AI platform team and other platform teams? Because at any large company you already have a cloud platform team, a data platform team, a developer experience team. How does the AI platform team fit?

**MARCUS:** This is one of the most important architectural questions, and it's been getting answered different ways at different companies. The pattern that I think is right is that the AI platform is a peer to the other platforms, with deep integration points but a clear charter. The AI platform owns the AI-specific infrastructure. The cloud platform owns the underlying compute. The data platform owns the warehouse and the data lineage. The developer experience platform owns the IDEs, the CI, the deploy pipelines. They all integrate. The AI platform doesn't try to absorb data engineering or cloud infrastructure. It builds on top. Cisco has organized this way -- the AI platform is a recognized peer to other platform organizations, with clear coordination patterns and joint governance for the cross-cutting concerns.

**PRIYA:** That coordination point is where companies break down most often, right? Because the AI platform needs data, needs compute, needs security review, needs deploy infrastructure -- it touches everything.

**MARCUS:** Touches everything. And the leadership investment required is the joint governance. Without a regular cadence where the heads of these platform teams meet and align, you get tension. The AI team wants a faster path to production than the security team is comfortable with. The data team is being asked to expose more data to AI than they were originally chartered for. The cloud team is being asked to provision GPU clusters they weren't budgeted for. The governance forum is where these tensions get negotiated, not in the field. Cisco's enterprise AI transformation has this kind of governance baked in. So does what we can see at Shopify. It's not optional. It's the price of operating at scale.

---

### SEGMENT 2: THE CISCO PLAYBOOK (8 minutes)

**PRIYA:** Let's go deep on Cisco. You've referenced them several times. What does their enterprise AI transformation actually look like?

**MARCUS:** Cisco is fascinating because they're operating in a difficult environment for AI transformation. They're a Fortune 100 company. They have decades of legacy systems. They have regulated customers in every industry. They have a hardware-and-software product mix. They have a global workforce. And they've decided to invest seriously in AI both as an internal capability and as a product capability. The public talks from their leadership suggest a multi-year program with several explicit phases.

**PRIYA:** What are the phases?

**MARCUS:** The first phase, which they're either in or recently completed depending on the function, is foundational -- building the AI platform team, establishing the model gateway, beginning the context layer work, defining the governance framework. This phase is largely invisible to the business. Leadership has to fund it patiently. The output is infrastructure, not features. The second phase is targeted pilots -- specific business units adopt specific AI capabilities, with the platform team supporting and the business unit owning the outcomes. Customer support, sales operations, IT support, engineering productivity -- these tend to be the early use cases because they have measurable workflows. The third phase, which is where the most mature parts of Cisco are now, is broad rollout -- the AI capabilities become woven into the standard operating model of the business, with KPIs tied to AI-augmented work and routine adoption across teams.

**PRIYA:** What's the executive sponsorship look like?

**MARCUS:** This matters enormously. The successful enterprise AI transformations have explicit, sustained executive sponsorship at the CEO or near-CEO level. At Cisco, AI transformation has been a public priority discussed by the CEO and other senior leaders. That sponsorship matters because the program has to survive setbacks. The first pilot that doesn't show ROI will create political pressure to cut funding. If the executive sponsor isn't bought in for the long horizon, the program dies. Cisco has signaled commitment over a multi-year timeframe, and that commitment has bought the program the space to do real work.

**PRIYA:** What's the role of the CIO versus the CTO versus the CDO in this kind of program?

**MARCUS:** This varies by company, but the pattern I see is that the CIO often owns the internal-facing AI transformation -- the productivity tools, the workflow automation, the back-office AI. The CTO often owns the product-facing AI -- features in the products customers buy, infrastructure for the company's own engineering. The CDO, where they exist, often owns the data foundation that everyone else depends on. The friction comes when these scopes overlap, which they always do in practice. The successful companies have a clear deconfliction mechanism, often a steering committee that meets regularly to resolve scope and prioritization questions. The unsuccessful companies have constant turf battles that exhaust everyone and slow everything.

**PRIYA:** What's the typical role of the consultancy or systems integrator?

**MARCUS:** Mixed picture. The consultancies can be helpful for benchmarking and for capability building, but they cannot do the work. The work has to be done by people who will live with the consequences. A consultancy that builds your AI platform and then hands it off creates a maintenance liability you can't fulfill. The pattern that works is, consultancies augment your team for specific capabilities you don't have yet, but the core platform and the core integration is owned by your own people. Cisco has used outside help selectively. The bulk of the engineering is internal. That's the right balance.

**PRIYA:** What about the change management piece? Because Cisco is a huge company. Getting tens of thousands of employees to actually use new AI tools is a massive undertaking.

**MARCUS:** Yes. And this is where the operational discipline of a company like Cisco shows. They've invested in what you might call AI fluency programs. Training. Internal evangelism. Champion programs in each business unit. Office hours from the AI platform team. Documentation. Internal case studies of teams that have adopted successfully. It looks a lot like how a sophisticated enterprise rolls out any major change -- ERP migration, cloud migration, security mandate. The change management muscle is the same. The thing that's different about AI is that the capabilities are evolving so fast that the training material becomes stale almost immediately. So the programs have to be continuous, not one-time. The fluency is maintained, not delivered once.

**PRIYA:** What's the measurement framework? How does Cisco track whether the transformation is working?

**MARCUS:** They've talked about a few different categories of metrics. Adoption metrics -- what percentage of eligible employees are actively using AI tools, broken down by function. Productivity metrics -- cycle time on key workflows, throughput per employee, time to resolution on standard tasks. Quality metrics -- error rates, customer satisfaction scores, eval scores on AI features. And business metrics -- revenue per employee, operating margin, customer retention. The full stack of metrics. Importantly, the metrics aren't all judged the same way. Leading indicators like adoption and eval scores are tracked weekly. Trailing indicators like business outcomes are tracked quarterly. That cadence discipline keeps the program honest without creating an unrealistic expectation of immediate business results.

---

### SEGMENT 3: THE TALENT QUESTION (6 minutes)

**PRIYA:** Let's talk about talent. Because every CTO I talk to is wrestling with this. They need AI engineers. The market is brutal. The compensation has spiked. What's actually working?

**MARCUS:** The first thing I tell people is that you probably need fewer pure AI specialists than you think. The pure ML research talent is genuinely scarce and expensive and is appropriate for a small number of foundation-model-related roles. But the bulk of the people you need for harness engineering are not pure ML researchers. They're senior platform engineers, senior infrastructure engineers, senior product engineers with strong systems intuition. That talent exists in your company already. You don't need to hire it from scratch.

**PRIYA:** That's a really important point because the framing of "we need to hire AI talent" leads companies to bidding wars for a small pool of people. Versus "we need to skill up our existing senior engineers to do this kind of work," which is a much more tractable problem.

**MARCUS:** Tractable, faster, and produces better results. The people who already know your codebase, your culture, your customers can pivot to harness engineering with a few months of investment. The external hire who's never been inside your company has to learn all that context before they can do anything useful. So the pragmatic playbook is, identify your strongest platform engineers and your strongest infrastructure engineers, pivot a meaningful share of them onto the AI platform work, and supplement with selective external hires for specific gaps. Frontier models, foundation model fine-tuning, that's where you might bring in specialists. Harness engineering itself, do it internal.

**PRIYA:** What about the AI literacy question for non-engineers?

**MARCUS:** This is where Cisco and others have invested in fluency programs. Every business function needs people who can identify AI opportunities, evaluate AI vendors, work with the AI platform team to specify a use case, and live with the consequences. These aren't AI engineers. They're business operators who are AI-literate. The training for them is much lighter than for an engineer, but it's structured. What is RAG, conceptually. What is an agent, conceptually. What are the failure modes you should be alert to. What questions to ask in a vendor pitch. What evals look like. The fluency lets these operators be sophisticated consumers of AI capability without having to build it themselves.

**PRIYA:** And what's the leadership team's AI literacy bar?

**MARCUS:** This is one of the underrated factors. The leadership team's AI literacy directly affects the quality of decisions made about AI investments. If your CFO doesn't understand the difference between token cost and inference cost and total cost of ownership, you're going to make bad investment decisions. If your COO doesn't understand the difference between deterministic and probabilistic systems, you're going to misjudge how to integrate AI into operational processes. So you need a sustained investment in executive AI fluency. Not "send them to a conference once." Regular briefings, internal demos, exposure to the actual systems. The companies that do this well make better decisions. The companies that don't make consistently worse decisions, and their AI programs suffer accordingly.

**PRIYA:** Are there roles that are emerging as new, distinct functions?

**MARCUS:** A few are. The "AI product manager" is a real, distinct role at this point. It looks like a regular PM but with deep awareness of model capabilities, eval design, latency and cost trade-offs, prompt design considerations. The "AI evaluation engineer" or "eval lead" is another emerging role, focused specifically on building and maintaining the eval infrastructure. The "AI safety and policy engineer" is becoming a distinct role at the larger and more regulated companies, focused on the governance layer. These aren't job titles every company needs, but at scale, they show up.

**PRIYA:** What about retention? Because the market for these people is hot, and once you've trained someone, they're a target.

**MARCUS:** Retention is a real problem. The compensation is one factor, but in my experience, compensation is rarely the dominant reason people leave. The dominant reasons are scope, growth, and impact. If you have an AI platform engineer doing meaningful, leveraged work on a critical program, with clear growth in their role, they tend to stay. If you have an AI engineer who's been sandboxed in a lab that doesn't ship, they leave. So retention is really about making sure the work is meaningful and visible. The companies investing seriously in AI are the ones that retain talent. The companies treating it as a side project lose people to the companies investing seriously.

---

### SEGMENT 4: THE MIDDLE MANAGER PROBLEM (6 minutes)

**PRIYA:** I want to talk about middle managers because I think this is one of the most underdiscussed aspects of enterprise AI transformation. The executive layer is bought in. The individual contributors are using the tools. But the middle managers are stuck in between.

**MARCUS:** This is a real and underappreciated tension. Middle managers are responsible for delivery. Their incentives are tied to predictable output -- the team ships what was committed, on time, with the quality bar. AI changes the inputs to that equation in ways that are hard to manage. The team's velocity might be higher in aggregate but more variable. The skill mix changes -- the most senior engineers may produce dramatically more, but the most junior may need different coaching. The work itself shifts toward review and verification, away from generation. A middle manager who came up in a previous era doesn't have a playbook for any of this. So they often default to skepticism or to ignoring the change. Either response is bad.

**PRIYA:** What's the constructive role for the middle manager in an AI-enabled organization?

**MARCUS:** Several things. One, they have to own the workflow redesign for their team. What work is the AI doing, what work is the human doing, what is the handoff. That's a leadership question, not an individual contributor question. Two, they have to manage the quality bar. With AI generating more output, the verification load increases. The manager has to ensure that the team has the capacity and the discipline to verify properly. Three, they have to manage the skill development of the team. As tasks change, the team needs new skills. The manager has to identify gaps and create development plans. Four, they have to be a feedback channel back to the platform team. Which AI capabilities are working, which aren't, what's missing, what's broken. The platform team needs that signal. The middle manager is the conduit.

**PRIYA:** That's a meaningful expansion of the role. Where do middle managers get the training and support to do this?

**MARCUS:** This is one of the most underinvested areas. Most AI transformation programs invest in IC training and in executive briefings. The middle management layer often gets a slide deck and is expected to figure it out. The companies that are getting it right are investing in dedicated manager enablement -- workshops, peer learning groups, manager-specific tooling. Atlassian has been particularly thoughtful about this in their public communications about AI in their workplace. They've treated managers as a specific cohort with specific needs, not just as a delivery vehicle for IC training.

**PRIYA:** What's the political economy of all this? Because in a lot of organizations, the middle management layer is feeling existential anxiety about AI -- "is my job going to exist in five years?"

**MARCUS:** The anxiety is real and it's not entirely unfounded. The total number of management layers in a typical large company is probably more than is structurally necessary, and AI capabilities may accelerate a flattening trend that was already underway. So the honest message is, the role is changing, the number of managers per IC may shrink, and the skill profile of a successful manager is shifting. That's a difficult message to deliver. The companies that handle it well are explicit about the change, invest in the transition for managers who can adapt, and are direct about the parts of the role that will atrophy. The companies that handle it poorly pretend nothing is changing while quietly making structural changes that erode trust.

**PRIYA:** That trust point is huge. Because if employees -- including managers -- feel that AI is being introduced dishonestly, they will not give it their best support, and the program will struggle.

**MARCUS:** Universal truth. The companies that introduce AI with honesty and intentionality build trust. The companies that introduce it with corporate PR-speak and avoidance erode trust. The eventual outcomes diverge based on that trust capital. Cisco has been notably direct in their internal communications about what AI is and what it isn't, what it will change and what it won't. That directness pays back in adoption and goodwill.

---

### SEGMENT 5: THE EXECUTIVE OPERATING CADENCE (5 minutes)

**PRIYA:** Let's talk about the executive operating cadence. Because if you're a CEO or a CTO of a large enterprise, what's the rhythm at which you should be tracking and steering this?

**MARCUS:** Three rhythms, in my view. A quarterly business review focused on outcomes. A monthly operating review focused on the platform and the major programs. And a weekly tactical sync for the leadership of the AI platform and the major product programs.

**PRIYA:** Quarterly business review first.

**MARCUS:** Quarterly is the right cadence for outcomes because business outcomes don't move faster than that. The questions at the quarterly are, what are the trailing business metrics doing, are the AI investments tracking toward the outcomes we said they would, what's the budget look like, what are the major decisions that need to be made at the leadership level. This is the venue where you'd decide things like, do we expand from one business unit to three, do we commission a new major initiative, do we approve a significant model spend increase. The CEO, CFO, CTO, CIO, and the heads of the major business units should be in this room. The board may want a version of this content as well.

**PRIYA:** Monthly operating review.

**MARCUS:** Monthly is the right cadence for the platform and program operations. The questions here are, how is the platform performing -- adoption, uptime, eval scores, latency, cost. How are the major programs progressing -- pilot status, expansion plans, key blockers. What's happening with the talent pipeline. Are there any emerging risks -- security, compliance, reputational. The CTO or CIO chairs this. The heads of the major AI initiatives and the heads of the platform attend. This is where you catch problems before they become quarterly business review issues.

**PRIYA:** Weekly tactical sync.

**MARCUS:** Weekly is where the people actually doing the work coordinate. The AI platform leadership and the leads of the major product programs sync on dependencies, on shared incidents, on rollout decisions. Most issues should be resolved here. Things that can't be resolved here get escalated to the monthly operating review.

**PRIYA:** That's a clean cadence. What's the failure mode if you don't establish it?

**MARCUS:** The failure mode is that everything becomes an exception. Every decision gets escalated to the CEO because there's no other forum. Either the CEO gets buried in detail, or the decisions don't get made and the program stalls. The cadence creates the muscles for routine decision-making at the right level. It's not glamorous. It's just operational hygiene. But it's what separates the programs that scale from the programs that don't.

**PRIYA:** What about the board's involvement? Because boards are asking about AI nonstop right now.

**MARCUS:** Boards should be informed at the quarterly level. They should not be running the program. The healthy pattern is, the CEO presents AI as part of the broader strategic update, with specific metrics and milestones. The board asks sharp questions, provides governance oversight, ensures the major risks are being managed. The unhealthy pattern is, the board is dictating specific AI initiatives or technologies or vendors because a board member read an article on the plane. Some boardrooms have devolved into this and it's deeply unproductive. The role of the board is governance and capital allocation, not technical direction.

---

### SEGMENT 6: WHAT GOOD LOOKS LIKE TWO YEARS IN (4 minutes)

**PRIYA:** Closing thought. If a company gets all of this right, what does the org look like two years in?

**MARCUS:** Two years into a well-executed transformation, you'd see a few specific markers. One, AI use is no longer a separate program. It's woven into the operating model of the major business units. The customer support team has AI in their day-to-day flow. The engineering team has AI in their PR review. The sales team has AI in their CRM. It's just how the work gets done. Two, the platform team is humming. They're shipping platform improvements on a regular cadence, they have a healthy roadmap, the internal customer satisfaction is high. Three, the eval and observability discipline is mature. Models can be swapped without drama. New features can be shipped quickly because the testing infrastructure is robust. Four, the leadership team can articulate what AI has done for the business in concrete, measured terms. Not "we use AI a lot." Specific numbers tied to specific operational metrics. Five, the company is recognized internally and externally as a place where AI work happens at a high level, which attracts and retains talent in a virtuous cycle.

**PRIYA:** And what's the gap if you don't get it right?

**MARCUS:** Two years in without getting it right, you'd see the opposite. AI is still a separate program. The platform team is either disbanded or marginalized. Different product teams have built different AI features with different qualities. The eval discipline is uneven. Leadership can point to demos but can't point to outcomes. Talent is churning. The board is impatient. And often, there's a budget cut coming. The window to recover narrows.

**PRIYA:** This is sobering. But I think it's also the right frame for someone listening who's at the start of this journey.

**MARCUS:** It's sobering, but the playbook is knowable. The companies that have done it well have shown the way. The companies that are starting now can copy the patterns rather than discovering them. That's why the case studies matter so much. We don't have to invent this from scratch.

**PRIYA:** Marcus, preview for episode five?

**MARCUS:** Episode five is the trust layer. Evals, guardrails, governance, compliance. The unsexy work that determines whether you can actually ship AI to regulated, audited, customer-facing surfaces. We'll go really deep on what eval frameworks look like in practice, what red teaming looks like, what the audit posture looks like. If episode three was about how to build, episode five is about how to ship with confidence.

**PRIYA:** That's the episode I'm most looking forward to because it's where the abstract concerns become concrete operational practice. Thanks Marcus. And thanks to all of you for listening. See you in episode five.

**[OUTRO MUSIC]**

---

*Next episode: Evals, Guardrails, and the Trust Layer -- the engineering practices that let regulated, audited enterprises ship AI features with confidence.*

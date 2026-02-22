# Episode 2: Multi-Agent Architecture for Enterprise Software
## "Designing Systems Where AI Agents Collaborate on Complex Business Problems"

**Duration:** ~55 minutes
**Hosts:** Alex (Interviewer) & Kevin (Expert)

---

### INTRO (3 minutes)

**ALEX:** Welcome back to The Forge Podcast. In Episode 1, we covered how PE firms create value through technology transformation. Today we're going deep on one of the most important technical topics in enterprise software right now: multi-agent architecture. Kevin, let's start with the basics. What do we mean when we say "multi-agent" and why is this different from just building a chatbot?

**KEVIN:** Great starting point. A single AI agent is essentially an LLM with some tools and a system prompt that can take actions in the world. A chatbot answers questions. An agent can read data, call APIs, make decisions, and execute workflows. The leap from a single agent to a multi-agent system is the same conceptual leap as going from a single developer working alone to a coordinated team of specialists.

In a multi-agent system, you have multiple agents, each with different specializations, different tools, different system prompts, and different levels of autonomy. They communicate with each other, share context, and collaborate to solve problems that no single agent could handle alone.

Think about it like a hospital. You wouldn't want one doctor who does surgery, reads MRIs, prescribes medication, does physical therapy, and handles billing. You want specialists who are exceptional at their specific domain, plus a coordination system that ensures the right specialist handles the right task and that information flows correctly between them.

---

### SEGMENT 1: MULTI-AGENT SYSTEMS IN PRACTICE (5 minutes)

**ALEX:** So what does this look like in practice? Give me a concrete enterprise example.

**KEVIN:** Let's use accounts payable automation as an example, since it's a domain I've been deep in. In a traditional AP workflow, an invoice arrives, someone manually enters the data, someone matches it to a purchase order, someone routes it for approval, someone handles exceptions, and someone schedules the payment. That's five to seven distinct functions.

In a multi-agent AP system, you'd have a Capture Agent that extracts and validates invoice data using OCR and natural language understanding. You'd have a Classification Agent that handles GL coding and cost center assignment. A Matching Agent that does three-way matching between the invoice, the purchase order, and the goods receipt. A Risk Agent that performs fraud detection and anomaly scoring. A Communication Agent that handles supplier inquiries and internal exception routing. A Payment Agent that optimizes payment timing and method selection. And a Compliance Agent that validates against regulatory requirements.

Each of these agents is a specialist. The Capture Agent doesn't know anything about payment optimization. The Risk Agent doesn't know anything about GL coding. But together, orchestrated properly, they can process an invoice end-to-end with zero human intervention in the majority of cases.

---

### SEGMENT 2: AGENT BOUNDARY DESIGN (7 minutes)

**ALEX:** How do you decide where to draw the boundaries between agents? What makes something one agent versus two?

**KEVIN:** This is one of the most important design decisions in multi-agent architecture, and I have a framework for thinking about it. There are four criteria.

First, cognitive specialization. If two tasks require fundamentally different knowledge domains, system prompts, or reasoning patterns, they should be separate agents. Fraud detection requires a completely different mental model than invoice data extraction. Trying to make one agent excellent at both is like trying to make one person an expert radiologist and an expert tax attorney. You'll get mediocrity at both.

Second, tool boundaries. Agents need tools to take actions. If two functions require completely different toolsets, like database access versus email API versus payment gateway, separating them reduces the attack surface and makes each agent's tool context cleaner. An agent with 50 tools available is going to make worse decisions about which tool to use than an agent with 5 highly relevant tools.

Third, autonomy levels. Different functions require different levels of human oversight. A Capture Agent that extracts data from an invoice can operate at 95 percent or higher autonomy. A Payment Agent that moves actual money should probably operate at much lower autonomy, with human approval for transactions above certain thresholds. If you bundle high-autonomy and low-autonomy functions into the same agent, you either restrict the whole thing to the lowest common denominator of autonomy, or you create risk by giving a broadly-scoped agent too much power.

Fourth, feedback loops. Each agent should have its own learning cycle. The Capture Agent gets better by learning from corrections to its data extraction. The Risk Agent gets better by learning from confirmed fraud cases. If they're the same agent, the feedback signals get muddled. Separating them allows each agent to improve independently at its specific function.

---

### SEGMENT 3: ORCHESTRATION PATTERNS (8 minutes)

**ALEX:** Okay, so you've got your agents defined. How do they actually talk to each other? What's the orchestration layer?

**KEVIN:** Orchestration is the central nervous system of a multi-agent architecture, and getting it right is the difference between a system that works and one that falls apart. There are three main orchestration patterns, and most enterprise systems use all three depending on the query type.

The first pattern is Direct Routing, which handles the majority of interactions, usually around 70 percent. A query comes in, the orchestration layer determines which single agent is best equipped to handle it, and routes it directly. "What's the status of invoice 12345?" goes straight to the Capture or Matching Agent. "Has this supplier been flagged for any issues?" goes to the Risk Agent. Direct routing is fast, predictable, and easy to debug.

The second pattern is Fan-Out and Aggregate. This handles complex queries that span multiple domains, usually around 20 percent of interactions. The orchestrator decomposes the query into sub-queries, sends them to multiple agents in parallel, collects the results, and synthesizes a unified response. For example, "Give me a comprehensive analysis of our spending with Supplier X" might fan out to the Capture Agent for invoice history, the Matching Agent for PO compliance data, the Risk Agent for anomaly flags, the Payment Agent for payment terms optimization, and the Communication Agent for any outstanding disputes. All five agents execute simultaneously, and the orchestrator weaves their outputs into a coherent analysis.

The third pattern is Sequential Pipeline. This handles workflows where each step depends on the output of the previous one, usually around 10 percent of interactions but often the highest-value ones. For example, generating a quarterly AP report might require the Capture Agent to aggregate invoice volumes, then the Classification Agent to break it down by category, then the Risk Agent to flag trends, then a Report Generation Agent to format everything into an executive brief. Each agent's output feeds directly into the next agent's input.

---

### SEGMENT 4: SHARED MEMORY ARCHITECTURE (7 minutes)

**ALEX:** What about the shared context? If agents are independent, how do they know what the other agents have done or discovered?

**KEVIN:** This is where shared memory architecture comes in, and it's the part that most people underestimate. There are three types of memory in a multi-agent system.

The first is Conversation Memory, which is the short-term working memory of a specific user interaction. When a user asks a question and the orchestrator fans out to multiple agents, each agent needs to know the original question, the user's context, and what other agents have already contributed. This is typically implemented as a shared context store, usually Redis or something similar, that persists for the duration of a conversation session. Each agent reads from and writes to this shared context.

The second is Cross-Agent Memory, which is medium-term memory that persists across conversations. If the Risk Agent flagged Supplier X as suspicious last week, the Communication Agent needs to know that when handling a new inquiry from Supplier X today. This is typically implemented in a database, like PostgreSQL, with a structured schema that allows agents to query each other's findings.

The third is Institutional Memory, which is the long-term knowledge that the system accumulates over time. This includes learned patterns, calibrated thresholds, validated rules, and domain expertise. For example, after processing a million invoices, the Capture Agent has learned that certain supplier formats always have the invoice number in the upper right corner, or that certain customers always use a specific GL code structure. This institutional memory is what creates the compounding advantage, the moat, that makes the system increasingly hard to replicate.

---

### SEGMENT 5: LLM LAYER AND MODEL ROUTING (6 minutes)

**ALEX:** Let's talk about the LLM layer. In a multi-agent system, are all agents using the same model?

**KEVIN:** Not necessarily, and this is an important optimization. Different agents have different computational needs and different latency requirements.

You want to use model-tier routing, which means assigning each agent to the appropriate model based on its cognitive requirements. Your Classification Agent that does GL coding might work perfectly well with a smaller, faster, cheaper model like GPT-4o-mini, because the task is relatively well-structured and pattern-based. Your Risk Agent that needs to reason about complex fraud patterns might need the full GPT-4o or Claude Opus because the reasoning is more nuanced and open-ended.

This has a massive impact on cost and latency. If 60 percent of your agent interactions can be handled by a smaller model at one-tenth the cost per token, your overall system economics improve dramatically. And because the smaller models are faster, your user-facing latency drops for the majority of interactions.

The way you implement this is through an LLM Gateway that sits between your agents and the model provider. The gateway handles model routing, token tracking, rate limiting, and cost attribution. Each agent declares its model tier in its configuration, and the gateway routes accordingly. This also gives you a single point for switching providers, A/B testing models, and implementing fallback strategies when one provider has latency issues.

---

### SEGMENT 6: GUARDRAILS AND SAFETY (7 minutes)

**ALEX:** What about guardrails? If these agents are operating autonomously, how do you prevent them from doing something wrong or dangerous?

**KEVIN:** Guardrails are non-negotiable in enterprise multi-agent systems, and they need to operate at multiple levels.

At the input level, you need intent classification and injection protection. Before a query even reaches an agent, a guardrail layer should classify the intent, check for prompt injection attempts, and validate that the user has permission to ask what they're asking. This is especially important in systems with role-based access control, where a junior analyst shouldn't be able to ask the Payment Agent to change payment terms.

At the agent level, each agent should have explicit boundaries on what data it can access and what actions it can take. The Capture Agent can read invoice data but shouldn't be able to modify payment records. The Payment Agent can recommend payment timing but shouldn't be able to execute payments above a certain threshold without human approval. These boundaries should be enforced at the tool level, not just in the system prompt. A system prompt is a suggestion. A tool-level permission check is an enforcement.

At the output level, every response should pass through validation before reaching the user or triggering a downstream action. This includes checking for hallucinations by validating claims against the source data, checking for data leakage by ensuring the response doesn't include information the user shouldn't have access to, and checking for compliance by ensuring the response meets regulatory requirements.

And then there's the audit trail. In financial software, every decision needs to be traceable. If the Risk Agent flags an invoice as suspicious, you need to know why, what data it looked at, what model it used, what confidence level it assigned, and who (if anyone) overrode the decision. This audit trail is not just good practice, it's a regulatory requirement in many jurisdictions.

---

### SEGMENT 7: MODEL CONTEXT PROTOCOL (5 minutes)

**ALEX:** How does this all connect to the MCP, the Model Context Protocol, that's gaining adoption right now?

**KEVIN:** MCP is really interesting because it standardizes how AI agents connect to external tools and data sources. Think of it like USB for AI agents. Before USB, every peripheral had its own proprietary connector. MCP does the same thing for agent-to-tool connections.

In a multi-agent architecture, MCP gives you a standardized way for each agent to declare its available tools and for the orchestration layer to understand what each agent can do. Instead of building custom integrations for every agent-tool combination, you define MCP servers that expose capabilities in a standardized format.

For example, your data platform might expose an MCP server that provides tools like "query_customers," "get_invoice_history," and "aggregate_spending." Any agent that needs access to customer data connects through this MCP server using the standard protocol. You write the integration once, and every agent benefits.

Where it gets really powerful is when you're building a platform that needs to scale to many agents quickly. If you have your data layer exposed through MCP, adding a new agent is mostly a matter of writing a good system prompt and configuring which MCP tools it has access to. The hard integration work is already done. This is why I think of MCP as the shared infrastructure layer, and the agents themselves as relatively lightweight specializations on top of that infrastructure.

---

### SEGMENT 8: IMPLEMENTATION ROADMAP AND COSTS (7 minutes)

**ALEX:** Let's talk about implementation. If someone is starting from a single agent and wants to scale to ten, what's the right sequence?

**KEVIN:** The sequence matters enormously, and most teams get it wrong by jumping straight to building new agents before the infrastructure is ready. Here's the approach I recommend, broken into four phases over about 24 weeks.

Phase 1 is Foundation, taking weeks 1 through 6. You build three things: the Agent Gateway, which handles routing, authentication, and rate limiting for all agent interactions; the shared data access layer, which is your MCP-based interface to your data platform so that every agent accesses data the same way; and the telemetry system, which gives you observability into what every agent is doing, how long it takes, what it costs, and where it fails.

Phase 2 is Core Agents, weeks 7 through 12. You build 3 to 4 agents that cover the highest-value use cases. These should be agents where the business impact is clear and measurable, and where the single-agent experience was already limited. During this phase, you also build the Conversation Memory store and the basic orchestration patterns for direct routing.

Phase 3 is Advanced Orchestration, weeks 13 through 18. You add the Fan-Out and Sequential Pipeline patterns, build Cross-Agent Memory, deploy the Guardrail Engine, and add 3 to 4 more specialized agents. This is where the system starts to feel qualitatively different from a collection of independent agents, because they're now collaborating and building on each other's work.

Phase 4 is Scale and Optimize, weeks 19 through 24. You add the remaining agents, implement Institutional Memory, optimize model-tier routing based on real-world performance data, and build the monitoring dashboards that let you continuously improve the system.

**ALEX:** What does this cost to build and run?

**KEVIN:** The build cost depends heavily on your existing infrastructure, but for a mid-size B2B SaaS company with a decent engineering team, you're looking at 3 to 5 senior engineers dedicated for about 6 months for the foundation and core agents, plus ongoing work for the advanced phases.

The running cost breaks down into LLM API costs, infrastructure costs, and engineering maintenance. For a system processing moderate volume, say tens of thousands of interactions per day, you're looking at roughly 6,000 to 13,000 dollars per month at launch, scaling to 26,000 to 48,000 per month at full scale with all agents operational. The biggest variable is LLM costs, which is why model-tier routing is so important. If you route 60 to 70 percent of interactions to cheaper models without sacrificing quality, you save substantially.

The key insight is that these costs should be compared to the alternative, which is human labor. If your multi-agent system automates workflows that currently require 20 or 30 or 50 human operators, the ROI is enormous even at the higher end of the cost range.

**ALEX:** One more question. What's the biggest mistake you see teams make when building multi-agent systems?

**KEVIN:** The number one mistake is building agents before building infrastructure. Teams get excited about the AI capabilities and start building specialized agents immediately, but they skip the shared infrastructure layer, the gateway, the data access SDK, the memory stores, the guardrails. What happens is each agent team builds their own bespoke integrations, their own data access patterns, their own memory solutions. Within six months, you have 8 agents that each work individually but can't collaborate, can't share context, and cost 3x more to maintain than they should.

The infrastructure is boring. It's not the exciting AI stuff. But it's the foundation that makes everything else work. Build the platform first, then the agents practically build themselves.

The second biggest mistake is not defining autonomy levels explicitly. If you don't decide upfront which actions an agent can take independently, which require human confirmation, and which are completely off-limits, you'll either build something too restricted to be useful or something too autonomous to be safe. This decision should be made deliberately, documented clearly, and enforced at the tool level.

**ALEX:** Fantastic. Kevin, this has been an incredibly detailed look at multi-agent architecture. In our next episode, we're going to talk about something you've been calling platform power dynamics, how data companies protect their moats when their customers and partners are trying to commoditize them. See you then.

---

*End of Episode 2*

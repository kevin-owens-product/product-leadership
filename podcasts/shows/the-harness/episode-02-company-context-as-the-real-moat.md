# Episode 2: Company Context as the Real Moat
## "How Notion, Stripe, and Cisco Turn Their Knowledge Into AI Advantage"

**Duration:** ~45 minutes
**Hosts:** Priya Anand (Interviewer) & Marcus Hale (Expert)
**Podcast:** The Harness -- Building the Enterprise AI Operating System

---

### INTRO (3 minutes)

**[INTRO MUSIC FADES]**

**PRIYA:** Welcome back to The Harness. I'm Priya Anand, here again with Marcus Hale. In episode one we made the case that the harness, not the model, is what's actually competitive in enterprise AI. Today we get specific about the most undervalued part of that harness -- the context layer. The thing that connects an LLM to your company's actual knowledge.

**MARCUS:** This is the episode I was most excited to record because I think it's the single most misunderstood part of enterprise AI. Everyone thinks the magic is in the model. The magic is actually in what the model sees. And what the model sees is determined by the context layer. If you get the context layer right, mediocre models do brilliant work. If you get it wrong, the best frontier model on Earth will tell your customers the wrong thing in a confident voice.

**PRIYA:** Today we're going deep on three things. One, what the context layer actually is, beyond the buzzword "RAG." Two, how a handful of companies -- Notion, Stripe, Cisco, and we'll bring in Shopify and Atlassian as well -- have built theirs. And three, what an operator should actually do this quarter to start investing in their own. Let's start with the basics. Marcus, what's wrong with the standard "just use RAG" answer?

---

### SEGMENT 1: WHY "JUST USE RAG" IS NOT AN ANSWER (8 minutes)

**MARCUS:** Retrieval-augmented generation is a real technique. The basic idea is that when a user asks a question, you don't just send the question to the model. You first search your company's knowledge base, retrieve the most relevant documents, stuff those documents into the prompt as context, and then ask the model to answer based on that context. It's a brilliant idea. It's also, in its simplest form, almost never good enough for an enterprise.

**PRIYA:** Why not?

**MARCUS:** Because the simple form makes a bunch of assumptions that fall apart in a real company. Assumption one -- there is a single knowledge base. In reality, your company has knowledge spread across Confluence, Notion, Google Drive, Slack, GitHub wikis, internal docs, customer support tickets, sales call transcripts, recorded video, code comments, runbooks, Jira, Salesforce, the data warehouse, and probably twenty more systems. The "knowledge base" is a distributed graph of facts and opinions and decisions, and most of it is unstructured, and a lot of it contradicts other parts of it. The first job of the context layer is to even begin to understand where the truth lives.

**PRIYA:** Right. Even saying "give me the latest version of our refund policy" implies you know which system has the latest version, that it's been updated, and that older copies in Slack or in old email threads are stale.

**MARCUS:** Exactly. And these conflicts compound at scale. Assumption two -- the relevant context for a question fits in a prompt. In reality, even with hundred-thousand or million-token context windows, you cannot stuff a company's entire knowledge base into a single prompt. You have to retrieve. Retrieval is search. Search is a hard problem. The naive vector search that all the RAG tutorials show you -- embed everything, find the nearest neighbors, return them -- is wildly insufficient for an enterprise. Real retrieval involves hybrid search, where you blend semantic and keyword signals. Filters based on document metadata. Re-ranking with a more sophisticated model. Query rewriting that turns the user's vague question into multiple targeted searches. None of this is in the "RAG in fifty lines of Python" demo.

**PRIYA:** That's a great point. The retrieval demos make it look easy because they're using a tiny corpus. Once your corpus is the size of a real company's knowledge, the simple approach breaks.

**MARCUS:** Assumption three -- access is uniform. In a real company, you have role-based access, project-based access, geography-based access, deal-stage-based access. A new salesperson should not be able to ask the AI "what's the pricing strategy for our enterprise tier" and get the executive negotiation playbook in response. The context layer has to enforce access control before the documents ever reach the model. And that's not a model capability. The model cannot be trusted to redact what it's already seen. The retrieval system has to never put it in the prompt to begin with. This is the single biggest gap between toy RAG and enterprise RAG.

**PRIYA:** Walk me through how that's actually implemented. Because I think this is one of those things that sounds simple in the abstract and turns out to be a real engineering challenge.

**MARCUS:** The pattern that's emerging is what I'd call permission-aware indexing. When you index a document, you tag it with the access control list of the source system. When a user issues a query, you authenticate them, expand their identity into the set of permissions they have across all integrated systems, and then you filter the search space to only the documents they're allowed to see -- before the vector search ever runs. So the search is performed in a permission-filtered index slice. Notion's done this for their workspace AI in a particularly elegant way because their entire product is permission-aware. They already had a sophisticated permissions model. When they wrapped AI on top, they extended the same primitives. The AI sees what you see. The AI is denied what you're denied. There's no separate AI permission system to keep in sync.

**PRIYA:** And for a company that doesn't have Notion's permission model as a starting point?

**MARCUS:** This is where enterprises hit a wall, and where the harness investment really matters. If your knowledge is spread across systems with inconsistent access models, you have to build a unification layer. Stripe has talked about how they built an internal identity-aware retrieval system that understands not just "is this user allowed to read this document in Confluence" but "is this user allowed to read the linked Jira ticket, the referenced source file, the dashboards behind the linked URL." It's federated permission resolution. It's hard. It's also non-negotiable in an enterprise. The companies that try to skip this end up either with AI features that leak data, which kills the program, or with AI features that hide everything to be safe, which makes them useless.

**PRIYA:** Assumption four?

**MARCUS:** Assumption four is that knowledge is static. In reality, your company's truth is changing every hour. New features ship. Policies update. People leave teams. Old documents get superseded. The context layer has to know not just what exists but what's current. A document indexed six months ago that's now outdated has to either be re-indexed, deprecated, or annotated as stale. Freshness pipelines are a real category of work, and most companies underinvest in them. The classic failure mode is, you launch your AI assistant, it works great in the demo because you indexed everything yesterday, and three months later it's confidently quoting policies that were changed two weeks ago.

**PRIYA:** That's an awful failure mode because it's hard to detect. You're not getting errors. You're getting stale truth.

**MARCUS:** Worst kind of failure. It looks like a working system. The user trusts it. The system is wrong. The fix is what I'd call the freshness loop -- automated re-indexing tied to source system change events, plus a periodic audit that samples documents and asks "is this still current?" Atlassian has done interesting work here because Confluence and Jira are themselves the knowledge systems being indexed. They have built-in change events that the AI layer can hook into. The freshness pipeline can be event-driven rather than polling.

**PRIYA:** Assumption five?

**MARCUS:** Assumption five is that text is enough. In reality, an enormous amount of enterprise knowledge lives in non-text formats. Diagrams, screenshots, video recordings of all-hands meetings, slide decks, design files, code, structured data in warehouses. Modern multimodal models can ingest a lot of this, but the indexing and retrieval pipeline has to know how to extract structure from each format. A screenshot of a dashboard contains numbers that matter. A Loom video of a product walkthrough contains the rationale that's not in the spec document. Companies that index only the text are missing huge portions of their actual knowledge.

**PRIYA:** I think this is where Shopify has been ahead, right? Because so much of their internal knowledge lives in workflow tools and structured systems, not in docs.

**MARCUS:** Shopify is a good example. They've invested heavily in pulling structured signals into their context layer -- not just unstructured docs but query-able structured data, in addition to a unified semantic layer over their data warehouse. So their internal AI can answer a question like "how does conversion rate vary by checkout flow variant for Plus customers in the last thirty days" by actually querying the data warehouse via a tool, not by hallucinating from a stale dashboard screenshot. That's a meaningful capability, and it requires the context layer to be tightly integrated with the data platform.

---

### SEGMENT 2: THE THREE FLAVORS OF CONTEXT (7 minutes)

**PRIYA:** Let's give listeners a mental model. When we say "the context layer," that's actually a few different things bundled together. Let's break them down.

**MARCUS:** Three flavors. Document context, structured context, and operational context. They're related but they have very different engineering profiles. Document context is the unstructured stuff -- your wikis, your docs, your tickets, your transcripts. The technology stack here is vector search, hybrid retrieval, chunking, and the things people commonly call RAG. Structured context is the data in your warehouse, your transactional systems, your CRM, your billing system. The technology stack here is much more SQL-flavored -- a semantic layer that maps natural language to query, sometimes a small LLM acting as a query translator, sometimes tools like Cube or dbt-based semantic layers. The retrieval pattern is different because you're not embedding tables, you're querying them. Operational context is the live state of the world right now -- the current on-call schedule, the current deploy status, the current production alerts, the current pipeline state. This is real-time, often event-driven, and the retrieval pattern is closer to an API call than a search.

**PRIYA:** And the AI assistant in a real enterprise needs all three.

**MARCUS:** All three, often within the same conversation. The example I like to use is the SRE on-call scenario. An engineer is paged at 3 a.m. They ask their AI assistant, "what's going on with the payment service?" The assistant needs to pull the recent production alerts -- operational context. It needs to look at the recent deploys and the recent commits -- structured context from version control. It needs to pull the runbook for the service -- document context. And it needs to weave all three together into a useful response. If your harness can only do one of those three, you have a partial system. The leading internal AI assistants -- Stripe has talked about this, Block has talked about this -- can do all three because they've invested in all three retrieval patterns.

**PRIYA:** Let's go deeper on each. Document context first. We've covered the basics. What's the cutting edge?

**MARCUS:** The cutting edge in document context is what I'd call structured retrieval over unstructured content. Instead of treating a document as a blob of text, you extract structure -- the relationships between sections, the references between documents, the entities mentioned, the canonical names. You build something closer to a knowledge graph. So when someone asks about "the new authentication policy," the retrieval system doesn't just match keywords. It knows that the term "auth policy" links to a specific document, which references an RFC, which references a security review, which references a follow-up ticket. The retrieval can pull the full thread, not just the leaf node. Notion has been building toward this kind of relationship-aware retrieval. Their context system understands which pages link to which, which databases reference which entities, who's edited what recently. That graph structure is what makes their AI feel like it actually knows your workspace rather than just searching it.

**PRIYA:** Structured context next. The data warehouse story.

**MARCUS:** Structured context is where the AI gets to give you real numbers. The challenge is that natural language to SQL is genuinely hard. You have to map vague human terms to specific column names, you have to handle joins across multiple tables, you have to deal with ambiguity -- "revenue" might mean GAAP revenue, ARR, gross billings, net of refunds, before or after revenue recognition. The pattern that's working in industry is a semantic layer that sits between the AI and the warehouse. The semantic layer defines a curated vocabulary -- "revenue" means this specific definition, "active user" means this specific definition -- and exposes those concepts as a constrained query API. The LLM picks from a finite set of metrics and dimensions, not from a free-form SQL space. This dramatically reduces hallucinations and dramatically increases trust. Cisco has been investing heavily in this kind of semantic layer because their data estate is enormous and inconsistent. They want their internal AI to answer "what's the renewal forecast for North America for this quarter" by hitting a specific, governed query path, not by free-styling SQL against a hundred tables.

**PRIYA:** That governance angle matters. Because if the AI is generating raw SQL against your production data, you have both a correctness problem and a security problem.

**MARCUS:** Both, and a performance problem. A free-form SQL agent will happily generate a query that scans your entire fact table and brings down your warehouse. The semantic layer is a guardrail as much as a translator. It says "here are the queries you're allowed to ask, here are the pre-aggregated tables we've optimized for, here are the dimensions you can filter on." That constraint is the gift to the AI, not the limitation. The AI gets to be confident and correct within the space, instead of correct only sometimes across a much larger and more dangerous space.

**PRIYA:** Operational context third.

**MARCUS:** Operational context is where the AI gets to know what's happening right now. The current ticket queue, the current incident, the current state of the deploy. This is where MCP and tool calling really shine, because operational context is rarely something you can pre-index. It's a live API call. The AI says "I need to know the current state of incident INC-2347," and the tool layer routes that to PagerDuty or to whatever incident system is in use, gets back the current state in real time, and feeds it into the prompt. The interesting investment here is in the tool catalog. How many internal APIs has the AI been wired into? How well are they documented? How safe are the operations -- is the AI calling read-only endpoints by default, with write endpoints gated by approval? Block has talked about how Goose, their agent framework, leverages MCP to give the agent broad access to internal tools. The catalog of tools is the operational context surface area.

---

### SEGMENT 3: NOTION'S APPROACH (6 minutes)

**PRIYA:** Let's spend time on Notion specifically. Because their AI product is one of the most interesting in the industry from a context layer perspective.

**MARCUS:** Notion is a fascinating case because the product itself is fundamentally a context container. Every customer's Notion workspace is a curated knowledge graph of their company. Pages, databases, comments, edits, relationships. Notion didn't have to bolt on a context layer. They already had one. The product was a context layer. So when AI features showed up, they could leverage everything that was already there.

**PRIYA:** Walk through how it works for the user.

**MARCUS:** A user in their workspace can ask their AI to summarize what's been happening on a project, draft a doc based on related pages, find the answer to a question across their entire workspace, or take an action like creating a new page or updating a database row. From the user's perspective, it feels like the AI has read everything you have. Under the hood, when you ask a question, the system retrieves from your specific workspace, scoped to your specific permissions. The retrieval is grounded in the relationship graph -- pages that link to each other, databases that share schemas, recent edits, who's been mentioned where. The model isn't searching the web. It's searching your workspace. And critically, it's only searching what you have access to.

**PRIYA:** That permission scoping is where I keep coming back. Because Notion's whole product is collaborative, with very granular permissions. If their AI had a single permission leak, the entire product would lose trust overnight.

**MARCUS:** It would be existential. So they've invested very heavily in making the permission layer airtight. The architecture pattern is that permission checks happen at the retrieval boundary, not at the model boundary. The model is never given documents it shouldn't see. The retrieval system applies the user's permission set as a filter on the index before the search runs. And then there's defense in depth -- the response is checked, the cited sources are checked, the whole thing is logged for audit. The result is that an AI feature in Notion is, from a permission and audit perspective, treated the same as any other feature in Notion. Same access controls. Same compliance posture. Same auditability.

**PRIYA:** What about the eval side? How do they know it's working?

**MARCUS:** They've built an internal eval framework, and they've talked publicly about it. The eval suite covers things like "given this workspace structure, does the AI find the right page when asked this question." They run the eval on every model upgrade. They run it when retrieval logic changes. They run it when chunking strategy changes. And they have a feedback loop from production -- users can flag bad responses, and those flagged responses become eval cases. That feedback loop is critical because it means the eval suite grows over time and reflects the actual distribution of user questions, not just what the team thought to test originally.

**PRIYA:** What's the lesson for an enterprise that's not Notion, that doesn't have a single application that owns the workspace? Because most enterprises are running thirty SaaS apps, none of which is the unified workspace.

**MARCUS:** The lesson is that you have to do, at the enterprise level, what Notion did at the product level. You have to build the unified workspace. Not as a single application, but as a context layer that has read access across your tools, that resolves identities consistently, that enforces permissions uniformly, and that exposes a single retrieval API to AI applications. That's a real platform investment. It's not a quarter of work. It's a multi-quarter, possibly multi-year investment. But once you have it, every AI feature you build benefits from it. And every model upgrade becomes incrementally cheaper because the integration work has already been done.

**PRIYA:** This is starting to sound like the IDP -- internal developer platform -- conversation from ten years ago. Where the question was, do we let every team build their own deployment pipeline, or do we build a paved road?

**MARCUS:** Exactly the same pattern. And the answer is the same. The companies that built a paved road for AI context are massively ahead. The companies that let every team integrate their own retrieval against their own scattered set of sources are still struggling. We'll come back to this in episode three when we talk about developer enablement, because the AI context layer is essentially a new product the platform team has to ship.

---

### SEGMENT 4: STRIPE'S INTERNAL HARNESS (5 minutes)

**PRIYA:** Stripe next. What's the story there?

**MARCUS:** Stripe has talked publicly about a few different threads of their AI work. One is internal developer AI -- tools that help engineers write code that works against the Stripe codebase, generate documentation, debug payments edge cases. Another is product AI -- features in the Stripe Dashboard that help merchants understand their data, fraud signals, or operational issues. A third is the foundation model work -- they've talked about a payments foundation model trained on transaction data that improves fraud detection and authorization rates. The common thread is that all of these depend on a robust internal context layer.

**PRIYA:** What does that context layer look like inside Stripe?

**MARCUS:** From what they've published, you can see a few key pieces. One is heavy investment in the code search and code intelligence pipeline. Stripe's codebase is large -- Ruby-heavy historically, with Sorbet typing on top. Their internal AI tools are deeply integrated with their code intelligence so that when an engineer asks "how do I add a new currency to this product line," the AI can pull the relevant pieces of the existing currency handling code, the relevant docs, the relevant past PRs, and the test patterns to follow. That's not generic code generation. That's grounded code generation. The grounding comes from the harness.

**PRIYA:** And the eval discipline?

**MARCUS:** Strong eval discipline. Stripe has a deep engineering culture around testing and reliability, and they've extended that culture to AI features. Every AI feature has an eval suite. The eval suite gates rollouts. There's a clear bar for what "ready to ship" means, and that bar is enforced through the eval framework. That cultural artifact, the eval bar, is one of the things they've talked about that I think other enterprises should copy directly.

**PRIYA:** What about the merchant-facing AI? That's a different kind of harness, right? Because now you have customer data, regulatory considerations, payment industry compliance.

**MARCUS:** Hugely different. The merchant-facing AI is in a much more regulated environment. Payment data is subject to PCI rules. Fraud signals are subject to fair lending considerations in some jurisdictions. The harness has to enforce all of that. The pattern Stripe has used is a fairly conservative one -- the merchant-facing AI features are tightly scoped, with clear data lineage, with explicit consent flows, and with robust audit trails. They lean on the same security and compliance infrastructure they've built for the core payments product. The AI doesn't get a separate compliance regime. It inherits the existing one.

**PRIYA:** That inheritance pattern is one I want to emphasize for the listener. The successful enterprise AI rollouts don't build a parallel compliance stack. They wire AI into the existing stack. The data classification, the audit logging, the access reviews -- all the things you already do for your existing systems should extend to AI. If you find yourself building a parallel set of compliance controls for AI, you've probably made an architectural mistake.

**MARCUS:** Yes, exactly. And to be concrete about why -- a parallel set of controls means twice the auditing surface, twice the failure modes, twice the maintenance. The leading companies don't do that. They extend, they don't duplicate. Cisco is a great example here too because their security posture is so mature that their AI deployments inherit a very deep stack of existing controls. The AI is a new tenant of the existing control plane, not its own control plane.

---

### SEGMENT 5: CISCO AND THE INSTITUTIONAL MEMORY PROBLEM (6 minutes)

**PRIYA:** Speaking of Cisco. Let's talk about them. Because they're a fascinating case study for a different reason. They're a Fortune 100 industrial-ish company with decades of accumulated knowledge across acquisitions, hardware, software, services. Their context problem is on a different scale.

**MARCUS:** Cisco's challenge is what I call the institutional memory problem. A company that's been around for thirty plus years, with hundreds of products, with major acquisitions, with engineers who've retired, has knowledge that exists nowhere coherent. The runbook for a feature lives in someone's head. The reason an architectural decision was made in 2014 lives in a six-thousand-line email chain that's been archived. The customer who got a custom integration in 2017 still has it, but the team that built it has churned three times. Onboarding a new engineer at a company like Cisco is brutal because the knowledge transfer is so expensive.

**PRIYA:** And AI doesn't magically fix this.

**MARCUS:** AI doesn't magically fix it. But a well-built context layer can dramatically improve it. What Cisco has been doing -- and they've talked about this in various forums -- is a systematic effort to capture institutional knowledge into a queryable form. Not just indexing existing docs. Actively interviewing senior engineers, recording architectural decision rationale, building a knowledge graph of how products and customers and integrations connect. The AI then becomes a retrieval interface to that institutional memory. A new engineer can ask "why does the BGP route reflector in this product use timer X instead of timer Y" and get back the actual reasoning from the engineer who made the decision a decade ago, because that reasoning was captured.

**PRIYA:** That's a much more proactive posture than most companies take. Most companies just index what already exists in docs and Slack.

**MARCUS:** And that's the gap. Most companies have a passive context strategy. They index what exists. But the most valuable knowledge often doesn't exist in indexable form. It exists in conversations, in expert minds, in tribal knowledge that nobody bothered to write down because the experts always knew it. The proactive context strategy is to invest in capturing that knowledge. Interview programs. Architectural decision records. Recorded onboarding sessions. The output of that work is fed into the context layer and becomes durable knowledge that survives team transitions.

**PRIYA:** That sounds expensive.

**MARCUS:** It is expensive. But it's also a one-time amortization. Once you've captured the why-did-we-decide-X for your top fifty architectural decisions, you don't have to do it again. Every engineer who joins the company has access to that reasoning forever. The expensive interview is paid back across years of saved onboarding time and avoided re-litigation of old decisions.

**PRIYA:** What's the eval picture for Cisco's institutional memory AI?

**MARCUS:** This is where Cisco's enterprise discipline shows. They treat the institutional AI like any other production system. There's an SLO. There's a quality bar. There's a regression test suite. There's an on-call rotation. The AI doesn't get to be a research project that fails sometimes. It has to meet the same reliability bar as their network management software. Which is a high bar. The discipline that comes with that maturity is honestly one of the most underrated things about enterprise AI. The startups have agility. The large enterprises have operational rigor. The companies that combine both -- a startup-like product velocity with enterprise-like operational maturity -- those are the ones that win the next decade.

**PRIYA:** What does the operational rigor actually look like? Give me a specific.

**MARCUS:** A specific would be the rollback discipline. If a new model is deployed and the eval scores drop, what happens? At a typical company in 2024, the answer was, "someone notices in a Slack channel a week later, we maybe roll back, maybe we just live with it." At a mature deployment, the answer is automated. The eval score is monitored as a metric. If the score drops below a threshold, the model rollout is automatically halted, traffic is shifted back to the previous version, and an incident is created. That's a deployment pipeline. That's what mature looks like. And it's what Stripe, Notion, and Cisco are all building toward, with different levels of completeness depending on how long they've been investing.

---

### SEGMENT 6: WHAT TO DO THIS QUARTER (5 minutes)

**PRIYA:** Let's land it. A listener is the head of platform at a mid-sized enterprise. They're listening to this and they're realizing they don't have a context layer. What should they do this quarter?

**MARCUS:** Three things. First, do a knowledge inventory. Catalog where your company's actual knowledge lives. List every system. List every type of artifact -- docs, code, tickets, conversations, video, data. For each, note who owns it, what the access control model is, how it changes, how stale it tends to be. This is the map. You can't build a context layer without the map. The act of doing the inventory often surfaces the surprising truth that the "single source of truth" your leadership claims you have actually lives in seven different systems with conflicting versions. That's worth knowing.

**PRIYA:** Second?

**MARCUS:** Second, pick one use case and build a real context-grounded AI feature for it. Not the most ambitious use case. Not the most strategic. Pick the one with the cleanest knowledge boundary and the most measurable outcome. Internal IT support is often a great choice. Customer support is often a great choice. Sales engineering support is often a great choice. You build it end to end. You ground it in the right context. You measure it. You learn what's hard, what's easy, what works, what doesn't. That first use case is your learning lab. Don't try to build the platform first in the abstract. Build it through the lens of solving one specific problem really well.

**PRIYA:** That's good advice. I've seen too many "AI platform" projects that built infrastructure for years without a real customer, and the infrastructure was wrong by the time the first customer showed up.

**MARCUS:** Universal failure mode. Build for the customer in front of you. The platform abstractions will emerge naturally from the second and third use case. Third recommendation -- start the eval investment in parallel. The very first thing you do for that pilot use case should be to define what "good" looks like and build an eval suite for it. Even before the model is great. Even before the retrieval is great. The eval suite tells you when you're getting better. Without it, you're guessing. Stripe, Notion, Block, Cisco -- every one of them has talked about this. Evals first.

**PRIYA:** Anything else?

**MARCUS:** One more. Get security in the room from day one. Not as a checkpoint at the end. As a partner from the start. The earliest architecture conversations should include the security architect. The access control model, the audit logging, the data classification scheme -- those should be designed in, not bolted on. The successful enterprises have already done this culturally. The struggling ones are still treating security as a gate.

**PRIYA:** All right. Knowledge inventory, one real use case, evals from day one, security as partner. That's a quarter of solid work. Marcus, before we close, give me the preview for episode three.

**MARCUS:** Episode three is the developer enablement story. How does this context layer, once you've built it, get exposed to product teams in a way that lets them ship AI features quickly and safely. The platform engineering angle. The IDP angle. The internal developer experience angle. And we'll spend a lot of time on Stripe and Block, because both of them have made fascinating bets on what a great AI-native developer platform looks like.

**PRIYA:** That's a topic I'm personally excited about because it's where my platform engineering background lights up. Thanks Marcus. And thanks to all of you for listening. See you in episode three.

**[OUTRO MUSIC]**

---

*Next episode: The Developer Enablement Stack -- how Stripe and Block are turning their internal AI infrastructure into a paved road that any team can ship on.*

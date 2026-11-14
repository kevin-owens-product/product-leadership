# Episode 6: Graph Engineering II: Retrieval Over Graphs
## "Traversal, Ranking, and Where Vectors Stop Working"

**Duration:** ~29 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Control Loop, episode six. Dana Okafor with Theo Lindqvist. Last week we built a code graph. Today we use it, and I want to start by naming the reframe that makes everything else follow.

**THEO:** Which is that retrieval is traversal, not similarity.

**DANA:** Right. The mental model most people carry is: turn the query into a vector, find nearby vectors, return them. One shot, one ranking, done. The graph model is different in kind. You find an entry point, you walk outward along relationships, you accumulate a neighborhood, and you fit that neighborhood into a token budget. It's four distinct phases and each one has its own design decisions.

**THEO:** And I want to be clear that this isn't "graphs replace vectors." That's the strawman version and it's wrong. The correct architecture uses both, and they do genuinely different jobs -- vectors are excellent at the first phase and mediocre at the rest. So the shape of the episode: seeding, expansion, ranking, and budget-fitting. Then the honest comparison of graph versus vector versus hybrid. Then knowledge graphs beyond code, where entity resolution and ontology design become the hard problems. And finally the part that determines whether any of it helps -- how you expose it to the agent.

**DANA:** Let's start at the entry point.

---

### SEGMENT 1: SEEDING (7 minutes)

**THEO:** The seeding problem: you have a natural language task -- "fix the bug where retry logic drops the last attempt" -- and you need to find the nodes in the graph where traversal should start. This is the phase where the query is unstructured and the graph is structured, and you have to cross that gap.

**DANA:** And this is where vectors are actually good.

**THEO:** This is exactly where vectors are good, and it's the thing I want people to take away about hybrid design. The gap between "natural language description of a problem" and "the symbol that implements it" is a semantic gap, and semantic similarity is the right tool for a semantic gap. What vectors are bad at is the *structural* part that comes after.

**DANA:** So what are the seeding strategies?

**THEO:** Four, and I'd run all of them and union the results. One: exact symbol lookup. If the query mentions an identifier that exists in the graph -- `validateToken`, `RetryPolicy` -- that's a seed with very high confidence and it costs a hash lookup. This is trivially cheap and skipping it is a common miss; people jump straight to embeddings and ignore that the user literally named the thing.

**DANA:** Two.

**THEO:** Lexical search. Full-text over identifiers, comments, and docstrings. BM25 or similar. This catches the case where the query's vocabulary matches the code's vocabulary but not exactly -- "retry" matching `retryCount`, `shouldRetry`, `RETRY_LIMIT`. Cheap, and it's notably better than embeddings at rare and specific terms, which code is full of. Embeddings systematically underweight rare tokens; lexical search overweights them, which is what you want for identifiers.

**DANA:** Three.

**THEO:** Semantic search over *documentation-bearing* units. Not chunks -- symbols, with their docstrings and signatures. Embed the function's name, signature, docstring, and maybe its first few lines, as one unit per symbol. This preserves the natural segmentation, and it means a hit is a node in the graph rather than a byte range you then have to map back.

**DANA:** That's a meaningful design detail. The embedding index is over graph nodes, so a semantic hit is immediately a traversal starting point.

**THEO:** That's the whole trick of the hybrid architecture, honestly. Keep one identity space. Every retrieval mechanism returns node IDs. Then you can union, intersect, and rank across mechanisms because they're all speaking about the same objects. The moment your vector index returns chunk offsets and your graph returns symbols, you have an impedance mismatch and you'll spend real effort on reconciliation.

**DANA:** And the fourth seeding strategy.

**THEO:** Recency and activity. What's changed recently, what's the agent already looking at, what did the user mention in the last message. This isn't a search at all -- it's context. If the agent just opened `retry.go`, that's a seed regardless of what the query says. Cheap, and it captures intent that the query text doesn't state.

**DANA:** How do you combine four seed sets with different score scales?

**THEO:** Reciprocal rank fusion, which is the boring correct answer. You don't try to normalize scores across mechanisms, because BM25 scores and cosine similarities aren't comparable and any normalization you invent will be arbitrary. Instead you use each mechanism's *rank* and combine with a formula that's a sum of one over rank plus a constant. It's robust, it needs no tuning, and it consistently beats hand-weighted score blending. Whenever someone tells me they're tuning fusion weights, I suggest they try rank fusion first and usually that's the end of the project.

**DANA:** How many seeds do you want?

**THEO:** Fewer than people expect. Five to ten. The reason is that expansion multiplies -- each seed brings its neighborhood, so twenty seeds with a neighborhood of thirty each is six hundred candidates, and now your ranking problem is harder than your seeding problem was. Precision at the seed stage pays off multiplicatively downstream.

---

### SEGMENT 2: EXPANSION POLICY (8 minutes)

**DANA:** Now the walk. I have seeds. How far do I go and along which edges?

**THEO:** This is where the real engineering is, and the key insight is that expansion should be *typed and asymmetric*. Not "expand two hops in all directions." Different edge types deserve different treatment, and the right treatment depends on the task.

**DANA:** Make that concrete.

**THEO:** Take the task "I'm changing the signature of this function." What do you need? Every caller -- so inbound `calls` edges, and you want *all* of them, exhaustively, because a missed one is a broken build. Do you need the functions this one calls? Barely -- its callees are unaffected by its signature. So for that task: inbound calls, unlimited breadth, one hop. Outbound calls, maybe one hop at low priority.

**DANA:** Now a different task.

**THEO:** "I'm trying to understand what this function does." Now it's inverted. You want outbound calls -- what does it use, what are those things -- probably two hops to get the shape of its implementation. Inbound callers are much less relevant; you don't need to know who calls it to understand it, though one or two examples of usage are genuinely helpful. So: outbound calls two hops, inbound calls one hop capped at three examples.

**DANA:** So expansion policy is task-conditional.

**THEO:** Task-conditional, and this is the single biggest difference between a code graph that helps and one that just adds noise. A fixed "expand two hops" policy gives you the union of everything anyone might want, which for a well-connected symbol is hundreds of nodes of which four matter. The classification of the task into an expansion profile is worth doing, and it's cheap -- a small set of profiles selected by a fast classifier or even by which tool the agent called.

**DANA:** Give me the profiles you'd ship.

**THEO:** Five. "Impact" -- inbound references and calls, exhaustive, plus tests that cover the target, plus co-change neighbors. That's for change-safety questions. "Comprehension" -- outbound calls and type dependencies, two hops, plus the defining module. "Debugging" -- outbound calls plus tests plus recent changes to anything in the neighborhood, because a recent change nearby is a prime suspect. "Example" -- other call sites of the same function, capped small, for "how do I use this." And "surface" -- module-level imports and exports only, no symbol detail, for orientation in an unfamiliar area.

**DANA:** Let's talk about the fan-out explosion, because I assume that's the failure mode.

**THEO:** It's the dominant failure mode. Real code graphs have hub nodes -- a logging function called from four thousand places, a base class everything inherits from, a utility module everyone imports. Expand one hop from a hub and you've retrieved the entire repository.

**DANA:** How do you handle hubs?

**THEO:** Three mechanisms. First, degree-based damping: nodes above a degree threshold don't expand, or expand with heavily discounted scores. A function with four thousand callers tells you nothing by being connected to something -- the edge carries almost no information. This is the same intuition as inverse document frequency, and you can literally use that formulation: an edge's informativeness is inversely related to the degree of its endpoints.

**DANA:** That's a clean way to put it. High-degree edges are stop words.

**THEO:** High-degree edges are stop words, exactly. Second mechanism: budget-bounded frontier expansion. Instead of expanding by hops, you expand by best-first search -- maintain a priority queue of frontier nodes scored by relevance, pop the best, expand it, until you've collected enough. This is much better than hop-based expansion because it naturally spends its budget where the signal is instead of uniformly.

**DANA:** And that gives you an anytime property.

**THEO:** It does, which is nice operationally -- you can stop whenever the budget runs out and you have the best set found so far. Third mechanism: path-based scoring, where a node's score decays with the length and quality of the path from the seed. A node three hops away through two low-confidence edges scores far below a node one hop away through a resolved call edge. That decay factor is the main knob and it wants to be aggressive -- something like halving per hop, and further discounting per unit of confidence lost.

**DANA:** What about paths that arrive at the same node multiple ways?

**THEO:** Boost it. A node reachable from three different seeds by three different paths is much more likely to be central to the task than one reachable from a single seed. Multi-path arrival is one of the strongest relevance signals in the whole system and it's something pure similarity search can't express at all -- it's inherently a structural property. If I had to name the single thing graph retrieval gives you that vectors can't, it's this.

---

### SEGMENT 3: RANKING AND BUDGET-FITTING (6 minutes)

**DANA:** So now I have a scored neighborhood, and it's bigger than my budget. What goes in?

**THEO:** First, decide the *unit* of inclusion, because this is where a lot of implementations go wrong. Do you include whole files, whole symbols, or signatures only? My default is a three-tier representation and I'd say it's the highest-leverage idea in this segment. Tier one: full source of the small number of things the agent is directly working on. Tier two: signature plus docstring for things in the immediate neighborhood -- enough to know what they do and how to call them, without the bodies. Tier three: name and location only, for the outer neighborhood, so the agent knows they exist and can ask.

**DANA:** So you're spending tokens proportional to relevance rather than including or excluding.

**THEO:** Right, and the compression ratio is dramatic. A function might be four hundred tokens of body and thirty tokens of signature-plus-docstring. So tier two costs you seven percent of tier one and preserves most of what a caller needs. You can cover a neighborhood ten times larger for the same budget. And critically, tier three is nearly free -- a line per node -- and it eliminates the worst failure of retrieval, which is the agent not knowing that something exists.

**DANA:** That's the unknown-unknown problem.

**THEO:** It's the killer, and it's why I'd always spend a little budget on breadth. An agent that retrieves five perfectly relevant files and doesn't know about the sixth will confidently produce an incomplete change. An agent that got four files in full plus a list of forty names, one of which looks relevant, will ask for the fifth. Breadth at low fidelity converts an unknown-unknown into a known-unknown, and agents handle known-unknowns well.

**DANA:** How do you allocate across the tiers?

**THEO:** Rough starting point: half the retrieval budget to tier one, a third to tier two, and the remainder to tier three. Then adjust by task -- comprehension tasks want more tier one, impact analysis wants more tier two and three because breadth is the point. And enforce a hard floor on tier three so it never gets squeezed to zero, because that's the tier that prevents the failure I just described.

**DANA:** Any ordering guidance within the retrieved block?

**THEO:** Yes, and it ties back to episode two. Most relevant last, closest to the model's turn, because that's the high-attention position. And group by file with clear path headers, because the agent needs to know where things live to act on them. An undifferentiated soup of code fragments without locations is nearly useless -- the agent can't edit what it can't locate.

**DANA:** Do you include the graph structure itself, or just the code?

**THEO:** Include a compact structural summary, and this is underused. Something like: "`processPayment` is called by these six functions, calls these four, is covered by these two tests, and lives in a module that imports these three." Fifty tokens. It gives the agent the topology explicitly rather than making it infer topology from a pile of source. I've seen that one addition meaningfully reduce the number of exploratory tool calls, which pays for itself immediately.

---

### SEGMENT 4: THE HONEST COMPARISON (6 minutes)

**DANA:** Let's do graph versus vector versus hybrid honestly, including where the graph loses.

**THEO:** Where the graph wins decisively: any question whose answer is defined by a relationship. Who calls this. What breaks if I change this. What does this module depend on. What tests cover this. These have exact answers, the graph has them, and similarity search approximates them badly.

**DANA:** And where does the graph lose?

**THEO:** Three places, and they're real. First, conceptual queries with no structural anchor. "Where do we handle rate limiting?" If there's no symbol named anything like rate limiting, and the implementation is spread across a middleware and a config, the graph has no entry point. Vectors find it because the docstring says "throttle incoming requests." Second, cross-artifact queries where the artifacts aren't code -- design docs, incident reports, chat threads. Those aren't in your code graph, and semantic search over them is the right tool.

**DANA:** And third?

**THEO:** Novelty and analogy. "Show me code that does something similar to this" is a similarity question by definition. The graph can tell you what's *connected* to something; it can't tell you what *resembles* it. If your task is "find another place where we solved this shape of problem," embeddings are the correct instrument.

**DANA:** So the hybrid architecture.

**THEO:** Vectors and lexical search for seeding and for unstructured artifacts. Graph for expansion, impact, and exact structural relations. Rank fusion to combine. One node identity space so everything is comparable. And -- this is the part I'd emphasize -- the graph should be able to *ingest* non-code artifacts as nodes. A design document that mentions three symbols becomes a node with three edges. An incident report that names a service becomes connected. Now your semantic search over documents produces seeds that traverse into code, and you have one system instead of two.

**DANA:** How do you get those links from a document to a symbol?

**THEO:** Mostly cheaply. Explicit code references in the document -- backticked identifiers, file paths, links. Those resolve directly. Then a pass that matches capitalized or camel-case tokens against symbol names, with disambiguation by document context. It's imprecise and that's fine -- these are seeding aids with confidence attached, not authoritative edges. The precision bar for "this document might be relevant to this symbol" is much lower than for "this function calls this function."

---

### SEGMENT 5: KNOWLEDGE GRAPHS BEYOND CODE (7 minutes)

**DANA:** Let's go past code, because the same machinery applies to company knowledge and the problems change character.

**THEO:** They change a lot, and the reason is that code has a free, exact, machine-checkable structure and organizational knowledge does not. Everything that was mechanical in the last episode becomes a judgment call. So the two hard problems become entity resolution and ontology design.

**DANA:** Start with entity resolution.

**THEO:** The problem: the same real-world thing appears under many names across many sources. "The billing service," "billing-svc," "BillingAPI," the repository named `payments-core`, and the team's internal codename. These are one entity in five surface forms and if you don't resolve them, your graph has five disconnected nodes and every query gets a fifth of the answer.

**DANA:** How do you approach it?

**THEO:** Layered, cheapest first. Exact and normalized matching -- case folding, punctuation stripping, common suffix removal. That gets a surprising amount. Then alias tables, which are manually curated and are the highest-value thing a human can contribute to a knowledge graph; a hundred hand-written aliases often outperform a sophisticated matcher. Then identifier-based joins -- if two records share a repository URL or a service ID or a ticket key, they're the same thing regardless of names. Then, last, embedding similarity with a human review queue for anything ambiguous.

**DANA:** Why is the human queue non-negotiable?

**THEO:** Because entity resolution errors are *catastrophic* rather than merely wrong, and asymmetrically so. A false merge collapses two distinct things into one, and now every query about either returns facts about both, and the graph confidently asserts things that aren't true. A false split just means you get partial answers. So you tune conservatively -- prefer splits to merges -- and you route the uncertain middle to a person. Automatic aggressive merging is how a knowledge graph becomes untrustworthy in a way that's very hard to detect afterward.

**DANA:** Now ontology design. What's the failure mode there?

**THEO:** Two opposite ones. Over-specification: someone designs a beautiful ontology with forty entity types and a hundred relation types before ingesting any data. It's coherent, it's principled, and the actual data doesn't fit it, so ingestion becomes a series of judgment calls that different people make differently, and the graph becomes internally inconsistent. Under-specification: everything is a generic node with a generic "related to" edge, and now you can't query anything meaningfully because relatedness has no semantics.

**DANA:** So what's the middle?

**THEO:** Start small and let data drive expansion. Five to eight entity types, ten to fifteen relation types, derived from *the questions you actually want to answer*, not from a model of the domain. Write down the twenty queries the system must serve. The entity and relation types are whatever those queries require, and nothing else. Then when a query you can't serve appears, extend deliberately with a migration.

**DANA:** Which raises schema drift.

**THEO:** Which is the operational problem nobody plans for. Your ontology will change, and you'll have millions of facts asserted under the old one. So: version the schema, store the schema version on every fact, and write real migrations rather than editing in place. And keep raw source material for everything -- if a fact was extracted from a document, keep a pointer to the document and the span. Then a schema change means re-extraction rather than data loss, which is the difference between a change taking an afternoon and being impossible.

**DANA:** What about extraction quality generally? Because you're using a model to turn documents into facts.

**THEO:** Two disciplines. Every extracted fact carries provenance -- source document, span, extraction timestamp, extractor version. Non-negotiable, for the reason above and because it's the only way to audit a wrong answer back to its cause. And extraction confidence should be surfaced in query results, so a retrieved fact can be presented as "asserted with medium confidence from a design doc dated eighteen months ago" rather than as ground truth. An organizational knowledge graph is full of things that were true once, and a system that presents stale facts with the same authority as current ones will burn its credibility fast.

---

### SEGMENT 6: EXPOSING IT TO THE AGENT (5 minutes)

**DANA:** Last segment, and you said this is where good graphs go to die.

**THEO:** It really is. You can build a beautiful graph and get no benefit because the interface is wrong. Two architectural choices: preloaded context, or a tool the agent calls.

**DANA:** Argue both.

**THEO:** Preloading: run the retrieval before the agent's turn, based on the task, and inject the neighborhood. Advantages -- zero latency in the loop, no round trips, and the agent can't fail to use it. Disadvantage -- you're guessing what it needs before it starts, and you pay for the context whether or not it's used. Tool-based: the agent asks. Advantages -- it asks for what it actually needs, at the moment it needs it, and can iterate. Disadvantage -- a round trip per query, and the agent may not know the tool exists or may not think to use it.

**DANA:** And the answer is both.

**THEO:** Both, in a specific arrangement that I'd call the standard shape. Preload a compact orientation -- the structural summary of the immediate task area, tier three breadth, maybe two hundred to five hundred tokens. That gives the agent a map and, importantly, makes it aware that structural information is available. Then expose graph queries as tools for the follow-ups. The preload primes the tool use, which is the part people miss -- an agent that's been shown a call graph summary is far more likely to ask for another one than an agent that's never seen the concept.

**DANA:** Let's talk about the tool design specifically. What does the graph tool surface look like?

**THEO:** A small number of task-shaped tools, not a query language. This is the mistake I see most: someone exposes a general graph query interface, and the agent writes bad queries, or doesn't know the schema, or asks for a traversal that returns nine thousand nodes. Instead, expose the profiles from segment two directly: `find_callers`, `find_definition`, `impact_of_change`, `tests_covering`, `module_surface`. Each takes a symbol or path and returns a budgeted, formatted result.

**DANA:** So the expansion policy is baked into the tool rather than exposed as parameters.

**THEO:** Baked in, because the policy is the expertise. You know that impact analysis wants exhaustive inbound calls plus tests plus co-change neighbors with hub damping. The agent doesn't and shouldn't have to. A tool named for the *question* rather than for the *mechanism* is easier to select correctly, harder to misuse, and lets you improve the policy later without changing the interface.

**DANA:** What does the result format look like?

**THEO:** Three properties. Always include locations -- file and line for every item, so the agent can act. Always state completeness -- "twelve of twelve callers" or "showing twenty of two hundred and forty, filtered to non-test code," because a truncated list that looks complete is exactly the silent-partial-coverage failure from episode three. And include the structural summary line, so the agent gets the shape and not just the items.

**DANA:** How do you know if the graph tools are actually helping?

**THEO:** Measure three things against a baseline without them. Tool calls to first mutation, which should drop -- that's the orientation efficiency metric from episode one. Total tokens per resolved task, which should drop meaningfully. And for impact-style tasks, a recall metric against ground truth -- did the change touch every site it needed to? If you built the graph from a repository with history, you can generate that ground truth from past refactoring commits, exactly as we discussed last week for evaluating resolution. Same trick, different use.

---

### CLOSING (3 minutes)

**DANA:** Landing it. Retrieval over a graph is four phases -- seed, expand, rank, fit -- and each has its own decisions. Vectors are genuinely good at phase one and weak at the rest, which is the honest basis for hybrid design.

**THEO:** Seed with four mechanisms in parallel -- exact symbol lookup, lexical, semantic over symbol-granular units, and recency -- and fuse by reciprocal rank rather than tuning score weights. Keep one node identity space across all mechanisms or you'll spend your life on reconciliation.

**DANA:** Expansion should be typed, asymmetric, and task-conditional. Ship a handful of profiles -- impact, comprehension, debugging, example, surface -- rather than a fixed hop count. Damp high-degree hubs, because high-degree edges are stop words. Use best-first frontier expansion for the anytime property. And boost multi-path arrival, which is the strongest signal the graph gives you that vectors structurally cannot.

**THEO:** Fit the budget with three tiers of fidelity -- full source, signature plus docstring, name only -- and protect the cheap breadth tier, because its job is converting unknown-unknowns into known-unknowns. Put the most relevant material last, group by file with paths, and include a compact structural summary.

**DANA:** Beyond code, the hard problems become entity resolution and ontology design. Resolve conservatively, prefer splits to merges, curate aliases by hand, and keep a human queue for the ambiguous middle -- false merges poison a graph in ways that are very hard to detect. Design the ontology from the queries you must answer, version it, keep provenance and raw sources so schema changes mean re-extraction rather than loss.

**THEO:** And expose it as a preloaded orientation plus a small set of question-shaped tools with the expansion policy baked in. Always give locations, always state completeness.

**DANA:** Next episode we start the harness pair. Tools as an API surface, why your tool descriptions are prompts, permission models, sandboxing, and the thing that quietly determines more of your agent's quality than your system prompt does -- what a tool returns when it fails.

**THEO:** That's my hill and I will be dying on it.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

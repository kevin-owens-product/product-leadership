# Episode 5: Graph Engineering I: Building the Code Graph
## "Parsing, Resolution, and Incremental Indexing"

**Duration:** ~29 minutes
**Hosts:** Dana Okafor & Theo Lindqvist
**Podcast:** Control Loop -- The Engineering Under the Agent

---

### INTRO (4 minutes)

[INTRO MUSIC]

**DANA:** Welcome to Control Loop. Dana Okafor and Theo Lindqvist. We're halfway through the season and we're switching layers. The first four episodes were about the loop -- control flow, context, topology, verification. Today and next week we go underneath it, to the thing that feeds it. Retrieval.

**THEO:** And I want to make the case for why this deserves two episodes, because "retrieval" sounds like a solved commodity. Here's the case. Every failure mode we've discussed -- thrash, wandering, premature completion, context saturation -- has retrieval quality as a contributing cause. An agent that can find the right three files in two steps does not saturate its context. An agent that reads forty files to find the same information saturates in fifteen steps and then makes worse decisions for the rest of the run.

**DANA:** So retrieval quality propagates into every other metric.

**THEO:** It propagates into all of them, and it's the cheapest place to intervene because it's outside the model. You can improve retrieval without touching your prompts, your loop, or your model choice. And most teams are running a retrieval strategy for code that was designed for prose.

**DANA:** Let's say that plainly, because it's the thesis. What's wrong with embedding chunks of code?

**THEO:** Several things, and I want to be fair -- it's not useless, it's mismatched. Embeddings capture semantic similarity in a continuous space. That's the right tool when the query and the answer are *about the same topic* but phrased differently. That's how prose works. Code doesn't primarily work that way. The thing you need when you're changing a function is not the code that's *semantically similar* to it -- it's the code that *calls* it. Those are different relations, and one of them is a graph edge that exists exactly and unambiguously in the source, and the other is a fuzzy distance.

**DANA:** Give me the concrete failure.

**THEO:** You're modifying a function called `validateToken`. You need every call site. Embedding search returns: other validation functions, other token-related functions, a test file about tokens, some documentation about authentication. All topically related. It may well miss the one call site in a file about billing, because that file is topically about billing and the reference is one line. Meanwhile a call-graph query returns exactly the call sites, all of them, with no false positives, in a millisecond.

**DANA:** And the second failure is chunking.

**THEO:** Chunking is its own disaster for code. Fixed-size chunks split functions in half. A chunk containing the bottom half of one function and the top half of the next is semantically incoherent -- it embeds to a point in space that corresponds to nothing. And critically, chunks lose the thing code has that prose doesn't: an exact, machine-readable structure that tells you where the boundaries are. You're throwing away a free, perfect segmentation and replacing it with byte counts.

**DANA:** So today: build the graph. Parsing, what the nodes and edges are, the hard problem of resolution, storage, and incremental maintenance. Next week: how to query it, and how it combines with vectors rather than replacing them.

---

### SEGMENT 1: PARSING, AND WHY THE AST ISN'T ENOUGH (7 minutes)

**THEO:** Start at the bottom. To build a graph over code you need to parse it, and you have four options with real trade-offs.

**DANA:** Enumerate.

**THEO:** Option one, regular expressions. I mention it only to dismiss it, but with a caveat: it's fine for a first cut of "where does this identifier appear," and it's genuinely useful as a *seeding* mechanism, which we'll get to next episode. It is not a basis for a graph, because it can't distinguish a definition from a reference from a comment from a string literal.

**DANA:** Option two.

**THEO:** Tree-sitter, or an equivalent incremental parser generator. This is what I'd recommend as a default and it's what most modern code intelligence is built on. Properties that matter. It's error-tolerant -- it produces a usable tree from code that doesn't compile, which is essential because a large fraction of the code an agent looks at is mid-edit and broken. It's incremental -- re-parsing after a small edit is proportional to the edit, not the file. It has grammars for essentially every language you care about, with a uniform interface. And it has a query language, so you can express "find all function definitions" declaratively per grammar rather than walking trees by hand.

**DANA:** What doesn't it give you?

**THEO:** Semantics. And this is the key limitation, so let me be precise. Tree-sitter gives you a *concrete syntax tree*. It tells you this is a function definition, this is a call expression, this identifier is here. It does not tell you what that identifier *refers to*. When you see `foo.bar()`, tree-sitter tells you there's a method call named `bar` on something named `foo`. It has no idea what `foo` is or which `bar` you got.

**DANA:** Which is the entire hard problem.

**THEO:** That's the entire hard problem and we'll spend a segment on it. Option three: the language's own compiler or type checker, accessed as a library. This gives you real semantics -- full name resolution, type information, everything the compiler knows. It's dramatically more accurate and it costs you: per-language integration work, a requirement that the code actually compiles, and much slower analysis. For a single-language codebase where accuracy matters, it's often the right call.

**DANA:** Option four.

**THEO:** Language Server Protocol, and the related index formats -- SCIP being the current best of them, LSIF being the older one. The idea is to consume the same analysis a language server does for your editor, either live over the protocol or precomputed into an index file. You get cross-language uniformity with real semantics, because each language's own server does the hard part.

**DANA:** What's the catch with LSP?

**THEO:** Two catches. Live LSP is stateful and slow to warm -- a language server on a large repository can take minutes to index before it answers anything, and it holds a lot of memory. That's fine for an editor you keep open and painful for a batch indexing job. And the protocol is designed around editor interactions -- "go to definition at this cursor position" -- rather than around bulk extraction. Asking it for the whole graph means a lot of individual position queries.

**DANA:** Which is why the precomputed index formats exist.

**THEO:** Exactly. SCIP in particular is designed for exactly this: a language-specific indexer runs once, emits a document with every symbol, every definition, and every reference in a uniform schema, and you load it. That's a very good foundation for a code graph and I'd reach for it when a mature indexer exists for your language.

**DANA:** So what's the practical recommendation?

**THEO:** Hybrid, tiered by accuracy need. Tree-sitter as the universal baseline -- it works on everything, always, including broken files. Layer semantic indexes on top for your primary languages where they exist. Accept that your graph has regions of different confidence and *record that confidence on the edges*. An edge that came from a real type checker and an edge that came from name matching are different facts, and downstream ranking should know which is which.

---

### SEGMENT 2: NODES AND EDGES (8 minutes)

**DANA:** Let's design the schema. What's a node?

**THEO:** I use five node types and I'd argue against adding more without a specific need. File -- a path in the repository. Module or package -- the language's unit of namespacing. Symbol -- a named, defined thing: function, method, class, type, constant, variable at file scope. Type, which I keep separate from symbol because type relationships are their own graph and mixing them makes queries messy. And what I'd call an external -- a symbol that is referenced but defined outside the indexed code, so a third-party dependency or a standard library function.

**DANA:** Why does external deserve its own type?

**THEO:** Because it's the boundary of your knowledge and you want to be able to see it. Queries frequently want "everything internal" or "what external surface does this module touch," and having a distinct node type makes both trivial. It also stops you from silently creating phantom nodes for things you can't resolve, which is a real trap -- you end up with a graph that looks complete and is full of stubs.

**DANA:** Now the edges, which is where the value is.

**THEO:** Eight that carry their weight. `defines`: a file or module defines a symbol. `references`: a symbol or file references a symbol -- the general case. `calls`: a specific kind of reference where the referent is invoked. I keep it separate from references because call relationships are the single most queried relation and you want them cheap.

**DANA:** Keep going.

**THEO:** `imports`: module-level dependency. `inherits` or `implements`: type hierarchy. `has_type`: a symbol's type is a type node -- this is what lets you answer "what functions take a `Config`." `tests`: a test symbol exercises a target symbol, which is enormously valuable and usually derivable from naming conventions plus imports plus call edges. And `co_changes`: two files have historically changed together, derived from version control history.

**DANA:** That last one is different in kind from the others.

**THEO:** Completely different, and it's my favorite edge in the whole schema. Everything else is derived from the source code as it exists. `co_changes` is derived from *history* -- from the record of what humans actually modified together. It captures coupling that has no syntactic expression. A configuration file and a deployment script that have no import relationship whatsoever but change together eighty percent of the time are coupled, and no static analysis will ever tell you that.

**DANA:** How do you compute it?

**THEO:** Walk the commit history, and for each commit take the set of changed files and increment a pairwise counter. Then normalize -- raw co-change counts are dominated by files that change constantly, so you want something like the conditional probability that B changed given A changed, or a lift score against the base rates. Filter out commits that touch a huge number of files, because a repo-wide reformat or a dependency bump correlates everything with everything and is pure noise. That filter matters a lot; without it your top co-change pairs are all garbage.

**DANA:** Any other history-derived signals worth having?

**THEO:** Two. Recency of change, as a node property -- code modified last week is more likely relevant to current work than code untouched for four years. And churn, the frequency of modification, which is a decent proxy for both risk and importance. Both are cheap to compute in the same history pass and both are useful ranking inputs next episode.

**DANA:** What about edge properties?

**THEO:** Three that I always carry. Location -- the file and line where the relationship is expressed, because next episode we're going to insist that every retrieved fact carries a pointer to its source. Confidence, as we discussed, reflecting whether this came from semantic analysis or heuristic matching. And a timestamp or version marker, which is what makes staleness detection possible.

**DANA:** Is there a node type you'd argue *against* including, that people commonly add?

**THEO:** Yes -- individual statements or expressions. People sometimes want a node per AST node, so the graph is a full program representation. Don't. The graph explodes by two or three orders of magnitude, queries get slow, and you gain almost nothing for retrieval purposes, because an agent retrieves at the granularity of symbols and files, not expressions. Keep the AST as a thing you can re-derive by parsing, and keep the graph at the granularity you actually query.

---

### SEGMENT 3: RESOLUTION, THE HARD PART (9 minutes)

**DANA:** Now the part you've flagged twice. Resolution. Turning "an identifier named `bar`" into "an edge pointing at this specific definition."

**THEO:** Let me lay out why it's hard by escalating through cases. Easy case: a local variable in a function with an explicit declaration. Lexical scoping resolves it, tree-sitter can basically do it, you're fine. Slightly harder: a call to a module-level function in the same file. Still easy. Harder: a call to an imported function -- now you have to resolve the import, which means understanding the module resolution rules of the language, which for something like JavaScript means understanding the resolution algorithm, the package manifest, path aliases in the build config, and possibly a bundler's configuration.

**DANA:** And that's before dynamic behavior.

**THEO:** That's before anything dynamic. Now the genuinely hard cases. Method calls on values whose type isn't locally evident. In a statically typed language with inference, you need the type checker. In a dynamically typed language, you may need to be honest that you cannot resolve it at all. `x.process()` where `x` came from a function that returns one of four types -- there are four candidate targets and no static answer.

**DANA:** What do you do in that case?

**THEO:** You record all four candidates as edges with lowered confidence, rather than picking one or dropping all. This is the design principle I'd defend hardest in this segment: an ambiguous edge set with honest confidence is far more useful than either a confident guess or silence. A retrieval layer can present four candidates to an agent and let it disambiguate from context, which it's actually good at. It cannot recover from an edge you didn't record.

**DANA:** Other hard cases.

**THEO:** Dynamic dispatch through interfaces -- a call to an interface method could land on any implementation, and often you want all of them. Reflection and dynamic invocation, where the target is computed at runtime from a string; frequently unresolvable and worth flagging as a known blind spot rather than pretending. Generated code, where the definition doesn't exist in the repository until a build step runs. Macros and code generation at compile time, same problem. And cross-language boundaries -- a frontend calling a backend endpoint, a service calling another service over a protocol definition.

**DANA:** That cross-language one seems increasingly important and least served.

**THEO:** It's the biggest gap in commodity tooling, and it's where a custom indexer earns its cost. The pattern that works: identify the *contract artifacts* -- the OpenAPI spec, the protobuf definition, the GraphQL schema, the shared types package -- and index those as first-class nodes. Then link both sides to the contract rather than trying to link them directly to each other. Now "what breaks if I change this endpoint" is a two-hop query through the contract node, and it works across the language boundary because the contract is the shared vocabulary.

**DANA:** That's a nice pattern. What about monorepo boundaries generally?

**THEO:** Package boundaries are worth modeling explicitly, because they change what a reference *means*. A reference within a package is an implementation detail. A reference across a package boundary is an API dependency with different change semantics. If your graph doesn't distinguish them, "who uses this function" gives an undifferentiated list where some entries are trivially changeable and others are breaking changes for another team.

**DANA:** Let's talk about the accuracy budget. How good does resolution have to be?

**THEO:** Better than people assume for the queries that matter, and the asymmetry is worth understanding. For "find the definition of this symbol," you need high precision -- a wrong answer sends the agent to the wrong place and it may not notice. For "find all references," you need high recall -- a missed call site is a broken build later, and an extra candidate is a cheap false positive the agent discards. So you should tune differently per query type, which means your resolver needs to expose confidence rather than just emitting edges.

**DANA:** How do you evaluate resolution quality?

**THEO:** Build a labeled set, and there's a cheap way to do it that I recommend. Take your repository's own history: for each renamed symbol in the history, the commit that renamed it tells you exactly which references were real, because the compiler forced the human to update all of them. That gives you ground truth for reference resolution, for free, at scale, without labeling anything by hand. It's one of the nicest evaluation tricks I know and almost nobody uses it.

**DANA:** That's genuinely clever.

**THEO:** It generalizes too. Any refactoring commit -- a move, a signature change, a type change -- is a labeled example of "these locations were coupled." Your version history is a large, free, human-verified dataset about the structure of your code, and most code intelligence systems ignore it entirely.

---

### SEGMENT 4: STORAGE AND QUERY PERFORMANCE (6 minutes)

**DANA:** Where does the graph live? Everyone assumes graph database, and I don't think that's obvious.

**THEO:** It isn't obvious and I'd usually argue against it for a first system. Three options. A dedicated graph database gives you a real traversal query language and good performance on deep multi-hop queries. The costs are operational -- another service to run, back up, and scale -- and the fact that most code graph queries are actually quite shallow.

**DANA:** How shallow?

**THEO:** One to three hops, overwhelmingly. "What calls this." "What does this file import." "What tests cover this function, and what do those tests also touch." I profiled a production retrieval layer once expecting deep traversals and found that ninety-plus percent of queries were two hops or fewer. At that depth, a relational database with a well-indexed edge table is completely adequate and often faster, because you avoid the traversal engine's overhead and you get to use ordinary joins.

**DANA:** So option two is just a relational schema.

**THEO:** A `nodes` table and an `edges` table, indexed on source, target, and edge type. In something embeddable so there's no service to run. A two-hop query is a self-join. It's boring and it works and you can put the whole thing in a file that ships alongside the repository. For most code graphs -- even large ones, hundreds of thousands of symbols -- this is the right answer and the operational simplicity is worth a lot.

**DANA:** And option three?

**THEO:** In-memory adjacency structures, built at startup from a serialized form. Fastest possible queries, no storage engine at all, and the constraint is that the whole graph must fit in memory and rebuild time must be tolerable. For a single repository this is very often fine -- a graph with a million edges is tens of megabytes in a compact representation. This is what I'd choose for a latency-critical path.

**DANA:** When would you actually want the graph database?

**THEO:** When you have genuinely deep or variable-depth traversals -- transitive dependency closure across a large dependency graph, or path-finding queries like "how does data get from this input to this output," which can be many hops. Also when the graph spans many repositories and doesn't fit the single-repo assumptions. Those are real cases; they're just not the starting case, and starting there costs you weeks of operational work before you've validated that the retrieval helps at all.

**DANA:** What's the latency target?

**THEO:** Under fifty milliseconds for a typical query, and I'd hold that line firmly. Here's why it matters more than it sounds: if graph queries are fast, you can afford to run several per agent step, speculatively, without the agent asking. Pre-fetching the neighborhood of whatever file the agent just opened costs nothing at ten milliseconds and is prohibitive at two seconds. Latency determines whether the graph is something the agent occasionally consults or something the harness continuously exploits.

---

### SEGMENT 5: INCREMENTAL INDEXING AND STALENESS (5 minutes)

**DANA:** The graph is a derived artifact and the source changes constantly, including changes the agent itself makes. How do you keep it fresh?

**THEO:** Three tiers, and you want all three. Tier one: full rebuild. Slow, correct, run on a schedule or on a significant change. Tier two: incremental update on file change -- reparse the changed file, remove its outgoing edges, recompute them. Fast, seconds at most. Tier three: invalidation of *affected* edges, which is the subtle one.

**DANA:** Explain the difference between two and three.

**THEO:** When a file changes, its own outgoing edges are obviously stale and tier two handles them. But edges *pointing at* symbols in that file may also be stale -- if you deleted a function, every call edge to it is now dangling; if you renamed it, every reference is wrong. Those edges live in other files that didn't change. So a change has an invalidation *cascade* that extends to the inbound neighborhood.

**DANA:** How far does the cascade go?

**THEO:** One hop, for structural correctness -- the inbound references to changed symbols. It doesn't propagate further in general, because a change to a function body doesn't invalidate anything about its callers' callers. The exception is signature and type changes, which can propagate through type inference in a statically typed language. My practical approach: handle one hop precisely, and use a periodic full rebuild to catch the residue rather than trying to compute a perfect transitive invalidation. The perfect version is a lot of work for the last few percent of correctness.

**DANA:** What about the agent's own edits during a run? That seems like the acute case.

**THEO:** It's the acute case and it's badly handled almost everywhere. An agent modifies a file at step twelve and queries the graph at step fourteen. If the graph reflects step-zero state, the agent gets stale answers about code it wrote itself, which is confusing in a distinctive way -- it will re-read the file, see its own change, and get contradictory information from two sources.

**DANA:** So you re-index on write.

**THEO:** Re-index the changed file synchronously on write, as part of the write tool. It's a tree-sitter parse plus an edge update -- tens of milliseconds. Make it part of the tool's contract rather than a background job, because a background job introduces a race where the agent's next query may or may not see the update, and intermittent staleness is worse than consistent staleness.

**DANA:** And staleness as an explicit concept?

**THEO:** Every node and edge carries the version it was derived from. Every query result reports the oldest version it touched. Then the retrieval layer can say "this answer is based on an index from three commits ago" and the agent can decide whether to trust it or re-read. That's a small amount of plumbing that turns a silent correctness problem into a visible one, which is the trade I'd make every time.

**DANA:** What about branches? An agent working on a feature branch against an index built from main.

**THEO:** Index the merge base and overlay the branch diff. You reparse only the files the branch touched -- usually a handful -- and layer those edges over the base index. It's cheap, it's correct for the changed region, and it avoids maintaining a full index per branch, which doesn't scale past a few developers.

---

### CLOSING (3 minutes)

**DANA:** Let's land it. Embeddings over code chunks are a mismatch: the relation you need is usually structural -- who calls this, who imports this -- and that relation exists exactly in the source. Chunking also destroys a free perfect segmentation.

**THEO:** Parse with tree-sitter as the universal error-tolerant baseline, layer real semantic analysis via LSP or SCIP or the compiler where it exists, and record edge confidence so downstream ranking knows which facts are solid.

**DANA:** Five node types -- file, module, symbol, type, external -- and eight edges: defines, references, calls, imports, inherits, has type, tests, co-changes. The co-change edge is derived from version history rather than source, and it captures coupling that no static analysis can see. Filter out the giant commits or it's noise.

**THEO:** Resolution is the hard part. Record ambiguous candidates with lowered confidence rather than guessing or dropping. Model contract artifacts as first-class nodes to bridge language boundaries. Model package boundaries because a cross-package reference means something different from an internal one. And use your own refactoring history as free labeled ground truth for evaluating resolution quality.

**DANA:** On storage: most code graph queries are two hops or fewer, so a well-indexed relational or in-memory structure is usually the right answer, and a graph database is a later decision, not a starting one. Hold a fifty-millisecond latency target, because fast queries let the harness prefetch rather than making the agent ask.

**THEO:** And keep it fresh with three tiers -- full rebuild, incremental on change, and one-hop invalidation of inbound references. Re-index synchronously inside the write tool so the agent never reads a stale view of its own edit. Version everything so staleness is visible instead of silent.

**DANA:** Next week we use it. Retrieval as traversal: seeding, expansion policy, ranking under a token budget, where vectors genuinely still win, GraphRAG and entity resolution beyond code, and how to expose all of this to an agent as a tool it will actually use well.

**THEO:** That last part is where a lot of good graphs go to die, so don't miss it.

**DANA:** I'm Dana Okafor.

**THEO:** I'm Theo Lindqvist.

**DANA:** This has been Control Loop.

[OUTRO MUSIC]

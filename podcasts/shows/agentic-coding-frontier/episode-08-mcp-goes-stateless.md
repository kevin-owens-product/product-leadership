# Episode 8: MCP Goes Stateless
## "The July Spec, Tasks, Apps, and the Standards Moving to a Foundation"

**Duration:** ~14 minutes
**Hosts:** Alex (Practitioner) & Riley (Research Lead)
**Season:** 2, The Late-2026 Frontier

---

### INTRO

**ALEX:** Welcome back to Agentic Coding Frontier. In season one, episode two, we covered tools, MCP and orchestration. At the time, the Model Context Protocol was a young standard, and the main debate was whether it would survive contact with enterprise infrastructure. Riley, that debate has mostly been settled.

**RILEY:** It has, and the July twenty eighth specification is the main reason. The project's own maintainers called it the largest update since launch. The short version is that MCP went stateless, gained a proper way to handle long-running work, hardened its authorization story, and got a framework for extensions so new features no longer have to wait for a full spec release.

**ALEX:** And alongside that, the governance moved. MCP now lives at the Agentic AI Foundation under the Linux Foundation, and in October, Anthropic donated the Agent Skills standard to the same foundation.

**RILEY:** So today is about plumbing. It is not glamorous, but plumbing is what decides whether your agents run in production or stay in a demo.

---

### SEGMENT 1: Why Stateful Was a Problem

**ALEX:** Start with the problem. Why did statefulness hurt?

**RILEY:** Under the old design, a client and a server opened a session with an initialize handshake, and the server handed back a session identifier that every later request carried. That meant the server instance that started your session had to keep serving it, or every instance had to share session state. In infrastructure terms, you needed sticky routing or a shared session store.

**ALEX:** Which is exactly what platform teams hate.

**RILEY:** Because it breaks the normal playbook. You cannot just put a fleet of MCP servers behind an ordinary load balancer, scale them up and down with traffic, and let any instance handle any request. Deployments get harder, failover gets harder, and every gateway in the path has to understand the session.

**ALEX:** So what changed?

**RILEY:** Coverage of the July spec describes the initialize handshake and the session identifier header being removed from the core. Each request carries what it needs. Any instance can answer any request. The maintainers' framing was that you can now run MCP servers behind standard load balancers with your existing Kubernetes and cloud-native tooling, the same way you run any other HTTP service.

**ALEX:** That sounds simple. What is the catch?

**RILEY:** The catch is the features that seemed to need a session. A server sometimes has to come back to the client mid-request. It needs the user to confirm something, or it needs the client's model to generate something. In the stateful world, you held a stream open and waited. The new spec adds a pattern called multi round-trip requests. Instead of holding a connection open, the server returns a result that says, in effect, "I need more input," and the client comes back with it on a new request.

**ALEX:** So the conversation still happens, but the server does not have to remember it in memory.

**RILEY:** Right. And there is a second piece that platform teams will like. Requests now carry headers naming the method and the target, so a gateway or a rate limiter at the edge can make routing decisions without unpacking the message body. List results can be cached as well, so a client that asks "what tools do you have" a thousand times does not cost the server a thousand lookups.

---

### SEGMENT 2: Tasks for Long-Running Work

**ALEX:** Next, Tasks. This one matters a lot for coding agents.

**RILEY:** It does. Think about what agents ask tools to do now. Run a full test suite. Build a container. Kick off a database migration in a staging environment. Some of those take twenty minutes. In the old model, the tool call either blocked for twenty minutes, or every server invented its own polling scheme.

**ALEX:** And Tasks standardizes it.

**RILEY:** A server can return a durable handle instead of blocking. The client polls for progress, supplies more input if the task needs it, and fetches the result when it is done, including after a reconnect. Because the task identifier can be stored durably, polling can resume after a crash or restart without holding a long-lived connection open. Tasks moved from experimental to an official extension with this release.

**ALEX:** That maps directly onto what we said in season one about long-horizon execution. The agent needs to be able to start something, go do other work, and come back.

**RILEY:** And it composes with statelessness. A long build runs as a task, the server instance that started it can die, another instance picks up the status request, and the agent never notices. That is the reliability property you want.

**ALEX:** Practical advice for a team writing MCP servers today?

**RILEY:** Anything that can take more than a few seconds should be a task, not a blocking call. Return a handle quickly, report progress honestly, and make the operation safe to poll from anywhere. And put a timeout and a cancellation path on every task, because agents are very good at starting things and much less good at noticing that something has been running for six hours.

---

### SEGMENT 3: Authorization Grows Up

**ALEX:** Authorization. This was the weakest part of MCP in its first year.

**RILEY:** It was, and the July spec spends real effort here. The maintainers said the goal was to align with how OAuth 2.0 and OpenID Connect are actually deployed. One specific change is that clients must validate the issuer parameter in the authorization response, which closes a class of mix-up attacks where a client could be tricked into sending a code from one authorization server to another.

**ALEX:** And the enterprise piece.

**RILEY:** Enterprise managed authorization. Organizations can manage which MCP servers their people can reach centrally, through their identity provider, instead of every developer wiring up credentials by hand. That is the feature security teams were waiting for, because it turns MCP access into something you can grant, review and revoke like any other application access.

**ALEX:** We should connect this to what is happening in the harnesses too. Claude Code, for example, added a way to sign in to MCP servers from the command line, managed settings that push approved servers to every user, and deny lists that block unapproved connectors.

**RILEY:** And that is the pattern. The protocol defines how identity flows. The harness and the identity provider decide who gets what. Neither one alone is enough.

---

### SEGMENT 4: Extensions and MCP Apps

**ALEX:** The extensions framework. Why does a protocol need a formal way to extend itself?

**RILEY:** Because the core spec has to be conservative and the ecosystem moves fast. Before, any new capability had to wait for the next spec revision, or it got bolted on in incompatible ways. Now there is a defined way to ship an extension that evolves on its own schedule. Tasks is one of these official extensions. MCP Apps is another.

**ALEX:** Explain MCP Apps.

**RILEY:** It lets a server deliver its own interactive user interface, rendered by the server, inside the client. So a tool is no longer just a function that returns text. A deployment tool can show a real approval screen with the diff and the risk summary. A data tool can show a chart you can filter.

**ALEX:** That is a bigger change than it sounds for agent design.

**RILEY:** It is, because it changes where the human sits. In season one we talked about humans approving agent actions through text prompts. With server-rendered interfaces, the approval can happen in a purpose-built screen that the tool owner controls, which is usually a better place to show the facts a human needs.

**ALEX:** And the governance guarantee that came with it?

**RILEY:** A formal deprecation policy. At least twelve months between a feature being deprecated and its earliest possible removal. For enterprises, that is the difference between "experimental protocol" and "infrastructure we can build on."

---

### SEGMENT 5: The Foundation Era

**ALEX:** Let us talk about the Agentic AI Foundation.

**RILEY:** Anthropic open-sourced MCP in November 2024 and contributed it to the Agentic AI Foundation under the Linux Foundation in December 2025. Anthropic co-founded the foundation with Block and OpenAI. Then on October twenty second this year, Anthropic donated Agent Skills, the standard name and logo, the GitHub organization and the domain.

**ALEX:** Remind people what Agent Skills is.

**RILEY:** A skill is a folder with a SKILL dot M D file, plus any scripts or reference material it needs. It packages a procedure, like how your team cuts a release or reviews a migration, so any compatible agent can load it when the task calls for it. Anthropic said more than seventy agent platforms had integrated the standard since it was published in December 2025, including ChatGPT, Cursor, GitHub Copilot and VS Code, with around a million skills published and roughly two hundred eighty million installs.

**ALEX:** So now the two standards that matter most for agent tooling, how agents reach tools and how agents learn procedures, both sit at a neutral foundation.

**RILEY:** Maintained by engineers from several labs, acting as individuals. That matters for the build-versus-buy decisions we talk about. If you write your internal tooling as MCP servers and your internal procedures as skills, you are less locked to any one vendor's agent.

**ALEX:** Is there a skeptical take?

**RILEY:** There is. Foundations move slowly, and the ecosystem moves fast. Expect the interesting work to happen in extensions first, and expect some fragmentation between what one client supports and what another does. Check what your clients actually implement, not just what the spec allows.

---

### SEGMENT 6: A Migration Checklist

**ALEX:** Give people a checklist. They run a few internal MCP servers today. What do they do this quarter?

**RILEY:** Six steps. First, inventory. Which servers do you run, who owns them, and which clients connect to them. Second, check your SDK version. The tier one SDKs were updated for the July spec, so upgrade before you change architecture. Third, find any server logic that depends on session memory, and move that state somewhere durable or into the request itself. Fourth, convert anything slow into a task. Fifth, put your servers behind your identity provider and turn on centrally managed access. And sixth, put them behind an ordinary load balancer and delete the sticky routing.

**ALEX:** And one for the people choosing tools rather than writing them.

**RILEY:** Ask every vendor two questions. Do you support the July spec, including tasks? And can my identity provider control who reaches your server? If the answer to either is no, plan for a migration later.

---

### SEGMENT 7: Skills and Servers Together

**ALEX:** Let us put the two standards together, because I think people are still confused about when to write a skill and when to write an MCP server.

**RILEY:** The simplest test is this. A server gives an agent a capability it could not otherwise have: access to a system, an action, some live data. A skill gives an agent knowledge about how your team does something: the steps, the conventions, the checks. Servers are hands. Skills are habits.

**ALEX:** Give me a worked example.

**RILEY:** Releasing a service. You write an MCP server that wraps your deployment system. It exposes tools like "start deployment" and "check deployment status." Starting a deployment returns a task handle, because it takes ten minutes. And it uses an MCP App to show a proper approval screen with the diff, the change risk and the rollback plan.

**ALEX:** And the skill.

**RILEY:** The skill is your release procedure. Check that the change log is updated. Confirm the feature flags. Never deploy on a Friday afternoon without a named on-call engineer. Run the smoke tests after deploy and roll back if two fail. The skill tells the agent how to use the server the way your team would.

**ALEX:** So the server is reusable across teams, and the skill encodes one team's judgment.

**RILEY:** Exactly. And there is a cost to watch. Skills are cheap to write, so people write a lot of them, and every skill's description sits in the agent's context on every turn whether it is used or not. Claude Code added a skill doctor command this year that shows what each skill costs in context and how often it is actually used. Prune the ones nobody calls.

**ALEX:** And testing?

**RILEY:** Test both, separately. The server gets ordinary integration tests. The skill gets an eval: a handful of realistic requests, and a check of whether the agent followed the procedure with the skill loaded versus without it. If the skill does not change the outcome, it is just context you are paying for.

---

### OUTRO

**ALEX:** So the summary. MCP dropped the session and became an ordinary HTTP service you can scale. Long-running work got a standard shape with Tasks. Authorization caught up with real-world OAuth and enterprise identity. Extensions let features like server-rendered interfaces ship on their own timeline. And both MCP and Agent Skills now sit at a neutral foundation.

**RILEY:** And for anyone who spent last year writing custom polling loops and session stores around their tools, this is the year to delete that code.

**ALEX:** Next episode is the one I have been looking forward to and also dreading. Models whose most powerful abilities are held back behind safeguards, a frontier model release cancelled for safety reasons, and what all of that means for the teams whose agents do security work.

**RILEY:** Capability behind a gate. See you then.

---

*End of Episode 8*

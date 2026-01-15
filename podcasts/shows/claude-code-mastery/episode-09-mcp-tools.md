# Episode 9: MCP Servers & Custom Tools

## Introduction

**ALEX:** Welcome back to Claude Code Mastery. I'm Alex, and today we're exploring how to extend Claude Code beyond its built-in capabilities.

**JAMIE:** I'm Jamie, and I'm really curious about this. Claude Code already does so much. What more could you add?

**ALEX:** The possibilities are vast. Database queries, API integrations, specialized tools for your workflow. By the end of this episode, you'll understand MCP and how to leverage it.

## What is MCP?

**JAMIE:** Let's start with the basics. What is MCP?

**ALEX:** MCP stands for Model Context Protocol. It's a standard way to give Claude access to external tools and data sources. Think of it as a plugin system for Claude.

**JAMIE:** So Claude can learn new skills?

**ALEX:** Exactly. By connecting MCP servers, you can teach Claude to search the web, query databases, access APIs, and much more. It's extensibility without modifying Claude itself.

**JAMIE:** Why is it called a protocol?

**ALEX:** Because it's a standardized way for Claude to communicate with these extensions. Any tool that speaks MCP can work with Claude. It's not tied to specific implementations.

**JAMIE:** An open standard.

**ALEX:** Right. This means there's a growing ecosystem of MCP servers you can use, and you can build your own.

## Built-in MCP Capabilities

**JAMIE:** What comes built into Claude Code?

**ALEX:** Claude Code has several built-in capabilities that use MCP under the hood. Web search, web fetching, and more. These are ready to use without any configuration.

**JAMIE:** Web search is built in?

**ALEX:** Yes! You can ask Claude to search the web for current information. "What's the latest version of React?" Claude can search and give you up-to-date info.

**JAMIE:** That's handy for checking documentation.

**ALEX:** Very handy. You're not limited to Claude's training data. You can get real-time information when needed.

## Adding External MCP Servers

**JAMIE:** How do I add more capabilities?

**ALEX:** You configure MCP servers in Claude Code's settings. Each server provides specific tools. A database server gives you query capabilities. An API server lets you interact with external services.

**JAMIE:** Where do I find MCP servers?

**ALEX:** There's a growing community creating them. You can find them on GitHub, in package registries, and through Anthropic's documentation. Some common ones: database connectors, CI/CD integrations, cloud service tools.

**JAMIE:** Any you particularly recommend?

**ALEX:** It depends on your needs. For web work, having a browser automation server is powerful. For data work, database connectors are essential. For DevOps, cloud provider tools are invaluable.

## Configuring MCP Servers

**JAMIE:** Walk me through setting one up.

**ALEX:** First, install the MCP server. It's usually an npm package or standalone tool. Then, add it to your Claude Code configuration with its connection details.

**JAMIE:** What connection details?

**ALEX:** Typically a path to the server executable and any required credentials or configuration. For a database server, you'd provide connection strings. For an API server, authentication tokens.

**JAMIE:** And then Claude can use it?

**ALEX:** Yes. Once configured, Claude gains new tools. You'll see them available in your session, and Claude can use them to accomplish tasks.

**JAMIE:** Does it require code changes?

**ALEX:** Just configuration. No code changes to Claude Code itself. Add the server to config, restart Claude Code, and the new tools are available.

## Common MCP Use Cases

**JAMIE:** What are the most popular use cases?

**ALEX:** Database access is huge. Being able to ask Claude "show me users who signed up last week" and have it query your database directly. No more writing SQL by hand for ad-hoc questions.

**JAMIE:** That sounds powerful and maybe dangerous?

**ALEX:** It requires trust and good configuration. You typically set up read-only access or limit what queries can be run. Claude will also ask permission before executing queries.

**JAMIE:** Good guardrails.

**ALEX:** Another popular use case: cloud provider integration. "Check the status of our AWS services" or "show me the logs from the production server." Claude can interact with cloud APIs.

**JAMIE:** What about third-party APIs?

**ALEX:** Absolutely. You can connect Claude to Slack, Jira, GitHub, or any API. "Create a Jira ticket for this bug" or "post this update to Slack."

## Web Search and Fetching

**JAMIE:** Let's talk more about web capabilities.

**ALEX:** Web search lets Claude find current information. You ask a question that requires up-to-date data, and Claude searches the web to answer it.

**JAMIE:** How accurate is it?

**ALEX:** It's fetching real web results, so accuracy depends on the sources. Claude will typically cite where information came from so you can verify.

**JAMIE:** What about fetching specific pages?

**ALEX:** Web fetch lets Claude read specific URLs. "Read the documentation at this URL" and Claude will fetch and process that page.

**JAMIE:** Useful for reading docs.

**ALEX:** Very useful. Instead of copying and pasting documentation, just give Claude the URL.

## Security Considerations

**JAMIE:** All this external access makes me think about security. What should I be aware of?

**ALEX:** Security is paramount. First, credential management. Never put sensitive tokens directly in configuration files that get committed to repos.

**JAMIE:** Use environment variables or secrets managers?

**ALEX:** Exactly. Second, principle of least privilege. Only give MCP servers the access they need. Read-only database access if you don't need writes.

**JAMIE:** Minimize potential damage.

**ALEX:** Third, be careful with what tools you install. Only use MCP servers from trusted sources. Review what they do before running them.

**JAMIE:** Don't install random tools from the internet.

**ALEX:** Right. And fourth, understand what data flows where. When Claude uses an MCP server, data passes through that server. Make sure that's acceptable for your use case.

## Building Custom MCP Servers

**JAMIE:** Can I build my own MCP server?

**ALEX:** Absolutely! If you have internal tools or APIs that you want Claude to access, you can create custom MCP servers for them.

**JAMIE:** How complex is that?

**ALEX:** It varies. The MCP specification is well-documented. A simple server that exposes one or two tools can be built in a day. Complex integrations take more time.

**JAMIE:** What languages can I use?

**ALEX:** The protocol is language-agnostic. There are SDKs and examples in TypeScript, Python, and other languages. Use whatever your team is comfortable with.

**JAMIE:** What makes a good custom MCP server?

**ALEX:** Clear tool definitions so Claude knows what each tool does. Good error handling so failures are communicated clearly. And appropriate security so sensitive operations require confirmation.

## Enterprise MCP Patterns

**JAMIE:** How do larger teams use MCP?

**ALEX:** Enterprise teams often create standardized MCP servers for internal systems. A company might have MCP servers for their internal APIs, documentation systems, and deployment tools.

**JAMIE:** Everyone on the team uses the same extensions?

**ALEX:** Right. It creates consistency. All developers have access to the same capabilities through Claude.

**JAMIE:** How do they manage it?

**ALEX:** Central configuration distributed through the project setup. When a developer starts Claude Code on a company project, the standard MCP servers are automatically available.

**JAMIE:** Sounds like the CLAUDE.md pattern but for tools.

**ALEX:** Exactly. Configuration as code, versioned and shared.

## Troubleshooting MCP

**JAMIE:** What if an MCP server isn't working?

**ALEX:** Start with logs. MCP servers typically log their activity. Check for connection errors or authentication issues.

**JAMIE:** Common problems?

**ALEX:** Credential issues are the most common. Expired tokens, wrong permissions. Next is connectivity: firewalls, network issues. Then version mismatches between the MCP server and Claude Code.

**JAMIE:** How do I know if Claude is even trying to use the server?

**ALEX:** Ask Claude! "What MCP tools do you have available?" Claude will list the connected servers and their tools.

## Best Practices for MCP

**JAMIE:** What are your best practices?

**ALEX:** First, start with one server at a time. Add, test, and verify before adding more. Debugging multiple new servers at once is frustrating.

**JAMIE:** Incremental additions.

**ALEX:** Second, test with low-stakes tasks first. Make sure the integration works before relying on it for important work.

**JAMIE:** Build confidence.

**ALEX:** Third, document your MCP setup. When you configure servers, note why and how in your project documentation.

**JAMIE:** For team knowledge.

**ALEX:** And fourth, keep servers updated. MCP servers evolve, and updates often include security fixes and improvements.

## The Future of MCP

**JAMIE:** Where is MCP heading?

**ALEX:** The ecosystem is growing rapidly. More pre-built servers, better tooling, richer capabilities. The vision is that Claude can be extended to do almost anything through MCP.

**JAMIE:** A platform, not just a tool.

**ALEX:** Exactly. Claude Code becomes a platform that adapts to your specific needs through MCP extensions.

## Practice Exercise

**JAMIE:** What should listeners practice?

**ALEX:** If you haven't already, try the built-in web search. Ask Claude a question that requires current information and see how it handles it.

**JAMIE:** Starting with what's already there.

**ALEX:** Then, explore the MCP server ecosystem. Find one that's relevant to your work and try setting it up. The configuration experience is valuable.

## What's Next

**JAMIE:** Great introduction to MCP. What's our final episode about?

**ALEX:** Episode ten wraps up the series with best practices and productivity tips. Everything we've learned, synthesized into a workflow that maximizes your effectiveness.

**JAMIE:** Bringing it all together.

**ALEX:** Exactly. See you in the finale!

**JAMIE:** Happy extending!

*Next Episode: Best Practices & Productivity Tips - Synthesize everything into a workflow that maximizes your effectiveness with Claude Code.*

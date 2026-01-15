# Episode 7: Project Setup & Configuration

## Introduction

**ALEX:** Welcome back to Claude Code Mastery. I'm Alex, and today we're diving into customization. How to make Claude Code work exactly the way you need for your specific projects.

**JAMIE:** I'm Jamie, and I've been wondering about this. Every project has its own conventions, quirks, and requirements. Can Claude adapt to that?

**ALEX:** Absolutely. By the end of this episode, you'll know how to configure Claude Code with project-specific instructions, set up permissions, and customize its behavior for your workflow.

## The CLAUDE.md File

**JAMIE:** I've heard about a CLAUDE.md file. What's that?

**ALEX:** CLAUDE.md is a special file you can put in your project root that contains instructions for Claude. When Claude Code starts in that directory, it reads this file to understand your project's context and conventions.

**JAMIE:** Like a README but for Claude?

**ALEX:** Exactly! It's documentation that Claude uses to work better with your codebase. You can include information about your architecture, coding standards, testing requirements, and anything else Claude should know.

**JAMIE:** What kinds of things should go in there?

**ALEX:** Project overview: what the project does, its main technologies. Architectural decisions: why you structured things a certain way. Coding conventions: naming patterns, formatting rules. Common gotchas: things that might trip up someone new to the project.

**JAMIE:** So Claude reads it like a new team member would?

**ALEX:** Right. Think about what you'd tell a new developer on day one. That's what goes in CLAUDE.md.

## What to Include in CLAUDE.md

**JAMIE:** Can you give specific examples?

**ALEX:** Sure. You might write: "This is a Next.js application with TypeScript. We use the App Router, not Pages Router. All API routes are in app/api. Database queries go through Prisma."

**JAMIE:** Architecture overview.

**ALEX:** Then coding conventions: "We use camelCase for functions, PascalCase for components. All components should have TypeScript props interfaces. Prefer async/await over promise chains."

**JAMIE:** Style guidance.

**ALEX:** Testing requirements: "All new features need tests. We use Jest with React Testing Library. Run tests with npm run test before committing."

**JAMIE:** Process requirements.

**ALEX:** And project-specific knowledge: "The auth module was written by a contractor and is complex. Ask questions before modifying it. The config in legacy-config.js is deprecated but still used by some features."

**JAMIE:** Tribal knowledge captured in writing.

**ALEX:** Exactly. All that context that lives in senior developers' heads, written down for Claude.

## Configuration Hierarchy

**JAMIE:** Can I have different configurations for different contexts?

**ALEX:** Yes! Claude Code has a hierarchy of configuration. Global settings apply everywhere. Project settings in CLAUDE.md override globals. And you can have directory-specific settings too.

**JAMIE:** Give me an example of where that's useful.

**ALEX:** Say you work on multiple projects. Globally, you might set your preferred response length and formatting. But one project uses Python with specific linting rules, another uses TypeScript with different conventions. Each project's CLAUDE.md captures those specifics.

**JAMIE:** So I don't have to reconfigure for each project?

**ALEX:** Right. Claude automatically picks up the right context based on where you're working.

## Setting Allowed and Disallowed Tools

**JAMIE:** What about controlling what Claude can do?

**ALEX:** You can configure which tools Claude can use. Maybe in a production environment, you want to restrict file writes. Or you want to prevent certain bash commands from running.

**JAMIE:** How do I set those restrictions?

**ALEX:** In your CLAUDE.md or configuration files, you can specify allowed tools and disallowed tools. For example, you might allow Read and Grep but disallow Bash in a sensitive repository.

**JAMIE:** That's useful for security-conscious environments.

**ALEX:** Exactly. Enterprise teams often lock down what Claude can do to match their security policies.

**JAMIE:** Can I restrict specific commands within Bash?

**ALEX:** Yes. You can say "allow npm commands but not rm" or "only allow git commands." Fine-grained control is possible.

## Permission Presets

**JAMIE:** You mentioned permissions earlier in the series. How do they relate to project configuration?

**ALEX:** Permissions can be configured at the project level. You might set up a preset that says "always allow file reads in this project without prompting" while keeping write permissions manual.

**JAMIE:** So I don't have to approve every single read?

**ALEX:** Right. Once you trust Claude with certain operations in a project, you can streamline them. But you can keep prompts for higher-risk operations like writes or command execution.

**JAMIE:** Balancing speed and safety.

**ALEX:** Exactly. As you build trust with Claude in a project, you might loosen restrictions. Start tight, then open up as you get comfortable.

## Custom Instructions

**JAMIE:** Can I give Claude ongoing instructions beyond CLAUDE.md?

**ALEX:** Yes. You can set custom instructions that persist across conversations. Things like "always explain your reasoning" or "prefer functional programming patterns" or "be very conservative with changes."

**JAMIE:** Where do these get set?

**ALEX:** In Claude Code's settings or in project configuration. They're persistent, so you don't have to repeat them each session.

**JAMIE:** What kinds of instructions are most useful?

**ALEX:** Communication style preferences: verbose explanations versus terse responses. Technical preferences: certain patterns you always want or never want. Workflow preferences: always run tests after edits, always show diffs before changes.

**JAMIE:** Shaping how Claude works.

**ALEX:** Right. You're training Claude to be the kind of collaborator you want.

## Environment and Dependencies

**JAMIE:** What about environment setup? Like making sure Claude knows about dependencies?

**ALEX:** Claude reads your dependency files automatically. Package.json, requirements.txt, Cargo.toml. It understands what's available in your project.

**JAMIE:** But what about environment variables or local setup?

**ALEX:** You can document those in CLAUDE.md. "This project requires a DATABASE_URL environment variable." "Run docker-compose up before testing." Claude will know what's expected.

**JAMIE:** Does Claude have access to my environment variables?

**ALEX:** Only if you share them. Claude Code doesn't automatically read your environment. But if relevant, you can tell Claude what variables are set.

**JAMIE:** Good for security.

**ALEX:** Right. Secrets stay secret unless you explicitly share them.

## Build and Run Configuration

**JAMIE:** What about telling Claude how to build and run the project?

**ALEX:** Include that in CLAUDE.md. "Build with npm run build. Run development server with npm run dev. Run production build with npm run start."

**JAMIE:** So Claude knows the commands.

**ALEX:** Exactly. Then when you say "start the dev server," Claude knows to run npm run dev rather than guessing.

**JAMIE:** What if the commands are non-standard?

**ALEX:** Even more important to document. "We use a custom build script: ./scripts/build.sh with arguments for environment."

## Team Configuration

**JAMIE:** What about sharing configuration across a team?

**ALEX:** CLAUDE.md can be committed to your repository. Everyone who uses Claude Code in that project gets the same context and instructions.

**JAMIE:** Consistency across the team.

**ALEX:** Right. It's especially valuable when you have a team using Claude Code together. Everyone gets the same guardrails and guidance.

**JAMIE:** What about personal preferences that differ per developer?

**ALEX:** Those can be in your global configuration, which isn't committed. So team settings in CLAUDE.md, personal preferences in your local config.

**JAMIE:** Best of both worlds.

## Managing Multiple Projects

**JAMIE:** I work on several projects. How do I manage that?

**ALEX:** Each project has its own CLAUDE.md with project-specific configuration. When you cd into a project and start Claude Code, it automatically picks up that project's settings.

**JAMIE:** Seamless context switching.

**ALEX:** Right. You don't have to remember to load different configs. It just works.

**JAMIE:** What if projects share some configuration?

**ALEX:** Common patterns can go in your global config. Only project-specific details go in CLAUDE.md. Keep each CLAUDE.md focused on what's unique to that project.

## Evolving Your Configuration

**JAMIE:** How do I know what to configure?

**ALEX:** Start minimal. Use Claude Code on your project and notice friction points. When you find yourself repeatedly correcting Claude about something, add it to CLAUDE.md.

**JAMIE:** Let pain points guide configuration.

**ALEX:** Exactly. Don't try to think of everything upfront. Let your actual usage reveal what needs to be documented.

**JAMIE:** And update it over time?

**ALEX:** Yes. CLAUDE.md should evolve with your project. New architectural decisions, new conventions, new team knowledge. Keep it current.

## Common Configuration Patterns

**JAMIE:** What do most teams configure?

**ALEX:** Almost everyone documents build and test commands. That's table stakes. Most document coding conventions, especially if they're non-obvious.

**JAMIE:** What else?

**ALEX:** Architecture overviews for complex projects. Security-sensitive areas that need extra care. Integration points with external services. Deployment requirements.

**JAMIE:** The stuff that's hard to figure out from code alone.

**ALEX:** Right. If understanding requires context beyond the code itself, it belongs in CLAUDE.md.

## Tips for Good Configuration

**JAMIE:** What are your tips for effective configuration?

**ALEX:** First, be specific. "Follow best practices" isn't helpful. "Use early returns instead of nested ifs" is specific and actionable.

**JAMIE:** Concrete over abstract.

**ALEX:** Second, explain why, not just what. "We use dependency injection because it makes testing easier" helps Claude understand the purpose, not just the rule.

**JAMIE:** Context for decisions.

**ALEX:** Third, update when things change. Outdated configuration is worse than no configuration. If you refactor something, update CLAUDE.md.

**JAMIE:** Keep it fresh.

**ALEX:** And fourth, test your configuration. Work with Claude on the project and see if it follows your guidelines. Refine based on what actually happens.

## Practice Exercise

**JAMIE:** What should listeners practice?

**ALEX:** Create a CLAUDE.md for one of your projects. Include at least: a project overview, build and test commands, two or three coding conventions, and one piece of architectural knowledge that's not obvious from the code.

**JAMIE:** A starter configuration.

**ALEX:** Then use Claude Code on that project and see how the configuration affects Claude's behavior. Iterate from there.

## What's Next

**JAMIE:** Great episode on configuration. What's coming up?

**ALEX:** Episode eight is about advanced prompting techniques. How to communicate with Claude effectively to get the best possible results.

**JAMIE:** The art of asking.

**ALEX:** Exactly. See you in episode eight!

**JAMIE:** Happy configuring!

*Next Episode: Advanced Prompting Techniques - Master the art of communicating with Claude for optimal results.*

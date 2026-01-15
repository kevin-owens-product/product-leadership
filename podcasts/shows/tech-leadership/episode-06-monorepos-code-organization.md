# Episode 6: Monorepos & Code Organization
## "One Repo to Rule Them All? The Great Repository Debate"

**Duration:** ~60 minutes
**Hosts:** Alex Chen (Technical Expert) & Sam Rivera (Product Leadership Perspective)

---

### INTRO

**[THEME MUSIC FADES]**

**SAM:** Welcome back to Tech Leadership Unpacked. I'm Sam Rivera. We've covered building systems at scale - now let's talk about how you organize the code that builds those systems. Specifically: should all your code live in one giant repository?

**ALEX:** I'm Alex Chen. And I should warn you - this topic generates surprisingly strong opinions. People get passionate about repository structure. We're going to try to cut through the religious wars and give you a practical framework.

**SAM:** Perfect. So let's start basic: what is a monorepo?

**ALEX:** A **monorepo** (mono repository) is a single version-controlled repository that contains multiple projects, often the entire codebase of an organization. Google, Meta, Microsoft, and many others use this approach.

**SAM:** As opposed to?

**ALEX:** **Polyrepo** or multi-repo - separate repositories for each project, library, or service. Most startups start here because it's the default: new project, new repo.

---

### SEGMENT 1: THE CASE FOR MONOREPOS (12 minutes)

**SAM:** Why would anyone want all their code in one place? That sounds like chaos.

**ALEX:** It sounds counterintuitive, but there are compelling benefits.

**Unified versioning and dependency management.** In a monorepo, all code is at one version - head of main. You never have the problem of "which version of the common library is service A using versus service B?"

**SAM:** That happens in polyrepo?

**ALEX:** Constantly. Library version drift is a major source of bugs and compatibility issues. In a monorepo, everyone uses the same version of shared code, and when you update that shared code, you update all consumers simultaneously.

**SAM:** That sounds like a lot of breaking changes.

**ALEX:** It changes how you handle breaking changes. Instead of deprecating and supporting multiple versions, you make the change and fix all consumers in the same commit. This is actually cleaner - no version fragmentation.

**ALEX:** **Atomic cross-project changes.** Need to refactor an API that's used by ten services? In a polyrepo world, that's ten PRs, coordinated carefully. In a monorepo, it's one change that updates the API and all consumers atomically.

**SAM:** How does that work practically?

**ALEX:** You run one refactoring script or make the changes, run the full test suite, and commit. Everything is in sync. No deployment coordination nightmares.

**ALEX:** **Code sharing and discoverability.** When code is in one place, it's easier to find and reuse. You can see what utilities exist, how problems were solved elsewhere, avoid reinventing wheels.

**SAM:** Don't you get duplication in polyrepo?

**ALEX:** Rampant duplication. Each team builds their own logging wrapper, their own auth library, their own HTTP client. In a monorepo, you build once and share.

**ALEX:** **Consistent tooling and configuration.** One linting config, one test framework, one CI setup. Everyone follows the same standards because there's one place to define them.

**SAM:** That sounds like enforced consistency.

**ALEX:** Yes, and that's often good. Consistency reduces cognitive load. A developer can move between projects and everything works the same way.

**ALEX:** **Simplified collaboration.** Everyone can see and contribute to any code. No access requests across repos. This creates transparency and enables broader ownership.

**SAM:** Who uses monorepos?

**ALEX:** Google is the famous example - most of their code is in one repository. Meta, Twitter, Microsoft, Uber, Airbnb. The pattern is proven at scale.

---

### SEGMENT 2: THE CASE AGAINST MONOREPOS (10 minutes)

**SAM:** Okay, that sounds compelling. What's the counterargument?

**ALEX:** The challenges are real, especially at scale.

**Tooling and build infrastructure.** Standard tools don't work. `git clone` takes forever. `git status` is slow. Your IDE chokes. You need specialized tooling for everything.

**SAM:** Like what?

**ALEX:** Google built Piper and Blaze (now open-sourced as Bazel). Meta has Mercurial extensions. You need: sparse checkout (only pull code you need), smart build systems that know what changed and what to rebuild, fast dependency analysis.

**SAM:** Can you get that off the shelf?

**ALEX:** Increasingly, yes. Bazel, Nx, Turborepo, Rush - there are now tools designed for monorepos. But it's not just install-and-go. There's a learning curve and configuration work.

**ALEX:** **Build and test times.** If you have to test everything on every change, builds take hours. You need sophisticated caching, parallel execution, and affected-only testing.

**SAM:** Can you achieve that?

**ALEX:** Yes, with investment. Bazel and similar tools have remote caching, distributed execution. The CI bill can be significant.

**ALEX:** **Ownership and permissions.** In a polyrepo, team A owns repo A. Clear boundaries. In a monorepo, who owns what? How do you prevent people from making changes to code they don't understand?

**SAM:** That's an organizational concern.

**ALEX:** Exactly. You need CODEOWNERS files, code review requirements, clear directory ownership. The tooling exists but needs to be implemented.

**ALEX:** **Tight coupling risk.** When it's easy to change anything, it's tempting to reach into other teams' code. You can end up with tangled dependencies that undermine the intended isolation.

**SAM:** How do you prevent that?

**ALEX:** Enforce module boundaries. Some monorepo tools can enforce that team A's code can only depend on team B's public API, not internals. You need discipline.

**ALEX:** **Scaling challenges.** At some point, even with great tooling, there are limits. Very large monorepos require custom infrastructure. Not everyone can afford what Google built.

---

### SEGMENT 3: MAKING THE DECISION (10 minutes)

**SAM:** So how do I decide? Monorepo or polyrepo?

**ALEX:** Let me give you a framework.

**Favor monorepo when:**
- You have significant shared code between projects
- You value consistency and standardization
- Your teams are collaborative, not siloed
- You're willing to invest in tooling
- You want atomic cross-project refactoring

**SAM:** When does polyrepo make more sense?

**ALEX:** **Favor polyrepo when:**
- Projects are truly independent with minimal sharing
- Teams are autonomous and want different tools/languages
- You can't invest in monorepo tooling
- Organizational boundaries are strong and intended
- Open source projects need independent contribution

**SAM:** What about a hybrid?

**ALEX:** Very common. One approach: monorepo per domain or per product line, polyrepo across domains. Or: monorepo for applications, separate repos for truly independent libraries or infrastructure.

**SAM:** What's the migration path if you want to switch?

**ALEX:** **Polyrepo to monorepo:** Start by identifying shared dependencies. Move those in first. Then gradually migrate projects, testing carefully.

**Monorepo to polyrepo:** Harder - you need to tease apart dependencies. Usually only done for specific reasons (spinning out an open-source project, team wanting autonomy).

**SAM:** Any general advice?

**ALEX:** Don't over-rotate. The choice matters less than how well you execute. A well-run polyrepo beats a poorly-run monorepo, and vice versa. Focus on the practices - sharing code, managing dependencies, consistent standards - and the repository structure follows.

---

### SEGMENT 4: MONOREPO TOOLING DEEP DIVE (12 minutes)

**SAM:** Let's talk tools. What do I need to make a monorepo work?

**ALEX:** Several categories of tooling:

**Build systems.** The key is understanding the dependency graph and only building what changed.

**Bazel** - Google's open-source build system. Extremely powerful, supports many languages, hermetic builds, remote caching and execution. Steep learning curve.

**SAM:** What's a hermetic build?

**ALEX:** A build that depends only on declared inputs, not on the machine state. Run it on any machine, get the same result. This enables distributed builds and caching.

**ALEX:** **Nx** - designed for JavaScript/TypeScript monorepos, but expanding. Great for web teams. Computation caching, affected commands, dependency graph visualization.

**Turborepo** - Vercel's answer to monorepo builds. Simpler than Nx, still effective. Good for JS/TS projects.

**Rush** - Microsoft's monorepo toolkit. Full-featured, integrates with pnpm.

**Lerna** - older JS tool, being replaced by newer options but still used.

**SAM:** How do these help?

**ALEX:** They understand what depends on what. When you change file X, they know which projects need rebuilding. They cache build outputs so unchanged code doesn't rebuild. They can run builds in parallel.

**SAM:** What about version control?

**ALEX:** Git works but needs help at scale.

**Sparse checkout** - only clone the parts of the repo you need. You might have millions of files in the repo but only check out 50,000.

**VFS for Git** (Microsoft) - virtualizes the file system so files are downloaded on demand.

**SAM:** What about CI/CD?

**ALEX:** Critical to get right. The build system's affected analysis should drive CI - only test what changed. Remote caching so different builds share results. Distributed test execution.

**SAM:** Sounds expensive.

**ALEX:** It can be. But consider: you're paying compute cost instead of coordination cost. The alternative is developers waiting for slow builds or, worse, not running tests.

**ALEX:** **Code ownership tools.**

CODEOWNERS files - define who must review changes to which paths. Most Git hosts support this.

Dependency rules - tools that enforce "this package can only depend on these other packages." Nx has this, Bazel can do it.

**SAM:** What about IDEs?

**ALEX:** Modern IDEs handle large projects better than before. VS Code with monorepo-aware extensions works well. JetBrains IDEs can scope to sub-projects. The key is not loading everything at once.

---

### SEGMENT 5: CODE ORGANIZATION WITHIN REPOS (10 minutes)

**SAM:** Let's zoom out from monorepo vs polyrepo. How should code be organized within a repository?

**ALEX:** Great question. The structure affects developer experience significantly.

**Directory structure matters.** A few approaches:

**By type:** `src/`, `tests/`, `docs/` at top level. Simple but doesn't scale - when you have 50 projects, finding things is hard.

**By project:** Each project has its own directory with src, tests, docs inside. Common in monorepos. Makes ownership clear.

**By domain:** Group related functionality. All payment-related code together, even if it spans multiple services.

**SAM:** What's most common in monorepos?

**ALEX:** Usually a structure like:
```
/apps
  /web-app
  /mobile-app
  /api
/libs
  /shared-ui
  /auth
  /common-utils
/tools
  /scripts
  /generators
```

Apps contain deployable applications. Libs contain shared libraries. Tools contain development utilities.

**SAM:** What makes a good library boundary?

**ALEX:** **Cohesion** - the library does one thing well. **Clear API** - internals aren't exposed. **Minimal dependencies** - doesn't pull in the world.

**SAM:** How do you prevent spaghetti dependencies?

**ALEX:** **Layered architecture** in the repo. Define layers: infrastructure, domain, application, presentation. Enforce that dependencies only flow one direction (e.g., presentation can depend on application, but not vice versa).

**ALEX:** **Package boundaries.** Tools like Nx have the concept of "tags" where you can tag libraries (scope:orders, type:feature, type:util) and define rules about what can depend on what.

**SAM:** What about feature organization?

**ALEX:** Some teams organize by feature "vertically" - all code for a feature in one place, even if it spans layers. This maximizes team autonomy but can lead to duplication.

The **hybrid approach** is often best: shared infrastructure is horizontal (everyone uses the same HTTP client), features are vertical (orders feature has its own components, services, models in one location).

**SAM:** How do you handle configuration?

**ALEX:** **Centralize what should be consistent** - linting rules, TypeScript config, CI definitions. Use inheritance so projects extend shared configs with overrides.

**Distribute what should be flexible** - project-specific environment variables, deployment configs, feature flags.

---

### SEGMENT 6: PACKAGE MANAGEMENT (10 minutes)

**SAM:** Let's talk about package management, especially for JavaScript ecosystems. It seems complicated in monorepos.

**ALEX:** It's the source of much pain. But there are solutions.

For **JavaScript/TypeScript monorepos**, you have several options:

**npm/yarn workspaces** - built-in monorepo support. Define packages, share node_modules, link packages locally.

**pnpm** - faster, uses hard links to save space, excellent for monorepos. Stricter than npm which actually helps avoid dependency issues.

**SAM:** What problems do these solve?

**ALEX:** Several:

**Dependency hoisting** - shared dependencies installed once, not in each package. Saves disk space and installation time.

**Local linking** - when package A depends on package B, it uses the local version, not a published version. Changes to B are immediately visible to A.

**Consistent versions** - tools can enforce that all packages use the same version of a dependency.

**SAM:** What about non-JavaScript ecosystems?

**ALEX:** Each ecosystem has its patterns:

**Python** - Poetry or pip-tools with virtual environments. Less mature monorepo tooling but workable.

**Go** - Go modules work well. The go.work file supports multi-module repositories.

**Java** - Maven multi-module or Gradle composite builds. Well-established patterns.

**Rust** - Cargo workspaces. First-class monorepo support.

**SAM:** What about versioning libraries within a monorepo?

**ALEX:** Controversial topic. Two approaches:

**No versioning internally** - everything is at head. When you update shared code, you update all consumers. Google does this.

**Independent versioning** - each package has its own version, published internally. More complex but allows gradual migration.

**SAM:** Which is better?

**ALEX:** No versioning is simpler and enables atomic changes. Independent versioning is necessary if you publish packages externally or have very large repos where updating all consumers at once isn't practical.

---

### SEGMENT 7: CULTURAL AND ORGANIZATIONAL ASPECTS (8 minutes)

**SAM:** Let's talk about the human side. How does code organization affect culture?

**ALEX:** Deeply. Repository structure shapes behavior.

**Monorepos encourage collaboration** - everyone can see and contribute to any code. This creates transparency and broader ownership. But it also requires trust and good code review.

**SAM:** What about team autonomy?

**ALEX:** There's tension there. Monorepos can feel centralizing - everyone must use the same tools, follow the same standards. Some teams chafe at that.

**SAM:** How do you balance?

**ALEX:** Be explicit about what's standardized (must use) versus what's suggested (should consider). Make the standards genuinely good so people want to follow them. Have a process for teams to propose changes to standards.

**ALEX:** **Inner-source culture.** The best monorepo cultures embrace inner-source - internal open source. Anyone can contribute to any code, with appropriate review. This spreads knowledge, increases bus factor, improves code quality.

**SAM:** What makes inner-source work?

**ALEX:** Good documentation - code should be understandable by outsiders. Welcoming maintainers who don't gatekeep. Clear contribution guidelines. Fast feedback on PRs.

**ALEX:** **Code ownership models.**

**Strong ownership** - team A owns package X, and only they can approve changes. Clear responsibility, potential bottleneck.

**Weak ownership** - anyone can change anything with appropriate review. Faster, but accountability is fuzzy.

**Hybrid** - team A must review changes to package X, but others can contribute. Common approach.

**SAM:** What works best?

**ALEX:** Depends on risk. For critical infrastructure, strong ownership makes sense. For utilities and features, weaker ownership enables faster iteration. The key is matching ownership strength to criticality.

---

### SEGMENT 8: PRACTICAL RECOMMENDATIONS (8 minutes)

**SAM:** Let's wrap up with actionable advice.

**ALEX:** Here's my practical guidance:

**For small teams (< 20 engineers):**
Don't overthink it. A monorepo with basic tooling (npm/yarn/pnpm workspaces, simple CI) works fine. Focus on building product, not infrastructure.

**For medium teams (20-100):**
This is where the decision matters. If you're feeling pain from polyrepo coordination, consider monorepo. Invest in tooling - Nx, Turborepo, or Bazel depending on your stack.

**SAM:** What's the migration story?

**ALEX:** Start small. Move shared libraries first. See how it feels. Then migrate applications gradually. Don't do a big-bang migration.

**ALEX:** **For large teams (100+):**
At this scale, you need deliberate investment either way. If monorepo, you need dedicated tooling teams. If polyrepo, you need strong dependency management and coordination processes.

**SAM:** What mistakes do you see?

**ALEX:** **Mistake 1:** Choosing monorepo without investing in tooling. You get the pain without the benefit.

**Mistake 2:** Not establishing standards. A monorepo with no consistency is worse than polyrepo.

**Mistake 3:** Ignoring team dynamics. If teams want autonomy, forcing monorepo breeds resentment.

**Mistake 4:** Over-engineering. You probably don't need Google's infrastructure. Start simple, evolve as needed.

**SAM:** What's the one thing to remember?

**ALEX:** Code organization should serve the humans who use it. If developers are fighting their tools, structure is wrong. If changes are scary and coordination is hard, structure is wrong. Optimize for developer productivity and collaboration, and the specific repo structure is secondary.

**SAM:** Great framing. Next episode: Design Systems. How to build and maintain component libraries that scale across products and teams.

**ALEX:** From code organization to UI organization.

**[OUTRO MUSIC]**

---

## Key Concepts Reference Sheet

| Term | Definition |
|------|-----------|
| Monorepo | Single repository containing multiple projects/all company code |
| Polyrepo | Separate repositories for each project |
| Bazel | Google's open-source hermetic build system |
| Nx | JavaScript/TypeScript monorepo build system |
| Turborepo | Vercel's monorepo build tool |
| Sparse Checkout | Git feature to checkout only subset of files |
| CODEOWNERS | File defining required reviewers for paths |
| Workspaces | Package manager feature for managing multiple packages |
| Inner-source | Internal open source - anyone can contribute to any code |
| Hermetic Build | Build that depends only on declared inputs |
| Affected Testing | Running tests only for code impacted by changes |
| Hoisting | Installing shared dependencies once at root level |

---

*Next Episode: "Design Systems - Building Component Libraries That Scale"*

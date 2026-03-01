# Episode 3: The Issue-to-PR Agentic Workflow
## "Designing End-to-End Autonomous Development Loops"

**Duration:** ~60 minutes
**Hosts:** Alex (Practitioner) & Riley (Research Lead)

---

### INTRO (5 minutes)

**ALEX:** Welcome back to Agentic Coding Frontier. I'm Alex, and I'm joined as always by Riley. Today we are taking on what I think is the single most important workflow in agentic software development: going from a filed issue all the way to a merged pull request, with an autonomous agent doing the heavy lifting in between. This is the workflow that every engineering leader I talk to asks about first, because it maps directly to developer throughput and it is the clearest test of whether your agentic setup actually works or just demos well.

**RILEY:** That is exactly right. If you strip away all the hype, what engineering teams care about is: can I hand this system a well-scoped issue and get back a production-quality pull request that my reviewers can actually merge? Not a pull request that looks impressive in a screenshot, but one that passes CI, has a coherent rationale, and does not create a maintenance burden down the road. That is a much harder bar to clear than most people realize, and it is what we are going to dig into today.

**ALEX:** We are going to walk through the full pipeline, from intake to merge, and talk about every stage where things go right and where they fall apart. We will cover how agents plan and decompose tasks, where you need checkpoints, what the testing and verification strategy looks like, how to produce PRs that reviewers actually want to review, and how to measure whether any of this is working. And then we will talk about scaling it: what changes when you go from one agent handling one issue to dozens running in parallel.

**RILEY:** And we will ground everything in what real teams are doing today. Not hypothetical future capabilities, but actual production workflows that exist right now, with their real constraints and tradeoffs. Let's get into it.

---

### SEGMENT 1: The Canonical Pipeline Architecture (10 minutes)

**ALEX:** So let's start with the big picture. When we talk about an issue-to-PR workflow, there is a canonical pipeline that most serious teams converge on. Riley, walk us through the stages as you see them.

**RILEY:** Sure. The pipeline has seven stages, and each one has a distinct job and a distinct completion contract. Stage one is intake: the agent receives an issue, parses its structure, and extracts the intent, acceptance criteria, and any constraints the author specified. Stage two is risk classification: the agent looks at what parts of the codebase would be affected, how many files are involved, whether any of those files are in critical paths, and assigns a risk tier. That risk tier determines how much autonomy the agent gets for the rest of the pipeline. Stage three is solution planning: the agent produces a concrete plan of what files to change, what the approach will be, and what tests will validate the result.

**ALEX:** And then we get into the execution side, right?

**RILEY:** Exactly. Stage four is execution: the agent makes the actual code changes according to the plan. Stage five is testing and verification: static analysis, unit tests, integration tests, linting, whatever your verification stack requires. Stage six is PR production: the agent assembles the pull request with a structured summary, the rationale for every significant change, and links back to the original issue. And stage seven is review request: the agent assigns reviewers, tags the right labels, and in some setups, responds to reviewer feedback autonomously. Each of those stages produces an artifact that the next stage consumes, and each stage has a clear definition of done.

**ALEX:** I want to emphasize something about stage two, the risk classification, because I think a lot of teams skip it and then wonder why things blow up. The insight is that not every issue deserves the same treatment. A typo fix in a README and a refactor of your authentication middleware are fundamentally different tasks, and the agent should know that before it starts planning. If you treat everything as medium risk, you either over-invest in review for trivial changes or under-invest for dangerous ones.

**RILEY:** That is one of the most important design decisions in the whole pipeline. We have seen teams use a simple three-tier system: low risk for changes that are cosmetic, documentation, or test-only; medium risk for feature additions that touch a bounded set of files; and high risk for anything that modifies core infrastructure, security surfaces, database schemas, or public APIs. The risk tier then gates everything downstream. Low-risk issues might go straight to PR creation with minimal checkpoints. High-risk issues require plan approval, step-by-step execution with human checkpoints, and expanded test suites.

**ALEX:** And the classification itself does not have to be perfect. What matters is that it is explicit and adjustable. If your team finds that the agent is misclassifying certain types of changes, you can tune the classification rules without touching the rest of the pipeline. That modularity is what makes the whole system maintainable over time.

**RILEY:** One more thing worth noting about the pipeline architecture: each stage should be idempotent and restartable. If the agent fails at stage four because of a transient error, you should be able to restart from stage four without re-doing planning and classification. This matters a lot at scale, because when you are running hundreds of these pipelines in parallel, failures are not exceptional, they are routine. You need the pipeline to be robust to partial failures without requiring a full restart every time.

**ALEX:** That restartability point is huge. I have seen teams build pipelines where a failure at any stage means starting over from scratch, and it absolutely kills their throughput. You end up with agents repeatedly doing the same planning work because the test runner timed out on the third attempt. Treat each stage as its own unit of work with its own state, and you avoid that entire class of problems.

---

### SEGMENT 2: Task Decomposition and Planning (10 minutes)

**ALEX:** Let's go deeper on planning, because in my experience this is where the most leverage is. An agent that plans well can execute mediocre code and still produce a mergeable PR, but an agent that plans poorly will produce garbage no matter how good its code generation is. Riley, why do agents fail so badly on large or ambiguous tasks?

**RILEY:** The core problem is that large language models are very good at local reasoning but struggle with global coherence over many steps. When you hand an agent an issue that says "refactor the payment processing module to support multi-currency," that is an enormous surface area. The agent does not know whether to start with the database schema, the API layer, the frontend display logic, or the test fixtures. Without a plan, it will pick some starting point based on whatever it saw first in the context, and then make a series of locally reasonable but globally incoherent changes. You end up with a PR where the database changes assume one approach, the API changes assume a different approach, and the tests validate a third approach that matches neither.

**ALEX:** So the planning stage is really about imposing global coherence before execution begins. What does a good plan actually look like for an agent?

**RILEY:** A good plan has four properties. First, it is ordered: it specifies what changes happen in what sequence, and the sequence respects dependency relationships. You change the data model before you change the functions that consume it. Second, it is verifiable at each step: after every chunk of work, there is a concrete check that the agent can run to confirm it did not break anything. Third, it is scoped: it explicitly states what is in bounds and what is out of bounds for this particular issue. And fourth, it is specific about files: it names the actual files that will be modified, created, or deleted. Vague plans like "update the relevant modules" are worse than no plan at all, because they give the agent a false sense of direction.

**ALEX:** I have seen a pattern that works well in practice, which is what some teams call "plan-then-confirm." The agent generates the plan, and before any code is written, a human or a policy check reviews the plan and either approves it, requests changes, or rejects it entirely. This catches a huge number of problems before any compute is spent on execution. If the agent misunderstood the issue, you find out at the plan stage, not after it has generated three hundred lines of wrong code.

**RILEY:** Plan-then-confirm is essential for anything above low risk. And I would add that the plan should include an estimate of the blast radius: how many files are touched, how many lines are expected to change, and which existing tests are expected to be affected. This gives the reviewer a quick sanity check. If an issue is "add a tooltip to the settings page" and the plan says it will modify fourteen files and touch the database migration layer, something has gone wrong in the agent's understanding.

**ALEX:** Let's talk about decomposition specifically. When an issue is too large for a single agent pass, how should teams think about breaking it down?

**RILEY:** The best approach is to decompose along verification boundaries. Each sub-task should produce a result that can be independently tested. If you are building a new API endpoint, one sub-task might be "create the database migration and verify it applies cleanly," another might be "implement the handler function and verify it passes unit tests with mocked dependencies," and a third might be "wire up the route and verify the integration test passes." Each of those has a clear completion criterion, and the agent can checkpoint after each one. If it gets the migration right but botches the handler, you do not lose the migration work.

**ALEX:** And there is a practical limit to how fine-grained the decomposition should be, right? I have seen teams go overboard and decompose a simple feature into twenty sub-tasks, and the overhead of managing all those checkpoints actually slows things down.

**RILEY:** Absolutely. The rule of thumb I have seen work well is: each sub-task should represent between fifteen minutes and two hours of equivalent human work. If a sub-task is smaller than that, the checkpoint overhead dominates. If it is larger, you lose the benefits of incremental verification. For most issues that agents handle today, that means somewhere between two and six sub-tasks. And it is perfectly fine for simple issues to have a single-step plan with no decomposition at all. Not everything needs to be broken into pieces.

**ALEX:** One more thing on planning that I think is underappreciated: the plan should include a rollback strategy. What happens if the agent gets to step four of six and realizes the approach is fundamentally wrong? A good plan says "if integration tests fail after step four, revert to the state after step two and try alternative approach B." Without that, agents get stuck in loops where they keep trying to patch a broken approach instead of stepping back and reconsidering.

**RILEY:** That is a great point. The ability to abandon a failing approach and try a different one is something that separates useful agents from frustrating ones. And it requires that the agent maintains clean state boundaries at each checkpoint, which brings us naturally into execution.

---

### SEGMENT 3: Execution with Checkpoints (8 minutes)

**ALEX:** So the plan is approved and the agent starts executing. In practice, how should checkpoint logic work? What is the agent actually doing at each checkpoint?

**RILEY:** A checkpoint is a pause-and-verify moment. The agent stops generating code, takes stock of what it has produced so far, and runs a set of validation checks specific to that stage. The typical checkpoint sequence for a medium-risk issue looks like this. Checkpoint one comes right after plan approval: the agent has its marching orders and confirms it can access all the files and tools it needs. Checkpoint two is after the first meaningful code change: the agent has made its initial edit, and it verifies that the codebase still compiles or parses cleanly. This catches structural errors early, before they cascade. Checkpoint three is after the test run: the agent has written or modified tests and run the relevant test suite. It checks whether existing tests still pass and whether new tests validate the intended behavior. And checkpoint four is right before PR creation: the agent does a final review of the entire diff, checks that it matches the original plan, and produces the PR summary.

**ALEX:** I think checkpoint two is the one most teams underinvest in. That "does it still compile after the first change" check seems trivial, but it catches an enormous number of problems. If the agent edits a function signature and breaks every call site, you want to know immediately, not after it has made forty more edits on top of the broken one. A fast feedback loop at the early stages saves massive amounts of wasted computation later.

**RILEY:** And the cost of that checkpoint is almost zero. Running a type checker or a syntax parse takes seconds. Compare that to the cost of letting the agent continue for another ten minutes of execution, generating code that all has to be thrown away because the foundation was broken. The economics strongly favor early, cheap checkpoints.

**ALEX:** What about the mechanics of state management at each checkpoint? I have seen some teams use git branches, where each checkpoint is a commit, and others use in-memory state. What works best?

**RILEY:** Git-based checkpointing is the most robust approach for anything non-trivial. The agent creates a working branch, and each checkpoint corresponds to a commit on that branch. If the agent needs to roll back, it does a git reset to the appropriate commit. This gives you full traceability: you can see exactly what the agent did at each step, and you can reproduce any intermediate state. In-memory state works for very fast, simple pipelines, but it does not give you the audit trail, and you lose everything if the process crashes. For production workflows, commit-based checkpointing is strongly preferred.

**ALEX:** There is also a human-in-the-loop dimension to checkpoints. For high-risk issues, some checkpoints should block until a human approves. How do teams handle that without making the workflow feel painfully slow?

**RILEY:** The key is to make checkpoint reviews asynchronous and fast. When the agent hits a human-required checkpoint, it posts a summary to Slack or your review tool, with the relevant diff and a specific question: "I plan to modify the authentication middleware to add rate limiting. Here is the diff so far. Approve to continue, or provide alternative direction." The human can review it on their own time, and the agent moves on to other work in the meantime. The worst pattern is synchronous blocking, where the agent just sits idle waiting. The best systems run a pool of issues in parallel and switch to another one whenever they are blocked on review for the current one.

**RILEY:** I also want to mention that checkpoints serve a second purpose beyond verification: they produce the audit trail that compliance and security teams need. When someone asks "how did this change get into production," you can point to a sequence of checkpoints with explicit approvals. That is much stronger than "the agent did it" as an answer, and it matters a lot in regulated industries.

---

### SEGMENT 4: Testing and Verification Strategy (10 minutes)

**ALEX:** Testing is where the rubber meets the road. An agent can produce beautiful-looking code that is completely wrong, and without a solid verification strategy, nobody catches it until it is in production. Riley, what should the verification stack look like for agent-generated code?

**RILEY:** The verification stack has five layers, and each one catches a different class of error. Layer one is static analysis: type checking, linting, style enforcement. This catches syntactic and structural errors. Layer two is targeted unit tests: tests that exercise the specific functions the agent modified. The agent should be able to identify which tests are relevant to its changes and run just those, rather than the entire test suite. Layer three is integration tests: a subset of end-to-end tests that cover the workflows affected by the change. Layer four is policy linting: custom rules that enforce your organization's specific standards, like "never modify the auth module without a security review tag" or "database migrations must be backward compatible." And layer five is semantic diff review: an automated analysis of the diff that flags suspicious patterns, like changes that are much broader than the issue warrants, or modifications to files that were not in the plan.

**ALEX:** Let's unpack the targeted unit test layer, because I think it is the most nuanced. The agent needs to both run existing tests and often write new ones. How should that work?

**RILEY:** For existing tests, the agent should use code analysis to determine the dependency graph from its changes backward to the test files that exercise the changed code. If it modifies a function in `payments/processor.py`, it should identify and run the tests in `tests/test_processor.py` and any integration tests that import from the payments module. Running only the relevant tests keeps the feedback loop fast, which is important because the agent may need to iterate several times. For new tests, the agent should write tests that cover the specific behavior it is adding or changing. A common failure mode is agents that write tests which merely assert that their own code does what it does, rather than testing that it satisfies the acceptance criteria from the issue. Good test generation means translating issue requirements into concrete assertions.

**ALEX:** That distinction between "tests that verify the code does what it does" and "tests that verify the code does what it should" is really important. I have reviewed agent-generated PRs where every test passes, but the tests are essentially tautological. They are testing that the function returns what it returns, not that it returns the right thing. How do you guard against that?

**RILEY:** There are a few approaches. One is to include the acceptance criteria from the issue in the agent's test-writing prompt, so it is anchored to the intended behavior rather than the implemented behavior. Another is mutation testing: you deliberately introduce small bugs into the agent's code and verify that the tests catch them. If you mutate a comparison operator and all the tests still pass, those tests are not actually testing anything meaningful. Some teams run mutation testing as part of the verification pipeline for agent-generated code, and it is very effective at catching weak test suites.

**ALEX:** What about the integration test layer? Running the full integration suite on every agent change would be way too slow. How do teams scope it down?

**RILEY:** Most teams maintain a mapping from code modules to integration test tags. When the agent modifies files in the payments module, it runs integration tests tagged with "payments" and "checkout," not the entire suite. Building and maintaining that mapping requires some upfront investment, but it pays for itself quickly. Some teams generate the mapping automatically by running their full test suite with code coverage tracking and recording which tests exercise which modules. Then the agent can query that mapping at runtime. The goal is a verification cycle of under ten minutes for most changes, because anything longer breaks the agent's iteration loop.

**ALEX:** Let's talk about policy linting, because I think this is the layer that is most specific to agent-generated code. What kinds of policies matter?

**RILEY:** Policy linting is where you encode organizational knowledge that the agent does not inherently have. Examples: "changes to the database schema directory require a migration review label." "Any modification to files in the security/ directory must be classified as high risk regardless of the change size." "PRs that add new dependencies must include a justification in the PR description." "Frontend changes must not increase the bundle size by more than five percent." These are rules that experienced engineers on your team know implicitly, but the agent does not unless you make them explicit. Policy linting turns tribal knowledge into automated checks, and it is valuable even beyond the agent use case, because it catches human mistakes too.

**RILEY:** The semantic diff review layer deserves its own discussion. This is where you use a second model, or sometimes the same model in a different mode, to review the agent's diff holistically. The reviewer model looks at the full set of changes and asks questions like: does this diff match the stated intent? Are there changes that seem unrelated to the issue? Are there files modified that were not in the plan? Is the change proportionate to the issue, meaning is a one-line bug fix producing a three-hundred-line diff? This catches a class of errors that no static tool can find, because they are about coherence and intent, not syntax.

**ALEX:** I love that concept of proportionality checking. If the issue says "fix the off-by-one error in pagination" and the agent rewrites the entire pagination module, that is a red flag even if all the tests pass. The change might be technically correct but it introduces unnecessary risk and review burden.

---

### SEGMENT 5: PR Quality and Review UX (9 minutes)

**ALEX:** Now let's talk about the output: the pull request itself. This is where the human-agent interface really matters, because even if the agent did everything perfectly, if the PR is hard to review, it creates friction and erodes trust. What makes an agent-generated PR reviewable?

**RILEY:** The number one thing is a structured, honest summary. The PR description should have four sections. First, a one-paragraph summary of what the change does and why, written for a human who has not read the issue. Second, a list of every file changed with a one-line explanation of why each file was modified. Third, the testing approach: what tests were run, what tests were added, and what the results were. Fourth, a risk assessment: what could go wrong with this change and what was done to mitigate those risks. That structure gives a reviewer everything they need to decide where to focus their attention, without having to reverse-engineer the agent's intent from the diff.

**ALEX:** The file-by-file explanation is something I have seen make an enormous difference. When you are reviewing a PR with twenty changed files, knowing that files one through five are "added new API endpoint," files six through ten are "updated existing tests," and files eleven through twenty are "auto-generated types from the schema change" completely changes your review strategy. You know to focus your attention on the first five files and do a lighter pass on the rest.

**RILEY:** Exactly. And this is an area where agents actually have an advantage over human developers. The agent knows exactly why it changed each file, because it followed a plan. It can produce that file-level explanation automatically and accurately. Human developers often skip this because it is tedious to write, but for agents it is nearly free. Teams should take advantage of that.

**ALEX:** What about diff organization? I have seen agent PRs where the diff is a jumbled mess of unrelated changes interleaved in ways that are very hard to follow. How do you get agents to produce clean diffs?

**RILEY:** This comes back to the execution plan. If the agent follows a well-ordered plan, the commits should naturally be organized in a logical sequence. The best practice is to have the agent produce one commit per logical step of the plan. So if the plan says "step one: add database migration, step two: implement handler, step three: wire up route, step four: add tests," you get four commits that each tell a coherent story. Reviewers can then review commit by commit rather than looking at the whole diff at once. Some teams squash everything into a single commit before merge, but during review, the per-step commit history is invaluable.

**ALEX:** There is also the question of commit messages. The agent should write commit messages that explain the why, not just the what. "Add rate limiting to login endpoint" is a decent commit subject, but "Add rate limiting to login endpoint to mitigate brute-force attacks (resolves SECURITY-1234)" is much better because it ties the change to its motivation and the original issue.

**RILEY:** Another PR quality dimension is what I call "diff hygiene." The agent should not include unrelated formatting changes, whitespace normalization, or import reordering unless those are explicitly part of the task. Every line in the diff should be traceable to the issue. I have seen agent PRs where the meaningful change is ten lines but the diff is three hundred lines because the agent auto-formatted every file it touched. That buries the signal in noise and makes review much harder. Good agents are disciplined about changing only what needs to change.

**ALEX:** That is a great segue into something I feel strongly about, which is that agent PRs should be held to a higher standard than human PRs, not a lower one. There is a temptation to say "well, the agent did it automatically, so we should cut it some slack." But the opposite is true. Because agents can produce PRs much faster and in much higher volume, the quality bar for each individual PR needs to be higher, or you will overwhelm your reviewers with mediocre output. Every agent PR that wastes a reviewer's time erodes the team's trust in the entire system.

**RILEY:** I completely agree. The teams that succeed with agentic workflows are the ones that configure their agents to be meticulous about PR quality. They would rather have the agent take an extra two minutes to clean up the diff and write a thorough description than save that time and shift the burden to the reviewer. The reviewer's time is the bottleneck in most organizations, not the agent's compute time.

---

### SEGMENT 6: Human Review Integration and Feedback Loops (9 minutes)

**ALEX:** So the PR is created and it looks good. Now a human reviewer picks it up. This interaction between the reviewer and the agent is really where the new dynamics come in. How should reviewers approach agent-generated PRs, and how should the system handle reviewer feedback?

**RILEY:** The first thing reviewers need is a clear signal that this is an agent-generated PR and what that means for their review. Most teams use a label or a tag in the PR title, something like "[agent]" or an "agentic" label. But more importantly, the PR should state the confidence level of the agent. Some systems include a self-assessment: "This change is straightforward and all tests pass with high confidence," or "This change involves a complex refactor and the agent recommends careful review of the error handling paths." That self-assessment helps the reviewer calibrate their effort.

**ALEX:** I want to push on that confidence signal because I think it is tricky. The agent's self-assessment might not be well-calibrated. It might say it is highly confident when it should not be, especially early in deployment. How do teams handle that?

**RILEY:** You are right that calibration is a real problem. The best approach is to start by ignoring the agent's self-assessment and always doing a thorough review, then tracking over time whether the agent's confidence correlates with actual quality. After a few weeks of data, you can start to trust the agent's high-confidence assessment for certain types of changes. It is an earned trust model, the same way you would treat a new hire's code. You review everything carefully at first, and over time you learn where they are reliable and where they need closer attention.

**ALEX:** What about the feedback loop back to the agent? If a reviewer leaves a comment saying "this error handling is wrong, you need to catch the timeout exception separately," can the agent pick that up and fix it?

**RILEY:** This is an area of active development, and different teams are at different levels of maturity. The simplest level is that the agent treats review comments as a new issue. The reviewer's comment becomes a follow-up task, and the agent goes through a mini version of the same pipeline: understand the feedback, plan the fix, make the change, verify it, and push an updated commit to the same PR. The more sophisticated level is conversational: the agent can ask clarifying questions, propose alternative approaches, and have a back-and-forth with the reviewer in the PR comments. This is harder to get right because the agent needs to understand the reviewer's intent, not just their literal words.

**ALEX:** I have seen the conversational approach work well for simple feedback like "rename this variable" or "add a null check here," but it struggles with higher-level feedback like "I do not think this approach is right, consider using the observer pattern instead." That kind of feedback requires the agent to substantially rethink its plan, not just make a local edit.

**RILEY:** That is a great example of where the risk classification comes back into play. If the reviewer's feedback requires a fundamental change in approach, the agent should escalate rather than try to handle it autonomously. It should acknowledge the feedback, explain that the requested change is substantial, and either ask for a new plan approval or flag the issue for human resolution. The worst outcome is an agent that confidently rewrite the entire PR in response to a review comment and produces something worse than what it started with. Knowing when to escalate is a crucial capability.

**ALEX:** Let's talk about iteration cycles. When the agent pushes a fix in response to a review comment, how quickly should that happen, and how does the reviewer stay in the loop?

**RILEY:** Speed matters a lot here, because the reviewer's context is fresh right after they leave the comment. If the agent can push a fix within a few minutes, the reviewer can immediately verify it and the PR moves toward merge. If it takes an hour, the reviewer has moved on to other work and has to context-switch back. The best systems target under five minutes for simple review responses and under fifteen minutes for more complex ones. The agent should also post a comment on the PR explaining what it changed in response to the review, so the reviewer does not have to re-review the entire diff to find the fix.

**RILEY:** There is also a pattern called "review summary posting" that I think is underused. After the agent addresses all review comments, it posts a single summary comment: "I addressed three review comments. Comment one about error handling was fixed in commit abc123. Comment two about naming was fixed in commit def456. Comment three about adding a test was addressed by adding a new test case in test_processor.py." This gives the reviewer a clear checklist to verify, rather than having to go through the whole PR again to see what changed.

**ALEX:** That is really smart. It turns the re-review from "figure out what changed" into "verify these three specific things." I think this kind of attention to the reviewer's workflow is what separates teams that successfully adopt agent PRs from teams that abandon the approach after a few weeks of frustration.

---

### SEGMENT 7: Measuring Success and Scaling (9 minutes)

**ALEX:** Let's shift to metrics. If a team is running this pipeline, how do they know if it is working? What should they measure?

**RILEY:** There are four categories of metrics that matter. The first is throughput: how many issues per week are being resolved through the agent pipeline, and what is the cycle time from issue creation to PR merge. The second is quality: what percentage of agent PRs are merged without requiring revisions, what is the defect rate of agent-generated code compared to human-generated code, and how often do agent changes cause production incidents. The third is reviewer satisfaction: how long do reviewers spend on agent PRs compared to human PRs, and what do they report in terms of the quality and reviewability of agent output. The fourth is time-to-merge: the clock time from PR creation to merge, broken down by stages like "waiting for review," "waiting for agent to address feedback," and "waiting for CI."

**ALEX:** Time-to-merge is interesting because it is affected by so many factors outside the agent's control. A PR might sit for two days waiting for a reviewer to pick it up. How do you separate the agent's performance from the organizational bottlenecks?

**RILEY:** You have to instrument each stage of the pipeline separately. Track the time the agent spends on each stage: planning, execution, testing, PR creation. Track the time the PR spends in each review state: waiting for initial review, waiting for re-review after feedback, waiting for CI. Then you can see where the bottlenecks are. In most organizations, the dominant bottleneck is not the agent; it is reviewer availability. The agent can produce a PR in fifteen minutes, but it sits in the review queue for a day and a half. That tells you that the place to invest is not in making the agent faster, but in streamlining the review process.

**ALEX:** What about the quality metrics? Defect rate is a lagging indicator, sometimes by weeks or months. Are there leading indicators that teams can track?

**RILEY:** The best leading indicator is the "first-pass approval rate": what percentage of agent PRs are approved on the first review without any change requests. If that number is going up over time, the agent is improving. If it is stagnating or dropping, something is wrong. Another good leading indicator is the "revert rate": how often are agent-generated changes reverted after merge. A low revert rate means the testing and verification pipeline is catching problems before they reach production. And you should segment all of these metrics by risk tier and issue type, because aggregate numbers can mask important differences. The agent might be excellent at low-risk documentation changes but terrible at medium-risk API modifications.

**ALEX:** Great. Now let's talk about scaling. We have been discussing a single issue flowing through a single pipeline. What changes when you want to run dozens or hundreds of these in parallel?

**RILEY:** Scaling introduces three new challenges. The first is resource contention: multiple agents working on different issues might need to modify the same files, and you need a strategy for handling conflicts. The simplest approach is optimistic concurrency: each agent works on its own branch, and if two PRs conflict, the second one to merge has to rebase and re-verify. More sophisticated systems use a work scheduler that is aware of file-level dependencies and avoids assigning conflicting issues to agents simultaneously.

**ALEX:** The file contention problem is real. I have seen teams where two agents independently refactored the same utility function in incompatible ways, and the merge conflict was a nightmare that required human intervention to resolve. The scheduler approach is much better.

**RILEY:** The second challenge is infrastructure cost. Each agent pipeline consumes compute for code generation, test execution, and CI. At scale, you need to think about queuing and prioritization. Not every issue should be worked on immediately; high-priority and low-risk issues should go first because they deliver the most value with the least risk. The third challenge is review capacity. If you have twenty agents producing PRs but only five reviewers, the review queue becomes the bottleneck and everything slows down. Scaling agent throughput without scaling review capacity just moves the bottleneck rather than eliminating it.

**ALEX:** That last point is critical and often overlooked. Teams get excited about the agent producing PRs faster and then discover that their review process cannot absorb the volume. What are the solutions?

**RILEY:** Several approaches help. One is tiered review: low-risk agent PRs go through an automated review process with only a lightweight human check, while high-risk PRs get full human review. Another is review batching: the agent groups related small changes into a single PR that can be reviewed together, rather than producing twenty tiny PRs that each require a separate review cycle. A third is investing in the reviewer tooling: making agent PRs so well-structured and well-documented that reviewers can process them in half the time. And a fourth, which is increasingly common, is using a second agent as a first-pass reviewer, catching obvious issues before a human ever sees the PR. The human reviewer then focuses on judgment calls and architectural concerns rather than catching typos and missing null checks.

**ALEX:** I want to ground this in reality before we wrap up. What are real teams doing today? Who is actually running issue-to-PR workflows in production?

**RILEY:** There are a few profiles. Some platform engineering teams at larger companies are running this for internal tooling and infrastructure changes: well-scoped issues with clear acceptance criteria, moderate codebase size, and high test coverage. These are ideal conditions for the pipeline because the issues are concrete and the verification is strong. There are also open-source maintainers who use agents to handle issue triage and simple bug fixes, especially for issues that have been well-characterized by reporters. And there are startups that are building their entire development workflow around agentic pipelines from day one, because they do not have the legacy processes that larger organizations need to work around.

**ALEX:** The common thread I see across all those examples is that the teams that succeed are very disciplined about scoping. They do not try to throw every issue at the agent. They start with issue types they know the agent can handle, they measure the results rigorously, and they gradually expand the scope as they build confidence. The teams that fail are the ones that flip the switch and try to route everything through the agent on day one.

**RILEY:** Exactly. This is a capability you grow into, not one you deploy all at once. Start with the issues you understand best, build the verification pipeline around those, measure relentlessly, and expand when the numbers support it. That is the path from experiment to production.

**ALEX:** Well said. Let me give a quick summary of what we covered today. We walked through the seven-stage canonical pipeline from issue intake to review request. We talked about why planning and task decomposition are the highest-leverage investment, how checkpoints prevent wasted work and provide audit trails, the five-layer verification stack from static analysis to semantic diff review, what makes agent PRs reviewable and why PR quality should be held to a higher standard, how reviewers interact with agent code and how feedback loops work, the four categories of success metrics, and the challenges of scaling from single-issue to parallel execution. Thanks for listening, and we will see you on the next episode of Agentic Coding Frontier.

**RILEY:** Thanks, everyone. See you next time.

# Episode 3: Code Reading & Editing

## Introduction

**ALEX:** Welcome back to Claude Code Mastery. I'm Alex, and today we're getting into the really powerful stuff: actually modifying your code with Claude's help.

**JAMIE:** I'm Jamie, and this is the episode I've been waiting for. Reading and navigating code is great, but the real productivity gains come from Claude helping me write and edit code, right?

**ALEX:** Absolutely. By the end of this episode, you'll understand the three main tools Claude uses to modify files: Read, Edit, and Write. You'll know when to use each one and how to review changes safely.

## The Read Tool in Depth

**JAMIE:** We touched on the Read tool last episode, but let's go deeper. What exactly happens when Claude reads a file?

**ALEX:** When Claude uses the Read tool, it requests the contents of a specific file at a specific path. The tool returns the file content with line numbers, which is crucial for making precise edits later.

**JAMIE:** Why are line numbers important?

**ALEX:** Because when Claude wants to edit a file, it needs to reference exact locations. If Claude reads a file and sees the function you want to change is on lines 45 through 60, it can target its edit precisely.

**JAMIE:** Makes sense. Does Claude always read the entire file?

**ALEX:** Not necessarily. The Read tool accepts optional parameters for offset and limit. So Claude can read lines 100 through 200 of a large file, or just the first 50 lines. This keeps context manageable.

**JAMIE:** What about really large files?

**ALEX:** For very large files, Claude often reads strategically. It might first search for a function name to find its line number, then read just that section. Or it might read the first 100 lines to understand the file structure, then jump to specific sections.

**JAMIE:** That's pretty clever. It's like how I would navigate a large file manually.

**ALEX:** Exactly. Claude mimics the patterns experienced developers use. Skim for structure, then dive into details where needed.

## The Edit Tool

**JAMIE:** Okay, let's talk about actually changing code. How does the Edit tool work?

**ALEX:** The Edit tool is Claude's primary way to modify existing files. It works on a find-and-replace principle. Claude specifies an old string that exists in the file and a new string to replace it with.

**JAMIE:** So it's like find and replace in my text editor?

**ALEX:** Similar, but more targeted. Claude has to provide a string that uniquely identifies the location in the file. If the old string appears multiple times, the edit will fail unless Claude explicitly says to replace all occurrences.

**JAMIE:** Why that constraint?

**ALEX:** Safety. Imagine Claude wants to change a variable name from "data" to "userData." If it just replaced every "data" in the file, it might accidentally change strings like "database" or "metadata" or comments. The uniqueness requirement prevents that.

**JAMIE:** So Claude has to include enough context to be unique?

**ALEX:** Right. Instead of just "data," Claude might specify "const data = fetchUser" as the old string, which is much more likely to be unique in the file.

## Watching an Edit in Action

**JAMIE:** Can you walk through what an edit looks like in practice?

**ALEX:** Sure. Let's say you ask Claude to add error handling to a function. First, Claude reads the file to see the current code. It might see a function like: async function fetchUser id, then return await api dot get user id.

**JAMIE:** A simple fetch without any error handling.

**ALEX:** Right. Claude then proposes an edit. The old string would be that entire function body. The new string would be the same code wrapped in a try-catch block with appropriate error handling.

**JAMIE:** And I see this proposal before it happens?

**ALEX:** Yes! Claude shows you exactly what the old code is, what the new code will be, and asks for permission. You can approve it, reject it, or ask for modifications before it runs.

**JAMIE:** That visibility is reassuring. I can catch mistakes before they happen.

**ALEX:** That's the whole point. Claude is powerful, but you stay in control. Review every change, especially when you're first learning the workflow.

## The Write Tool

**JAMIE:** What about creating entirely new files? Is that different?

**ALEX:** Yes, that's the Write tool. While Edit modifies existing files, Write creates new files or completely overwrites existing ones.

**JAMIE:** When would Claude use Write versus Edit?

**ALEX:** Write is for new files: a new component, a new test file, a new utility module. It's also used when you want to completely replace a file's contents rather than make a surgical change.

**JAMIE:** What's the permission flow for Write?

**ALEX:** Similar to Edit. Claude shows you the file path it wants to write to and the content it will write. You approve or deny. If the file already exists, you'll be warned that it will be overwritten.

**JAMIE:** Good. I wouldn't want to accidentally clobber an existing file.

**ALEX:** Right. In practice, Claude tries to use Edit for existing files because it's less destructive. Write is reserved for new files or complete rewrites.

## Edit vs Write: Making the Right Choice

**JAMIE:** How do I know which one Claude will use?

**ALEX:** Claude makes this decision automatically based on the situation. If you ask to "add a function to utils.js," Claude will use Edit because it's adding to an existing file. If you ask to "create a new helper file," Claude will use Write.

**JAMIE:** What if I want to replace a whole file?

**ALEX:** You can ask explicitly. "Rewrite the config file completely" or "replace the entire contents of setup.js" signals to Claude that a full Write is appropriate.

**JAMIE:** Are there cases where Edit is better even for big changes?

**ALEX:** Generally, smaller, targeted edits are safer. Even if you're changing a lot, multiple Edit operations let you review each change individually. A single Write that replaces everything is harder to review.

**JAMIE:** Incremental changes are easier to verify.

**ALEX:** Exactly. I usually prefer Claude to make a series of edits rather than one big rewrite. It's easier to catch issues and rollback if needed.

## Handling Multiple File Edits

**JAMIE:** What about changes that span multiple files? Like adding a feature that touches the model, controller, and view?

**ALEX:** Claude handles multi-file changes by making edits sequentially. It will edit the first file, then the second, then the third. Each edit gets its own permission prompt.

**JAMIE:** Can I approve them all at once?

**ALEX:** If you trust the pattern, you can tell Claude to proceed with all related changes. But especially for complex features, reviewing each file change individually is wise.

**JAMIE:** What if one edit fails?

**ALEX:** Claude will tell you about the failure and typically try to recover or ask for guidance. Maybe the file changed since it was read, or the string it was trying to match doesn't exist anymore.

**JAMIE:** So I might need to help Claude get back on track?

**ALEX:** Sometimes. You might say "read the file again" or "the function was renamed, look for newFunctionName instead." It's a collaboration.

## Reviewing Proposed Changes

**JAMIE:** What's the best way to review Claude's proposed changes?

**ALEX:** First, look at the scope. Is Claude changing what you expected? If you asked to fix a typo and Claude is rewriting the whole function, that's a red flag.

**JAMIE:** Scope creep in AI suggestions.

**ALEX:** Exactly. Second, read the actual diff. Does the new code make sense? Are there obvious bugs or issues? Trust your developer instincts here.

**JAMIE:** What if I'm not sure about a change?

**ALEX:** Ask Claude to explain it! "Why did you change this part?" or "What does this new code do?" Claude will walk you through its reasoning. Sometimes the explanation reveals issues you hadn't noticed.

**JAMIE:** Or confirms that it's the right approach.

**ALEX:** Right. And don't hesitate to say "no, try a different approach." Claude can suggest alternatives. The first proposal isn't always the best one.

## Common Editing Patterns

**JAMIE:** What are some common editing patterns you use with Claude?

**ALEX:** One of my favorites is "add X to Y." Add logging to this function. Add validation to this endpoint. Add error handling to this API call. It's specific about what and where.

**JAMIE:** Clear instructions produce clear results.

**ALEX:** Another pattern is "change X from A to B." Change the timeout from 30 seconds to 60 seconds. Change the color scheme from blue to green. Very explicit about the transformation.

**JAMIE:** What about refactoring?

**ALEX:** For refactoring, I often say "extract this logic into a separate function" or "move this code into its own file." Claude understands these refactoring concepts and can execute them cleanly.

**JAMIE:** Does Claude handle renaming well?

**ALEX:** Yes! "Rename the function from handleClick to handleButtonClick everywhere" is a great prompt. Claude will use Grep to find all usages and update them consistently.

## Working with Different File Types

**JAMIE:** Does Claude handle different file types differently?

**ALEX:** Claude understands many file types and their conventions. JavaScript, TypeScript, Python, Go, Rust, Java, and many more. It knows the syntax and common patterns for each.

**JAMIE:** What about non-code files like JSON or YAML?

**ALEX:** Claude handles configuration files really well. "Update the package.json to add a new dependency" or "change the database port in docker-compose.yml" are natural requests.

**JAMIE:** What about markdown or documentation?

**ALEX:** Absolutely. "Add a section to the README about installation" or "update the API docs with the new endpoint" work great. Claude treats documentation as a first-class editing target.

**JAMIE:** Does it handle Jupyter notebooks?

**ALEX:** Yes! Claude has specific support for notebook files. It can read cells, understand the flow of a notebook, and edit individual cells. There's even a specialized NotebookEdit tool for this.

## Safety and Rollback

**JAMIE:** What if Claude makes a change I don't like? How do I undo it?

**ALEX:** The best safety net is git. If you're working in a git repository, you can always revert changes. Before any major editing session, I recommend committing your current state so you have a clean rollback point.

**JAMIE:** Git is the ultimate undo.

**ALEX:** Exactly. You can use git diff to see what changed, git checkout to discard changes to specific files, or git reset to go back to your last commit.

**JAMIE:** Can Claude help with the rollback?

**ALEX:** Yes! You can say "undo the last changes to auth.js" and Claude will help you revert. Or "show me what changed" and Claude will run git diff for you.

**JAMIE:** That's handy. The same tool that made the changes can unmake them.

**ALEX:** And honestly, mistakes are part of learning. Don't be afraid to experiment knowing you can always roll back.

## Tips for Effective Editing

**JAMIE:** What are your top tips for getting the best editing results?

**ALEX:** First, read before you edit. Make sure Claude has actually read the file before asking for changes. Say "read the login function in auth.js" before "add rate limiting to the login function."

**JAMIE:** Context before action.

**ALEX:** Second, be specific about what you want to preserve. "Add validation but keep the existing error messages" tells Claude what not to change.

**JAMIE:** Constraints help.

**ALEX:** Third, work incrementally. Instead of "refactor this entire module," try "refactor the first function in this module" then "now the second one." Smaller chunks are easier to review.

**JAMIE:** Baby steps are safer steps.

**ALEX:** And fourth, use your editor alongside Claude. Keep the file open in your IDE. When Claude makes a change, you'll see it update. You can also make manual tweaks and tell Claude about them.

## Common Pitfalls

**JAMIE:** What mistakes do new users commonly make with editing?

**ALEX:** The biggest one is asking for changes without Claude having read the file. If Claude hasn't seen the current code, it's guessing about what needs to change.

**JAMIE:** Always read first.

**ALEX:** Another pitfall is vague requests. "Make this better" doesn't give Claude much to work with. Better is "improve the error messages to be more user-friendly" or "optimize this loop for performance."

**JAMIE:** Specificity again.

**ALEX:** Also, some users approve changes too quickly without reading them. I know it's tempting to just click approve, but those few seconds of review can catch significant issues.

**JAMIE:** Trust but verify.

**ALEX:** Exactly. And finally, not using version control. If you're making significant changes, commit frequently. It's your safety net.

## Practice Exercise

**JAMIE:** Can we give listeners an exercise to practice editing?

**ALEX:** Here's a good one. Pick a function in your codebase that doesn't have comments. Ask Claude to read the function, then ask it to add a documentation comment explaining what the function does.

**JAMIE:** A safe, low-risk edit.

**ALEX:** Right. Review the comment Claude proposes. Does it accurately describe the function? Is the style consistent with your project? Approve it and check the result.

**JAMIE:** And we've practiced the full edit cycle.

**ALEX:** Exactly. Read, request change, review, approve. That's the pattern you'll use for all edits.

## What's Next

**JAMIE:** Great episode. I feel ready to start making edits with confidence. What's coming up?

**ALEX:** Episode four dives into search and exploration in depth. We'll cover advanced patterns for Grep and Glob, using the specialized Explore agent for complex searches, and techniques for understanding unfamiliar codebases.

**JAMIE:** From editing what we know to discovering what we don't know.

**ALEX:** Exactly. See you in episode four!

**JAMIE:** Happy editing, everyone!

*Next Episode: Search & Codebase Exploration - Master advanced search techniques and explore unfamiliar codebases efficiently.*

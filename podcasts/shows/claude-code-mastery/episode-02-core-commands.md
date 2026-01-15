# Episode 2: Core Commands & Navigation

## Introduction

**ALEX:** Welcome back to Claude Code Mastery. I'm Alex, and in today's episode, we're diving deep into how Claude Code actually understands and navigates your codebase.

**JAMIE:** And I'm Jamie. After installing Claude Code from last episode, I've been playing around with it, and I'm amazed at how much it just seems to know about my project. But I want to understand what's happening under the hood.

**ALEX:** That's exactly what we're covering today. By the end of this episode, you'll understand the tools Claude uses to read and search your code, and you'll have practical techniques for getting around large projects efficiently.

## How Claude Reads Your Codebase

**JAMIE:** So when I start Claude Code in my project directory, what's actually happening? Is it reading every file?

**ALEX:** Not immediately. Claude Code is smart about this. It doesn't just slurp up your entire codebase into memory. Instead, it reads files on demand, when they're relevant to what you're asking about.

**JAMIE:** So it's lazy loading, in a sense?

**ALEX:** Exactly. When you ask a question like "how does the user authentication work," Claude will figure out which files are likely relevant and read those. It might look at your file structure first, identify files with names like "auth" or "user" or "login," and then read those specifically.

**JAMIE:** That makes sense from an efficiency standpoint. You wouldn't want to process a million lines of code just to answer a simple question.

**ALEX:** Right. And it keeps the context focused. By only including relevant files, Claude can give you better, more targeted answers without getting distracted by unrelated code.

## The Read Tool

**JAMIE:** You mentioned Claude "reads" files. Is that a specific operation?

**ALEX:** Yes! Under the hood, Claude Code uses what's called the Read tool. When Claude needs to see the contents of a file, it invokes this tool and requests permission to read that file.

**JAMIE:** That's the permission prompt we talked about last episode?

**ALEX:** Exactly. You'll see something like "Claude wants to read src/auth/login.js" and you can approve or deny. Once approved, Claude sees the full file contents and can discuss them with you.

**JAMIE:** Can I tell Claude to read a specific file proactively?

**ALEX:** Absolutely. You can say "read the file src/components/Header.jsx" or "show me what's in package.json" and Claude will use the Read tool to fetch that file. It's a great way to bring specific code into the conversation.

**JAMIE:** What if the file is really long?

**ALEX:** Claude handles large files intelligently. The Read tool can read portions of files, specifying a starting line and a number of lines. So for a ten thousand line file, Claude might read the first few hundred lines, or jump to a specific function.

**JAMIE:** How does it know where to jump?

**ALEX:** That's where the search capabilities come in. Claude might first search the file for a function name, find it's on line 847, then read from that line. It's a combination of search and read that makes navigation efficient.

## Understanding the Glob Tool

**JAMIE:** Speaking of search, I've heard about something called Glob. What's that?

**ALEX:** Glob is a file pattern matching tool. It helps Claude find files based on their names and paths, not their contents. The name comes from glob patterns, which are like wildcards for file paths.

**JAMIE:** Can you give me an example?

**ALEX:** Sure. If Claude needs to find all JavaScript files in your project, it might use a pattern like "star star slash star dot js." That means any file ending in .js, in any directory, at any depth.

**JAMIE:** And star star means any number of directories?

**ALEX:** Exactly. Single star matches anything within one directory level, double star matches across multiple levels. So "src slash star star slash star dot test dot js" would find all test files anywhere under the src folder.

**JAMIE:** That's really powerful for quickly mapping out what files exist.

**ALEX:** It is. And it's fast because it's just looking at file names and paths, not actually reading file contents. Claude can glob for hundreds of files in milliseconds.

## The Grep Tool

**JAMIE:** What about searching inside files? Looking for specific code?

**ALEX:** That's where Grep comes in. Named after the classic Unix grep command, this tool searches file contents for patterns. It's how Claude finds where a function is defined, where a variable is used, or where an error message appears.

**JAMIE:** So Grep looks inside files while Glob looks at file names?

**ALEX:** Exactly right. They complement each other. Often Claude will use Glob first to narrow down which files to search, then Grep to find specific content within those files.

**JAMIE:** Can Grep use regular expressions?

**ALEX:** Yes, it supports full regex syntax. So you can search for complex patterns, not just simple strings. Want to find all function definitions that start with "handle"? You could use a pattern like "function handle" followed by word characters.

**JAMIE:** That's great for refactoring, finding all usages of something.

**ALEX:** Definitely. I use this constantly. "Find everywhere we call the deprecated API" or "show me all places where we catch errors." Grep makes these searches trivial.

## Combining Search Strategies

**JAMIE:** So in practice, how do these tools work together?

**ALEX:** Let me walk through a realistic scenario. Say you ask Claude "where is the shopping cart total calculated?" Here's what might happen behind the scenes.

**JAMIE:** Okay, I'm following.

**ALEX:** First, Claude might Glob for files with "cart" in the name. It finds cart.js, CartComponent.jsx, cartUtils.ts. Then it Greps those files for "total" or "calculate." It finds a function called calculateCartTotal in cartUtils.ts at line 45.

**JAMIE:** So it narrowed from the entire codebase to exactly the right function.

**ALEX:** Right. Then it uses Read to show you that function with some surrounding context. The whole process takes seconds, and you get a precise answer with the actual code.

**JAMIE:** That's so much faster than me manually searching through files.

**ALEX:** It really is. And Claude is doing this automatically based on your natural language question. You don't have to think about glob patterns or grep syntax. Just ask what you want to know.

## The Bash Tool

**JAMIE:** What about running actual commands? Can Claude do that?

**ALEX:** Yes, Claude Code has a Bash tool that can execute shell commands. This is incredibly powerful for things like running your build, executing tests, checking git status, or any other terminal operation.

**JAMIE:** That seems like it could be dangerous if misused.

**ALEX:** That's why it's carefully permissioned. Every bash command Claude wants to run is shown to you first. You see exactly what command will be executed, and you have to approve it. Claude won't run anything without your explicit consent.

**JAMIE:** What are common use cases for the Bash tool?

**ALEX:** Running tests is huge. You can say "run the tests for the auth module" and Claude will figure out the right test command and execute it. Same with builds. "Build the project and show me any errors."

**JAMIE:** And it can see the output?

**ALEX:** Yes, the command output comes back to Claude, so it can analyze test failures, build errors, or any other results. That's what makes it agentic. It can take action, observe the result, and continue working.

**JAMIE:** Like running a test, seeing it fail, then fixing the code.

**ALEX:** Exactly! That loop of run, observe, fix is incredibly powerful. We'll dive much deeper into testing workflows in episode six.

## Working Directory Context

**JAMIE:** You mentioned last episode that Claude understands the working directory. How deep does that go?

**ALEX:** Very deep. When you start Claude Code in a directory, it becomes aware of that as your project root. All file paths are relative to that location. If you ask about "the src folder," Claude knows you mean the src folder in your current project.

**JAMIE:** What if I'm in a subdirectory?

**ALEX:** Claude still understands the project root. Even if you're in src/components, Claude can access files from anywhere in the project. The working directory sets the context but doesn't limit access.

**JAMIE:** Does it detect what kind of project it is?

**ALEX:** Yes! Claude looks for telltale files. A package.json suggests Node or JavaScript. A Cargo.toml means Rust. A pom.xml indicates Java Maven. A requirements.txt or pyproject.toml points to Python. This detection helps Claude give appropriate advice.

**JAMIE:** So it knows the conventions of my ecosystem.

**ALEX:** Right. If you're in a React project, Claude knows about components, hooks, JSX. In a Django project, it understands views, models, templates. This contextual awareness makes the assistance much more relevant.

## Efficient Navigation Techniques

**JAMIE:** Let's get practical. What are your go-to techniques for navigating a codebase with Claude?

**ALEX:** The first technique I'd recommend is the overview question. When I join a new project or come back to one after a while, I ask Claude "give me an overview of this codebase structure." It reads key files and gives me a map of how things are organized.

**JAMIE:** Like an instant onboarding.

**ALEX:** Exactly. Second technique: follow the flow. If you're trying to understand how something works end to end, ask Claude to trace it. "Walk me through what happens when a user submits the contact form." Claude will follow the code path and explain each step.

**JAMIE:** That's great for understanding complex features.

**ALEX:** Third technique: definition jumping. When you see a function being called and want to know what it does, just ask "what does the processOrder function do?" Claude will find the definition and explain it.

**JAMIE:** Like IDE "go to definition" but with an explanation attached.

**ALEX:** Right. And fourth, use references. "Where is UserContext used?" Claude will grep for usages and show you everywhere that context is consumed. Great for understanding dependencies.

## Asking Good Questions

**JAMIE:** How do I phrase questions to get the best navigation results?

**ALEX:** Specificity helps a lot. Instead of "tell me about the database," try "how do we connect to the database and where is the configuration?" That gives Claude a clearer target.

**JAMIE:** More specific means less ambiguity.

**ALEX:** Also, include what you're trying to accomplish. "I need to add a new field to user profiles, where should I make that change?" Now Claude isn't just finding code, it's guiding you to the right place for your goal.

**JAMIE:** The why helps as much as the what.

**ALEX:** Exactly. And don't be afraid to ask follow-up questions. If Claude's first response isn't quite what you needed, just say "not that one, I mean the validation logic" or "go deeper on the error handling part."

## Keyboard Shortcuts and Efficiency

**JAMIE:** Are there keyboard shortcuts I should know?

**ALEX:** Yes! In the Claude Code interface, Control-C cancels the current operation if something is taking too long. Control-L clears the screen while keeping conversation history. These basic ones are essential.

**JAMIE:** What about scrolling through long responses?

**ALEX:** Your terminal's normal scrolling works. Page up, page down, or mouse scrolling depending on your terminal. For really long outputs, you might pipe to less or a file, but usually the terminal handles it fine.

**JAMIE:** Any tips for managing conversation length?

**ALEX:** Use slash clear when you're switching to a completely different task. Use slash compact when you want to keep some context but reduce the length. I typically compact after every major feature or bug fix.

**JAMIE:** Starting fresh keeps things focused?

**ALEX:** It does. A conversation that's been going for hours about many different topics can get muddled. Claude might confuse which file you're talking about now versus earlier. Fresh starts help.

## Multi-File Operations

**JAMIE:** What about when I need to work across multiple files?

**ALEX:** Claude handles this naturally. You can say "I need to add a new API endpoint, which files will I need to modify?" Claude will identify the router file, possibly a controller, maybe a model, and any test files.

**JAMIE:** And then I can work through them one by one?

**ALEX:** Yes, or Claude can read several at once and help you see the big picture. "Show me the User model and the User controller together" is a valid request. Claude will read both and understand their relationship.

**JAMIE:** That's helpful for understanding how components interact.

**ALEX:** Very much so. A lot of bugs happen at the boundaries between components. Seeing multiple files together helps Claude spot inconsistencies or suggest better patterns.

## Understanding Project Scale

**JAMIE:** Does project size affect how I should use Claude Code?

**ALEX:** Somewhat. For small projects, Claude can practically understand the whole thing. For very large monorepos with millions of lines, you'll want to guide Claude more specifically to the relevant sections.

**JAMIE:** How do I guide it?

**ALEX:** Be specific about paths. Instead of "find the auth code," say "look in the services/auth directory." Instead of "fix the tests," say "fix the tests in packages/api/tests." This helps Claude focus its search.

**JAMIE:** Does Claude ever get lost in large codebases?

**ALEX:** It can struggle if the project is poorly organized or if naming conventions are inconsistent. If auth logic is spread across ten unrelated folders, Claude has to work harder to piece it together.

**JAMIE:** So good code organization pays dividends with AI tools too.

**ALEX:** Absolutely. The same practices that help human developers, clear naming, logical structure, good documentation, also help Claude be more effective.

## Practical Exercise

**JAMIE:** Can we do a quick exercise listeners can try at home?

**ALEX:** Great idea. Here's a navigation exercise. Open Claude Code in any project you have. First, ask "what is the main entry point of this application?" Notice how Claude finds and explains it.

**JAMIE:** Starting from the entry point makes sense.

**ALEX:** Then ask "what are the main dependencies this project uses?" Claude will likely read your package.json or equivalent and summarize them.

**JAMIE:** Getting the lay of the land.

**ALEX:** Finally, pick any feature in your app and ask "how does the feature X work end to end?" Watch how Claude traces through multiple files to explain the flow. That's the power of intelligent navigation.

## What's Coming Next

**JAMIE:** This was super practical. I feel like I understand how Claude navigates code now. What's next?

**ALEX:** Episode three is all about code editing. Now that you know how to navigate and understand code, we'll cover how to actually make changes. The Read tool, the Edit tool, the Write tool, and when to use each one.

**JAMIE:** Moving from reading to writing.

**ALEX:** Exactly. We'll cover how to safely make edits, how to review Claude's proposed changes, and patterns for effective refactoring.

**JAMIE:** Can't wait. Thanks for listening everyone, and we'll see you in episode three!

**ALEX:** Happy navigating!

*Next Episode: Code Reading & Editing - Learn how to safely make changes to your codebase with Claude's help.*

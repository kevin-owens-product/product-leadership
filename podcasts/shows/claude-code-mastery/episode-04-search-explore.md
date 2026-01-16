# Episode 4: Search & Codebase Exploration
## "Navigate Unfamiliar Code with Confidence"

**Duration:** ~60 minutes
**Hosts:** Alex (Expert Developer) & Jamie (Learning Developer)

---

### INTRO (3 minutes)

## Introduction

**ALEX:** Welcome back to Claude Code Mastery. I'm Alex, and today we're exploring one of Claude Code's most powerful capabilities: searching and understanding codebases.

**JAMIE:** I'm Jamie, and I'm really excited about this one. I often get thrown into unfamiliar codebases at work, and anything that helps me ramp up faster is gold.

**ALEX:** That's exactly what we're covering. By the end of this episode, you'll be able to quickly find anything in any codebase and understand how unfamiliar systems work.

---

### SEGMENT 1: WHY SEARCH MATTERS (4 minutes)

## Why Search Matters

**JAMIE:** Before we dive into techniques, why is search such a big deal?

**ALEX:** Think about how much of development is actually finding things. Finding where a bug originates. Finding where a feature is implemented. Finding all the places you need to change for a refactor.

**JAMIE:** When you put it that way, I probably spend more time searching than writing new code.

**ALEX:** Most developers do. Studies suggest developers spend 60 to 70 percent of their time reading and understanding code, not writing it. Any tool that accelerates that understanding is a huge productivity boost.

**JAMIE:** And Claude can help with that understanding, not just finding text.

**ALEX:** Exactly. Claude doesn't just locate code. It explains what it found. That combination of search plus explanation is incredibly powerful.

---

### SEGMENT 2: GREP PATTERNS FOR CONTENT SEARCH (5 minutes)

## Grep Patterns for Content Search

**JAMIE:** Let's start with Grep. We covered the basics, but what are some advanced patterns?

**ALEX:** The key thing to understand about Grep is that it searches file contents using regular expressions. The pattern you provide can be simple text or a complex regex.

**JAMIE:** Give me some practical examples.

**ALEX:** Sure. To find all function definitions in JavaScript, you could search for "function space backslash w plus." That matches "function" followed by a space and one or more word characters, which would be the function name.

**JAMIE:** And that works across all JS files?

**ALEX:** Right. You can also filter by file type. Grep has a type parameter, so you can say type equals "js" to only search JavaScript files. Or use glob patterns to search specific directories.

**JAMIE:** What about finding class definitions?

**ALEX:** For classes in JavaScript or TypeScript, search for "class space backslash w plus." In Python, look for "class space backslash w plus colon." The pattern adapts to the language's syntax.

**JAMIE:** How do I find usages of a specific function?

**ALEX:** Search for the function name followed by an open parenthesis. So "fetchUser backslash open paren" would find everywhere fetchUser is called. The backslash escapes the parenthesis as a literal character.

**JAMIE:** These regex patterns take some getting used to.

**ALEX:** They do, but here's the good news: you usually don't have to write them yourself. Just tell Claude "find all calls to the fetchUser function" and it will construct the appropriate grep pattern.

---

### SEGMENT 3: GLOB PATTERNS FOR FILE DISCOVERY (4 minutes)

## Glob Patterns for File Discovery

**JAMIE:** What about Glob for finding files? What patterns should I know?

**ALEX:** The most useful glob patterns use the double star, which means any directory depth. "Star star slash star dot tsx" finds all TSX files anywhere in the project.

**JAMIE:** What if I want files in a specific folder?

**ALEX:** Add the folder prefix. "Src slash components slash star star slash star dot tsx" finds all TSX files under the components folder, including nested subdirectories.

**JAMIE:** Can I combine patterns?

**ALEX:** Yes! You can use braces for alternatives. "Star star slash star dot curly brace ts comma tsx close brace" finds both TypeScript and TSX files. Great for searching all TypeScript code at once.

**JAMIE:** What about excluding folders like node modules?

**ALEX:** Glob doesn't have built-in exclusion, but Claude automatically excludes common folders like node_modules, .git, and build outputs. It knows those aren't typically what you're looking for.

**JAMIE:** Smart defaults.

**ALEX:** And if you need to search those folders specifically, you can ask explicitly. "Search in node_modules for" will override the default exclusion.

---

### SEGMENT 4: THE EXPLORE AGENT (5 minutes)

## The Explore Agent

**JAMIE:** I've heard about the Explore agent. What is that?

**ALEX:** The Explore agent is a specialized mode within Claude Code designed for complex search tasks. When you have an open-ended question that might require searching in multiple places or following chains of logic, Explore is the right tool.

**JAMIE:** How is it different from regular search?

**ALEX:** Regular Grep and Glob are one-shot searches. You ask for files or content matching a pattern, and you get results. Explore is iterative. It searches, analyzes results, searches again based on what it found, and builds up understanding.

**JAMIE:** Like a human exploring a codebase?

**ALEX:** Exactly. If you asked a senior developer to understand how authentication works in a new codebase, they wouldn't do one search. They'd search, read some code, follow imports, search for related concepts, and piece it together.

**JAMIE:** And Explore does that automatically?

**ALEX:** Right. You can specify how thorough you want the exploration. Quick for basic searches, medium for moderate exploration, very thorough for comprehensive analysis.

**JAMIE:** When should I use Explore versus direct Grep?

**ALEX:** Use direct Grep when you know exactly what you're looking for. A specific function name, a particular error message, an exact string. Use Explore when you have a conceptual question or need to understand relationships.

---

### SEGMENT 5: UNDERSTANDING UNFAMILIAR CODEBASES (5 minutes)

## Understanding Unfamiliar Codebases

**JAMIE:** Let's talk about jumping into unfamiliar code. What's your strategy?

**ALEX:** I have a systematic approach. First, I ask Claude for a high-level overview. "Give me an overview of this codebase architecture." This reads key files like README, package.json, and main entry points to establish the big picture.

**JAMIE:** Starting from the top.

**ALEX:** Then I ask about the directory structure. "What's the purpose of each top-level directory?" This helps me understand where different types of code live.

**JAMIE:** Building a mental map.

**ALEX:** Third, I identify the entry points. "Where does execution start?" "What's the main file?" For web apps, I might ask "how is routing set up" to understand how URLs map to code.

**JAMIE:** Following the flow.

**ALEX:** Finally, I trace specific features. I pick a feature I need to work on and ask Claude to walk me through it end to end. "How does user login work from start to finish?"

**JAMIE:** That gives you depth in the area you need.

**ALEX:** Right. You don't need to understand everything. Just the parts relevant to your current task.

---

### SEGMENT 6: ARCHITECTURE DISCOVERY (4 minutes)

## Architecture Discovery

**JAMIE:** What if the codebase doesn't have good documentation?

**ALEX:** Most don't, honestly. That's where Claude's ability to infer architecture from code is valuable. Ask questions like "what design patterns is this project using" or "how is state management handled."

**JAMIE:** It can recognize patterns from the code itself?

**ALEX:** Yes. Claude can identify that a project is using MVC, or that it has a services layer, or that it follows a microservices architecture. It looks at file organization, naming conventions, and code structure.

**JAMIE:** What about dependencies? How do I understand what external libraries are used?

**ALEX:** Ask Claude to summarize the dependencies. "What are the main libraries this project uses and what are they for?" It will read package.json or requirements.txt and explain each dependency.

**JAMIE:** That's faster than googling each one.

**ALEX:** Much faster. And Claude can tell you how the project uses each library, not just what the library does in general.

---

### SEGMENT 7: FINDING WHERE THINGS ARE DEFINED (4 minutes)

## Finding Where Things Are Defined

**JAMIE:** One thing I always struggle with is finding where things are defined. Where does this function come from? What file has this component?

**ALEX:** This is a perfect use case for Claude. "Where is the UserProfile component defined?" Claude will search for the definition and tell you the file and line number.

**JAMIE:** And it can distinguish between definitions and usages?

**ALEX:** Exactly. Searching for "UserProfile" might find dozens of files that import or use it. Claude understands you want the definition, the file where it's declared and implemented.

**JAMIE:** What about things that come from libraries?

**ALEX:** Claude will tell you that too. "Where does useState come from?" Claude knows it's from React and will explain that it's imported from the react package, not defined in your codebase.

**JAMIE:** That context is helpful.

**ALEX:** And if something is defined in your code but seems to shadow or wrap a library function, Claude will explain that relationship.

---

### SEGMENT 8: UNDERSTANDING DATA FLOW (4 minutes)

## Understanding Data Flow

**JAMIE:** How do I trace how data moves through an application?

**ALEX:** Data flow questions are great for Claude. Try "how does user input from the login form reach the database?" Claude will trace the path: form submission, API call, server handler, database operation.

**JAMIE:** Following the journey of data.

**ALEX:** You can also ask the reverse. "Where does the user's profile data come from?" Claude will trace backward from where it's displayed to where it originates.

**JAMIE:** That's useful for debugging data issues.

**ALEX:** Extremely useful. When data is wrong somewhere, you need to find where it went wrong. Tracing the flow helps you identify the problematic step.

---

### SEGMENT 9: FINDING ALL USAGES (4 minutes)

## Finding All Usages

**JAMIE:** What about finding everywhere something is used?

**ALEX:** This is Claude's bread and butter. "Show me everywhere the formatCurrency function is called." Claude will grep for usages and give you a list of files and locations.

**JAMIE:** Can it show context around each usage?

**ALEX:** Yes. Grep can show lines before and after each match. Claude often does this automatically to give you context around each usage.

**JAMIE:** That helps understand how something is being used, not just where.

**ALEX:** Right. And you can ask follow-up questions. "Show me the different ways formatCurrency is called" and Claude will analyze the usages and categorize them.

---

### SEGMENT 10: SEARCH STRATEGIES FOR COMPLEX QUESTIONS (5 minutes)

## Search Strategies for Complex Questions

**JAMIE:** What if my question doesn't map to a simple text search?

**ALEX:** That's when you describe the concept and let Claude figure out the search strategy. "How does this app handle authentication failures?" Claude will search for error handling, authentication, login failure, and related terms.

**JAMIE:** It translates concepts into searches.

**ALEX:** Exactly. And it combines multiple searches. Authentication failures might be handled in the auth service, in the API middleware, in the frontend error handler. Claude will check all these places.

**JAMIE:** What if Claude's first search doesn't find what I need?

**ALEX:** Guide it with more information. "That's the login logic, but I'm looking for where session expiration is handled." Claude will adjust its search based on your feedback.

**JAMIE:** The conversation refines the search.

**ALEX:** Exactly. It's iterative. You and Claude work together to narrow in on what you need.

---

### SEGMENT 11: PERFORMANCE CONSIDERATIONS (4 minutes)

## Performance Considerations

**JAMIE:** Do searches ever get slow?

**ALEX:** Usually searches are fast, even in large codebases. Grep is optimized to be quick, and Glob is just looking at file paths. The Explore agent can take longer because it's doing multiple searches.

**JAMIE:** What if I'm searching something huge?

**ALEX:** Be more specific. Instead of searching the entire codebase, narrow to a specific directory. "Search in the api folder for rate limiting" is faster than searching everywhere.

**JAMIE:** Constraints speed things up.

**ALEX:** Also, Claude caches some context during a session. If you're doing repeated searches in the same area, later searches can be faster.

---

### SEGMENT 12: PRACTICAL TIPS (4 minutes)

## Practical Tips

**JAMIE:** What are your go-to tips for effective searching?

**ALEX:** First, start broad and narrow down. Ask a general question, see what Claude finds, then focus on the most relevant results.

**JAMIE:** Funnel approach.

**ALEX:** Second, use specific names when you have them. Searching for "handleAuth" is more precise than searching for "authentication handling."

**JAMIE:** Proper nouns over common words.

**ALEX:** Third, combine conceptual questions with specific searches. "How does caching work?" followed by "show me the cache implementation in services/cache.ts."

**JAMIE:** Mix high-level and low-level.

**ALEX:** And fourth, ask Claude to explain what it found. Don't just take the search results. Ask "explain how this caching code works" after finding it.

---

### SEGMENT 13: PRACTICE EXERCISE (3 minutes)

## Practice Exercise

**JAMIE:** Let's give listeners something to practice.

**ALEX:** Here's a good exercise. Pick a codebase you're not fully familiar with. Ask Claude three things. First, "give me an architecture overview of this project." Second, "find where the main business logic lives." Third, "trace how a specific feature works end to end."

**JAMIE:** Three questions that build understanding.

**ALEX:** Do this with different projects to practice. Each codebase will teach you something about how Claude explores and explains.

---

### SEGMENT 14: WHAT'S COMING NEXT (3 minutes)

## What's Coming Next

**JAMIE:** Great episode on search and exploration. What's next?

**ALEX:** Episode five is all about Git workflow and collaboration. We'll cover how Claude helps with commits, pull requests, code review, and working with your team.

**JAMIE:** Version control with AI assistance.

**ALEX:** Exactly. It's one of the most practical daily workflows you'll develop. See you there!

**JAMIE:** Happy exploring!

*Next Episode: Git Workflow & Collaboration - Master version control with Claude's assistance for commits, PRs, and code review.*

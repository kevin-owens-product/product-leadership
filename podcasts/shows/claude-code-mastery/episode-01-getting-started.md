# Episode 1: Getting Started with Claude Code

## Introduction

**ALEX:** Welcome to Claude Code Mastery, the podcast that will transform how you write software. I'm Alex, a senior developer who's been using Claude Code since its early days, and I'm genuinely excited to share everything I've learned.

**JAMIE:** And I'm Jamie! I've been coding for a few years now, but I'm relatively new to AI-assisted development. I've heard so much buzz about Claude Code, and I'm ready to dive in and learn alongside our listeners.

**ALEX:** That's the perfect perspective, Jamie. A lot of developers are in your shoes right now. They've heard about these AI coding tools, maybe even tried a few, but haven't really integrated them into their daily workflow. By the end of this series, that's going to change completely.

**JAMIE:** So let's start at the very beginning. What exactly is Claude Code, and why should developers care about it?

## What is Claude Code?

**ALEX:** Claude Code is Anthropic's official command-line interface for Claude. Think of it as having a brilliant senior developer sitting right next to you in your terminal, someone who can read your code, understand your project structure, make edits, run commands, and help you solve problems.

**JAMIE:** So it's like having a pair programmer who never gets tired and knows basically every programming language?

**ALEX:** Exactly! But it's more than just answering questions. Claude Code can actually interact with your codebase. It can read files, search through your code, make edits, run your tests, commit changes, even create pull requests. It's agentic, meaning it can take actions on your behalf with your permission.

**JAMIE:** That sounds powerful, but also a little scary. How do you maintain control?

**ALEX:** Great question, and this is something Anthropic has thought carefully about. Claude Code has a permission system. Before it takes any action, whether that's reading a file, running a command, or making an edit, it asks for your approval. You're always in the driver's seat.

**JAMIE:** That's reassuring. So I won't wake up to find Claude has rewritten my entire codebase overnight?

**ALEX:** Ha! No, definitely not. Every action requires your explicit consent. And you can configure what types of actions it can take automatically versus what needs approval. We'll cover that in detail in a later episode.

## Installation

**JAMIE:** Alright, I'm sold. How do I get this installed?

**ALEX:** The installation is straightforward if you have Node.js installed. You just need npm, which comes with Node. Open your terminal and run: npm install minus g at anthropic ai slash claude code. That's all lowercase, with hyphens.

**JAMIE:** And that installs it globally so I can use it from any directory?

**ALEX:** Exactly. The minus g flag means global installation. Once it's installed, you can run Claude Code from anywhere by just typing "claude" in your terminal.

**JAMIE:** What about system requirements? Do I need a beefy machine?

**ALEX:** Not at all. Claude Code itself is lightweight. The heavy lifting happens on Anthropic's servers where Claude actually runs. Your machine just needs to handle the terminal interface and send your code context to the API. Any modern computer running macOS, Linux, or Windows with WSL will work fine.

**JAMIE:** WSL? For the Windows users out there?

**ALEX:** Right, Windows Subsystem for Linux. Claude Code runs in a Unix-like environment, so Windows users should use WSL. It's straightforward to set up, and honestly, if you're doing serious development on Windows, you probably already have WSL configured.

## First Run and Authentication

**JAMIE:** Okay, I've run the install command. What happens when I type "claude" for the first time?

**ALEX:** The first time you run it, Claude Code will need to authenticate. It will open your web browser and ask you to log in to your Anthropic account. If you don't have one yet, you can create one right there.

**JAMIE:** Is this tied to API usage and billing?

**ALEX:** Yes. Claude Code uses the Anthropic API under the hood. You'll need API credits, but Anthropic often provides some free credits for new accounts. There are also different plans depending on your usage level.

**JAMIE:** And after authentication, I'm good to go?

**ALEX:** Pretty much! The credentials are stored securely on your machine, so you won't need to log in every time. You'll see Claude Code's interface appear, and you can start having conversations immediately.

## Understanding the Interface

**JAMIE:** What does the interface look like? Is it intimidating?

**ALEX:** Not at all. It's actually quite clean and simple. You see a prompt where you can type your message, and Claude's responses appear below. It's conversational, just like texting, but in your terminal.

**JAMIE:** So I just type what I want in plain English?

**ALEX:** Exactly! That's the beauty of it. You don't need to learn special commands or syntax. You can say things like "What does the handleSubmit function do?" or "Add error handling to this API call" or "Why is my test failing?" Claude understands natural language.

**JAMIE:** That's much more approachable than I expected. Are there any special conventions I should know about?

**ALEX:** A few helpful things. First, Claude Code automatically understands your current working directory. So if you're in your project folder, Claude knows that context. It can see your file structure and understand what kind of project you're working on.

**JAMIE:** So I should cd into my project directory before starting Claude?

**ALEX:** Yes, that's the recommended workflow. Navigate to your project root, then start Claude Code. It will automatically detect things like your package.json, git configuration, README files, and use those to understand your project context.

## The Permission System

**JAMIE:** You mentioned permissions earlier. Can you walk me through how that actually works in practice?

**ALEX:** Sure. When you ask Claude to do something that requires action, like reading a file or running a command, it will show you exactly what it wants to do and ask for permission. You'll see a prompt asking you to approve or deny the action.

**JAMIE:** What are my options when that prompt appears?

**ALEX:** You typically have a few choices. You can approve just that one action, approve that type of action for the rest of the session, or deny it. There's also the option to always allow certain safe operations.

**JAMIE:** What kinds of things need permission?

**ALEX:** Reading files, writing or editing files, running bash commands, making web requests. Basically anything that interacts with your system. The philosophy is that Claude should explain what it wants to do and let you decide.

**JAMIE:** That makes sense. Can I configure default permissions?

**ALEX:** Yes! You can set up configuration that allows certain operations automatically. For example, you might want Claude to always be able to read files without asking, but always prompt before making edits. We'll cover the configuration in detail in episode seven.

**JAMIE:** Good to know. I imagine as I get more comfortable, I'll loosen those restrictions.

**ALEX:** That's exactly how it usually goes. Most developers start cautious and then gradually give Claude more autonomy as they build trust in the workflow.

## Slash Commands Overview

**JAMIE:** I've heard there are special commands you can use. What's that about?

**ALEX:** Right, slash commands. These are shortcuts for common operations. You type a forward slash followed by the command name. They're not strictly necessary, since you can do everything through natural conversation, but they're handy for frequent tasks.

**JAMIE:** What are the most important ones to know?

**ALEX:** I'd say the essential ones are slash help, which shows you all available commands and tips. Slash clear, which clears the conversation history if things get too long or you want a fresh start. Slash status, which shows you information about your current session.

**JAMIE:** What about slash compact? I've seen that mentioned.

**ALEX:** Good one! Slash compact condenses the conversation history. This is useful in long sessions where you've been working on many things. It summarizes what's been discussed so Claude can maintain context without the conversation getting unwieldy.

**JAMIE:** Are there slash commands for specific development tasks?

**ALEX:** Yes, there are some really useful ones. Slash commit will help you create a git commit with an AI-generated message. Slash review dash pr can help review pull requests. These are more specialized and we'll explore them in the git workflow episode.

**JAMIE:** This is great. So I have both natural language and these shortcuts available.

**ALEX:** Exactly. Use whatever feels natural. Most of the time, I just type what I want in plain English. The slash commands are there when I want to be quick and direct.

## IDE Integration

**JAMIE:** I spend most of my time in VS Code. Can Claude Code work with my editor?

**ALEX:** Absolutely. While Claude Code is primarily a terminal tool, it integrates beautifully with modern development workflows. You can run it in VS Code's integrated terminal, and there's even a dedicated VS Code extension that provides tighter integration.

**JAMIE:** What does the extension add?

**ALEX:** The extension lets you start Claude Code directly from VS Code, share selected code snippets easily, and see Claude's responses in a nice panel. It makes the context switching between coding and asking Claude questions much smoother.

**JAMIE:** What about other editors? Vim, Emacs, JetBrains IDEs?

**ALEX:** Since Claude Code is a terminal application, it works alongside any editor. You can have Claude running in a terminal split while you code in your editor of choice. For JetBrains, you can use the integrated terminal. For Vim or Emacs users, you might run Claude in a separate tmux pane or terminal window.

**JAMIE:** That flexibility is nice. Not everyone uses VS Code.

**ALEX:** Right. The terminal-based approach means Claude Code isn't tied to any specific editor. That's a deliberate design choice. Developers have strong preferences about their tools, and Claude Code respects that.

## Your First Conversation

**JAMIE:** Let's get practical. I've installed Claude Code, authenticated, and I'm in my project directory. What should my first interaction look like?

**ALEX:** A great way to start is to just ask Claude about your project. Try something like "What kind of project is this?" or "Give me an overview of this codebase." Claude will look at your files and give you a summary.

**JAMIE:** And it figures that out just from the file structure?

**ALEX:** It reads key files like your README, package.json or equivalent, main source files, and configuration. From that, it can tell you what framework you're using, what the project does, how it's organized.

**JAMIE:** That's actually really useful for when I join a new project at work.

**ALEX:** It's incredible for onboarding! You can ask Claude to explain any part of the codebase. "What does the authentication flow look like?" or "Where is the database schema defined?" or "How do users sign up?" Claude will find the relevant code and explain it.

**JAMIE:** What if I want to make changes? What's a good first edit to try?

**ALEX:** Start small. Maybe ask Claude to add a comment to a function, or rename a variable, or add some basic error handling. Something low-risk where you can easily verify the change and roll it back if needed.

**JAMIE:** That makes sense. Build trust with small wins.

**ALEX:** Exactly. Then you can gradually give Claude more complex tasks. Refactor this function. Add a new API endpoint. Fix this failing test. As you see Claude succeed at these tasks, you'll naturally become more comfortable with bigger changes.

## Common First-Day Questions

**JAMIE:** What are some questions new users commonly have on day one?

**ALEX:** The big one is usually "how does Claude know about my code?" People are sometimes confused about whether their code is being uploaded somewhere or stored.

**JAMIE:** That's a fair concern. What's the answer?

**ALEX:** Claude Code sends relevant portions of your code to Anthropic's API as context for your conversation. It's processed to generate responses but isn't stored long-term or used to train models. Your code remains yours.

**JAMIE:** That's good to know. What else?

**ALEX:** People often ask about the conversation length. Can they have really long sessions? The answer is yes, but there are practical limits. Very long conversations can slow down as more context needs to be processed. That's where slash clear or slash compact come in handy.

**JAMIE:** What about cost? How do I know how much I'm spending?

**ALEX:** Claude Code uses tokens, which is how API usage is measured. Longer conversations with more code context use more tokens. You can check your usage in the Anthropic console. For most individual developers, the cost is very reasonable, especially compared to the productivity gains.

**JAMIE:** Are there rate limits I should know about?

**ALEX:** There are rate limits on the API, but they're generous for normal usage. You'd have to be doing something unusual to hit them. If you're on a team or enterprise plan, the limits are even higher.

## Tips for Day One Success

**JAMIE:** Any tips for making that first day really successful?

**ALEX:** Yes! First, start with a project you know well. That way you can verify Claude's understanding and suggestions against your own knowledge. It builds confidence.

**JAMIE:** Don't throw it at something totally unfamiliar right away?

**ALEX:** Right. Save the unfamiliar projects for later when you've developed intuition for how Claude works. Second tip: be specific in your requests. "Fix the bug" is less helpful than "The login form isn't validating email addresses, can you fix that validation logic?"

**JAMIE:** More context means better responses.

**ALEX:** Exactly. Third tip: don't be afraid to say "that's not quite right" or "try a different approach." Claude learns from your feedback within the conversation and adjusts.

**JAMIE:** It's a real dialogue, not just one-shot queries.

**ALEX:** Precisely. The best results come from iterating together. Claude suggests something, you refine or redirect, and together you arrive at the best solution. It's collaborative.

## What's Coming Next

**JAMIE:** This has been a great introduction. I feel ready to install Claude Code and start experimenting. What's coming in the next episode?

**ALEX:** In episode two, we'll dive deeper into the core commands and navigation. We'll explore how Claude reads and understands your codebase, the different tools it uses like Read and Glob, and how to efficiently move around large projects.

**JAMIE:** Getting into the real practical workflow.

**ALEX:** Exactly. By the end of episode two, you'll be navigating codebases and asking questions like a pro. We'll cover keyboard shortcuts, efficiency tips, and some of the tricks I use daily.

**JAMIE:** I can't wait. Thanks everyone for listening to this first episode of Claude Code Mastery. Go install Claude Code and give it a try!

**ALEX:** And remember, the goal isn't to replace your skills as a developer. It's to amplify them. Claude Code is a tool that makes you faster and more effective. Used well, it's like having superpowers.

**JAMIE:** See you in episode two!

*Next Episode: Core Commands & Navigation - Learn how Claude reads your codebase and how to navigate projects efficiently.*

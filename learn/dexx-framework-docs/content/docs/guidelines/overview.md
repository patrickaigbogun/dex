---
title: "Overview"
---


**Guideline**
1. Start every feature from the beginner path.
   - Each topic should answer: “What is this?”, “Why would I use it?”, “What do I build with it?”, and “What do I need to know next?”
   - Do not start with APIs or file lists. Start with the user outcome.

2. Organize docs by learning stage, not by file location.
   - Landing page
   - Getting started
   - Core concepts
   - Feature guides
   - API reference
   - Recipes
   - Deployment
   - Troubleshooting
   - Migration and edge cases

3. Make each page do one job.
   - A guide teaches a workflow.
   - A reference documents behavior and options.
   - A recipe solves a specific task.
   - A concept page explains a mental model.
   - Do not mix all four in one page unless the page is tiny.

4. Write like the reader is new to Dex, not new to programming.
   - Define terms the first time they appear.
   - Avoid “obviously” assumptions.
   - Explain where files live, what runs when, and what changes are generated.
   - Prefer “here’s the shape of the system” before “here’s the API.”

5. Cover behavior completely.
   - Laravel-style docs are strong because they document what happens, not just what exists.
   - For each feature, include defaults, precedence, failure modes, and edge cases.
   - If something is configurable, document the precedence order and examples for each level.

6. Include examples in every major feature doc.
   - Happy path example
   - Minimal example
   - Customization example
   - One or two “real world” examples
   - A troubleshooting note if the feature commonly fails in one way

7. Keep reference docs separate from narrative docs.
   - Narrative docs should read like a path.
   - Reference docs should be exhaustive and structured.
   - This prevents the “I read the docs and still can’t use the framework” problem.

8. Add a docs coverage checklist for every package.
   - What it does
   - When to use it
   - When not to use it
   - Minimal example
   - Full example
   - Configuration
   - Defaults
   - Edge cases
   - Common errors
   - Related features

**Recommended structure**
- “Start here” for first-time users
- “Build your first app” for a guided end-to-end path
- “Core concepts” for packages, routing, runtime, build-time, and conventions
- “Router”, “Server”, “Dev”, “CLI” as feature guides with full behavior coverage
- “Recipes” for real use cases like custom paths, API-only deploy, prerendering, monorepo layout
- “Reference” for CLI flags, config fields, exported functions, and defaults
- “Troubleshooting” for errors, build issues, and path-resolution problems

**Writing rule of thumb**
- If a page teaches you how to accomplish a task, it should feel like a tutorial.
- If a page explains how something behaves, it should feel like a specification.
- If a page answers “how do I do X with Dex?”, it should include one complete example that you can copy and run.


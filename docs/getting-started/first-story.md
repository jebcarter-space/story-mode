# Your First Story

This guide walks you through creating your first story with Story Mode, demonstrating the core features and workflow. We'll create a short fantasy adventure using both AI assistance and the Oracle system.

## Prerequisites

Before starting, make sure you have:
- [Story Mode installed and configured](installation.md)
- An LLM profile set up with a working API key
- Either VSCode extension or web application ready

## The Story We'll Create

We're going to write a short fantasy story about a mysterious artifact, demonstrating:
- AI text continuation
- Oracle decision-making
- Repository item usage
- Basic narrative flow

## Step 1: Set Up Your Story Space

### VSCode Extension
1. **Open your workspace** in VS Code
2. **Create a new file**: `my-first-story.md`
3. **Start with a title**:

```markdown
# The Mysterious Artifact

## Chapter 1: The Discovery
```

### Web Application
1. **Navigate to Library**: Click "Library" in the navigation
2. **Create a story**: Click "+" to create a new story
3. **Name it**: "The Mysterious Artifact"
4. **Open it**: Click on your new story to start writing

## Step 2: Write Your Opening

Start with this opening text:

```markdown
The old wizard Eldara examined the strange artifact carefully. It was unlike anything she had seen in her centuries of study - a crystalline sphere that seemed to pulse with inner light. As she reached out to touch it
```

**Don't finish the sentence yet!** We'll use AI to continue the story.

## Step 3: Your First AI Continuation

Now let's use AI to continue the story:

### VSCode Extension
1. **Position cursor** at the end of your text (after "As she reached out to touch it")
2. **Continue with AI**: Press `Ctrl+Shift+Enter` (Windows/Linux) or `Cmd+Shift+Enter` (Mac)
3. **Wait for generation**: You'll see a progress indicator
4. **Review the result**: AI will add text continuing your story

### Web Application
1. **Position cursor** at the end of your text
2. **Continue with AI**: Click the "Continue" button or use the keyboard shortcut
3. **Wait for generation**: A loading indicator will appear
4. **Review the result**: The AI continuation will be added to your story

**Example continuation you might get:**
```markdown
, the crystal suddenly flared with brilliant blue light. Eldara jerked her hand back, her heart racing. Ancient runes began to appear on the sphere's surface, glowing and shifting like living things. This was no ordinary magical artifact - this was something far older and more dangerous than anything in her collection.
```

## Step 4: Make a Decision with the Oracle

Now we have a choice to make: What should Eldara do next? Let's ask the Oracle!

### Using the Oracle

**Question to ask**: "Should Eldara touch the artifact despite the warning signs?"

### VSCode Extension
1. **Invoke Oracle**: Press `Ctrl+Shift+O` / `Cmd+Shift+O`
2. **Enter your question**: Type "Should Eldara touch the artifact despite the warning signs?"
3. **Press Enter**: Wait for the Oracle's response

### Web Application
1. **Click Oracle button**: Look for the Oracle button in the interface
2. **Enter your question**: Type your question in the dialog
3. **Submit**: Click to get the Oracle's response

**Example Oracle response:**
```markdown
**Oracle Query**: Should Eldara touch the artifact despite the warning signs?
**Result**: No, but (Rolled: 7)
**Keywords**: ancient, whispers
**Interpretation**: Eldara should resist touching the artifact, but her curiosity is overwhelming. Something about it calls to her despite the obvious danger.
```

The Oracle gave us "No, but" with keywords "ancient" and "whispers" - perfect for our story!

## Step 5: Continue Based on Oracle Guidance

Now let's write the next part of our story, incorporating the Oracle's wisdom:

```markdown
Eldara stepped back from the pulsing artifact, her scholarly instincts warring with caution. The wise choice would be to research it first, to understand what she was dealing with. But as she watched the ancient runes shift and dance, she could almost hear whispers calling to her from within the crystal sphere.

"Just one touch," she murmured to herself. "Just to see what secrets it holds."
```

## Step 6: Add a Repository Item

Let's create a character entry for Eldara so we can reference her consistently:

### VSCode Extension
1. **Create character file**: `.story-mode/repositories/characters/eldara.md`
2. **Add character details**:

```markdown
# Eldara

**Type**: Character
**Keywords**: wizard, scholar, centuries, magic, research

## Description
An ancient and powerful wizard with centuries of magical study behind her. Known for her insatiable curiosity about magical artifacts and her vast collection of mystical items. Despite her wisdom, her scholarly nature sometimes leads her into dangerous situations.

## Appearance
- Long silver hair
- Deep violet robes
- Piercing blue eyes that have seen centuries pass
- Carries an ancient staff topped with a crystal that matches her eyes

## Background
Has spent centuries collecting and studying magical artifacts. Her tower library contains some of the rarest magical texts and items in the known world.
```

### Web Application
1. **Navigate to Repository**: Go to your library's repository section
2. **Create Character**: Click "Add Character" or similar option
3. **Fill in details**: Add the same information as above

## Step 7: Continue with Repository Integration

Now when you continue writing, Story Mode will automatically recognize "Eldara" and inject relevant context:

```markdown
Against her better judgment, Eldara reached out once more. The moment her fingertip made contact with the crystal surface
```

**Continue with AI again** - the system will use your character information to maintain consistency!

## Step 8: Complete Your First Scene

Let's finish this scene. You might want to:

1. **Ask the Oracle**: "Does the artifact transport Eldara somewhere?"
2. **Continue with AI**: See what happens when she touches it
3. **Add descriptive text**: Enhance the AI output with your own writing

Here's how your complete first scene might look:

```markdown
# The Mysterious Artifact

## Chapter 1: The Discovery

The old wizard Eldara examined the strange artifact carefully. It was unlike anything she had seen in her centuries of study - a crystalline sphere that seemed to pulse with inner light. As she reached out to touch it, the crystal suddenly flared with brilliant blue light. Eldara jerked her hand back, her heart racing. Ancient runes began to appear on the sphere's surface, glowing and shifting like living things. This was no ordinary magical artifact - this was something far older and more dangerous than anything in her collection.

**Oracle Query**: Should Eldara touch the artifact despite the warning signs?
**Result**: No, but (Rolled: 7)
**Keywords**: ancient, whispers
**Interpretation**: Eldara should resist touching the artifact, but her curiosity is overwhelming. Something about it calls to her despite the obvious danger.

Eldara stepped back from the pulsing artifact, her scholarly instincts warring with caution. The wise choice would be to research it first, to understand what she was dealing with. But as she watched the ancient runes shift and dance, she could almost hear whispers calling to her from within the crystal sphere.

"Just one touch," she murmured to herself. "Just to see what secrets it holds."

Against her better judgment, Eldara reached out once more. The moment her fingertip made contact with the crystal surface, the world exploded into brilliant light. When her vision cleared, she was no longer in her familiar tower study. She stood in a vast underground chamber, surrounded by towering pillars covered in the same shifting runes. The artifact was gone, but its whispers echoed all around her.

"Welcome, keeper of knowledge," a voice boomed from the shadows. "You have finally answered our call."
```

## What You've Learned

Congratulations! You've just experienced the core Story Mode workflow:

✅ **AI Text Continuation**: Seamlessly extending your narrative
✅ **Oracle Decision Making**: Using yes/no questions to drive plot
✅ **Repository Integration**: Creating and using character information
✅ **Keywords and Interpretation**: Enhancing decisions with context
✅ **Collaborative Writing**: Blending human creativity with AI assistance

## Next Steps

Now that you understand the basics, explore these advanced features:

### Immediate Next Steps
1. **[Basic Concepts](basic-concepts.md)** - Understand the theory behind what you just did
2. **[Oracle System](../features/oracle-system.md)** - Master advanced Oracle techniques
3. **[AI Continuation](../features/ai-continuation.md)** - Optimize your AI interactions

### Explore Different Workflows
1. **[Solo RPG Campaign](../workflows/solo-rpg.md)** - Turn this into a full RPG session
2. **[Creative Writing](../workflows/creative-writing.md)** - Enhance your creative writing process
3. **[Worldbuilding](../workflows/worldbuilding.md)** - Build consistent worlds and settings

### Advanced Features
1. **[Spark Tables](../features/spark-tables.md)** - Get random inspiration keywords
2. **[Template System](../features/templates.md)** - Create reusable content templates
3. **[Repository Management](../features/repository.md)** - Organize all your story elements

## Tips for Success

### Writing with AI
- **Be specific**: Give the AI clear context and direction
- **Edit freely**: AI output is a starting point, not a final product
- **Maintain control**: You decide what stays and what changes

### Using the Oracle
- **Ask clear questions**: Yes/no questions work best
- **Use keywords**: The generated keywords often provide the best story direction
- **Follow the interpretation**: But feel free to adapt it to your needs

### Repository Management
- **Start simple**: Don't over-plan, build your repository as you write
- **Use keywords**: Include relevant keywords for automatic integration
- **Stay consistent**: Use the same naming conventions throughout

## Common Beginner Questions

**Q: The AI didn't write what I expected. What do I do?**
A: Edit or rewrite the AI output! It's just a suggestion. You can also try continuing again for a different result.

**Q: How detailed should my repository items be?**
A: Start simple and add details as needed. A few sentences are often enough to begin with.

**Q: Can I use Story Mode for genres other than fantasy?**
A: Absolutely! Story Mode works for any genre - sci-fi, horror, romance, mystery, or even non-fiction.

**Q: Do I need to use AI for everything?**
A: Not at all! Use AI assistance when you want inspiration or help, but feel free to write entirely on your own when creativity flows.

---

**Ready for more?** Check out [Basic Concepts](basic-concepts.md) to understand the deeper principles, or jump into [specific feature guides](../features/) to master individual tools.
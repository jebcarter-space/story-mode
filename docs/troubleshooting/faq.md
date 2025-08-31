# Frequently Asked Questions (FAQ)

Common questions and answers about Story Mode, its features, and how to use them effectively.

## General Questions

### What is Story Mode?

Story Mode is an AI-powered interactive storytelling and solo RPG tool that helps you create engaging narratives. It combines human creativity with AI assistance through features like:

- **AI text continuation** for overcoming writer's block
- **Oracle system** for decision-making and plot direction
- **Repository management** for consistent character and world details
- **Spark tables** for creative inspiration
- **Template system** for reusable content patterns

### Is Story Mode free to use?

The Story Mode web application and VSCode extension are completely free and open source. However, you'll need API access to AI providers (like OpenAI, OpenRouter, or local models) for AI features. Many providers offer free tiers or credits for new users.

### Do I need technical knowledge to use Story Mode?

No! Story Mode is designed for writers and gamers of all technical levels. The web application has a user-friendly interface, and the VSCode extension integrates seamlessly into your writing workflow. You only need to provide an API key for AI features.

### Can I use Story Mode offline?

- **Basic features**: Yes, you can write stories, use the Oracle (without AI interpretation), and manage your repository offline
- **AI features**: No, AI text continuation and Oracle interpretation require internet connection to your chosen AI provider
- **Local AI**: If you run local AI models (like KoboldCPP), you can use AI features without internet

## Getting Started

### How do I set up my first AI provider?

1. **Choose a provider**: OpenAI, OpenRouter, or KoboldCPP are popular options
2. **Get an API key**: Sign up with your chosen provider and obtain an API key
3. **Configure Story Mode**:
   - **VSCode**: Create `.story-mode/llm-profiles/default.json` with your API details
   - **Web app**: Go to Settings → LLM Settings and add a new profile
4. **Test the connection**: Try the AI continuation feature to verify everything works

### What's the difference between the web app and VSCode extension?

Both tools work with the same file format and can share data:

**VSCode Extension:**
- Integrated into your development environment
- File-based workflow with Git integration
- Advanced template system
- Keyboard shortcuts for all features
- Multi-LLM routing capabilities

**Web Application:**
- Clean, distraction-free interface
- Visual repository management
- Mobile-friendly design
- Easy sharing and collaboration
- No software installation required

### How do I create my first story?

1. **Start simple**: Open Story Mode and create a new story
2. **Write an opening**: Type a few sentences to establish setting and character
3. **Use AI continuation**: Press the continue button to see how AI extends your story
4. **Ask the Oracle**: When facing decisions, ask yes/no questions to guide the plot
5. **Build as you go**: Add characters and locations to your repository as they appear

## Features and Functionality

### How does the Oracle system work?

The Oracle answers yes/no questions about your story using a weighted probability system:

- **20% chance**: "Yes" (simple positive)
- **60% chance**: "Yes, but" (positive with complications)
- **10% chance**: "No, but" (negative with silver lining)
- **5% chance**: "Yes, and" (strongly positive)
- **5% chance**: "No, and" (strongly negative)

Each response includes keywords and AI interpretation to help guide your story.

### Why does the Oracle favor "Yes, but" results?

"Yes, but" results create the most interesting storytelling opportunities by:
- Moving the plot forward (the "Yes" part)
- Adding complications that create tension (the "But" part)
- Generating unexpected twists and character development
- Keeping stories dynamic and engaging

### How can I get better AI continuations?

1. **Provide clear context**: End sentences with clear direction for what happens next
2. **Use repository items**: Reference characters and locations by name for consistency
3. **Adjust settings**: Experiment with temperature and other AI parameters
4. **Edit freely**: Treat AI output as a first draft that you can modify
5. **Give feedback**: The more you edit AI output, the better it learns your style

### What are Spark Tables and how do I use them?

Spark Tables generate random keywords for creative inspiration:

- **Default sparks**: General-purpose keywords for any genre
- **Themed sparks**: Genre-specific keywords (horror, fantasy, sci-fi, etc.)
- **Custom sparks**: Your own keyword collections

Use sparks when you're stuck, need plot direction, or want to add unexpected elements to your story.

### How do I organize my characters and locations?

Use the Repository system to store story elements:

1. **Create repository items** for characters, locations, objects, and situations
2. **Include keywords** that trigger automatic inclusion in AI context
3. **Add relevant details** that help maintain story consistency
4. **Organize by scope**: Library-wide, shelf-specific, book-specific, or chapter-specific
5. **Reference by name** in your writing to automatically include their information

## Technical Questions

### Which AI providers work with Story Mode?

Story Mode supports any OpenAI-compatible API:

**Hosted Providers:**
- OpenAI (GPT-3.5, GPT-4)
- OpenRouter (access to multiple models)
- Mistral AI
- Anthropic (via OpenRouter)

**Local Options:**
- KoboldCPP
- Text Generation WebUI
- LocalAI
- Any other OpenAI-compatible local server

### How much do AI providers cost?

Costs vary by provider and usage:

- **OpenAI**: ~$0.002-0.03 per 1K tokens (very affordable for typical use)
- **OpenRouter**: Varies by model, often cheaper than direct access
- **Local models**: Free after initial setup, but requires technical knowledge
- **Free tiers**: Many providers offer free credits for new users

For typical story writing, monthly costs are usually under $5-10.

### Can I use Story Mode with my existing writing projects?

Yes! Story Mode works with standard Markdown files:

1. **Import existing stories**: Copy your text into Story Mode or save as `.md` files
2. **Git integration**: Use version control with your existing writing projects
3. **Export options**: Export your stories to any format using standard Markdown tools
4. **No vendor lock-in**: All data is stored in open, standard formats

### How do I backup my stories?

**VSCode Extension:**
- Use Git for version control and cloud backup
- Regularly commit changes and push to GitHub/GitLab
- Export important stories to multiple formats

**Web Application:**
- Use the export feature to download your data as JSON
- Regularly export your libraries and settings
- Consider using the VSCode extension for automatic Git backup

## Troubleshooting

### My AI isn't working. What should I check?

1. **API key**: Verify your API key is correct and hasn't expired
2. **Internet connection**: Ensure you have stable internet access
3. **Provider status**: Check if your AI provider is experiencing outages
4. **Billing**: Confirm your AI provider account has sufficient credits/billing
5. **Settings**: Review your LLM profile configuration for errors

### The Oracle results seem repetitive. How can I fix this?

1. **Clear cache**: Restart the application to clear any cached responses
2. **Custom spark tables**: Add your own keyword tables for more variety
3. **Different questions**: Try asking questions from different angles
4. **Edit interpretations**: Customize Oracle interpretations to fit your story better

### My repository items aren't being recognized. What's wrong?

1. **Check keywords**: Ensure repository items include relevant keywords
2. **File format**: Verify repository files are in Markdown (.md) format
3. **File location**: Confirm files are in the correct repository subfolder
4. **Restart**: Reload the application after adding new repository items
5. **Naming**: Use consistent naming that matches how you reference items in stories

### Performance is slow. How can I improve it?

1. **Reduce context**: Lower `maxContextEntries` in your LLM profile
2. **Smaller repositories**: Keep repository items focused and concise
3. **Browser optimization**: Close unnecessary tabs, clear cache
4. **AI settings**: Reduce `maxTokens` if you don't need long responses
5. **Local models**: Consider local AI for faster response times

## Best Practices

### How should I structure my writing workflow?

**Discovery Writing:**
1. Start with a simple premise
2. Use AI continuation to explore possibilities
3. Ask Oracle questions when facing decisions
4. Let the story emerge organically

**Planned Writing:**
1. Create repository items for key elements first
2. Use templates for consistent scenes
3. Plan major plot points with Oracle queries
4. Execute detailed writing with AI assistance

### What makes a good Oracle question?

**Good Oracle Questions:**
- "Does the guard believe my disguise?"
- "Is there a hidden passage in this room?"
- "Does the NPC know more than they're saying?"

**Poor Oracle Questions:**
- "Should I go left or right?" (you decide this)
- "What color is the door?" (too specific for yes/no)
- "Will I win this fight?" (predetermined by game mechanics)

### How do I maintain story consistency?

1. **Use repository items**: Create detailed character and location profiles
2. **Reference by name**: Mention repository items in your writing
3. **Review AI output**: Edit AI continuations to match your established tone
4. **Track details**: Keep notes about important story elements and decisions
5. **Use templates**: Create consistent patterns for similar scenes

### How can I collaborate with others?

**VSCode Extension:**
- Use Git for version control and collaboration
- Share `.story-mode` directories with team members
- Create pull requests for collaborative editing

**Web Application:**
- Export/import data to share libraries
- Share individual stories as Markdown files
- Use screen sharing for real-time collaboration

---

**Still have questions?** Check our [Common Issues](common-issues.md) guide or [create a discussion](https://github.com/jebcarter-space/story-mode/discussions) on GitHub!
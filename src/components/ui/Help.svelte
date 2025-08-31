<script lang="ts">
  import { onMount } from 'svelte';
  import Modal from './Modal.svelte';
  
  export let isOpen = false;
  export let searchTerm = '';
  
  interface HelpSection {
    id: string;
    title: string;
    category: string;
    content: string;
    keywords: string[];
  }
  
  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      category: 'basics',
      content: `
# Getting Started with Story Mode

Story Mode helps you create interactive stories using AI assistance and decision-making tools.

## Quick Start
1. **Create a Story**: Click "Library" → "+" to create your first story
2. **Write and Continue**: Type some text, then click "Continue" to let AI extend your story
3. **Ask the Oracle**: Click "Oracle" to ask yes/no questions about your story
4. **Use Sparks**: Get random keywords for inspiration when you're stuck

## Core Concepts
- **Oracle**: Answers yes/no questions with AI interpretation
- **AI Continuation**: Extends your story naturally
- **Repository**: Store characters, locations, and objects for consistency
- **Sparks**: Random keywords for creative inspiration
      `,
      keywords: ['start', 'begin', 'intro', 'first', 'new', 'basic']
    },
    {
      id: 'oracle-system',
      title: 'Oracle System',
      category: 'features',
      content: `
# Oracle System

The Oracle helps you make story decisions by answering yes/no questions.

## How to Use
1. Click the "Oracle" button in your story
2. Type a yes/no question about your story
3. Get an answer with keywords and interpretation

## Oracle Responses
- **Yes, and**: Strongly positive with benefits
- **Yes**: Simple positive result  
- **Yes, but**: Positive with complications
- **No, but**: Negative with silver lining
- **No**: Simple negative result
- **No, and**: Strongly negative with complications

## Tips
- Ask about genuine uncertainty, not predetermined outcomes
- Use the keywords for creative inspiration
- Let unexpected results drive your story in new directions
      `,
      keywords: ['oracle', 'decision', 'question', 'yes', 'no', 'random']
    },
    {
      id: 'ai-continuation',
      title: 'AI Text Continuation',
      category: 'features',
      content: `
# AI Text Continuation

AI continuation helps you extend your stories naturally and overcome writer's block.

## How to Use
1. Position your cursor where you want to continue
2. Click "Continue" or use the keyboard shortcut
3. AI will generate text that continues your story
4. Edit the result to match your vision

## Getting Better Results
- End sentences with clear direction: "As she opened the door..."
- Include character and location names from your repository
- Provide enough context for the AI to understand the situation
- Edit the AI output to match your style and preferences

## Troubleshooting
- If results are poor, try providing more context
- Edit freely - AI output is a starting point, not final text
- Adjust your LLM settings for different creative styles
      `,
      keywords: ['ai', 'continue', 'generate', 'extend', 'text', 'writing']
    },
    {
      id: 'repository',
      title: 'Repository System',
      category: 'features',
      content: `
# Repository System

The repository stores information about characters, locations, and objects for consistent storytelling.

## Repository Types
- **Characters**: People, creatures, entities in your stories
- **Locations**: Places, settings, geographical features  
- **Objects**: Items, artifacts, tools, weapons

## Creating Repository Items
1. Navigate to Repository in your library
2. Click "+" to add a new item
3. Fill in the name, description, and keywords
4. Items are automatically used when you mention their keywords

## Keywords
Include relevant keywords in each repository item. When you use these keywords in your story, the system automatically includes the item's information for AI context.

## Tips
- Start simple and add details as needed
- Use consistent naming throughout your stories
- Include relevant keywords for automatic integration
      `,
      keywords: ['repository', 'character', 'location', 'object', 'organize', 'storage']
    },
    {
      id: 'spark-tables',
      title: 'Spark Tables',
      category: 'features',
      content: `
# Spark Tables

Spark tables provide random keywords for creative inspiration when you're stuck.

## How to Use
1. Click "Sparks" in your story interface
2. Get 2-3 random keywords for inspiration
3. Use these keywords to drive your story in new directions

## Types of Sparks
- **Default**: General-purpose keywords
- **Themed**: Specific genres (horror, fantasy, sci-fi, etc.)
- **Custom**: Your own keyword collections

## Managing Spark Tables
1. Go to Settings → Custom Tables
2. Create new tables or import existing ones
3. Enable/disable tables as needed
4. Adjust weights for different selection frequencies

## Tips
- Use sparks when you're unsure what happens next
- Combine multiple sparks for complex inspiration
- Create custom tables for your specific genres or themes
      `,
      keywords: ['spark', 'random', 'keyword', 'inspiration', 'table', 'generate']
    },
    {
      id: 'settings-llm',
      title: 'LLM Settings',
      category: 'configuration',
      content: `
# LLM (AI) Settings

Configure AI providers and models for text continuation and Oracle interpretation.

## Setting Up AI
1. Go to Settings → LLM Settings
2. Click "Add New Profile"
3. Enter your API key and configuration
4. Test the connection

## Supported Providers
- **OpenAI**: GPT-3.5, GPT-4 models
- **OpenRouter**: Access to multiple AI models
- **KoboldCPP**: Local AI hosting
- **Mistral**: Mistral AI models
- **Custom**: Any OpenAI-compatible API

## Important Settings
- **Temperature**: Controls creativity (0.1 = focused, 1.0 = creative)
- **Max Tokens**: Length of AI responses
- **Model**: Which AI model to use

## Security
- Keep your API keys secure
- Don't share profiles containing API keys
- Use environment variables for shared setups
      `,
      keywords: ['llm', 'ai', 'settings', 'api', 'key', 'configuration', 'model']
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      category: 'help',
      content: `
# Common Issues

## AI Not Working
- Check your API key in LLM Settings
- Verify internet connection
- Test with a different model
- Check browser console for errors (F12)

## Data Not Saving
- Ensure browser allows localStorage
- Try clearing browser cache
- Don't use private/incognito mode for regular work
- Export your data regularly as backup

## Performance Issues
- Close other browser tabs
- Clear browser cache and reload
- Reduce story length for better performance
- Limit concurrent AI operations

## Import/Export Problems
- Check file format (should be JSON)
- Try smaller files if large imports fail
- Ensure browser allows file downloads/uploads

## Getting Help
- Check the full documentation at GitHub
- Report bugs in the GitHub issues
- Ask questions in GitHub discussions
      `,
      keywords: ['problem', 'issue', 'error', 'bug', 'fix', 'help', 'troubleshoot']
    }
  ];
  
  let filteredSections = helpSections;
  let selectedSection: HelpSection | null = null;
  
  $: if (searchTerm) {
    filteredSections = helpSections.filter(section => 
      section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  } else {
    filteredSections = helpSections;
  }
  
  function selectSection(section: HelpSection) {
    selectedSection = section;
  }
  
  function goBack() {
    selectedSection = null;
  }
  
  function closeHelp() {
    isOpen = false;
    selectedSection = null;
    searchTerm = '';
  }
  
  // Keyboard shortcuts
  onMount(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (isOpen && event.key === 'Escape') {
        if (selectedSection) {
          goBack();
        } else {
          closeHelp();
        }
      }
    }
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<Modal bind:isOpen={isOpen} title="Story Mode Help" onClose={closeHelp}>
  <div class="help-container">
    {#if selectedSection}
      <!-- Individual help section view -->
      <div class="help-section-detail">
        <div class="help-header">
          <button 
            class="back-button" 
            onclick={goBack}
            aria-label="Go back to help topics"
          >
            ← Back to Help Topics
          </button>
          <h2 class="section-title">{selectedSection.title}</h2>
        </div>
        
        <div class="help-content">
          {@html selectedSection.content.replace(/\n/g, '<br>').replace(/^# (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h4>$1</h4>')}
        </div>
      </div>
    {:else}
      <!-- Help topics overview -->
      <div class="help-overview">
        <!-- Search -->
        <div class="search-container">
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search help topics..."
            class="search-input"
          />
        </div>
        
        <!-- Categories -->
        <div class="help-categories">
          <div class="category">
            <h3>Getting Started</h3>
            {#each filteredSections.filter(s => s.category === 'basics') as section}
              <button class="help-topic" onclick={() => selectSection(section)}>
                <span class="topic-title">{section.title}</span>
                <span class="topic-arrow">→</span>
              </button>
            {/each}
          </div>
          
          <div class="category">
            <h3>Features</h3>
            {#each filteredSections.filter(s => s.category === 'features') as section}
              <button class="help-topic" onclick={() => selectSection(section)}>
                <span class="topic-title">{section.title}</span>
                <span class="topic-arrow">→</span>
              </button>
            {/each}
          </div>
          
          <div class="category">
            <h3>Configuration</h3>
            {#each filteredSections.filter(s => s.category === 'configuration') as section}
              <button class="help-topic" onclick={() => selectSection(section)}>
                <span class="topic-title">{section.title}</span>
                <span class="topic-arrow">→</span>
              </button>
            {/each}
          </div>
          
          <div class="category">
            <h3>Help & Support</h3>
            {#each filteredSections.filter(s => s.category === 'help') as section}
              <button class="help-topic" onclick={() => selectSection(section)}>
                <span class="topic-title">{section.title}</span>
                <span class="topic-arrow">→</span>
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Quick links -->
        <div class="quick-links">
          <h3>External Resources</h3>
          <div class="links-grid">
            <a href="https://github.com/jebcarter-space/story-mode" target="_blank" class="external-link">
              📚 Full Documentation
            </a>
            <a href="https://github.com/jebcarter-space/story-mode/issues" target="_blank" class="external-link">
              🐛 Report Issues
            </a>
            <a href="https://github.com/jebcarter-space/story-mode/discussions" target="_blank" class="external-link">
              💬 Community Discussions
            </a>
            <a href="https://marketplace.visualstudio.com/items?itemName=story-mode" target="_blank" class="external-link">
              🔧 VSCode Extension
            </a>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Modal>

<style>
  .help-container {
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .help-overview {
    padding: 1rem;
  }
  
  .search-container {
    margin-bottom: 1.5rem;
  }
  
  .search-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--theme-border, #ccc);
    border-radius: 0.5rem;
    font-size: 1rem;
    background: var(--theme-bg-main, white);
    color: var(--theme-text-main, black);
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--theme-primary, #007acc);
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  }
  
  .help-categories {
    margin-bottom: 2rem;
  }
  
  .category {
    margin-bottom: 1.5rem;
  }
  
  .category h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-main, black);
    border-bottom: 1px solid var(--theme-border, #eee);
    padding-bottom: 0.25rem;
  }
  
  .help-topic {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    border: 1px solid var(--theme-border, #eee);
    border-radius: 0.5rem;
    background: var(--theme-bg-muted, #f9f9f9);
    color: var(--theme-text-main, black);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .help-topic:hover {
    background: var(--theme-bg-hover, #f0f0f0);
    border-color: var(--theme-primary, #007acc);
  }
  
  .topic-title {
    font-weight: 500;
  }
  
  .topic-arrow {
    color: var(--theme-text-muted, #666);
    font-weight: bold;
  }
  
  .quick-links h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--theme-text-main, black);
  }
  
  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .external-link {
    display: block;
    padding: 0.75rem;
    border: 1px solid var(--theme-border, #eee);
    border-radius: 0.5rem;
    background: var(--theme-bg-muted, #f9f9f9);
    color: var(--theme-text-main, black);
    text-decoration: none;
    transition: all 0.2s ease;
  }
  
  .external-link:hover {
    background: var(--theme-bg-hover, #f0f0f0);
    border-color: var(--theme-primary, #007acc);
  }
  
  /* Section detail view */
  .help-section-detail {
    padding: 1rem;
  }
  
  .help-header {
    margin-bottom: 1.5rem;
  }
  
  .back-button {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    margin-bottom: 1rem;
    border: 1px solid var(--theme-border, #ccc);
    border-radius: 0.25rem;
    background: var(--theme-bg-muted, #f9f9f9);
    color: var(--theme-text-main, black);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .back-button:hover {
    background: var(--theme-bg-hover, #f0f0f0);
  }
  
  .section-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--theme-text-main, black);
  }
  
  .help-content {
    line-height: 1.6;
    color: var(--theme-text-main, black);
  }
  
  .help-content :global(h3) {
    margin: 1.5rem 0 0.75rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--theme-text-main, black);
  }
  
  .help-content :global(h4) {
    margin: 1rem 0 0.5rem 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--theme-text-main, black);
  }
  
  .help-content :global(ul) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  .help-content :global(li) {
    margin: 0.25rem 0;
  }
  
  .help-content :global(code) {
    background: var(--theme-bg-muted, #f0f0f0);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.9em;
  }
</style>
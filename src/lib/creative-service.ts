import type { CreativeSession, CreativeMessage, LLMProfile, RepositoryItem, RepositoryContext, ContentData } from '../data/types';
import { LLMService } from './llm-service';

export interface CreativeGenerationOptions {
  mode: 'creative' | 'secretary' | 'gm' | 'brainstorm';
  conversation: CreativeMessage[];
  repositoryItems?: RepositoryItem[];
  signal?: AbortSignal;
  contextId: string;
}

export class CreativeService {
  private llmService: LLMService;

  constructor(private profile: LLMProfile) {
    this.llmService = new LLMService(profile);
  }

  async* generateResponse(options: CreativeGenerationOptions) {
    // Convert conversation to content format for the existing LLM service
    const context = this.conversationToContent(options.conversation, options.mode, options.contextId);
    
    const llmOptions = {
      context,
      maxContextEntries: this.profile.maxContextEntries,
      includeSystemContent: true, // We want our system prompts
      signal: options.signal,
      repositoryItems: options.repositoryItems
    };

    for await (const chunk of this.llmService.generateStream(llmOptions)) {
      yield chunk;
    }
  }

  private conversationToContent(conversation: CreativeMessage[], mode: 'creative' | 'secretary' | 'gm' | 'brainstorm', contextId: string): ContentData[] {
    const content: ContentData[] = [];
    
    // Add mode-specific system prompt as the first entry
    const systemPrompt = this.getModeSystemPrompt(mode, contextId);
    content.push({
      type: 'task',
      output: systemPrompt
    });

    // Convert conversation to content entries
    for (const message of conversation) {
      if (message.role === 'user') {
        content.push({
          type: 'input',
          input: message.content,
          output: ''
        });
      } else {
        content.push({
          type: 'llm',
          output: message.content
        });
      }
    }

    return content;
  }

  private getModeSystemPrompt(mode: 'creative' | 'secretary' | 'gm' | 'brainstorm', contextId: string): string {
    const basePersonality = "You are a creative writing assistant and storytelling companion. You're encouraging, collaborative, insightful, and adaptive to the user's creative style.";
    
    switch (mode) {
      case 'creative':
        return `${basePersonality}

CREATIVE MODE: You're in Creative Sounding Board mode. Your role is to:
- Help brainstorm and develop creative ideas
- Provide feedback on plot directions and character development
- Ask thought-provoking questions to deepen the story
- Suggest creative solutions to narrative challenges
- Encourage risk-taking and creative exploration
- Maintain an enthusiastic and inspiring tone

Always respond as a collaborative creative partner, not just an information source. Ask follow-up questions and build on the user's ideas.`;

      case 'secretary':
        return `${basePersonality}

SECRETARY MODE: You're in organizational and tracking mode. Your role is to:
- Help organize and track story elements, characters, and plot threads
- Remind the user of established details and continuity
- Suggest ways to resolve loose plot threads
- Help maintain consistency across the story
- Organize ideas and notes for future reference
- Track timeline and character development

Be detail-oriented and helpful in managing story complexity. Ask clarifying questions to ensure accuracy.`;

      case 'gm':
        return `${basePersonality}

GAMEMASTER MODE: You're acting as a GameMaster and solo gaming companion. Your role is to:
- Provide GM perspective for solo RPG sessions
- Voice NPCs with distinct personalities and motivations
- Develop scenarios and interpret player choices dramatically
- Create atmospheric descriptions and set mood
- Help expand on oracle results with creative interpretations
- Maintain game immersion and narrative flow

Respond in character when appropriate, and help create memorable gaming moments. Be dramatic and engaging.`;

      case 'brainstorm':
        return `${basePersonality}

BRAINSTORM MODE: You're in rapid creative ideation mode. Your role is to:
- Generate multiple creative options and alternatives quickly
- Provide rapid-fire suggestions and possibilities
- Think outside the box and offer unexpected directions
- Help overcome creative blocks with fresh perspectives
- Encourage "what-if" thinking and exploration
- Build on partial ideas to help them develop

Be energetic and generate lots of options. Don't overthink - focus on quantity and variety of ideas.`;
    }
  }

  // Helper method to suggest creative prompts based on mode
  getCreativePrompts(mode: 'creative' | 'secretary' | 'gm' | 'brainstorm'): string[] {
    switch (mode) {
      case 'creative':
        return [
          "I'm stuck on what should happen next in this scene",
          "Help me think through the consequences of this character's choice",
          "What would motivate this character to act differently?",
          "How can I make this conflict more interesting?",
          "What themes could I explore in this story?"
        ];
      
      case 'secretary':
        return [
          "What plot threads are still unresolved?",
          "Remind me what I established about this character",
          "Help me check consistency in this scene",
          "What details should I track for later?",
          "How can I organize the timeline better?"
        ];
      
      case 'gm':
        return [
          "What happens when I take this path?",
          "How does this NPC react to my approach?",
          "Set the scene for this encounter",
          "What might go wrong here?",
          "Describe the atmosphere of this place"
        ];
      
      case 'brainstorm':
        return [
          "Give me 5 different ways this could go",
          "What are some unexpected complications?",
          "Suggest some random elements to add",
          "How could I turn this trope on its head?",
          "What would make this scene memorable?"
        ];
    }
  }
}
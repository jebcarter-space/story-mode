import type { Template, LLMProfile } from '../types';
import { PlaceholderResolver, type PlaceholderResolverOptions } from './placeholder-resolver';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_AUTHOR_NOTE } from './system-prompt-presets';

export class TemplateEngine {
  private resolver: PlaceholderResolver;

  constructor(resolverOptions?: PlaceholderResolverOptions) {
    this.resolver = new PlaceholderResolver(resolverOptions);
  }

  /**
   * Resolve systemPrompt with inheritance: Template → Connection → Default
   */
  public resolveSystemPrompt(template: Template, llmProfile?: LLMProfile): string {
    // Priority: Template's systemPrompt → Connection's systemPrompt → Default
    if (template.systemPrompt) {
      return template.systemPrompt;
    }
    if (llmProfile?.systemPrompt) {
      return llmProfile.systemPrompt;
    }
    return DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Resolve authorNote with inheritance: Template → Connection → Default
   */
  public resolveAuthorNote(template: Template, llmProfile?: LLMProfile): string {
    // Priority: Template's authorNote → Connection's authorNote → Default
    if (template.authorNote) {
      return template.authorNote;
    }
    if (llmProfile?.authorNote) {
      return llmProfile.authorNote;
    }
    return DEFAULT_AUTHOR_NOTE;
  }

  /**
   * Create a modified LLM profile that incorporates template-level overrides
   * Made public for testing purposes
   */
  public createEffectiveLLMProfile(template: Template, baseLLMProfile: LLMProfile): LLMProfile {
    const resolvedSystemPrompt = this.resolveSystemPrompt(template, baseLLMProfile);
    const resolvedAuthorNote = this.resolveAuthorNote(template, baseLLMProfile);
    
    return {
      ...baseLLMProfile,
      systemPrompt: resolvedSystemPrompt,
      authorNote: resolvedAuthorNote
    };
  }

  /**
   * Process a template with placeholder resolution and inheritance
   */
  async processTemplate(
    template: Template,
    context: Record<string, any>,
    baseLLMProfile?: LLMProfile
  ): Promise<{ content: string; effectiveLLMProfile?: LLMProfile }> {
    // Resolve placeholders in template content
    const resolvedContent = await this.resolver.resolve(template.content);
    
    // Create effective LLM profile with overrides if base profile is provided
    const effectiveLLMProfile = baseLLMProfile ? 
      this.createEffectiveLLMProfile(template, baseLLMProfile) : undefined;
    
    return {
      content: resolvedContent,
      effectiveLLMProfile
    };
  }
}
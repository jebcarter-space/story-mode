import type { Template, TemplateList, RepositoryItem, RepositoryCategory, LLMProfile } from '../data/types';
import { PlaceholderResolver, type ResolverOptions } from './placeholder-resolver';
import { LLMService } from './llm-service';

export class TemplateEngine {
  private resolver: PlaceholderResolver;

  constructor(resolverOptions?: ResolverOptions) {
    this.resolver = new PlaceholderResolver(resolverOptions);
  }

  public executeTemplate(template: Template): string {
    return this.resolver.resolve(template.content);
  }

  public executeTemplateContent(content: string): string {
    return this.resolver.resolve(content);
  }

  public async executeTemplateWithLLM(
    template: Template, 
    llmProfile?: LLMProfile,
    repositorySaveCallback?: (content: string, category: RepositoryCategory) => void
  ): Promise<string> {
    // First execute the template normally
    const baseResult = this.resolver.resolve(template.content);
    
    // If LLM is not enabled or no profile provided, return base result
    if (!template.llmEnabled || !llmProfile) {
      return baseResult;
    }

    try {
      // Create LLM service with the profile
      const llmService = new LLMService(llmProfile);
      
      // Prepare the LLM instructions with template variables resolved
      const resolvedInstructions = template.llmInstructions 
        ? this.resolver.resolve(template.llmInstructions)
        : '';
      
      // Build the prompt for LLM
      const prompt = resolvedInstructions 
        ? `${resolvedInstructions}\n\n${baseResult}`
        : baseResult;
      
      // Generate LLM response
      const llmResult = await llmService.generate({
        context: [{ 
          type: 'template', 
          output: prompt,
          input: template.llmInstructions 
        }],
        maxContextEntries: 1,
        includeSystemContent: false
      });

      // Determine final result based on append mode
      const finalResult = template.appendMode 
        ? `${baseResult}\n\n${llmResult}`
        : llmResult;

      // Save to repository if configured
      if (template.repositoryTarget && template.repositoryTarget !== 'None' && repositorySaveCallback) {
        repositorySaveCallback(finalResult, template.repositoryTarget as RepositoryCategory);
      }

      return finalResult;
    } catch (error) {
      console.error('LLM processing failed:', error);
      // Return base result if LLM processing fails
      return baseResult;
    }
  }

  public resetConsumption(tableName?: string): void {
    this.resolver.resetConsumption(tableName);
  }

  public getConsumedItems(tableName: string): string[] {
    return this.resolver.getConsumedItems(tableName);
  }
}

// Default templates that come with the system
export function getDefaultTemplates(): TemplateList {
  const now = Date.now();
  
  return {
    character_basic: {
      name: "Character (Basic)",
      description: "Generate a basic character with name, age, profession, and personality",
      content: "Name: {names}\nAge: {rand 18-65}\nProfession: {occupations}\nPersonality: {traits.pick 2}",
      category: "Character",
      created: now,
      updated: now
    },
    character_detailed: {
      name: "Character (Detailed)",
      description: "Generate a detailed character with equipment and background",
      content: "Name: {names}\nAge: {rand 18-65}\nProfession: {occupations}\nPersonality: {traits.pick 3}\nBackground: {backgrounds}\nEquipment: {gear.consumable} and {gear.consumable}\nWealth: {roll 3d6} gold pieces\nHealth: {roll 2d6+6} hit points",
      category: "Character",
      created: now,
      updated: now
    },
    location_basic: {
      name: "Location (Basic)",
      description: "Generate a basic location with name, type, and description",
      content: "Location: {locations}\nType: {locationTypes}\nFeature: {locationFeatures}\nAtmosphere: {atmospheres}",
      category: "Location",
      created: now,
      updated: now
    },
    location_detailed: {
      name: "Location (Detailed)",
      description: "Generate a detailed location with inhabitants and secrets",
      content: "Location: {locations}\nType: {locationTypes}\nSize: {locationSizes}\nFeature: {locationFeatures.pick 2}\nAtmosphere: {atmospheres}\nInhabitants: {creatures.pick 2}\nSecret: {secrets}\nTreasure: {treasures} (DC {roll 1d6+10} to find)",
      category: "Location",
      created: now,
      updated: now
    },
    quest_basic: {
      name: "Quest (Basic)",
      description: "Generate a basic quest with objective and reward",
      content: "Objective: {questTypes.capitalize} {questTargets}\nLocation: {locations}\nReward: {roll 2d6+3} gold pieces\nDeadline: {rand 1-7} days",
      category: "Quest",
      created: now,
      updated: now
    },
    quest_detailed: {
      name: "Quest (Detailed)",
      description: "Generate a detailed quest with complications and NPCs",
      content: "Objective: {questTypes.capitalize} {questTargets}\nClient: {names}, {article} {occupations}\nLocation: {locations} ({locationTypes})\nComplications: {complications.pick 2}\nOpposition: {creatures}\nReward: {roll 3d6+10} gold pieces and {treasures}\nDeadline: {rand 3-14} days\nSecondary Objective: {questTypes.capitalize} {questTargets}",
      category: "Quest",
      created: now,
      updated: now
    },
    item_weapon: {
      name: "Weapon",
      description: "Generate a weapon with properties",
      content: "Weapon: {weaponTypes}\nMaterial: {materials}\nCondition: {conditions}\nDamage: {roll 1d6+2}\nSpecial Property: {weaponProperties}",
      category: "Item",
      created: now,
      updated: now
    },
    item_magic: {
      name: "Magic Item",
      description: "Generate a magical item with powers",
      content: "Item: {magicItems}\nType: {itemTypes}\nPower: {magicPowers}\nActivation: {magicActivation}\nCharges: {rand 1-10} (recharges at {magicRecharge})\nCurse: {rand 1-100}% chance of {curses}",
      category: "Item",
      created: now,
      updated: now
    },
    encounter_social: {
      name: "Social Encounter",
      description: "Generate a social encounter with NPCs",
      content: "NPC: {names}, {article} {occupations}\nMood: {moods}\nGoal: {npcGoals}\nPersonality: {traits.pick 2}\nSecret: {npcSecrets}\nOffering: {services} for {roll 1d6+2} gold\nWants: {npcWants}",
      category: "Encounter",
      created: now,
      updated: now
    },
    encounter_combat: {
      name: "Combat Encounter",
      description: "Generate a combat encounter",
      content: "Enemies: {rand 1-6} {creatures}\nLocation: {battlegrounds}\nTactics: {combatTactics}\nTerrain: {terrainFeatures.pick 2}\nTreasure: {treasures} ({roll 2d6+5} gold value)\nEscape Route: {escapeRoutes}",
      category: "Encounter",
      created: now,
      updated: now
    }
  };
}

export function loadDefaultTemplates(): void {
  const stored = localStorage.getItem('templates');
  const existing = stored ? JSON.parse(stored) : {};
  
  // Only add default templates that don't already exist
  const defaults = getDefaultTemplates();
  const merged = { ...defaults, ...existing };
  
  localStorage.setItem('templates', JSON.stringify(merged));
}
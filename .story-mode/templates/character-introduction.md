---
name: "Character Introduction"
description: "Template for introducing a new character with LLM enhancement"
category: "Characters"
llmEnabled: true
llmInstructions: "Generate a vivid character introduction based on the provided details, focusing on atmosphere and first impressions"
llmProfile: ""
appendMode: false
repositoryTarget: "Character"
---

## {{random_character}} Enters the Scene

**Age:** {{rand 18-65}}
**Initial Impression:** {{roll 1d6}}

{{#llm}}Describe this character's dramatic entrance into the scene, including their appearance, mannerisms, and the immediate impression they make on others present{{/llm}}

**Notable Equipment:** 
- Primary weapon/tool: {{rand 1-10}}
- Distinctive clothing or accessory

**Random Quirk:** {{rand 1-100}}% chance of having an unusual habit

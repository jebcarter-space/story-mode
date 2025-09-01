---
name: "Tavern Scene"
description: "Generate a detailed tavern scene with atmosphere"
category: "Locations"  
llmEnabled: true
llmInstructions: "Create a vivid tavern scene with sensory details, atmosphere, and notable features"
llmProfile: ""
appendMode: true
repositoryTarget: "Location"
---

# The {{random_location}} Tavern

**Crowd Level:** {{rand 5-50}} patrons  
**Atmosphere Check:** {{roll 2d6}}

## Basic Setup
- **Lighting:** Flickering candlelight and oil lamps
- **Sounds:** {{roll 1d4}} conversations happening simultaneously  
- **Notable Patron:** {{random_character}} sits in the corner

## Scene Enhancement
{{#llm}}Add rich atmospheric details about the tavern's mood, smells, sounds, and any interesting events happening right now{{/llm}}

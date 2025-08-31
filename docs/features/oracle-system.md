# Oracle System

The Oracle is Story Mode's AI-powered decision-making system that helps drive your narrative forward through intelligent yes/no questions and meaningful interpretations.

## What is the Oracle?

The Oracle system answers yes/no questions about your story using:
- **Weighted probability rolls** based on a d20 system
- **Contextual AI interpretation** that considers your story
- **Random keywords** for creative inspiration
- **Consistent results** that build meaningful narratives

Think of it as having a wise, impartial narrator who helps you discover what happens next in your story.

## How the Oracle Works

### The Resolution System

Oracle responses use a weighted d20 system:

| Roll | Result | Probability | Meaning |
|------|--------|-------------|---------|
| 1 | No, and | 5% | Strongly negative with complications |
| 2 | No, but | 5% | Negative with silver lining |
| 3-14 | Yes, but | 60% | Positive with complications |
| 15-19 | Yes | 25% | Simple positive result |
| 20 | Yes, and | 5% | Strongly positive with benefits |

This weighting ensures that:
- **Most results are positive** but come with interesting complications
- **Extreme results are rare** but impactful when they occur
- **"But" results create narrative tension** and story opportunities

### Response Components

Every Oracle response includes:

1. **The Answer**: Yes/No with qualifier (and/but)
2. **The Roll**: Shows the d20 result for transparency
3. **Keywords**: 2-3 random words for inspiration
4. **Interpretation**: AI analysis of what this means for your story

**Example Response:**
```
Query: "Does the guard believe my disguise?"
Result: No, but (Rolled: 7)
Keywords: suspicious, opportunity, quick
Interpretation: The guard sees through your disguise immediately, but their suspicion creates an opportunity for quick thinking rather than immediate confrontation.
```

## Using the Oracle Effectively

### Best Questions to Ask

#### Story Progression
- "Does the plan work as expected?"
- "Are there enemies waiting in the next room?"
- "Does the NPC tell the truth?"
- "Is this clue important to the mystery?"

#### Character Development
- "Does the character trust me?"
- "Is the character hiding something?"
- "Does the character have useful information?"
- "Will the character help me?"

#### World Building
- "Is this location dangerous?"
- "Are there valuable resources here?"
- "Does this place have magical properties?"
- "Is someone watching us?"

#### Plot Development
- "Is this the real villain?"
- "Does this event happen as planned?"
- "Are there unexpected consequences?"
- "Is there more to this situation?"

### Questions to Avoid

#### Already Decided Outcomes
❌ "Do I want to go to the tavern?" (You decide this)
✅ "Is the tavern busy tonight?" (Oracle decides this)

#### Overly Specific Details
❌ "Does the innkeeper have exactly 47 gold coins?"
✅ "Does the innkeeper have enough money to help us?"

#### Meta-Game Questions
❌ "Should I use the Oracle for this decision?"
✅ Ask substantive story questions

## Oracle Strategies

### Following Oracle Logic

When you get an Oracle result, consider these approaches:

#### Embrace Unexpected Results
- **Unwanted "No"**: Often leads to more interesting complications
- **Unexpected "Yes"**: May reveal new story possibilities
- **"And" results**: Double down on the extreme outcome
- **"But" results**: Add the complication that makes sense

#### Use Keywords Actively
Keywords often provide the best story direction:
- **Combine with the result**: "No, but" + "hidden, passage" = "The door is locked, but there's a hidden passage nearby"
- **Apply to different story elements**: Use keywords for NPCs, locations, or objects
- **Let them surprise you**: Don't force keywords to fit preconceptions

### Advanced Oracle Techniques

#### Oracle Chains
Ask follow-up questions to explore complex situations:

```
Q1: "Is the merchant honest?"
A1: No, but (Keywords: desperate, family)

Q2: "Is he cheating because of family troubles?"  
A2: Yes (Keywords: debt, dangerous)

Q3: "Are dangerous people threatening his family?"
A3: Yes, and (Keywords: immediate, tonight)
```

#### Contextual Interpretation
Use your story context to interpret results meaningfully:

**Same result, different contexts:**
- **Combat**: "No, but" might mean you miss but create an opening
- **Social**: "No, but" might mean rejection but with respect
- **Exploration**: "No, but" might mean no treasure but useful information

#### Oracle-Driven Plot Twists
Let the Oracle surprise you with major story developments:

```
Q: "Is the helpful sage who we think he is?"
A: No, and (Keywords: ancient, enemy, disguise)
Result: Plot twist - the sage is an ancient enemy in disguise!
```

## Oracle Integration with Other Features

### With AI Continuation
1. **Ask Oracle question** about what happens next
2. **Get result and keywords**
3. **Use AI continuation** incorporating the Oracle guidance
4. **Edit the result** to perfectly match your vision

### With Repository Items
- **Reference characters**: "Does [Character Name] trust the party?"
- **Use location keywords**: Oracle keywords can describe locations
- **Build object histories**: "Is this artifact cursed?"

### With Templates
Include Oracle queries in templates for dynamic content:

```yaml
---
title: "Random Encounter"
---

## Encounter Setup

{{oracle:Is this encounter hostile?}}

Based on the Oracle's guidance: {{llm:Describe an encounter that matches the Oracle result, incorporating the keywords provided.}}
```

## Oracle Variants and Customization

### Probability Modifications

For different genres or situations, you might mentally adjust probabilities:

#### High Fantasy (More "Yes" results)
- Treat 2-3 as "Yes, but" instead of "No, but"
- Magic makes more things possible

#### Horror (More "No" results)  
- Treat 13-14 as "No, but" instead of "Yes, but"
- Things go wrong more often

#### Comedy (More extreme results)
- Treat 2-19 as either "Yes, and" or "No, and"
- Extreme outcomes create funny situations

### Custom Oracle Questions

Create specialized Oracle patterns for your genre:

#### Mystery Genre
- "Is this clue genuine or a red herring?"
- "Does this witness know more than they're saying?"
- "Is this suspect the real culprit?"

#### Romance Genre
- "Does this character have romantic interest?"
- "Are there obstacles to this relationship?"
- "Is this gesture well received?"

#### Adventure Genre
- "Is this path safe to travel?"
- "Does this risk pay off?"
- "Are there unexpected allies nearby?"

## Troubleshooting Oracle Issues

### When Oracle Results Don't Feel Right

#### The Result Seems Wrong
- **Remember**: Oracle represents story truth, not character knowledge
- **Consider**: How could this result actually be true?
- **Reframe**: What would make this result interesting?

#### Too Many Negative Results
- **Check your questions**: Are you asking about inherently risky things?
- **Embrace complications**: "But" results create story opportunities
- **Balance with positive framing**: Ask what goes right, not just what goes wrong

#### Oracle Fatigue
- **Use sparingly**: Not every decision needs the Oracle
- **Trust your instincts**: Use Oracle for genuine uncertainty
- **Mix with other tools**: Combine with AI continuation and repository items

### Common Oracle Mistakes

#### Over-reliance
❌ Using Oracle for every tiny decision
✅ Using Oracle for meaningful uncertainty

#### Ignoring Results
❌ Re-rolling when you don't like the answer
✅ Finding interesting ways to interpret any result

#### Meta-gaming
❌ Asking questions to get desired outcomes
✅ Asking genuine questions about story uncertainty

## Oracle in Different Story Types

### Solo RPG Gaming
- **Character actions**: "Does my stealth check succeed?"
- **NPC reactions**: "Does the guard raise an alarm?"
- **World events**: "Does the storm pass by morning?"
- **Plot developments**: "Is the missing person still alive?"

### Creative Writing
- **Plot direction**: "Does the protagonist find what they're looking for?"
- **Character motivation**: "Is this character hiding their true feelings?"
- **World building**: "Does this city have the resources we need?"
- **Story pacing**: "Should this scene end with revelation or mystery?"

### Worldbuilding
- **Geography**: "Is there a river blocking this path?"
- **History**: "Did this ancient war really happen as recorded?"
- **Culture**: "Do these people welcome strangers?"
- **Magic/Technology**: "Does this device work as intended?"

## Advanced Oracle Philosophy

### The Oracle as Story Partner
Think of the Oracle not as a random number generator, but as:
- **Collaborative storyteller** that brings surprises
- **Impartial judge** of story possibilities  
- **Creative catalyst** that pushes beyond your preconceptions
- **Wisdom source** that knows what makes good stories

### Embracing Oracle Wisdom
The Oracle often knows better than you what will make an interesting story:
- **Unexpected "No"** results often lead to better plot developments
- **Complicated "But"** results create more engaging narratives
- **Random keywords** frequently provide perfect story elements
- **Challenging results** force creative problem-solving

---

**Ready to master other features?** Check out [AI Continuation](ai-continuation.md) to learn how to combine Oracle decisions with AI-powered writing, or explore [Spark Tables](spark-tables.md) for even more creative inspiration tools.
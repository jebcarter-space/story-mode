# Solo RPG Campaign Workflow

This guide demonstrates how to run a complete solo RPG campaign using Story Mode, combining traditional RPG elements with AI assistance and the Oracle system for an engaging single-player experience.

## Campaign Overview: "The Shattered Realm"

We'll create a fantasy RPG campaign where you play as a traveling knight investigating strange magical disturbances. This example demonstrates:

- **Character and world creation**
- **Session management and continuity**
- **Combat and skill resolution**
- **Campaign progression and storytelling**
- **Integration of Oracle, AI, and traditional RPG mechanics**

## Phase 1: Campaign Setup

### 1. Create Campaign Structure

**VSCode Extension:**
```
workspace/
├── .story-mode/
│   ├── repositories/
│   │   ├── characters/
│   │   ├── locations/
│   │   └── objects/
│   └── templates/
└── shattered-realm-campaign/
    ├── character-sheet.md
    ├── session-01.md
    ├── session-02.md
    └── campaign-notes/
        ├── world-state.md
        └── npcs.md
```

**Web Application:**
- Create new Library: "The Shattered Realm"
- Create Shelf: "Main Campaign"  
- Create Book: "Session Logs"

### 2. Create Your Character

**File: `character-sheet.md`**
```markdown
# Sir Kaelan Brightblade

## Character Stats
- **Class**: Paladin
- **Level**: 3
- **HP**: 24/24
- **AC**: 16 (Chain mail + Shield)

## Abilities
- **Strength**: 16 (+3)
- **Dexterity**: 12 (+1)  
- **Constitution**: 14 (+2)
- **Intelligence**: 10 (+0)
- **Wisdom**: 13 (+1)
- **Charisma**: 15 (+2)

## Skills
- **Investigation**: +3
- **Insight**: +4
- **Persuasion**: +5
- **Religion**: +3

## Equipment
- Longsword (+5, 1d8+3)
- Shield (+2 AC)
- Chain mail (AC 16)
- Holy symbol
- Adventuring gear
- 50 gold pieces

## Background
A noble knight investigating reports of magical corruption spreading across the realm. Seeks to find the source and stop the growing darkness.

## Current Mission
Investigate strange magical disturbances in the village of Millbrook.
```

### 3. Set Up Repository Elements

**Character: `repositories/characters/sir-kaelan.md`**
```markdown
# Sir Kaelan Brightblade

**Type**: Character
**Keywords**: knight, paladin, noble, investigation, holy

## Description
A noble paladin dedicated to protecting the innocent and investigating magical threats. Wears gleaming chain mail and carries a blessed longsword passed down through generations.

## Personality
- Honorable and just
- Curious about magical mysteries
- Protective of innocent people
- Sometimes too trusting

## Goals
- Stop the magical corruption spreading across the realm
- Protect innocent villagers
- Uncover the source of the disturbances
```

**Location: `repositories/locations/millbrook.md`**
```markdown
# Millbrook

**Type**: Location  
**Keywords**: village, farming, corruption, worried, simple

## Description
A small farming village on the edge of the Whisperwood Forest. Usually peaceful and prosperous, but recently plagued by strange magical phenomena.

## Key Features
- Population: ~200 people
- Main industry: Farming and lumber
- Notable locations: Village inn, temple, mayor's house
- Recent problems: Crops withering, strange lights in forest

## NPCs
- Mayor Aldric Stoneheart (worried, overwhelmed)
- Innkeeper Martha Goodbrew (gossipy, well-informed)
- Priest Father Benedict (concerned, knows about magic)
```

## Phase 2: Session Play

### Session 1: Arrival in Millbrook

#### Opening Scene
```markdown
# Session 1: Shadows Over Millbrook

## Scene 1: Arrival

The sun hangs low as Sir Kaelan approaches Millbrook. Even from a distance, something feels wrong about the normally prosperous farming village.

**Oracle Query**: Are there obvious signs of the magical corruption?
**Result**: Yes, but (Rolled: 16)
**Keywords**: subtle, hidden, locals
**Interpretation**: The corruption is present and noticeable, but it's subtle enough that only someone looking for it would see the signs. The locals might not fully understand what they're seeing.
```

**Continue with AI:** Position cursor after "something feels wrong" and use AI continuation:

```markdown
The crops in the outlying fields appear stunted, their leaves bearing an unnatural grayish tinge that speaks of more than drought or poor soil. Wisps of strange, pale mist drift between the houses despite the clear evening sky, and the usual sounds of village life seem muted, as if the very air swallows sound.

As Kaelan guides his horse down the main road, worried faces peer at him from windows and doorways. These are people who have seen something they don't understand, and hope has arrived in the form of a knight in gleaming armor.
```

#### Meeting the Mayor

```markdown
## Scene 2: The Village Hall

**Oracle Query**: Is Mayor Aldric willing to share all the details immediately?
**Result**: No, but (Rolled: 8)
**Keywords**: trust, test, information  
**Interpretation**: The mayor is cautious about trusting a stranger with sensitive information, but is willing to share basic details. He might test Kaelan's sincerity before revealing everything.

Mayor Aldric Stoneheart is a sturdy man in his fifties, with calloused hands and worry lines etched deep around his eyes. He greets Sir Kaelan with a mixture of relief and wariness.

"Welcome to Millbrook, Sir Knight. We've sent messages to the capital, but..." He gestures helplessly. "Things have been... strange. I'm not sure how much you'll believe."

**Skill Check**: Persuasion to gain the mayor's trust
**Roll**: 1d20+5 = 17 (Success!)

Kaelan's earnest demeanor and obvious dedication convince the mayor to open up.
```

**Continue with AI for the mayor's revelation:**

```markdown
Aldric's shoulders sag with relief as he decides to trust the paladin. "Three weeks ago, it started with the Henderson farm. Their prize bull... changed. Not just sick, but wrong somehow. Its eyes turned that sickly green color, and it became vicious beyond reason. We had to put it down."

He walks to the window, staring out at the forest edge. "Then the crops started failing, but only in patches. Perfect circles of withered plants, like something drained the life right out of them. And the lights..." He shudders. "Green lights dancing in the forest at night. Folk are scared to leave their homes after dark."
```

#### Investigation Planning

Use the Oracle to determine investigation priorities:

```markdown
## Scene 3: Planning the Investigation

**Oracle Query**: Should Kaelan investigate the forest lights first?
**Result**: No, and (Rolled: 1)
**Keywords**: dangerous, preparation, information
**Interpretation**: Going to the forest immediately would be dangerous and foolish. Kaelan needs more preparation and information before venturing into the source of the corruption.

**Oracle Query**: Would talking to the priest provide valuable insights?
**Result**: Yes, and (Rolled: 19)  
**Keywords**: ancient, knowledge, solution
**Interpretation**: Father Benedict has ancient knowledge that could provide not just insights but potentially point toward a solution.

**Oracle Query**: Are there other recent incidents to investigate?
**Result**: Yes, but (Rolled: 11)
**Keywords**: hidden, shame, reluctant
**Interpretation**: There are other incidents, but people are hiding them out of shame or fear. They'll need convincing to share.
```

Based on Oracle guidance, Kaelan's plan:
1. **Talk to Father Benedict** for ancient knowledge
2. **Investigate recent incidents** after gaining villagers' trust  
3. **Prepare thoroughly** before entering the forest

### Session Management Techniques

#### Using Templates for Encounters

**Template: `templates/npc-encounter.md`**
```yaml
---
title: "NPC Encounter"
category: "social"
description: "Generate an interaction with a village NPC"
---

## Meeting {{npc.name}}

**Oracle Query**: {{oracle:Is this NPC helpful and forthcoming?}}

**NPC Attitude**: Based on Oracle result
**Information Available**: {{llm:What does {{npc.name}} know about the situation? Consider their role as {{npc.occupation}} and personality {{npc.keywords}}.}}

**Potential Complications**: {{llm:What complication or concern might {{npc.name}} have that affects this conversation?}}
```

#### Combat Resolution

When combat occurs, combine traditional RPG mechanics with Story Mode tools:

```markdown
## Combat: Corrupted Wolf Pack

**Setup**: While investigating the forest edge, Kaelan encounters three wolves with the same sickly green eyes as the bull.

### Round 1
**Initiative**: Kaelan goes first (rolled 15+1=16)

**Action**: Attack with longsword
**Attack Roll**: 1d20+5 = 18 (Hit!)
**Damage**: 1d8+3 = 7 damage

**Oracle Query**: Does the wolf's corruption make it unnaturally tough?
**Result**: Yes, but (Rolled: 17)
**Keywords**: resistant, pain, berserker
**Interpretation**: The corruption makes it resistant to damage but also drives it into a pain-fueled berserker rage.

**Continue with AI**: The blessed blade cuts deep into the corrupted wolf's flank, drawing black ichor instead of blood. The creature howls in pain and fury, its eyes blazing brighter with unnatural green fire as the corruption drives it into a mindless rage.
```

#### Skill Challenges

Use Oracle + traditional mechanics for complex challenges:

```markdown
## Investigation: The Henderson Farm

**Skill Challenge**: Investigating the corrupted farm (4 successes before 3 failures)

### Check 1: Investigation
**Roll**: 1d20+3 = 14 (Success)
**Discovery**: Strange symbols carved into the barn's foundation

**Oracle Query**: Are these symbols recently made?
**Result**: No, and (Rolled: 2)
**Keywords**: ancient, dormant, awakened
**Interpretation**: These are ancient symbols that were dormant for decades or centuries, but something has recently awakened their power.

### Check 2: Religion  
**Roll**: 1d20+3 = 11 (Success)
**Discovery**: Recognizing the symbols as related to an ancient cult

**Continue with AI**: The symbols match descriptions from forbidden texts Kaelan studied during his training. They belong to the Cult of the Verdant Shadow, worshippers of a dark entity that sought to corrupt the natural world. The fact that they're active again suggests someone or something has deliberately awakened them.
```

## Phase 3: Campaign Progression

### Session Planning

#### Between-Session Activities

**File: `campaign-notes/world-state.md`**
```markdown
# World State - After Session 1

## Discoveries
- Ancient cult symbols at Henderson farm (Cult of the Verdant Shadow)
- Corruption spreads in circular patterns
- Father Benedict has relevant ancient knowledge
- Forest contains the source of corruption

## Active Mysteries
- Who awakened the ancient symbols?
- What is the Cult of the Verdant Shadow's ultimate goal?
- How can the corruption be stopped?

## NPC Status
- **Mayor Aldric**: Trusts Kaelan, willing to provide resources
- **Father Benedict**: Has critical information, not yet revealed
- **Villagers**: Scared but hopeful with knight's presence

## Next Session Hooks
- Investigate the ancient temple Father Benedict mentioned
- Confront whatever is in the forest
- Research the Cult of the Verdant Shadow
```

#### Using AI for Session Preparation

**Prompt for next session opening:**
```markdown
The next morning, Father Benedict reveals ancient texts about the Cult of the Verdant Shadow. Based on previous discoveries about ancient symbols and forest corruption

**Continue with AI** to generate the priest's revelation and set up the next adventure.
```

### Campaign Mechanics

#### Experience and Progression

Track character growth through story milestones:

```markdown
## Experience Tracking

### Session 1 Milestones
- [x] Successfully gained villagers' trust
- [x] Discovered the cult connection  
- [x] Survived first corrupted creature encounter
- [ ] Learned the corruption's source
- [ ] Found a way to stop the spread

**Level Progress**: 2/4 major discoveries toward next level
```

#### Resource Management

Use Oracle to determine resource availability:

```markdown
**Oracle Query**: Can the village provide healing supplies?
**Result**: Yes, but (Rolled: 13)
**Keywords**: limited, cost, rationing
**Interpretation**: The village has healing supplies but they're rationed due to recent emergencies. Available for a cost or service.
```

### Advanced Campaign Techniques

#### Multi-Session Plot Threads

Track ongoing mysteries and revelations:

```markdown
# Campaign Plot Threads

## The Corruption Source
- **Session 1**: Ancient symbols discovered
- **Session 2**: Cult of Verdant Shadow identified  
- **Session 3**: (Planned) Temple investigation
- **Session 4**: (Planned) Final confrontation

## The Mysterious Cult Leader
- **Session 1**: Unknown awakener of symbols
- **Session 2**: Hints of noble involvement
- **Session 3**: (Planned) Identity revealed

## The Spreading Corruption
- **Session 1**: Affecting crops and animals
- **Session 2**: Growing stronger
- **Session 3**: (Planned) Reaches critical point
```

#### Oracle-Driven Campaign Events

Let the Oracle create unexpected campaign developments:

```markdown
**Major Campaign Oracle Query**: Does something unexpected complicate the investigation?
**Result**: Yes, and (Rolled: 20)
**Keywords**: betrayal, ally, revelation  
**Interpretation**: A trusted ally betrays Kaelan, and this betrayal reveals something crucial about the larger conspiracy.

This Oracle result becomes the foundation for a major plot twist in Session 3!
```

## Tips for Solo RPG Success

### Balancing Structure and Spontaneity

#### Structured Elements
- **Character stats and mechanics**: Keep traditional RPG framework
- **Session goals**: Have clear objectives for each session
- **World consistency**: Use repository to maintain continuity

#### Spontaneous Elements  
- **Oracle decisions**: Let randomness drive plot developments
- **AI continuation**: Allow unexpected narrative directions
- **Keyword inspiration**: Use random elements for creative sparks

### Managing Multiple Characters

#### Ally Management
Use repository items for companions:

```markdown
# Gareth the Tracker

**Type**: Character
**Keywords**: tracker, local, forest, suspicious, helpful

## Role
Local guide who knows the forest paths and corruption patterns.

## Current Status
- Traveling with Kaelan
- HP: 15/15
- Key skills: Survival +4, Stealth +3
```

#### NPC Automation
Use Oracle + AI for NPC actions:

```markdown
**Oracle Query**: Does Gareth spot the ambush before it happens?
**Result**: No, but (Rolled: 6)
**Keywords**: intuition, warning, partial

**Continue with AI**: Gareth doesn't see the corrupted creatures lurking in the underbrush, but his forest instincts make him pause and whisper a warning just as the attack begins.
```

### Difficulty Scaling

#### Dynamic Challenge Adjustment
Use Oracle to modify encounter difficulty:

```markdown
**Oracle Query**: Is this encounter more dangerous than expected?
**Result**: Yes, and (Rolled: 19)
**Keywords**: reinforcements, magic, escalation

**Result**: Add magical corruption effects and additional enemies mid-combat.
```

#### Character Growth Integration
Adjust challenges based on character level and capabilities:

```markdown
**Level 3 Character Considerations**:
- Access to 1st level spells
- Improved proficiency bonus
- Higher hit points
- Enhanced abilities

**Oracle-Adjusted Encounters**:
- Base difficulty for level 3
- Oracle modifications for variance
- Story-appropriate challenges
```

---

**Ready for more campaign ideas?** Check out [Creative Writing](creative-writing.md) for AI-assisted narrative techniques, or explore [Worldbuilding](worldbuilding.md) for systematic world creation that enhances your campaigns.
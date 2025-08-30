<script lang="ts">
  import { DiceRoller } from '@dice-roller/rpg-dice-roller';
  import RollIcon from '../../assets/d20.svg';
  import { content } from '../../App.svelte';
  import {input as data} from './Input.svelte';
  import type { ContentData } from '../../data/types';
  import { tooltip } from '../../lib/tooltip.svelte';

  let input = $derived(data.value);
  let hasQuestion = $derived(input !== '');
  let notation = $state('1d20');

  function roll() {
    const roller = new DiceRoller();
    roller.roll(notation);

    const output: ContentData = {
      type: 'roll',
      output: roller.output,
      input: `<strong>Roll:</strong> ${input}`,
    };

    content.add([ output ]);

    data.reset();
  }
</script>

<div class="flex">
  <input bind:value={notation} class="w-[96px] min-h-[44px] text-center"/>
  <button
    class="min-w-[48px] min-h-[44px] flex items-center justify-center p-2"
    onclick={roll}
    disabled={!hasQuestion ? true : undefined}  
    use:tooltip={'Roll Dice'}
  >
    <img src={RollIcon} alt="Roll" class="h-[32px] w-[32px]"/>
  </button>
</div>
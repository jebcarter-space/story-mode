<script lang="ts">
  import TextIcon from '../../assets/text.svg';
  import {input as data} from './Input.svelte';
  import { tooltip } from '../../lib/tooltip.svelte';
  import { addInput } from './functions';

  let input = $derived(data.value);
  let hasQuestion = $derived(input !== '');

</script>

<button
  onclick={addInput}
  disabled={!hasQuestion ? true : undefined}
  class="w-[48px] flex items-center justify-center"
  use:tooltip={'Add Text'}
>
  <img src={TextIcon} alt="Add Text"  class="h-[24px]"/>
</button>
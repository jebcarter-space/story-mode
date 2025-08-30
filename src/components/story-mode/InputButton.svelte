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
  class="min-w-[48px] min-h-[44px] flex items-center justify-center p-2"
  use:tooltip={'Add Text'}
>
  <img src={TextIcon} alt="Add Text"  class="h-[32px] w-[32px]"/>
</button>
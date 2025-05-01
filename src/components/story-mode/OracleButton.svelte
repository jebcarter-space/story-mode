<script lang="ts">
  import OracleIcon from '../../assets/oracle.svg';
  import { input as data} from './Input.svelte';
  import { tooltip } from '../../lib/tooltip.svelte';
  import { getAnswer } from './functions';

  let input = $derived(data.value);
  let hasQuestion = $derived(input !== '');
</script>

<button
  class="w-[48px] flex items-center justify-center"
  onclick={getAnswer}
  disabled={!hasQuestion ? true : undefined}
  use:tooltip={'Ask the Oracle'}
>
  <img src={OracleIcon} alt="Yes/No" class="h-[24px]"/>
</button>
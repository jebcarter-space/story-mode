<script lang="ts">
  import OracleIcon from '../../assets/oracle.svg';
  import { input as data} from './Input.svelte';
  import { tooltip } from '../../lib/tooltip.svelte';
  import { getAnswer } from './functions';

  let input = $derived(data.value);
  let hasQuestion = $derived(input !== '');
</script>

<button
  class="min-w-[48px] min-h-[44px] flex items-center justify-center p-2"
  onclick={getAnswer}
  disabled={!hasQuestion ? true : undefined}
  use:tooltip={'Ask the Oracle'}
>
  <img src={OracleIcon} alt="Yes/No" class="h-[32px] w-[32px]"/>
</button>
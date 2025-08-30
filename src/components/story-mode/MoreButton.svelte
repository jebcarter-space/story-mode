<script lang="ts">
  import MoreIcon from '../../assets/more.svg';
  import { navigate } from 'svelte-routing';
  import { tooltip } from '../../lib/tooltip.svelte';

  function openMore() {
    navigate('/more');
  }
</script>

<div class="relative">
  <button
    onclick={openMore}
    class="min-w-[48px] min-h-[44px] flex items-center justify-center p-2"
    use:tooltip={'More Options'}
  >
    <img src={MoreIcon} alt="More Options"  class="h-[32px] w-[32px]"/>
  </button>
</div>
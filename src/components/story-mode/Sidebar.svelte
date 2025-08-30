<script lang="ts">
	import Divider from './../ui/Divider.svelte';
	import CopyButton from './CopyButton.svelte';
  import DiceButton from '../story-mode/DiceButton.svelte';
  import InputButton from '../story-mode/InputButton.svelte';
  import KeywordsButton from '../story-mode/KeywordsButton.svelte';
  import OracleButton from '../story-mode/OracleButton.svelte';
  import TaskButton from '../story-mode/TaskButton.svelte';
  import TemplateButton from '../story-mode/TemplateButton.svelte';
  import NewSceneButton from './NewSceneButton.svelte';
  import ClearButton from './ClearButton.svelte';
  import MoreButton from './MoreButton.svelte';
  import { createAppConfig } from '../../data/models/app-config.svelte';

  const appConfig = createAppConfig();
</script>

<div class="flex gap-2 mt-2">
  <OracleButton />
  <TaskButton/>
  {#if appConfig.features.templates}
    <TemplateButton/>
  {/if}
</div>
<div class="flex gap-2">
  <DiceButton  />
  <Divider />
  <InputButton  />
  <KeywordsButton />
  <MoreButton />
</div>

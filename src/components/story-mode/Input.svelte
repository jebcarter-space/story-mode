<script lang="ts" module>
  import { content } from "../../App.svelte";
  import { createInput } from "../../data/models/input.svelte";
  import type { ContentData } from "../../data/types";
  import { addInput, getAnswer } from "./functions";

  export let input = createInput();
</script>

<script lang="ts">
  let question = $state('');
  let cleared = $derived(input.cleared);

  $effect(() => {
    if(cleared) {
      question = '';
      input.emptied();
    }
  })

  function changeInput() {
    input.update(question);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if(event.key === 'Enter') {
      if(event.shiftKey) {
        // do nothing allow enter to pass through
      }
      else if (event.ctrlKey || event.metaKey) {
        getAnswer();
        event.preventDefault();
      }
      else {
        addInput();
        event.preventDefault();
      }
    }
  }
</script>

<textarea
  id="question"
  bind:value={question}
  oninput={changeInput}
  onkeydown={handleKeyDown}
  class="w-full px-3 py-2 h-[60px]"
  placeholder="Question, task or text"
></textarea>
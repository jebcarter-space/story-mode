<script lang="ts">
  import { ConditionalEvaluator } from '../../lib/conditional-evaluator';
  
  interface Props {
    condition?: string;
    onConditionChange: (condition: string) => void;
    onValidate?: (isValid: boolean, error?: string) => void;
  }

  let { condition = '', onConditionChange, onValidate }: Props = $props();

  // UI State
  let operatorMode: 'simple' | 'advanced' = $state('simple');
  let testMode = $state(false);
  let testResult = $state<{ result: boolean; error?: string } | null>(null);

  // Simple mode state
  let simpleConditions = $state<Array<{
    variable: string;
    operator: string;
    value: string;
    logicalOperator?: 'AND' | 'OR';
  }>>([
    { variable: 'character_level', operator: '>=', value: '5' }
  ]);

  // Available variables and operators
  const availableVariables = ConditionalEvaluator.getAvailableVariables();
  const exampleConditions = ConditionalEvaluator.getExampleConditions();
  
  const operators = [
    { value: '==', label: 'equals' },
    { value: '!=', label: 'not equals' },
    { value: '>', label: 'greater than' },
    { value: '>=', label: 'greater than or equal' },
    { value: '<', label: 'less than' },
    { value: '<=', label: 'less than or equal' },
    { value: 'includes', label: 'contains' },
    { value: 'startsWith', label: 'starts with' },
    { value: 'endsWith', label: 'ends with' },
  ];

  // Reactive condition building
  $effect(() => {
    if (operatorMode === 'simple') {
      const conditionParts = simpleConditions.map((cond, index) => {
        let conditionStr = '';
        
        if (cond.operator === 'includes') {
          conditionStr = `${cond.variable}.includes("${cond.value}")`;
        } else if (cond.operator === 'startsWith') {
          conditionStr = `${cond.variable}.startsWith("${cond.value}")`;
        } else if (cond.operator === 'endsWith') {
          conditionStr = `${cond.variable}.endsWith("${cond.value}")`;
        } else if (cond.operator === '==' && isNaN(Number(cond.value))) {
          conditionStr = `${cond.variable} ${cond.operator} "${cond.value}"`;
        } else {
          conditionStr = `${cond.variable} ${cond.operator} ${cond.value}`;
        }

        if (index > 0 && simpleConditions[index - 1].logicalOperator) {
          conditionStr = ` ${simpleConditions[index - 1].logicalOperator} ${conditionStr}`;
        }
        
        return conditionStr;
      });
      
      const newCondition = conditionParts.join('');
      if (newCondition !== condition) {
        condition = newCondition;
        onConditionChange(condition);
      }
    }
  });

  // Validation
  $effect(() => {
    if (condition) {
      const validation = ConditionalEvaluator.validate(condition);
      onValidate?.(validation.isValid, validation.error);
    }
  });

  function addSimpleCondition() {
    simpleConditions.push({
      variable: 'character_level',
      operator: '>=',
      value: '1',
      logicalOperator: simpleConditions.length > 0 ? 'AND' : undefined
    });
    // Update logical operator for previous condition
    if (simpleConditions.length > 1) {
      simpleConditions[simpleConditions.length - 2].logicalOperator = 'AND';
    }
  }

  function removeSimpleCondition(index: number) {
    simpleConditions.splice(index, 1);
    // Update logical operators
    if (index === 0 && simpleConditions.length > 0) {
      simpleConditions[0].logicalOperator = undefined;
    }
  }

  function loadExample(exampleCondition: string) {
    condition = exampleCondition;
    operatorMode = 'advanced';
    onConditionChange(condition);
  }

  function testCondition() {
    const dummyContext = {
      variables: {
        character_level: 7,
        party_size: 4,
        current_season: 'winter',
        story_progress: 60,
        character_class: 'wizard',
        location_type: 'dungeon',
      },
      previousResults: [],
      depth: 0,
      storyId: 'test',
      rollId: 'test',
    };

    testResult = ConditionalEvaluator.evaluate(condition, dummyContext);
    testMode = true;
  }

  function resetTest() {
    testMode = false;
    testResult = null;
  }
</script>

<div class="conditional-builder space-y-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold">Condition Builder</h3>
    <div class="flex items-center space-x-2">
      <button
        onclick={() => operatorMode = 'simple'}
        class="px-3 py-1 text-sm rounded {operatorMode === 'simple' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}"
      >
        Simple
      </button>
      <button
        onclick={() => operatorMode = 'advanced'}
        class="px-3 py-1 text-sm rounded {operatorMode === 'advanced' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}"
      >
        Advanced
      </button>
    </div>
  </div>

  {#if operatorMode === 'simple'}
    <!-- Simple Mode -->
    <div class="space-y-3">
      {#each simpleConditions as cond, index}
        <div class="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded">
          {#if index > 0}
            <select 
              bind:value={cond.logicalOperator}
              class="px-2 py-1 text-sm border rounded"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          {/if}

          <select 
            bind:value={cond.variable}
            class="flex-1 px-2 py-1 border rounded"
          >
            {#each Object.keys(availableVariables) as variable}
              <option value={variable}>{variable}</option>
            {/each}
          </select>

          <select 
            bind:value={cond.operator}
            class="px-2 py-1 border rounded"
          >
            {#each operators as op}
              <option value={op.value}>{op.label}</option>
            {/each}
          </select>

          <input
            bind:value={cond.value}
            class="flex-1 px-2 py-1 border rounded"
            placeholder="Value"
          />

          <button
            onclick={() => removeSimpleCondition(index)}
            class="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            disabled={simpleConditions.length === 1}
          >
            ×
          </button>
        </div>
      {/each}

      <button
        onclick={addSimpleCondition}
        class="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Add Condition
      </button>
    </div>
  {:else}
    <!-- Advanced Mode -->
    <div class="space-y-3">
      <textarea
        bind:value={condition}
        oninput={() => onConditionChange(condition)}
        class="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded font-mono text-sm"
        placeholder="Enter JavaScript expression..."
      ></textarea>

      <!-- Example Conditions -->
      <div class="space-y-2">
        <h4 class="font-medium">Example Conditions:</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          {#each Object.entries(exampleConditions) as [name, example]}
            <button
              onclick={() => loadExample(example)}
              class="text-left p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <div class="font-medium text-sm">{name}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 font-mono">{example}</div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Current Condition Display -->
  {#if condition}
    <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded">
      <div class="text-sm font-medium mb-1">Current Condition:</div>
      <code class="text-sm">{condition}</code>
    </div>
  {/if}

  <!-- Test Section -->
  <div class="border-t pt-4 space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="font-medium">Test Condition</h4>
      <div class="space-x-2">
        <button
          onclick={testCondition}
          class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          disabled={!condition}
        >
          Test
        </button>
        {#if testMode}
          <button
            onclick={resetTest}
            class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Reset
          </button>
        {/if}
      </div>
    </div>

    {#if testMode && testResult}
      <div class="p-3 rounded {testResult.result ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}">
        <div class="font-medium">
          Result: <span class="{testResult.result ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}">
            {testResult.result ? 'TRUE' : 'FALSE'}
          </span>
        </div>
        {#if testResult.error}
          <div class="text-sm text-red-600 dark:text-red-400 mt-1">
            Error: {testResult.error}
          </div>
        {/if}
        <div class="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Test context: character_level=7, party_size=4, current_season="winter", story_progress=60, character_class="wizard", location_type="dungeon"
        </div>
      </div>
    {/if}
  </div>

  <!-- Available Variables Reference -->
  <details class="border-t pt-4">
    <summary class="cursor-pointer font-medium">Available Variables</summary>
    <div class="mt-2 space-y-1">
      {#each Object.entries(availableVariables) as [variable, description]}
        <div class="flex justify-between text-sm">
          <code class="font-mono">{variable}</code>
          <span class="text-gray-600 dark:text-gray-400">{description}</span>
        </div>
      {/each}
    </div>
  </details>
</div>

<style>
  details > summary {
    list-style: none;
  }
  
  details > summary::-webkit-details-marker {
    display: none;
  }
  
  details > summary::before {
    content: '▶';
    margin-right: 0.5rem;
  }
  
  details[open] > summary::before {
    content: '▼';
  }
</style>
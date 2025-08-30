<script lang="ts">
  import { createTheme, themeDefinitions } from '../../../data/models/theme.svelte';
  import type { ThemeName } from '../../../data/types';
  
  const theme = createTheme();
  
  // Theme preview state
  let previewTheme: ThemeName | null = $state(null);
  
  function selectTheme(themeName: ThemeName) {
    theme.set(themeName);
    previewTheme = null;
  }
  
  function previewThemeHandler(themeName: ThemeName) {
    previewTheme = themeName;
  }
  
  function clearPreview() {
    previewTheme = null;
  }
  
  // Apply preview temporarily
  $effect(() => {
    if (previewTheme) {
      const originalTheme = theme.value;
      const root = document.documentElement;
      const colors = themeDefinitions[previewTheme].colors;
      
      // Temporarily apply preview colors
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value);
      });
      
      return () => {
        // Reset to original theme
        const originalColors = themeDefinitions[originalTheme].colors;
        Object.entries(originalColors).forEach(([key, value]) => {
          root.style.setProperty(`--theme-${key}`, value);
        });
      };
    }
  });
</script>

<h4>Theme Selection</h4>
<p class="mb-6 text-sm opacity-75">
  Choose your preferred visual theme. Changes apply instantly and persist across sessions.
</p>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {#each theme.availableThemes as themeName}
    {@const themeInfo = theme.getThemeDefinition(themeName)}
    <div
      class="theme-card p-4 border-2 rounded-lg cursor-pointer transition-all duration-200"
      class:selected={theme.value === themeName}
      class:previewing={previewTheme === themeName}
      onclick={() => selectTheme(themeName)}
      onmouseenter={() => previewThemeHandler(themeName)}
      onmouseleave={clearPreview}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectTheme(themeName);
        }
      }}
    >
      <!-- Theme Preview Box -->
      <div class="theme-preview mb-3 h-16 rounded border overflow-hidden">
        <div 
          class="h-full grid grid-cols-4 gap-0"
          style="background-color: {themeInfo.colors.background};"
        >
          <div style="background-color: {themeInfo.colors.foreground};" class="opacity-90"></div>
          <div style="background-color: {themeInfo.colors.accent};" class="opacity-80"></div>
          <div style="background-color: {themeInfo.colors.button};" class="opacity-70"></div>
          <div style="background-color: {themeInfo.colors.muted};" class="opacity-60"></div>
        </div>
      </div>
      
      <!-- Theme Info -->
      <div>
        <h5 class="font-semibold text-lg mb-1">
          {themeInfo.name}
          {#if theme.value === themeName}
            <span class="text-xs bg-blue-500 text-white px-2 py-1 rounded ml-2">Current</span>
          {/if}
        </h5>
        <p class="text-xs opacity-75 leading-relaxed">
          {themeInfo.description}
        </p>
      </div>
      
      <!-- Color Palette -->
      <div class="flex gap-1 mt-3">
        <div 
          class="w-4 h-4 rounded-full border" 
          style="background-color: {themeInfo.colors.background};"
          title="Background"
        ></div>
        <div 
          class="w-4 h-4 rounded-full border" 
          style="background-color: {themeInfo.colors.foreground};"
          title="Foreground"
        ></div>
        <div 
          class="w-4 h-4 rounded-full border" 
          style="background-color: {themeInfo.colors.accent};"
          title="Accent"
        ></div>
        {#if themeInfo.colors.primary}
          <div 
            class="w-4 h-4 rounded-full border" 
            style="background-color: {themeInfo.colors.primary};"
            title="Primary"
          ></div>
        {/if}
        {#if themeInfo.colors.secondary}
          <div 
            class="w-4 h-4 rounded-full border" 
            style="background-color: {themeInfo.colors.secondary};"
            title="Secondary"
          ></div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<div class="mt-6 p-4 theme-bg-muted rounded-lg">
  <h5 class="font-semibold mb-2">Current Theme: {theme.getThemeDefinition(theme.value).name}</h5>
  <p class="text-sm opacity-75 mb-3">
    {theme.getThemeDefinition(theme.value).description}
  </p>
  
  <div class="text-xs opacity-60">
    <strong>Theme persisted in localStorage:</strong> '{theme.value}'
  </div>
</div>

<style>
  .theme-card {
    border-color: var(--theme-border);
    background-color: var(--theme-background);
    transition: all 0.2s ease;
  }
  
  .theme-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .theme-card.selected {
    border-color: var(--theme-accent);
    box-shadow: 0 0 0 1px var(--theme-accent);
  }
  
  .theme-card.previewing {
    border-color: var(--theme-focus);
    transform: translateY(-1px);
  }
  
  .theme-preview {
    border: 1px solid var(--theme-border);
  }
</style>
<script lang="ts">
  import Help from "../../ui/Help.svelte";
  
  let showHelp = $state(false);
  let helpSearchTerm = $state('');
  
  function openHelp() {
    showHelp = true;
  }
</script>

<div class="help-settings">
  <h4 class="text-xl font-semibold mb-4">Documentation & Help</h4>
  
  <div class="help-options">
    <div class="help-option">
      <h5 class="font-medium mb-2">Interactive Help</h5>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Access built-in help and documentation directly within the application.
      </p>
      <button 
        onclick={openHelp}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Open Help System
      </button>
    </div>
    
    <div class="help-option">
      <h5 class="font-medium mb-2">External Resources</h5>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Comprehensive documentation and community resources.
      </p>
      <div class="external-links">
        <a 
          href="https://github.com/jebcarter-space/story-mode/tree/main/docs" 
          target="_blank"
          class="link-button"
        >
          📚 Full Documentation
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode/blob/main/docs/getting-started/first-story.md" 
          target="_blank"
          class="link-button"
        >
          🚀 Getting Started Guide
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode/blob/main/docs/troubleshooting/common-issues.md" 
          target="_blank"
          class="link-button"
        >
          🔧 Troubleshooting
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode/discussions" 
          target="_blank"
          class="link-button"
        >
          💬 Community Discussions
        </a>
      </div>
    </div>
    
    <div class="help-option">
      <h5 class="font-medium mb-2">VSCode Extension</h5>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Documentation specific to the VSCode extension.
      </p>
      <div class="external-links">
        <a 
          href="https://marketplace.visualstudio.com/items?itemName=story-mode" 
          target="_blank"
          class="link-button"
        >
          🔧 VSCode Marketplace
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode/blob/main/vscode-extension/README.md" 
          target="_blank"
          class="link-button"
        >
          📖 Extension Documentation
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode/blob/main/vscode-extension/QUICK_START.md" 
          target="_blank"
          class="link-button"
        >
          ⚡ Quick Start Guide
        </a>
      </div>
    </div>
    
    <div class="help-option">
      <h5 class="font-medium mb-2">Support & Feedback</h5>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Get help with issues or share feedback with the development team.
      </p>
      <div class="external-links">
        <a 
          href="https://github.com/jebcarter-space/story-mode/issues" 
          target="_blank"
          class="link-button"
        >
          🐛 Report Issues
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode/issues/new?assignees=&labels=enhancement&template=feature_request.md" 
          target="_blank"
          class="link-button"
        >
          💡 Request Features
        </a>
        <a 
          href="https://github.com/jebcarter-space/story-mode" 
          target="_blank"
          class="link-button"
        >
          ⭐ GitHub Repository
        </a>
      </div>
    </div>
  </div>
</div>

<!-- Help Component -->
<Help bind:isOpen={showHelp} bind:searchTerm={helpSearchTerm} />

<style>
  .help-settings {
    padding: 1rem;
  }
  
  .help-options {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }
  
  .help-option {
    padding: 1.5rem;
    border: 1px solid var(--theme-border, #e5e7eb);
    border-radius: 0.5rem;
    background: var(--theme-bg-muted, #f9fafb);
  }
  
  .external-links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .link-button {
    display: inline-block;
    padding: 0.5rem 1rem;
    border: 1px solid var(--theme-border, #d1d5db);
    border-radius: 0.375rem;
    background: var(--theme-bg-main, white);
    color: var(--theme-text-main, #374151);
    text-decoration: none;
    transition: all 0.2s ease;
    text-align: center;
    font-size: 0.875rem;
  }
  
  .link-button:hover {
    background: var(--theme-bg-hover, #f3f4f6);
    border-color: var(--theme-primary, #3b82f6);
  }
  
  .link-button:focus {
    outline: none;
    ring: 2px;
    ring-color: var(--theme-primary, #3b82f6);
    ring-opacity: 0.5;
  }
</style>
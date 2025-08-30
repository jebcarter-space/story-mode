<script lang="ts">
  import { link, Link } from "svelte-routing";
  import Logo from "../../assets/logo.svg";
  import GithubIcon from "../../assets/github.svg";
  import InfoIcon from "../../assets/info.svg";
  import GearIcon from "../../assets/gear.svg";
  import SunIcon from "../../assets/sun.svg";
  import MoonIcon from "../../assets/moon.svg";
  import BookIcon from "../../assets/open-book.svg";
  import { content } from "../../App.svelte";
  import { tooltip } from "../../lib/tooltip.svelte";
  import { createLibrary } from "../../data/models/library.svelte";

  // Accept theme as prop
  let { theme } = $props();

  const library = createLibrary();

  function toggleTheme() {
    theme.toggle();
  }

  let game = $state('Start a Game');
  let keys = $derived(Object.keys(content.value));
  let contentLength = $derived(keys.length);
  
  // Check for library content
  let hasLibraryContent = $derived(
    library.isLoaded && library.value && 
    Object.values(library.value.shelves).some(shelf => 
      Object.keys(shelf.books).length > 0
    )
  );

  $effect(() => {
    if (contentLength > 0 || hasLibraryContent) {
      game = 'Continue Game';
    }
  })
  
  function getGamePath(): string {
    if (hasLibraryContent) {
      return library.getContinueBookPath();
    }
    return '/story';
  }
</script>

<div id="home">
  <div class="flex items-center gap-2 justify-center my-30">
    <img src={Logo} alt="Story Mode" class="h-15" />
    <h2 class="text-3xl font-bold">Story Mode</h2>
  </div>
  <div class="my-10">
    <div class="flex flex-col gap-3">
      <Link to={getGamePath()} class="flex gap-2 items-center justify-center">
        <img src={BookIcon} alt="Story" class="h-6 w-6"/>
        <span>{game}</span>
      </Link>
      
      <Link to="/library" class="flex gap-2 items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a1 1 0 100 2h14a1 1 0 100-2V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clip-rule="evenodd" />
        </svg>
        <span>Library</span>
      </Link>
    </div>
  </div>
  <div class="flex gap-2 items-center justify-center">
    <a href="/settings" use:link use:tooltip={`Settings`}>
      <img src={GearIcon} alt="Settings" class="h-6 w-6"/>
    </a>
    <button onclick={toggleTheme} class="transparent" use:tooltip={`Theme`}>
      <img src={!theme.isDark ? SunIcon : MoonIcon} alt="Theme" class="h-6 w-6"/>
    </button>
    <a href="/about" use:link use:tooltip={`About`}>
      <img src={InfoIcon} alt="About" class="h-6 w-6"/>
    </a>
    <a href="https://github.com/matalina/story-mode" use:tooltip={`Github`}>
      <img src={GithubIcon} alt="Github" class="h-6 w-6"/>
    </a>
  </div>
  <div>

  </div>
</div>
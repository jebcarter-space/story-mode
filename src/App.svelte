<script lang="ts" module>
  import { createContent } from './data/models/content.svelte';

  export let content = createContent();
</script>

<script>
  import { Route, Router } from 'svelte-routing';
  import ChangeLog from './components/pages/ChangeLog.svelte';
  import Story from './components/pages/Story.svelte';
  import About from './components/pages/About.svelte';
  import More from './components/pages/More.svelte';
  import Settings from './components/pages/Settings.svelte';
  import Home from './components/pages/Home.svelte';
  import Library from './components/pages/Library.svelte';
  import Shelf from './components/pages/Shelf.svelte';
  import Book from './components/pages/Book.svelte';
  import { createTheme } from './data/models/theme.svelte';

  // Initialize theme system
  let theme = createTheme();

  let url = $state('');
  let dark = $derived(theme.isDark);
</script>

<div id="app" class="mx-auto lg:w-5/6" class:dark={dark}>
  <Router {url}>
    <div class="layout p-3 border h-full">
      <section class="">
        <Route path="/"><Home {theme} /></Route>
        <Route path="/story"><Story /></Route>
        <Route path="/library" component={Library}></Route>
        <Route path="/library/:shelfId" let:params>
          <Shelf shelfId={params.shelfId} />
        </Route>
        <Route path="/library/:shelfId/:bookId" let:params>
          <Book shelfId={params.shelfId} bookId={params.bookId} />
        </Route>
        <Route path="/library/:shelfId/:bookId/:chapterId" let:params>
          <Book shelfId={params.shelfId} bookId={params.bookId} chapterId={params.chapterId} />
        </Route>
        <Route path="/change-log"><ChangeLog /></Route>
        <Route path="/about"><About /></Route>
        <Route path="/more"><More /></Route>
        <Route path="/settings"><Settings/></Route> 
      </section>
    </div>
  </Router>
</div>

<style lang="postcss">
 .layout {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 65px auto;
  }
</style>

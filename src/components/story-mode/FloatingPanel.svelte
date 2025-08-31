<script lang="ts">
  interface Props {
    title?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    minSize?: { width: number; height: number };
    maxSize?: { width: number; height: number };
    resizable?: boolean;
    draggable?: boolean;
    children?: any;
  }

  let {
    title = '',
    position = $bindable({ x: 20, y: 20 }),
    size = $bindable({ width: 300, height: 400 }),
    minSize = { width: 200, height: 300 },
    maxSize = { width: 800, height: 600 },
    resizable = true,
    draggable = true,
    children
  }: Props = $props();

  let panel: HTMLElement;
  let isDragging = $state(false);
  let isResizing = $state(false);
  let dragStart = $state({ x: 0, y: 0 });
  let resizeStart = $state({ x: 0, y: 0, width: 0, height: 0 });
  let windowWidth = $state(0);
  let windowHeight = $state(0);
  let isMobile = $derived(windowWidth <= 480);
  let isTablet = $derived(windowWidth > 480 && windowWidth <= 768);

  // Update window dimensions
  function updateWindowSize() {
    if (typeof window !== 'undefined') {
      windowWidth = window.innerWidth;
      windowHeight = window.innerHeight;
    }
  }

  // Responsive positioning and sizing
  function adjustForMobile() {
    if (isMobile) {
      // On mobile, make the panel full width and adjust positioning
      position.x = 10;
      position.y = Math.max(10, position.y);
      size.width = Math.min(windowWidth - 20, size.width);
      size.height = Math.min(windowHeight - 100, size.height);
    } else if (isTablet) {
      // On tablet, ensure panel doesn't exceed screen bounds
      position.x = Math.max(10, Math.min(position.x, windowWidth - size.width - 10));
      position.y = Math.max(10, Math.min(position.y, windowHeight - size.height - 10));
    }
  }

  // Initialize and handle window resize
  $effect(() => {
    updateWindowSize();
    adjustForMobile();

    const handleResize = () => {
      updateWindowSize();
      adjustForMobile();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  });

  function handleMouseDown(event: MouseEvent) {
    if (!draggable) return;
    
    const target = event.target as HTMLElement;
    if (target.closest('.resize-handle')) return; // Don't start drag when clicking resize handle
    
    isDragging = true;
    dragStart = {
      x: event.clientX - position.x,
      y: event.clientY - position.y
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    event.preventDefault();
  }

  function handleResizeStart(event: MouseEvent) {
    if (!resizable) return;
    
    isResizing = true;
    resizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: size.width,
      height: size.height
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    event.stopPropagation();
    event.preventDefault();
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      position.x = Math.max(0, event.clientX - dragStart.x);
      position.y = Math.max(0, event.clientY - dragStart.y);
      
      // Constrain to window bounds with responsive margins
      const margin = isMobile ? 10 : 0;
      const maxX = windowWidth - size.width - margin;
      const maxY = windowHeight - size.height - margin;
      position.x = Math.min(position.x, Math.max(margin, maxX));
      position.y = Math.min(position.y, Math.max(margin, maxY));
    }
    
    if (isResizing && !isMobile) {
      const deltaX = event.clientX - resizeStart.x;
      const deltaY = event.clientY - resizeStart.y;
      
      // Responsive min/max sizes
      const responsiveMinWidth = isMobile ? windowWidth - 20 : minSize.width;
      const responsiveMaxWidth = isMobile ? windowWidth - 20 : Math.min(maxSize.width, windowWidth - position.x - 20);
      
      size.width = Math.max(
        responsiveMinWidth,
        Math.min(responsiveMaxWidth, resizeStart.width + deltaX)
      );
      size.height = Math.max(
        minSize.height,
        Math.min(Math.min(maxSize.height, windowHeight - position.y - 20), resizeStart.height + deltaY)
      );
    }
  }

  function handleMouseUp() {
    isDragging = false;
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
</script>

<div
  bind:this={panel}
  class="floating-panel fixed theme-bg-main rounded-lg shadow-lg z-50"
  class:mobile={isMobile}
  class:tablet={isTablet}
  class:dragging={isDragging}
  class:resizing={isResizing}
  style="border: 1px solid var(--theme-border); left: {position.x}px; top: {position.y}px; width: {size.width}px; height: {size.height}px;"
>
  <!-- Header -->
  {#if title || draggable}
    <div
      class="panel-header flex items-center justify-between p-3 theme-bg-muted rounded-t-lg"
      style="border-bottom: 1px solid var(--theme-border);"
      class:cursor-move={draggable}
      class:cursor-grab={draggable && !isDragging}
      class:cursor-grabbing={draggable && isDragging}
      onmousedown={handleMouseDown}
      role="banner"
      tabindex={draggable ? 0 : -1}
      aria-label={title ? `${title} panel` : 'Panel'}
    >
      {#if title}
        <h3 class="panel-title font-medium theme-text-main select-none">{title}</h3>
      {:else}
        <div class="flex-1"></div>
      {/if}
      
      <!-- Drag handle indicator -->
      {#if draggable && !isMobile}
        <div class="drag-handle theme-text-muted select-none" aria-hidden="true">
          ⋮⋮⋮
        </div>
      {/if}
    </div>
  {/if}
  
  <!-- Content -->
  <div class="flex-1 overflow-hidden" style="height: {title || draggable ? `${size.height - 48}px` : `${size.height}px`};">
    {@render children?.()}
  </div>
  
  <!-- Resize handle -->
  {#if resizable && !isMobile}
    <div
      class="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:opacity-80"
      style="background-color: var(--theme-button);"
      onmousedown={handleResizeStart}
      role="button"
      tabindex="0"
      aria-label="Resize panel"
    >
      <div class="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2" style="border-color: var(--theme-border);"></div>
    </div>
  {/if}
</div>

<style>
  .floating-panel {
    user-select: none;
    transition: transform 0.2s ease;
  }
  
  .floating-panel.dragging {
    transition: none;
  }
  
  .floating-panel.resizing {
    transition: none;
  }
  
  .panel-header {
    min-height: 44px;
  }
  
  .panel-title {
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  .drag-handle {
    font-size: 0.75rem;
    line-height: 1;
    opacity: 0.7;
  }
  
  .resize-handle {
    border-bottom-right-radius: 0.5rem;
    transition: opacity 0.2s ease;
  }
  
  /* Mobile responsive styles */
  .floating-panel.mobile {
    border-radius: 0.5rem 0.5rem 0 0;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  
  .floating-panel.mobile .panel-header {
    min-height: 48px;
    padding: 1rem;
  }
  
  .floating-panel.mobile .panel-title {
    font-size: 1rem;
  }
  
  /* Tablet responsive styles */
  .floating-panel.tablet {
    border-radius: 0.5rem;
  }
  
  .floating-panel.tablet .panel-header {
    min-height: 44px;
    padding: 0.875rem;
  }
  
  .floating-panel.tablet .panel-title {
    font-size: 0.95rem;
  }
  
  /* Touch-friendly interactions */
  @media (hover: none) and (pointer: coarse) {
    .panel-header {
      min-height: 48px;
      padding: 1rem;
    }
    
    .panel-title {
      font-size: 1rem;
    }
    
    .resize-handle {
      width: 20px;
      height: 20px;
    }
  }
  
  /* High DPI displays */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .panel-title {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  }
  
  /* Accessibility: Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    .floating-panel {
      transition: none;
    }
    
    .resize-handle {
      transition: none;
    }
  }
</style>
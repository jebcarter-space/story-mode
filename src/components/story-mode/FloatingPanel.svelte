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
      
      // Constrain to window bounds
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;
      position.x = Math.min(position.x, Math.max(0, maxX));
      position.y = Math.min(position.y, Math.max(0, maxY));
    }
    
    if (isResizing) {
      const deltaX = event.clientX - resizeStart.x;
      const deltaY = event.clientY - resizeStart.y;
      
      size.width = Math.max(
        minSize.width,
        Math.min(maxSize.width, resizeStart.width + deltaX)
      );
      size.height = Math.max(
        minSize.height,
        Math.min(maxSize.height, resizeStart.height + deltaY)
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
  class="floating-panel fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50"
  class:dragging={isDragging}
  class:resizing={isResizing}
  style="left: {position.x}px; top: {position.y}px; width: {size.width}px; height: {size.height}px;"
>
  <!-- Header -->
  {#if title || draggable}
    <div
      class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 rounded-t-lg cursor-move"
      class:cursor-grab={draggable && !isDragging}
      class:cursor-grabbing={draggable && isDragging}
      onmousedown={handleMouseDown}
    >
      {#if title}
        <h3 class="font-medium text-sm text-gray-900 dark:text-white select-none">{title}</h3>
      {:else}
        <div class="flex-1"></div>
      {/if}
      
      <!-- Drag handle indicator -->
      {#if draggable}
        <div class="text-gray-400 text-xs select-none">
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
  {#if resizable}
    <div
      class="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
      onmousedown={handleResizeStart}
    >
      <div class="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-400 dark:border-gray-300"></div>
    </div>
  {/if}
</div>

<style>
  .floating-panel {
    user-select: none;
  }
  
  .floating-panel.dragging {
    transition: none;
  }
  
  .floating-panel.resizing {
    transition: none;
  }
  
  .resize-handle {
    border-bottom-right-radius: 0.5rem;
  }
</style>
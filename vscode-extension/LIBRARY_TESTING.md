# VSCode Extension Library Management Test

This document outlines the manual testing of the newly implemented library management system.

## Test Scenarios

### 1. Basic Tree View
- [x] Extension loads without errors
- [x] Story Mode tree view appears in Explorer panel
- [x] Shows "Stories" root node
- [x] Shows proper library hierarchy (shelves → books → chapters)

### 2. Shelf Management
- [ ] Create Shelf command works from command palette
- [ ] Create Shelf context menu works from Stories node
- [ ] Edit Shelf command works (from context menu and command palette)
- [ ] Delete Shelf command works with proper confirmation
- [ ] Shelf shows correct book count in tree view

### 3. Book Management  
- [ ] Create Book command works from shelf context menu
- [ ] Create Book works from command palette (with shelf selector)
- [ ] Edit Book command works
- [ ] Delete Book command works with proper confirmation
- [ ] Book shows correct chapter count in tree view

### 4. Chapter Management
- [ ] Create Chapter command works from book context menu
- [ ] Create Chapter works from command palette (with book selector) 
- [ ] Edit Chapter command works (rename functionality)
- [ ] Delete Chapter command works with proper confirmation
- [ ] Double-click or context menu opens chapter file
- [ ] Chapter files are created in proper directory structure

### 5. File System Integration
- [ ] Physical directories created under .story-mode/shelves/
- [ ] Shelf metadata files (.shelf.json) created correctly
- [ ] Book metadata files (.book.json) created correctly  
- [ ] Chapter markdown files (.md) created with proper content
- [ ] library.json updated with all changes

### 6. Error Handling
- [ ] Proper error messages for invalid operations
- [ ] Graceful handling of missing files/directories
- [ ] Confirmation dialogs for destructive operations
- [ ] Progress feedback for long operations

## Expected Directory Structure

```
.story-mode/
├── library.json
├── shelves/
│   └── shelf-id-123456/
│       ├── .shelf.json
│       └── book-id-123456/
│           ├── .book.json
│           └── chapter-id-123456.md
```

## Usage Instructions

1. Open VSCode in a workspace with a `.story-mode` directory
2. Use Command Palette (Ctrl+Shift+P) to access "Story Mode: Create Shelf"
3. Use tree view context menus for hierarchical operations
4. Verify files are created in file system as expected
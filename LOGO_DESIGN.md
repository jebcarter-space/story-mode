# Story-Mode Logo Design

## Overview

The new Story-Mode logo incorporates three core elements that represent the application's functionality:

1. **D20 Icosahedron Die** - Represents gaming and random generation elements
2. **Book** - Represents storytelling and narrative creation
3. **Pen Nib** - Represents writing and creative authorship

## Design Philosophy

The logo combines these three elements in a harmonious circular composition with connecting lines to show their interconnected nature. The central "SM" monogram ties the elements together and provides brand recognition.

## Files Created

### Primary Logo Files
- `src/assets/story-mode-logo.svg` - Main colorful logo (240x240px)
- `src/assets/story-mode-logo-small.svg` - Simplified version for small sizes (64x64px)
- `src/assets/story-mode-logo-mono.svg` - Theme-aware monochrome version

### Integrated Files
- `src/assets/logo.svg` - Replaced with main logo design
- `public/logo.svg` - Replaced with small version for PWA assets

## Design Details

### Color Scheme
- **D20 Die**: Blue gradient (#4f46e5 to #6366f1)
- **Book**: Green gradient (#059669 to #10b981)
- **Pen**: Red gradient (#dc2626 to #ef4444)
- **Background**: Light gray (#f8fafc) with subtle border
- **Center**: Dark slate for contrast (#1e293b)

### Scalability
The design works at multiple sizes:
- Large (240px): Full detail with shadows and gradients
- Small (64px): Simplified elements, essential details preserved
- Monochrome: Theme-aware using CSS custom properties

### Theme Support
The monochrome version uses CSS custom properties:
- `--theme-foreground`: Primary element color
- `--theme-background`: Background color
- `--theme-border`: Border color
- `--theme-muted`: Secondary element color

## Usage Guidelines

### Header Logo
Use the main logo (`src/assets/logo.svg`) in the header. The current height of 2.5rem (40px) works well.

### Home Page
The larger version on the home page (3.75rem / 60px) provides good visibility and detail.

### PWA Icons
The small version generates clean, recognizable PWA icons and favicons that maintain the core visual identity.

### Theme Integration
For applications with dynamic themes, consider using the monochrome version (`story-mode-logo-mono.svg`) which adapts to light and dark themes automatically.

## Technical Notes

- All logos are vector SVG format for perfect scalability
- Drop shadows and gradients enhance visual appeal
- Simplified geometry ensures recognition at small sizes
- CSS custom properties enable theme integration
- Generated PWA assets maintain consistency across platforms
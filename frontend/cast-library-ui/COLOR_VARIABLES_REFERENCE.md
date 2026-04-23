# Color Variable Naming Convention & Quick Reference

## Naming Pattern

```
$color-[component/context]-[usage]-[variant/state]
```

### Examples:
- `$color-cast-gold-1` - Cast card gold color, variant 1
- `$color-loc-banner-dark` - Location card banner, dark variant
- `$color-secrets-hover` - Secrets button hover state
- `$color-border-black-light` - Black border, light opacity

## Quick Reference by Category

### Base Colors
```scss
$color-bg           // Main background #0d0804
$color-page-start   // Page gradient start
$color-page-mid     // Page gradient middle
$color-page-end     // Page gradient end
$color-black        // Pure black
$color-dark-frame   // Dark frame border #1a0f00
```

### Text Colors
```scss
$color-text-primary      // Primary text
$color-text-secondary    // Secondary text
$color-text-muted        // Muted text
$color-text-dark         // Dark text (for light backgrounds)
$color-text-placeholder  // Input placeholder
```

### Border Colors
```scss
$color-border               // Standard border
$color-border-accent        // Accent border
$color-border-light         // Light border
$color-border-solid         // Solid border for inputs
$color-border-black-light   // rgba(0, 0, 0, 0.15)
$color-border-black-med     // rgba(0, 0, 0, 0.2)
$color-border-black-strong  // rgba(0, 0, 0, 0.25)
$color-border-white-light   // rgba(255, 255, 255, 0.10)
$color-border-white-med     // rgba(255, 255, 255, 0.25)
```

### Cast Card Colors (Gold Theme)
```scss
$color-cast-gold-1        // Frame gradient #f0d060
$color-cast-gold-2        // Frame gradient #c9a84c
$color-cast-gold-3        // Frame gradient #8a6820 (border)
$color-cast-gold-4        // Text highlight #e8c96a
$color-cast-gold-5        // Dark variant #5a4010
$color-cast-gold-6        // Frame gradient #d4a840
$color-cast-gold-7        // Subtitle color #d9c090

$color-cast-banner-dark   // Banner gradient #3d0e0e
$color-cast-banner-red    // Banner gradient #6b1a1a

$color-cast-bg-light-1    // Front bg #f0e2b6
$color-cast-bg-light-2    // Front bg #e5d49a
$color-cast-bg-light-3    // Front bg #d4c07a

$color-cast-portrait-1    // Portrait bg #c8b07a
$color-cast-portrait-2    // Portrait bg #e0c98a
$color-cast-portrait-3    // Portrait bg #c4a86a

$color-cast-back-dark-1   // Back bg #1e100a
$color-cast-back-dark-2   // Back bg #2a1a0f

// Cast Button Colors
$color-cast-btn-gold-1          // Button gold gradient
$color-cast-btn-gold-2          // Button gold gradient
$color-cast-btn-gold-hover-1    // Button gold hover
$color-cast-btn-gold-hover-2    // Button gold hover
$color-cast-btn-red-1           // Button red gradient
$color-cast-btn-red-2           // Button red gradient
$color-cast-btn-red-hover-1     // Button red hover
$color-cast-btn-red-hover-2     // Button red hover
```

### Location Card Colors (Green Theme)
```scss
$color-loc-green-1        // Frame gradient #c8e080
$color-loc-green-2        // Frame gradient #7aaa30
$color-loc-green-3        // Frame gradient #3d6010 (border)
$color-loc-green-4        // Frame gradient #a8c850
$color-loc-green-5        // Frame gradient #6a9828
$color-loc-green-6        // Dark variant #2a4008
$color-loc-green-7        // Frame gradient #90b840
$color-loc-green-8        // Subtitle color #a8d080

$color-loc-banner-dark    // Banner gradient #1a2e0a
$color-loc-banner-mid     // Banner gradient #2d4f14

$color-loc-bg-light-1     // Front bg #eaf0d8
$color-loc-bg-light-2     // Front bg #d8e5b8
$color-loc-bg-light-3     // Front bg #c4d49a

$color-loc-portrait-2     // Portrait bg #d8e5b8
$color-loc-portrait-3     // Portrait bg #b8cc88

$color-loc-back-dark-1    // Back bg #0e180a
$color-loc-back-dark-2    // Back bg #182810

// Location Button Colors
$color-loc-btn-green-1          // Button green gradient
$color-loc-btn-green-2          // Button green gradient
$color-loc-btn-green-hover-1    // Button green hover
$color-loc-btn-green-hover-2    // Button green hover
$color-loc-btn-red-1            // Button red gradient
$color-loc-btn-red-2            // Button red gradient
$color-loc-btn-red-hover-1      // Button red hover
$color-loc-btn-red-hover-2      // Button red hover
```

### Shadow & Overlay
```scss
$color-shadow-light      // rgba(0, 0, 0, 0.5)
$color-shadow-medium     // rgba(0, 0, 0, 0.6)
$color-shadow-dark       // rgba(0, 0, 0, 0.9)
$color-overlay-dark      // rgba(0, 0, 0, 0.45)
$color-overlay-darker    // rgba(0, 0, 0, 0.35)
```

### Interactive Element Colors
```scss
// Secrets Button
$color-secrets-bg                // Normal state
$color-secrets-hover             // Hover state
$color-secrets-revealed          // Revealed state
$color-secrets-revealed-hover    // Revealed hover state

// Delete Button
$color-delete-bg                 // Normal state
$color-delete-hover              // Hover state
```

### Form Input Colors
```scss
$color-input-bg             // Input background
$color-input-focus-border   // Input focus border
$color-input-focus-bg       // Input focus background
$color-wb-hover             // Wireframe block hover
```

### Badge Colors
```scss
// DM Badge
$color-dm-bg         $color-dm-border         $color-dm-text

// Player Badge  
$color-player-bg     $color-player-border     $color-player-text

// AI Badge
$color-ai-bg         $color-ai-border         $color-ai-text

// Locked Status
$color-locked-bg     $color-locked-border     $color-locked-text

// Open Status
$color-open-bg       $color-open-border       $color-open-text

// Arcane Badge
$color-arcane-bg     $color-arcane-border     $color-arcane-text     $color-arcane-glow
```

### Library Card Colors
```scss
// Cast
$color-lib-cast-1    $color-lib-cast-2    $color-lib-cast-3

// Location
$color-lib-location-1    $color-lib-location-2    $color-lib-location-3

// Sublocation
$color-lib-sublocation-1    $color-lib-sublocation-2    $color-lib-sublocation-3

// Shop
$color-lib-shop-1    $color-lib-shop-2    $color-lib-shop-3

// Player
$color-lib-player-1    $color-lib-player-2    $color-lib-player-3

// Scrollbar
$color-lib-scrollbar
```

## Usage in SCSS Files

### 1. Import variables at the top of your SCSS file:
```scss
@use '../../../styles/variables' as v;
```

### 2. Use variables with the `v.$` prefix:
```scss
.my-element {
  background: v.$color-cast-bg-light-1;
  border: 1px solid v.$color-border;
  color: v.$color-text-primary;
}
```

### 3. For gradients:
```scss
background: linear-gradient(
  180deg,
  v.$color-cast-gold-1 0%,
  v.$color-cast-gold-2 50%,
  v.$color-cast-gold-3 100%
);
```

### 4. For shadows and overlays:
```scss
box-shadow: 0 4px 8px v.$color-shadow-medium;
background: v.$color-overlay-dark;
```

### 5. For hover states:
```scss
.button {
  background: v.$color-cast-btn-gold-1;

  &:hover {
    background: v.$color-cast-btn-gold-hover-1;
  }
}
```

## Common Patterns

### Card Frame
```scss
.card-frame {
  background: linear-gradient(145deg,
    v.$color-cast-gold-1 0%,
    v.$color-cast-gold-2 20%,
    v.$color-cast-gold-3 45%,
    v.$color-cast-gold-4 55%,
    v.$color-cast-gold-2 70%,
    v.$color-cast-gold-5 85%,
    v.$color-cast-gold-6 100%
  );
  box-shadow:
    0 0 0 1px v.$color-dark-frame,
    0 6px 22px v.$color-shadow-dark,
    inset 0 1px 0 v.$color-cast-shadow-inset;
}
```

### Button with States
```scss
.button {
  background: linear-gradient(180deg, v.$color-cast-btn-gold-1, v.$color-cast-btn-gold-2);
  color: v.$color-cast-banner-dark;
  box-shadow: 0 2px 4px v.$color-shadow-light;

  &:hover {
    background: linear-gradient(180deg, v.$color-cast-btn-gold-hover-1, v.$color-cast-btn-gold-hover-2);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}
```

### Border with Multiple Layers
```scss
.bordered-element {
  border: 1.5px solid v.$color-border-black-med;
  border-top: 1px solid v.$color-border-black-light;
  box-shadow: 0 1px 2px v.$color-shadow-light;
}
```

## Tips

1. **Always add comments** in `_variables.scss` indicating where each variable is used
2. **Group related variables** (e.g., all cast gold variants together)
3. **Use consistent naming** (component-usage-variant)
4. **Test visual appearance** after replacing to ensure colors match
5. **Check hover/active states** work correctly with new variables
6. **Reuse existing variables** when possible instead of creating duplicates
7. **Document new variables** in this reference when adding them

## Benefits

✅ Single source of truth for all colors
✅ Easy global theme changes
✅ Consistency across components
✅ Better maintainability
✅ Supports future theming/dark mode
✅ Aligns with design system best practices

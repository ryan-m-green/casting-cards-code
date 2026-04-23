# Color Variables Migration Status

## Overview
This document tracks the migration of hardcoded colors from SCSS files to centralized variables in `src/styles/_variables.scss`.

## Completed Files

### ✅ src/styles/_variables.scss
- **Status**: EXPANDED with comprehensive color system
- **Changes**: Added 100+ color variables organized by usage:
  - Base & Page Colors
  - Text Colors  
  - Border Colors (including variants for black/white borders)
  - Gold Colors (Cast Cards) - 20+ variables
  - Green Colors (Location Cards) - 18+ variables
  - Shadow & Overlay Colors
  - Secret/Lock Button Colors
  - Delete Button Colors
  - Form Input Colors
  - Badge Colors (DM, Player, AI, Locked, Open, Arcane)
  - Library Card Colors

### ✅ src/styles/_components.scss
- **Status**: COMPLETE
- **Changes**:
  - Replaced `rgba(110, 75, 22, 0.04)` with `v.$color-wb-hover` (2 instances)
  - Replaced `rgba(255, 248, 232, 0.55)` with `v.$color-input-bg`
  - Replaced `rgba(110, 75, 22, 0.32)` with `v.$color-border-solid`
  - Replaced `rgba(110, 75, 22, 1.0)` with `v.$color-text-placeholder`
  - Replaced `rgba(90, 58, 154, 0.65)` with `v.$color-input-focus-border`
  - Replaced `rgba(46, 26, 94, 0.04)` with `v.$color-input-focus-bg`
  - Replaced library card gradients with variables (5 cards)
  - Replaced `rgba(0,0,0,0.22)` with `v.$color-shadow-light`
  - Replaced `rgba(110, 75, 22, 0.2)` with `v.$color-lib-scrollbar`
  - Replaced text color `rgba(42, 24, 4, 1.0)` with `v.$color-text-primary`

### ✅ src/app/shared/components/cast-card/cast-card.component.scss
- **Status**: COMPLETE
- **Changes**: ALL colors replaced with variables including:
  - Frame gradients (6 color stops)
  - Inner background gradients (3 colors)
  - Banner background gradients (2 colors)
  - Name and subtitle colors
  - Portrait background gradient (3 colors)
  - Upload overlay background
  - Stars filter shadow
  - Flavor border and text colors
  - Strip background gradient and colors
  - Pip and label colors
  - Secrets button colors (normal, hover, revealed)
  - Delete button colors
  - Back face gradients and borders
  - Back stats colors and scrollbar
  - Button gradients (gold and red variants)

### ✅ src/app/shared/components/location-card/location-card.component.scss
- **Status**: COMPLETE
- **Changes**: ALL colors replaced with variables including:
  - Frame gradients (7 color stops)
  - Inner background gradients (3 colors)
  - Banner background gradients (2 colors)
  - Name and subtitle colors
  - Portrait background gradient (3 colors)
  - Upload overlay background
  - Flavor border and text colors
  - Strip background gradient and colors
  - Pip and label colors
  - Secrets button colors (normal, hover, revealed)
  - Delete button colors
  - Back face gradients and borders
  - Back stats colors and scrollbar
  - Button gradients (green/gold and red variants)

## Remaining Files to Update

The following files still contain hardcoded colors and need to be updated to use variables:

### High Priority (Card Components)
- [ ] `src/app/shared/components/sublocation-card/sublocation-card.component.scss`
- [ ] `src/app/shared/components/currency-card/currency-card.component.scss`

### Medium Priority (Feature Components)
- [ ] `src/app/layout/journal-shell/journal-shell.component.scss`
- [ ] `src/app/features/dashboard/dashboard.component.scss`
- [ ] `src/app/features/campaign/campaign-library/campaign-library.component.scss`
- [ ] `src/app/features/campaign/campaign-creator/campaign-creator.component.scss`
- [ ] `src/app/features/campaign/campaign-cast-detail/campaign-cast-detail.component.scss`
- [ ] `src/app/features/campaign/campaign-location-detail/campaign-location-detail.component.scss`
- [ ] `src/app/features/campaign/relationship-web-modal/relationship-web-modal.component.scss`
- [ ] `src/app/features/campaign/time-of-day-editor/time-of-day-editor.component.scss`
- [ ] `src/app/shared/components/time-of-day-bar/time-of-day-bar.component.scss`

### Lower Priority (Form/UI Components)
- [ ] `src/app/shared/components/dm-nav/dm-nav.component.scss`
- [ ] `src/app/shared/components/secret-modal/secret-modal.component.scss`
- [ ] `src/app/features/cover/cover.component.scss`
- [ ] `src/app/features/player/player-campaigns/player-campaigns.component.scss`
- [ ] `src/app/features/player/player-location-political-notes/player-location-political-notes.component.scss`
- [ ] All form component SCSS files

## Variables Still Needed

Additional variables that may be needed as more files are migrated:

### Sublocation Card Colors
- Sublocation frame gradient colors (likely blue/gray tones)
- Sublocation banner colors
- Sublocation portrait colors
- Sublocation back face colors
- Sublocation button colors

### Portal/Campaign Colors  
- Portal void/rim colors
- Portal spark colors
- Portal animation colors

### Time of Day Colors
- Time bar segment colors (dawn, day, dusk, night)
- Time indicator colors
- Time editor colors

### Political Notes Colors
- Faction colors
- Relationship indicator colors
- Political map colors

### Modal/Overlay Colors
- Modal backdrop colors
- Modal panel colors
- Modal button colors

### Journal/Spine Colors
- Journal spine colors
- Journal leather colors
- Journal page fold colors
- Journal strap colors

## Migration Pattern

When updating remaining files, follow this pattern:

1. **Add @use statement** at the top of the SCSS file:
   ```scss
   @use '../../../styles/variables' as v;
   ```

2. **Identify hardcoded colors**:
   - Hex colors: `#abc123`
   - RGB/RGBA: `rgb(...)` or `rgba(...)`
   - Named colors: `transparent`, `black`, `white` (keep as-is usually)

3. **Replace with appropriate variable**:
   - Check if variable exists in `_variables.scss`
   - If not, add new variable with descriptive name and usage comment
   - Replace hardcoded value with `v.$variable-name`

4. **Group related colors**:
   - Frame/border colors
   - Background gradients
   - Text colors
   - Button states (normal, hover, active)
   - Shadow/overlay colors

5. **Test the changes**:
   - Build the project
   - Visually verify colors match the original design
   - Check responsive behavior
   - Test hover/active states

## Benefits of This Approach

1. **Centralized Color Management**: All colors defined in one place
2. **Easy Theme Updates**: Change colors globally by updating variables
3. **Consistency**: Ensures same colors used across similar elements
4. **Maintainability**: Clear naming convention with usage comments
5. **Design System**: Aligns with the Copilot instruction to use design system variables
6. **Future-Proof**: Easy to add dark mode, alternate themes, or accessibility improvements

## Notes

- The wizard-secret-overlay component should use `v.$color-border` for the wso-figure-wrap glow to match campaign page pulsing border styling (per copilot-instructions.md)
- Always include comments next to variables indicating where they're used
- Group variables logically by component or usage
- Use descriptive names that indicate both the component and usage (e.g., `$color-cast-gold-4` or `$color-loc-banner-dark`)

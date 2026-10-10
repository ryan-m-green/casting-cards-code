/**
 * Animation configuration constants for card navigation
 * These values are protected and should not be modified to ensure consistent animation behavior
 * Unified animation system: Single phase, GPU-accelerated, batched operations
 */
export const ANIMATION_CONFIG = {
  // Unified animation duration (slow for debugging visibility)
  ANIMATION_DURATION: 2500,

  // Easing functions
  EASING: 'cubic-bezier(0.4, 0, 0.8, 1)',

  // Scale values
  SCALE_TOP_ROW: 0.5,
  SCALE_STACKED: 0.8,
  SCALE_ORIGINAL: 1,

  // Z-index values
  Z_INDEX_TOP: 100,
  Z_INDEX_BASE: 50,
  Z_INDEX_INITIAL_OFFSET: 10,
  Z_INDEX_GHOSTS: 1000,

  // Opacity values
  OPACITY_FULL: 1,
  OPACITY_STACKED: 0.7,
  OPACITY_HIDDEN: 0,

  // Dropzone positioning offsets (based on swiper slide width and padding)
  DROPZONE_OFFSET_X: 38,
  DROPZONE_OFFSET_Y: 55,
  DROPZONE_PADDING_LEFT: 12,
  DROPZONE_SLIDE_WIDTH: 174, // 12px padding + 150px card + 12px padding
  DROPZONE_MIDDLE_ROW_TOP: 0,
  DROPZONE_BOTTOM_ROW_TOP: 244,
  DROPZONE_BOTTOM_OFFSET_CENTER: 37.5, // Center 75px card within 150px: (150-75)/2

  // Card dimensions
  CARD_FULL_WIDTH: 150,
  CARD_FULL_HEIGHT: 220,
  CARD_SIMPLE_WIDTH: 75,
  CARD_SIMPLE_HEIGHT: 110,

  // Fallback vertical movement
  FALLBACK_VERTICAL_MOVE: -160,
} as const;

/**
 * Type for animation configuration to ensure type safety
 */
export type AnimationConfig = typeof ANIMATION_CONFIG;
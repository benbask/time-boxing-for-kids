/**
 * Theme registry. All colour values live in css/themes.css; this module only
 * knows the identifiers and labels used for persistence and the picker UI.
 */

export const THEMES = [
  {
    id: 'sky-mint',
    name: 'Sky & Mint',
    swatches: ['#1f9d8f', '#8fd9e8', '#eef8f9'],
  },
  {
    id: 'candy',
    name: 'Candy',
    swatches: ['#e05c94', '#8b7bff', '#fff5fa'],
  },
  {
    id: 'lavender',
    name: 'Lavender',
    swatches: ['#6f5fd6', '#d3c6fb', '#f6f3ff'],
  },
  {
    id: 'nature',
    name: 'Nature',
    swatches: ['#4f9440', '#b9d8a0', '#f4faef'],
  },
];

export const THEME_IDS = THEMES.map((theme) => theme.id);

export const DEFAULT_THEME = 'sky-mint';

export function isThemeId(value) {
  return THEME_IDS.includes(value);
}

export function applyTheme(themeId) {
  const id = isThemeId(themeId) ? themeId : DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', id);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--bg-soft')
      .trim();
    if (color) meta.setAttribute('content', color);
  }
  return id;
}

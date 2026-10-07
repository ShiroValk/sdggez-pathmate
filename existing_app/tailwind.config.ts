import animate from 'tailwindcss-animate';

/** Preserve class-based dark mode and the existing animation utilities locally. */
export default {
  darkMode: 'class',
  content: [
    './client/src/**/*.{ts,tsx,css}',
  ],
  plugins: [animate],
}

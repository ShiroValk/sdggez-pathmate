/** Opt-in static showcase build. Normal builds retain real authentication. */
export const PUBLIC_DEMO_MODE = import.meta.env?.VITE_PUBLIC_DEMO === 'true';

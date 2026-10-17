interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string;
  readonly VITE_PUBLIC_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

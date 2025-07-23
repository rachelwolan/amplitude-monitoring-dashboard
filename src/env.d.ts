/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AMPLITUDE_API_KEY: string;
  readonly AMPLITUDE_SECRET_KEY: string;
  readonly AMPLITUDE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 
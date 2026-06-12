/**
 * Default entry — types, storage helpers, and queries that are safe everywhere.
 * Import clients from their explicit subpaths to avoid bundling the wrong runtime:
 *   @grocery/db/browser  — Next.js Client Components
 *   @grocery/db/server   — Next.js Server Components / Route Handlers / Actions
 *   @grocery/db/admin    — service-role (SERVER ONLY)
 *   @grocery/db/native   — Expo / React Native
 */
export * from "./types.gen";
export * from "./storage";
export * from "./queries";

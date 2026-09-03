/**
 * Single source of truth for the backend API origin.
 *
 * - Local dev: defaults to '/api', which Vite's dev server proxies to
 *   http://localhost:8000 (see vite.config.ts), so nothing needs to be set.
 * - Production: set VITE_API_BASE at build time (e.g. in Vercel/Netlify/Render
 *   env vars) to the deployed backend's URL, e.g. https://orbit-api.onrender.com/api.
 *   Without this, a statically-hosted frontend has no way to reach a
 *   separately-hosted backend.
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? '/api';

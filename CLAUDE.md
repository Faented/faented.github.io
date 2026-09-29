# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal single-page profile site for GitHub user `Faented`, served at the `faented.github.io` user page. Built with React 18 + TypeScript, Vite, and Tailwind CSS v3 (via PostCSS).

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — type-check (`tsc -b`) then build to `dist/`
- `npm run preview` — serve the built `dist/`

There are no tests and no linter configured. `npm run build` is the only correctness check, since `tsc` runs in strict mode with `noEmit` before Vite bundles.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`. It runs `npm ci && npm run build` on Node 20 and publishes `dist/` through GitHub Pages Actions (`upload-pages-artifact` / `deploy-pages`). The `deploy` script in package.json (`gh-pages -d dist`) is a legacy manual path; CI is the real deploy mechanism.

The site is served from the domain root, so Vite has no `base` configured and assets use absolute paths like `/background.jpg`, which comes from `public/`.

## Architecture

Nearly all UI lives in `src/App.tsx`:
- On mount, it fetches the profile (avatar, name, bio) at runtime from the public GitHub API (`https://api.github.com/users/Faented`). To change the displayed name or bio, edit the GitHub profile, not the code.
- Social links are an inline array of `{ href, label, icon }` with inline SVG icons.
- A cursor spotlight effect: a `mousemove` listener writes the `--mouse-x` / `--mouse-y` CSS custom properties onto an overlay ref, and CSS in `src/index.css` reads them. Updates go straight to the DOM rather than through React state, so the component doesn't re-render on every mouse move.
- `useDisableContextMenu` (in `src/hooks/`) blocks the right-click menu site-wide.

The Poppins font is loaded from Google Fonts in `index.html` and mapped to Tailwind's `font-sans` in `tailwind.config.js`. Some code comments are in Russian.

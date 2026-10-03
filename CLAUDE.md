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

Pushing to `main` (or a manual run from the Actions tab) triggers `.github/workflows/deploy.yml`. It runs `npm ci && npm run build` on Node 20 and pushes `dist/` to the `gh-pages` branch with the `gh-pages` package. GitHub Pages is set to publish from the `gh-pages` branch, so the branch contents are what's live. Never commit to `gh-pages` by hand: any commit there, including the `CNAME` commits GitHub makes when you edit Custom domain in Settings → Pages, redeploys whatever the branch holds. `npm run deploy` does the same publish from a local machine. `public/.nojekyll` disables Jekyll on the branch build, and `public/404.html` is a standalone static page (it's not part of the React app) that GitHub Pages serves for any missing path. To use a custom domain, commit `public/CNAME`; setting it in the GitHub UI gets wiped by the next deploy.

The site is served from the domain root, so Vite has no `base` configured and assets use absolute paths like `/background.mp4`, which comes from `public/`.

## Architecture

Personal values (GitHub username, `LINKS`, fallback bio) live in `src/config.ts`; change them there, not in components.

On first visit in a tab, `src/components/Boot.tsx` shows a black "press any key to boot" screen. A click or key runs a short fake boot log with a progress bar, then calls `onDone`. `App.tsx` stores `booted` in `sessionStorage`, so the boot screen is skipped on reloads within the same tab. It's also skipped when the page opens on any hash route other than `#/`, so deep links to notes go straight to content. The terminal renders only after boot.

The UI is a square glass "terminal window" (`src/components/Window.tsx`) over `src/components/Background.tsx`: a black background with `public/background.mp4` on top. The video starts downloading immediately, so it loads while the boot screen waits for input, and fades in only once `visible` is set (after boot) and it's actually playing. It's skipped under `prefers-reduced-motion` or Save-Data, paused on hidden tabs, and dropped on error, which leaves plain black. There is intentionally no image fallback. The MP4 should keep `moov` before `mdat` (faststart) so it can play while still downloading.

- **Routing** is hash-based (`src/hooks/useHashRoute.ts`): `#/` shows the home page and `#/notes[/<slug>]` shows notes. The hook URI-decodes the hash, so non-ASCII note slugs work, and strips trailing slashes. GitHub Pages can't rewrite `/notes` to `index.html`, so stay on hash URLs rather than adding path routes. `App.tsx` matches the route and picks the page.
- **Home** (`src/pages/Home.tsx`) gets its avatar, name and bio at runtime from `https://api.github.com/users/Faented`. To change the displayed name or bio, edit the GitHub profile, not the code. `LINKS` from `config.ts` drive `ls links` and `open <name>`.
- **Terminal** (`src/components/Shell.tsx`) is an interactive shell. To add a command, add an entry to the `commands` map (`name: [help text, handler]`); an empty help text hides the command from `help`. Handlers get `(args, ctx)`, where `ctx` holds the current directory `cwd` and a `cd` setter. `cwd` lives in `TerminalContext` (state in `App.tsx`), not in `Shell`, so the window title follows `cd`. The virtual filesystem is one level deep: `~` → the keys of `dirs` (`links`, `notes`). `resolveDir` handles relative paths, `..`, and `~`; files exist only in `notes/` (the `.md` notes). To add a folder, add a key to `dirs` and, if it holds files, extend `files()`. The `initial` commands run on mount as ordinary history, so they scroll and `clear` removes them. Shell keeps two separate lists: `screen` (what's shown; `clear` empties it) and `typed` (↑/↓ recall). Both are mirrored into the module-level `session` object, so the terminal survives navigating to `#/notes` and back. Output is scrolled with `scrollTop` on the log element; never use `scrollIntoView` there, because it scrolls the page on mobile. The input auto-focuses only with `(pointer: fine)`, so phones don't pop the keyboard, and it's 16px below `sm` to stop iOS from zooming on focus.
- **Prompt** `<user>@<host>` comes from `TerminalContext` (`src/terminal.tsx`): `user` is the lowercased GitHub login, and `host` is `__COMMIT__`, the short SHA injected by `define` in `vite.config.ts` (`GITHUB_SHA` in CI, otherwise `git rev-parse HEAD`). Changing `define` requires restarting the dev server.
- **Notes** are Markdown files in `src/notes/`. Name a file `YYYY-MM-DD-slug.md` and make its first line `# Title`. `src/notes.ts` imports them with `import.meta.glob(..., { query: "?note", eager: true })`. The `notes-markdown` plugin in `vite.config.ts` handles the `?note` query: it splits off the title and renders the body to HTML with `marked` at build time. `marked` is a devDependency and never reaches the bundle. External links get `target="_blank"`. The HTML is injected with `dangerouslySetInnerHTML` (the notes are trusted, author-written content) and styled by the `.md` class in `src/index.css`. Notes are sorted newest first by filename.
- **Cursor spotlight:** a `mousemove` listener in `App.tsx` writes `--mouse-x` / `--mouse-y` onto the `.overlay` element, and CSS in `src/index.css` reads them. Updates go straight to the DOM rather than through React state, so nothing re-renders on mouse move.
- `useDisableContextMenu` blocks the right-click menu everywhere except links, inputs and `.select-text` elements. `body` has `select-none`, and note bodies opt back into selection with `select-text`.

Fonts: Poppins (`font-sans`, profile header) and JetBrains Mono (`font-mono`, terminal), both loaded from Google Fonts in `index.html`. The `accent` color (teal) is defined in `tailwind.config.cjs`. The package is `"type": "module"`, so CommonJS configs must use `.cjs`.

Head meta in `index.html`: `public/favicon.svg`, `public/apple-touch-icon.png`, and Open Graph/Twitter tags pointing at `public/og.png` (1200×630, absolute URL). The OG image is a rendered static PNG, so regenerate it if the branding changes. The page is `lang="ru"`, and some code comments are in Russian. `tsconfig.json` also type-checks `vite.config.ts`, which holds the notes plugin.

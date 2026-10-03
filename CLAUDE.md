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

Pushing to `main` (or a manual run from the Actions tab) triggers `.github/workflows/deploy.yml`. It runs `npm ci && npm run build` on Node 20 and pushes `dist/` to the `gh-pages` branch with the `gh-pages` package. GitHub Pages is set to publish from the `gh-pages` branch, so the branch contents are what's live. Never commit to `gh-pages` by hand: any commit there, including the `CNAME` commits GitHub makes when you edit Custom domain in Settings → Pages, redeploys whatever the branch holds. `npm run deploy` does the same publish from a local machine. `public/.nojekyll` disables Jekyll on the branch build. To use a custom domain, commit `public/CNAME`; setting it in the GitHub UI gets wiped by the next deploy.

After publishing, the workflow runs `scripts/indexnow.mjs`, which pings IndexNow (`api.indexnow.org`, which fans out to Bing/DuckDuckGo, Yandex and others) with the changed URLs: always `/`, plus `/notes/` and each added, modified or deleted note since `github.event.before`. That's why checkout uses `fetch-depth: 0`. Before sending, the script waits until the key file and new pages are actually live on Pages. The key is `public/<32-hex>.txt`; it's public by design, so don't rename or delete it. The step is `continue-on-error`, so it never fails a deploy. Test locally with `DRY_RUN=1 BEFORE=<sha> node scripts/indexnow.mjs`.

Search-engine verification lives in `index.html` (Google and Bing meta tags) and `public/` (`google*.html`, `yandex_*.html`). Never remove these; engines re-check them.

The site is served from the domain root, so Vite has no `base` configured and assets use absolute paths like `/background.mp4`, which comes from `public/`.

## Architecture

Personal values live in `src/config.ts`: GitHub username, `SITE_URL`, `SITE_TITLE`, `SITE_DESCRIPTION`, `LINKS`, `KNOWS_ABOUT`/`ABOUT` and the fallback bio. Change them there, not in components; both the app and the build read them.

## SEO / static pages (`build/site.ts`)

The app is a hash-routed SPA behind a click-to-boot screen, which search engines can't index (they ignore `#` and don't click). `build/site.ts` holds two Vite plugins that work around this at build time:
- `notesPlugin`: the `?note` import that renders note Markdown with `marked`. `readNote()` is shared, so the app and the static pages render identically.
- `seoPlugin`:
  - fills `<!--seo:head-->` in `index.html` with title, description, canonical, Open Graph and JSON-LD (`WebSite` + `ProfilePage` + `Person`);
  - fills `<!--seo:fallback-->` inside `#root` with a plain-HTML version of the home page. React replaces it on mount; CSS shows it to people only if JS fails to start within 3s;
  - emits `notes/index.html`, `notes/<slug>/index.html` (full note, `BlogPosting` + `BreadcrumbList` JSON-LD), `404.html`, `sitemap.xml`, `feed.xml` (RSS 2.0 with full HTML in `content:encoded`), `.well-known/security.txt` (RFC 9116; `Expires` is refreshed each build) and `robots.txt`.

Every page's `<head>` comes from `headMeta()`, which emits:
- a `robots` directive allowing large image previews and full snippets;
- `rel="me"` links for every `LINKS` entry, plus the RSS `alternate` link;
- `article:*` meta on notes.

The JSON-LD shares one `Person` (`@id` `/#me`) across all pages. `ProfilePage` carries `dateCreated`/`dateModified` from the first and last git commit. Sitemap `lastmod` values are real commit dates, never "today": the home page uses HEAD's date, and each note uses its file's last commit. Faking `lastmod` makes Google ignore it.

Notes may start with optional front matter: `---`, then `description: …`, then `tags: a, b`, then `---`, before the `# Title`. `description` overrides the auto-generated snippet; `tags` feed `keywords`, `article:tag` and RSS categories. Set both on new notes; they are the main per-page SEO lever.

For AI search and assistants (most of their crawlers don't run JS):
- `llms.txt` (llmstxt.org format) is a short Markdown map of who/what/where;
- `llms-full.txt` is all content in one file;
- each note also ships as `notes/<slug>.md`, linked from its HTML page via `<link rel="alternate" type="text/markdown">`;
- `robots.txt` explicitly allows the AI crawlers listed in `AI_BOTS`;
- the `Person` JSON-LD carries `knowsAbout` and `description` from `KNOWS_ABOUT`/`ABOUT` in `config.ts`.

Keep `ABOUT` strictly factual: assistants quote it verbatim when asked about the author.

The static pages are standalone HTML with inline CSS (`STYLE`) that mimics the terminal; they link to the SPA via `/#/notes/<slug>`. When you change the look of `.md` in `src/index.css`, mirror it in `STYLE`. `isBot()` in `src/bot.ts` matches exact crawler names only. Never add generic words like `google`, `claude`, `gpt` or `telegram`: they match real browsers, such as the Claude app's browser or Telegram's in-app browser, and those people would lose the boot screen. For bots, `App.tsx` skips the boot screen and `Background` skips the video. `App.tsx` also sets `document.title` per route. Imports inside the Vite config graph use explicit `.ts` extensions (`allowImportingTsExtensions`), which Vite's native config loader requires.

On first visit in a tab, `src/components/Boot.tsx` shows a black "press any key to boot" screen. A click or key runs a short fake boot log with a progress bar, then calls `onDone`. `App.tsx` stores `booted` in `sessionStorage`, so the boot screen is skipped on reloads within the same tab. It's also skipped when the page opens on any hash route other than `#/`, so deep links to notes go straight to content. The terminal renders only after boot.

The UI is a square glass "terminal window" (`src/components/Window.tsx`) over `src/components/Background.tsx`: a black background with `public/background.mp4` on top. The video starts downloading immediately, so it loads while the boot screen waits for input, and fades in only once `visible` is set (after boot) and it's actually playing. It's skipped under `prefers-reduced-motion` or Save-Data, paused on hidden tabs, and dropped on error, which leaves plain black. There is intentionally no image fallback. The MP4 should keep `moov` before `mdat` (faststart) so it can play while still downloading.

- **Routing** is hash-based (`src/hooks/useHashRoute.ts`): `#/` shows the home page and `#/notes[/<slug>]` shows notes. The hook URI-decodes the hash, so non-ASCII note slugs work, and strips trailing slashes. GitHub Pages can't rewrite `/notes` to `index.html`, so stay on hash URLs rather than adding path routes. `App.tsx` matches the route and picks the page.
- **Home** (`src/pages/Home.tsx`) gets its avatar, name and bio at runtime from `https://api.github.com/users/Faented`. To change the displayed name or bio, edit the GitHub profile, not the code. `LINKS` from `config.ts` drive `ls links` and `open <name>`.
- **Terminal** (`src/components/Shell.tsx`) is an interactive shell. To add a command, add an entry to the `commands` map (`name: [help text, handler]`); an empty help text hides the command from `help`. Handlers get `(args, ctx)`, where `ctx` holds the current directory `cwd` and a `cd` setter. `cwd` lives in `TerminalContext` (state in `App.tsx`), not in `Shell`, so the window title follows `cd`. The virtual filesystem is one level deep: `~` → the keys of `dirs` (`links`, `notes`). `resolveDir` handles relative paths, `..`, and `~`; files exist only in `notes/` (the `.md` notes). To add a folder, add a key to `dirs` and, if it holds files, extend `files()`. The `initial` commands run on mount as ordinary history, so they scroll and `clear` removes them. Shell keeps two separate lists: `screen` (what's shown; `clear` empties it) and `typed` (↑/↓ recall). Both are mirrored into the module-level `session` object, so the terminal survives navigating to `#/notes` and back. Output is scrolled with `scrollTop` on the log element; never use `scrollIntoView` there, because it scrolls the page on mobile. The input auto-focuses only with `(pointer: fine)`, so phones don't pop the keyboard, and it's 16px below `sm` to stop iOS from zooming on focus.
- **Prompt** `<user>@<host>` comes from `TerminalContext` (`src/terminal.tsx`): `user` is the lowercased GitHub login, and `host` is `__COMMIT__`, the short SHA injected by `define` in `vite.config.ts` (`GITHUB_SHA` in CI, otherwise `git rev-parse HEAD`). Changing `define` requires restarting the dev server.
- **Notes** are Markdown files in `src/notes/`. Name a file `YYYY-MM-DD-slug.md` and make its first line `# Title`. `src/notes.ts` imports them with `import.meta.glob(..., { query: "?note", eager: true })`. `notesPlugin` in `build/site.ts` handles the `?note` query: it splits off the title and renders the body to HTML with `marked` at build time. `marked` is a devDependency and never reaches the bundle. External links get `target="_blank"`. The HTML is injected with `dangerouslySetInnerHTML` (the notes are trusted, author-written content) and styled by the `.md` class in `src/index.css`. Notes are sorted newest first by filename.
- **Cursor spotlight:** a `mousemove` listener in `App.tsx` writes `--mouse-x` / `--mouse-y` onto the `.overlay` element, and CSS in `src/index.css` reads them. Updates go straight to the DOM rather than through React state, so nothing re-renders on mouse move.
- `useDisableContextMenu` blocks the right-click menu everywhere except links, inputs and `.select-text` elements. `body` has `select-none`, and note bodies opt back into selection with `select-text`.

Fonts: Poppins (`font-sans`, profile header) and JetBrains Mono (`font-mono`, terminal), both loaded from Google Fonts in `index.html`. The `accent` color (teal) is defined in `tailwind.config.cjs`. The package is `"type": "module"`, so CommonJS configs must use `.cjs`.

Head meta in `index.html`: `public/favicon.svg`, `public/apple-touch-icon.png`, and Open Graph/Twitter tags pointing at `public/og.png` (1200×630, absolute URL). The OG image is a rendered static PNG, so regenerate it if the branding changes. The page is `lang="ru"`, and some code comments are in Russian. `tsconfig.json` also type-checks `vite.config.ts` and `build/`.

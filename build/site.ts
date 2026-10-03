// Плагины сборки: записки из Markdown и SEO.
// Сайт — SPA с hash-роутингом, а поисковики не видят ничего после `#` и не жмут «press any key».
// Поэтому при сборке рядом с приложением генерируются обычные статические страницы:
//   /notes/                 — список записок
//   /notes/<slug>/          — каждая записка целиком
//   /404.html, /sitemap.xml, /robots.txt
// а в index.html подставляются meta-теги, JSON-LD и текстовая версия главной для роботов.

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Marked } from "marked";
import type { Plugin } from "vite";
import {
  FALLBACK_BIO,
  GITHUB_USERNAME,
  LINKS,
  SITE_DESCRIPTION,
  SITE_TITLE,
  SITE_URL,
} from "../src/config.ts";

const NOTES_DIR = resolve(process.cwd(), "src/notes");
const AVATAR = `https://github.com/${GITHUB_USERNAME}.png`;
const user = GITHUB_USERNAME.toLowerCase();

// ---------- Markdown ----------

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// записки пишешь ты сам, поэтому HTML из Markdown доверенный.
// внешние ссылки открываем в новой вкладке, чтобы не уходить с сайта
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const attrs = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${attrs}>${text}</a>`;
    },
  },
});

export interface BuiltNote {
  slug: string;
  date: string;
  title: string;
  body: string;
  html: string;
  description: string; // первые ~155 символов текста — для meta description
  modified: string; // дата последнего коммита файла (ISO), для sitemap
}

const plain = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

const gitDate = (file: string) => {
  try {
    return execSync(`git log -1 --format=%cI -- "${file}"`).toString().trim();
  } catch {
    return "";
  }
};

export const readNote = (file: string): BuiltNote => {
  const slug = file.replace(/^.*[\\/]|\.md$/g, "");
  const [first, ...rest] = readFileSync(file, "utf-8").replace(/\r\n/g, "\n").trim().split("\n");
  const hasTitle = first.startsWith("# ");
  const body = (hasTitle ? rest : [first, ...rest]).join("\n").trim();
  const html = md.parse(body, { async: false });
  const text = plain(html);
  const date = slug.slice(0, 10);
  return {
    slug,
    date,
    title: hasTitle ? first.slice(2).trim() : slug.slice(11),
    body,
    html,
    description: text.length > 155 ? `${text.slice(0, 154).trimEnd()}…` : text,
    modified: gitDate(file) || date,
  };
};

const allNotes = () =>
  readdirSync(NOTES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readNote(resolve(NOTES_DIR, f)))
    .sort((a, b) => b.slug.localeCompare(a.slug));

// `import x from './note.md?note'` → { title, body, html }.
// Markdown превращается в HTML при сборке, так что marked не попадает в бандл
export const notesPlugin = (): Plugin => ({
  name: "notes-markdown",
  load(id) {
    const [file, query] = id.split("?");
    if (query !== "note") return;
    this.addWatchFile(file);
    const { title, body, html } = readNote(file);
    return `export default ${JSON.stringify({ title, body, html })};`;
  },
});

// ---------- статические страницы ----------

const url = (path: string) => `${SITE_URL}${path}`;
const noteUrl = (slug: string) => url(`/notes/${encodeURIComponent(slug)}/`);
const prompt = (path: string, cmd: string) =>
  `<div><span class="u">${user}</span><span class="d">:${path}$ </span>${esc(cmd)}</div>`;

const person = {
  "@type": "Person",
  name: GITHUB_USERNAME,
  url: SITE_URL,
  image: AVATAR,
  description: FALLBACK_BIO,
  sameAs: LINKS.map((l) => l.href),
};

const jsonLd = (data: object) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

// общие meta для всех страниц: описание, canonical, превью в соцсетях
const headMeta = (o: { title: string; description: string; path: string; type?: string }) => `
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}" />
<link rel="canonical" href="${url(o.path)}" />
<meta name="author" content="${GITHUB_USERNAME}" />
<meta property="og:type" content="${o.type ?? "website"}" />
<meta property="og:locale" content="ru_RU" />
<meta property="og:site_name" content="${SITE_URL.replace(/^https:\/\//, "")}" />
<meta property="og:url" content="${url(o.path)}" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.description)}" />
<meta property="og:image" content="${url("/og.png")}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Окно терминала: ${user} — ${esc(FALLBACK_BIO)}" />
<meta name="twitter:card" content="summary_large_image" />`;

// одна тема на все статические страницы — тот же стеклянный терминал, что и в приложении
const STYLE = `
:root{--a:#5eead4}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#000}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;padding:40px 16px;
 font:14px/1.7 "JetBrains Mono",ui-monospace,Consolas,monospace;color:rgba(255,255,255,.85)}
.w{width:100%;max-width:672px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.03);animation:ap .4s ease-out both}
.b{display:flex;justify-content:space-between;gap:16px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.1);
 background:rgba(255,255,255,.05);color:rgba(255,255,255,.6)}
.b span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c{padding:20px 24px}
.u{color:var(--a)}.d{color:rgba(255,255,255,.45)}.e{color:#f87171;word-break:break-all}
a{color:inherit;text-decoration:none}a:hover{color:var(--a)}
h1{font-size:1.15em;color:#fff;margin:12px 0 0}
.date{color:rgba(255,255,255,.4)}
ul.l{list-style:none;padding:0;margin:8px 0}
ul.l li{display:flex;gap:16px}
.nav{margin-top:20px;display:flex;flex-wrap:wrap;gap:16px}
.md{color:rgba(255,255,255,.8);overflow-wrap:break-word}
.md h1,.md h2,.md h3{color:#fff;font-size:1em;font-weight:600}
.md h1::before{content:"# ";color:var(--a)}.md h2::before{content:"## ";color:var(--a)}.md h3::before{content:"### ";color:var(--a)}
.md strong{color:#fff}
.md a{color:var(--a);text-decoration:underline;text-decoration-color:rgba(94,234,212,.4);text-underline-offset:2px}
.md code{background:rgba(255,255,255,.1);padding:0 4px}
.md pre{background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.1);padding:12px;overflow-x:auto}
.md pre code{background:none;padding:0}
.md ul{list-style:none;padding:0}.md ul>li::before{content:"- ";color:var(--a)}
.md ol{padding-left:1.5em}.md ol ::marker{color:var(--a)}
.md blockquote{margin:0;border-left:2px solid rgba(94,234,212,.5);padding-left:12px;color:rgba(255,255,255,.6)}
.md img{max-width:100%}
.md table{border-collapse:collapse}.md th,.md td{border:1px solid rgba(255,255,255,.15);padding:4px 8px}
.cur{animation:bl 1s step-end infinite}
@keyframes bl{50%{opacity:0}}
@keyframes ap{from{opacity:0;transform:translateY(8px)}}
@media (prefers-reduced-motion:reduce){.w,.cur{animation:none}}`;

const page = (o: {
  title: string;
  description: string;
  path: string;
  type?: string;
  windowTitle: string;
  body: string;
  ld?: object;
  noindex?: boolean;
}) => `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${o.noindex ? '<meta name="robots" content="noindex" />' : ""}${headMeta(o)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#000000" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>${STYLE}</style>
${o.ld ? jsonLd(o.ld) : ""}
</head>
<body>
<main class="w">
<div class="b"><span>${user}@${SITE_URL.replace(/^https:\/\//, "")}:${esc(o.windowTitle)}</span><a href="/" aria-label="Home">[x]</a></div>
<div class="c">
${o.body}
</div>
</main>
</body>
</html>
`;

const notePage = (n: BuiltNote) =>
  page({
    title: `${n.title} — ${GITHUB_USERNAME}`,
    description: n.description || SITE_DESCRIPTION,
    path: `/notes/${encodeURIComponent(n.slug)}/`,
    type: "article",
    windowTitle: `~/notes/${n.slug}`,
    ld: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: n.title,
      description: n.description,
      datePublished: n.date,
      dateModified: n.modified,
      inLanguage: "ru",
      url: noteUrl(n.slug),
      mainEntityOfPage: noteUrl(n.slug),
      image: url("/og.png"),
      author: person,
    },
    body: `<article>
${prompt("~/notes", `cat ${n.slug}.md`)}
<h1>${esc(n.title)}</h1>
<time class="date" datetime="${n.date}">${n.date}</time>
<div class="md">${n.html}</div>
</article>
<nav class="nav"><a href="/notes/">[..] все записки</a><a href="/#/notes/${encodeURIComponent(n.slug)}">[открыть в терминале]</a></nav>`,
  });

const noteList = (notes: BuiltNote[]) =>
  notes.length === 0
    ? `<p class="d">&gt; пусто</p>`
    : `<ul class="l">${notes
        .map(
          (n) =>
            `<li><time class="date" datetime="${n.date}">${n.date}</time><a href="/notes/${encodeURIComponent(n.slug)}/">${esc(n.title)}</a></li>`,
        )
        .join("")}</ul>`;

const notesIndexPage = (notes: BuiltNote[]) =>
  page({
    title: `Записки — ${GITHUB_USERNAME}`,
    description: `Записки ${GITHUB_USERNAME}: ${notes.map((n) => n.title).join(", ") || "скоро"}.`,
    path: "/notes/",
    windowTitle: "~/notes",
    ld: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: `Записки ${GITHUB_USERNAME}`,
      url: url("/notes/"),
      inLanguage: "ru",
      author: person,
      blogPost: notes.map((n) => ({ "@type": "BlogPosting", headline: n.title, url: noteUrl(n.slug), datePublished: n.date })),
    },
    body: `${prompt("~", "ls notes/")}
<h1>Записки</h1>
${noteList(notes)}
<nav class="nav"><a href="/">[cd ~]</a></nav>`,
  });

// путь показывается скриптом: страница одна на все несуществующие адреса
const notFoundPage = () =>
  page({
    title: `404 — ${GITHUB_USERNAME}`,
    description: "Страница не найдена.",
    path: "/404.html",
    windowTitle: "~",
    noindex: true,
    body: `${prompt("~", "cd ")}<div class="e">bash: cd: <span id="p">/</span>: No such file or directory</div>
${prompt("~", "echo $?")}<div>404</div><br />
<div class="d">нажми любую клавишу или <a href="/">[cd ~]</a>, чтобы вернуться домой</div>
<div><span class="u">${user}</span><span class="d">:~$ </span><span class="cur">█</span></div>
<script>
var p = location.pathname;
try { p = decodeURIComponent(p); } catch (e) {}
document.getElementById("p").textContent = p;
document.querySelector(".c > div").lastChild.textContent = "cd " + p;
addEventListener("keydown", function () { location.href = "/"; });
</script>`,
  });

const sitemap = (notes: BuiltNote[]) => {
  const today = new Date().toISOString().slice(0, 10);
  const latest = notes.map((n) => n.modified.slice(0, 10)).sort().pop() ?? today;
  const entries = [
    { loc: url("/"), lastmod: today, priority: "1.0" },
    { loc: url("/notes/"), lastmod: latest, priority: "0.8" },
    ...notes.map((n) => ({ loc: noteUrl(n.slug), lastmod: n.modified.slice(0, 10), priority: "0.6" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod><priority>${e.priority}</priority></url>`).join("\n")}
</urlset>
`;
};

const robots = () => `User-agent: *
Allow: /

Sitemap: ${url("/sitemap.xml")}
`;

// ---------- главная ----------

const homeHead = () =>
  headMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" }) +
  "\n" +
  jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: SITE_TITLE, url: SITE_URL, inLanguage: "ru", author: { "@id": `${SITE_URL}/#me` } },
      {
        "@type": "ProfilePage",
        url: SITE_URL,
        name: SITE_TITLE,
        inLanguage: "ru",
        mainEntity: { "@id": `${SITE_URL}/#me` },
      },
      { ...person, "@id": `${SITE_URL}/#me` },
    ],
  });

// текстовая версия главной внутри #root: её читают роботы без JS, а React заменяет её при запуске.
// Людям она не видна — только если JS так и не загрузился, через 3 секунды
const homeFallback = (notes: BuiltNote[]) => `<div class="seo-fallback">
<h1>${GITHUB_USERNAME}</h1>
<p>${esc(FALLBACK_BIO)}</p>
<nav>${LINKS.map((l) => `<a href="${l.href}" rel="me">${l.name}</a>`).join(" · ")}</nav>
<h2><a href="/notes/">Записки</a></h2>
${noteList(notes)}
</div>`;

export const seoPlugin = (): Plugin => ({
  name: "seo",
  transformIndexHtml(html) {
    const notes = allNotes();
    return html.replace("<!--seo:head-->", homeHead()).replace("<!--seo:fallback-->", homeFallback(notes));
  },
  generateBundle() {
    const notes = allNotes();
    const emit = (fileName: string, source: string) => this.emitFile({ type: "asset", fileName, source });
    emit("404.html", notFoundPage());
    emit("notes/index.html", notesIndexPage(notes));
    for (const n of notes) emit(`notes/${n.slug}/index.html`, notePage(n));
    emit("sitemap.xml", sitemap(notes));
    emit("robots.txt", robots());
  },
});

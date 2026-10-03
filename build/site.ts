// Плагины сборки: записки из Markdown и SEO.
// Сайт — SPA с hash-роутингом, а поисковики не видят ничего после `#` и не жмут «press any key».
// Поэтому при сборке рядом с приложением генерируются обычные статические страницы:
//   /notes/                 — список записок
//   /notes/<slug>/          — каждая записка целиком
//   /404.html, /sitemap.xml, /robots.txt, /feed.xml (RSS), /.well-known/security.txt
//   /llms.txt, /llms-full.txt, /notes/<slug>.md — для AI
// а в index.html подставляются meta-теги, JSON-LD и текстовая версия главной для роботов.

import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { Marked } from "marked";
import type { Plugin } from "vite";
import {
  ABOUT,
  FALLBACK_BIO,
  KNOWS_ABOUT,
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
  description: string; // из front matter, иначе первые ~155 символов текста — для meta description
  tags: string[]; // из front matter: keywords в JSON-LD, article:tag, категории в RSS
  modified: string; // дата последнего коммита файла (ISO), для sitemap
}

// необязательный front matter в начале записки:
//   ---
//   description: о чём записка, одной фразой — уйдёт в сниппет поиска
//   tags: web, security, ai
//   ---
//   # Заголовок
const frontMatter = (text: string): [Record<string, string>, string] => {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return [{}, text];
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return [meta, text.slice(m[0].length)];
};

// HTML → текст: блочные теги дают пробел между абзацами, а строчные (<strong>, <code>) исчезают бесследно,
// чтобы не было «Markdown -файлы»
const plain = (html: string) =>
  html
    .replace(/<\/?(p|h[1-6]|li|ul|ol|pre|blockquote|br|hr|tr|td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const git = (args: string) => {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
};
const gitDate = (file: string) => git(`log -1 --format=%cI -- "${file}"`);

// возраст и свежесть сайта по git: первый коммит — когда сайт появился, последний — когда менялся.
// Google рекомендует эти даты для ProfilePage. В CI нужна полная история (fetch-depth: 0)
const now = new Date().toISOString();
const SITE_CREATED = git("log --reverse --format=%cI").split("\n")[0] || now;
const SITE_MODIFIED = git("log -1 --format=%cI") || now;

export const readNote = (file: string): BuiltNote => {
  const slug = file.replace(/^.*[\\/]|\.md$/g, "");
  const [meta, text0] = frontMatter(readFileSync(file, "utf-8").replace(/\r\n/g, "\n").trim());
  const [first, ...rest] = text0.trim().split("\n");
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
    description: meta.description || (text.length > 155 ? `${text.slice(0, 154).trimEnd()}…` : text),
    tags: (meta.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
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

// одна сущность «ты» на весь сайт: страницы ссылаются на неё по @id, а sameAs связывает с профилями.
// Так поисковик и AI склеивают сайт, GitHub и Telegram в одного человека
const ME = `${SITE_URL}/#me`;
const person = {
  "@type": "Person",
  "@id": ME,
  name: GITHUB_USERNAME,
  alternateName: [user, `@${GITHUB_USERNAME}`],
  identifier: GITHUB_USERNAME,
  url: SITE_URL,
  image: AVATAR,
  description: ABOUT,
  knowsAbout: KNOWS_ABOUT,
  sameAs: LINKS.map((l) => l.href),
};

const jsonLd = (data: object) =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

// хлебные крошки: Google показывает их в выдаче вместо голого URL
const breadcrumbs = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: url(path) })),
});

// общие meta для всех страниц: описание, canonical, превью в соцсетях, директивы для сниппетов
const headMeta = (o: {
  title: string;
  description: string;
  path: string;
  type?: string;
  noindex?: boolean;
  article?: { published: string; modified: string; tags: string[] };
}) => `
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}" />
<meta name="robots" content="${o.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}" />
<link rel="canonical" href="${url(o.path)}" />
<meta name="author" content="${GITHUB_USERNAME}" />
${LINKS.map((l) => `<link rel="me" href="${l.href}" />`).join("\n")}
<link rel="alternate" type="application/rss+xml" title="Записки ${GITHUB_USERNAME}" href="${url("/feed.xml")}" />
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
${
  o.article
    ? [
        `<meta property="article:published_time" content="${o.article.published}" />`,
        `<meta property="article:modified_time" content="${o.article.modified}" />`,
        `<meta property="article:author" content="${SITE_URL}" />`,
        ...o.article.tags.map((t) => `<meta property="article:tag" content="${esc(t)}" />`),
      ].join("\n")
    : ""
}
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
  article?: { published: string; modified: string; tags: string[] };
  markdown?: string; // адрес .md-версии страницы — AI читают её проще, чем HTML
}) => `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${headMeta(o)}
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${o.markdown ? `<link rel="alternate" type="text/markdown" href="${o.markdown}" />` : ""}
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
<meta name="theme-color" content="#000000" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" onload="this.onload=null;this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap" /></noscript>
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
    article: { published: n.date, modified: n.modified, tags: n.tags },
    markdown: `/notes/${encodeURIComponent(n.slug)}.md`,
    windowTitle: `~/notes/${n.slug}`,
    ld: {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BlogPosting",
          headline: n.title,
          description: n.description,
          datePublished: n.date,
          dateModified: n.modified,
          inLanguage: "ru",
          url: noteUrl(n.slug),
          mainEntityOfPage: noteUrl(n.slug),
          image: url("/og.png"),
          wordCount: plain(n.html).split(" ").filter(Boolean).length,
          ...(n.tags.length && { keywords: n.tags.join(", ") }),
          isPartOf: { "@type": "Blog", "@id": url("/notes/#blog") },
          author: person,
        },
        breadcrumbs([
          [GITHUB_USERNAME, "/"],
          ["Записки", "/notes/"],
          [n.title, `/notes/${encodeURIComponent(n.slug)}/`],
        ]),
      ],
    },
    body: `<article>
${prompt("~/notes", `cat ${n.slug}.md`)}
<h1>${esc(n.title)}</h1>
<time class="date" datetime="${n.date}">${n.date}</time>${n.tags.length ? ` <span class="d">· ${n.tags.map(esc).join(", ")}</span>` : ""}
<div class="md">${n.html}</div>
</article>
<nav class="nav" aria-label="Навигация"><a href="/notes/">[..] все записки</a><a href="/#/notes/${encodeURIComponent(n.slug)}">[открыть в терминале]</a><a href="/">[~] ${GITHUB_USERNAME}</a></nav>`,
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
      "@graph": [
        {
          "@type": "Blog",
          "@id": url("/notes/#blog"),
          name: `Записки ${GITHUB_USERNAME}`,
          url: url("/notes/"),
          inLanguage: "ru",
          author: person,
          blogPost: notes.map((n) => ({
            "@type": "BlogPosting",
            headline: n.title,
            url: noteUrl(n.slug),
            datePublished: n.date,
            dateModified: n.modified,
          })),
        },
        breadcrumbs([
          [GITHUB_USERNAME, "/"],
          ["Записки", "/notes/"],
        ]),
      ],
    },
    body: `${prompt("~", "ls notes/")}
<h1>Записки</h1>
${noteList(notes)}
<nav class="nav" aria-label="Навигация"><a href="/">[cd ~] ${GITHUB_USERNAME}</a><a href="/feed.xml">[rss]</a></nav>`,
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

// lastmod — только реальные изменения (даты коммитов), а не «сегодня» при каждой сборке:
// если lastmod врёт, Google перестаёт ему доверять и обходит сайт реже
const sitemap = (notes: BuiltNote[]) => {
  const latest = notes.map((n) => n.modified.slice(0, 10)).sort().pop() ?? SITE_MODIFIED.slice(0, 10);
  const entries = [
    { loc: url("/"), lastmod: SITE_MODIFIED.slice(0, 10), priority: "1.0" },
    { loc: url("/notes/"), lastmod: latest, priority: "0.8" },
    ...notes.map((n) => ({ loc: noteUrl(n.slug), lastmod: n.modified.slice(0, 10), priority: "0.6" })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod><priority>${e.priority}</priority></url>`).join("\n")}
</urlset>
`;
};

// AI-роботы и так попадают под `*`, но явный список — сигнал, что сайт открыт для них намеренно.
// Чтобы закрыть какой-то из них, замени его Allow на Disallow
const AI_BOTS = [
  "GPTBot", // OpenAI: обучение
  "OAI-SearchBot", // ChatGPT Search
  "ChatGPT-User", // ChatGPT открывает ссылку по просьбе пользователя
  "ClaudeBot", // Anthropic: обучение
  "Claude-SearchBot", // поиск в Claude
  "Claude-User", // Claude открывает ссылку по просьбе пользователя
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini и AI Overviews
  "Applebot-Extended", // Apple Intelligence
  "Meta-ExternalAgent",
  "CCBot", // Common Crawl — на нём учатся многие модели
  "YandexAdditional", // Алиса и нейропоиск Яндекса
];

const robots = () => `User-agent: *
Allow: /

${AI_BOTS.map((b) => `User-agent: ${b}`).join("\n")}
Allow: /

Sitemap: ${url("/sitemap.xml")}
`;

// ---------- RSS ----------

// лента записок: агрегаторы, читалки и поисковики подписываются на неё и узнают о новых записках сами
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const rfc822 = (iso: string) => new Date(iso).toUTCString();

const feed = (notes: BuiltNote[]) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Записки ${esc(GITHUB_USERNAME)}</title>
  <link>${url("/notes/")}</link>
  <atom:link href="${url("/feed.xml")}" rel="self" type="application/rss+xml" />
  <description>${esc(ABOUT)}</description>
  <language>ru</language>
  <lastBuildDate>${rfc822(notes[0]?.modified ?? SITE_MODIFIED)}</lastBuildDate>
  <image><url>${url("/apple-touch-icon.png")}</url><title>Записки ${esc(GITHUB_USERNAME)}</title><link>${url("/notes/")}</link></image>
${notes
  .map(
    (n) => `  <item>
    <title>${esc(n.title)}</title>
    <link>${noteUrl(n.slug)}</link>
    <guid isPermaLink="true">${noteUrl(n.slug)}</guid>
    <pubDate>${rfc822(n.date)}</pubDate>
    <description>${esc(n.description)}</description>
${n.tags.map((t) => `    <category>${esc(t)}</category>`).join("\n")}
    <content:encoded>${cdata(n.html)}</content:encoded>
  </item>`,
  )
  .join("\n")}
</channel>
</rss>
`;

// ---------- security.txt (RFC 9116) ----------

// куда сообщать об уязвимостях. Expires обязателен и обновляется каждой сборкой
const securityTxt = () => {
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, "Z");
  return `Contact: ${LINKS.find((l) => l.name === "telegram")?.href ?? url("/")}
Contact: ${LINKS.find((l) => l.name === "github")?.href ?? url("/")}
Expires: ${expires}
Preferred-Languages: ru, en
Canonical: ${url("/.well-known/security.txt")}
`;
};

// ---------- для AI: llms.txt (стандарт llmstxt.org) и Markdown-версии ----------

const linksMd = () => LINKS.map((l) => `- [${l.name}](${l.href})`).join("\n");

// краткая карта сайта для LLM: кто, о чём, где что лежит
const llmsTxt = (notes: BuiltNote[]) => `# ${GITHUB_USERNAME}

> ${ABOUT}

Интересы: ${KNOWS_ABOUT.join(", ")}.
Сайт: ${SITE_URL} — интерактивный терминал (SPA). Весь контент также доступен как статические страницы и Markdown по ссылкам ниже.

## Ссылки

${linksMd()}

## Записки

${notes.length ? notes.map((n) => `- [${n.title}](${url(`/notes/${encodeURIComponent(n.slug)}.md`)}): ${n.description}`).join("\n") : "- пока нет"}

## Optional

- [Весь контент одним файлом](${url("/llms-full.txt")})
- [RSS записок](${url("/feed.xml")})
- [Sitemap](${url("/sitemap.xml")})
`;

const noteMd = (n: BuiltNote) => `# ${n.title}

Автор: ${GITHUB_USERNAME} · ${n.date} · ${noteUrl(n.slug)}

${n.body}
`;

// всё сразу — чтобы AI мог прочитать сайт целиком одним запросом
const llmsFullTxt = (notes: BuiltNote[]) => `# ${GITHUB_USERNAME}

> ${ABOUT}

Интересы: ${KNOWS_ABOUT.join(", ")}.

## Ссылки

${linksMd()}

${notes.map((n) => `---\n\n${noteMd(n)}`).join("\n")}`;

// ---------- главная ----------

const homeHead = () =>
  headMeta({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: "/" }) +
  "\n" +
  jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#site`,
        name: SITE_TITLE,
        alternateName: GITHUB_USERNAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        inLanguage: "ru",
        author: { "@id": ME },
        publisher: { "@id": ME },
      },
      {
        "@type": "ProfilePage",
        url: SITE_URL,
        name: SITE_TITLE,
        inLanguage: "ru",
        isPartOf: { "@id": `${SITE_URL}/#site` },
        dateCreated: SITE_CREATED,
        dateModified: SITE_MODIFIED,
        mainEntity: { "@id": ME },
      },
      person,
    ],
  });

// текстовая версия главной внутри #root: её читают роботы без JS, а React заменяет её при запуске.
// Людям она не видна — только если JS так и не загрузился, через 3 секунды
const homeFallback = (notes: BuiltNote[]) => `<div class="seo-fallback">
<h1>${GITHUB_USERNAME}</h1>
<p>${esc(FALLBACK_BIO)}</p>
<p>${esc(ABOUT)}</p>
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
    emit("feed.xml", feed(notes));
    emit(".well-known/security.txt", securityTxt());
    emit("robots.txt", robots());
    emit("llms.txt", llmsTxt(notes));
    emit("llms-full.txt", llmsFullTxt(notes));
    for (const n of notes) emit(`notes/${n.slug}.md`, noteMd(n));
  },
});

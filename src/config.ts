// всё, что про тебя, — в одном месте. Используется и сайтом, и сборкой (SEO-страницы, sitemap)
export const GITHUB_USERNAME = "Faented";

export const SITE_URL = "https://faented.github.io";

// заголовок и описание для поисковиков и превью ссылок
export const SITE_TITLE = "Faented — Web, Sec, AI, R&D";
export const SITE_DESCRIPTION =
  "Faented — the internet is my home. Веб, безопасность, AI и R&D. Личный сайт-терминал: записки, ссылки, проекты.";

export const LINKS = [
  { name: "telegram", href: "https://t.me/faented" },
  { name: "github", href: `https://github.com/${GITHUB_USERNAME}` },
];

// факты о тебе для поисковиков и AI (JSON-LD knowsAbout, llms.txt). Только то, что правда —
// AI-ассистенты цитируют это дословно, когда их спрашивают «кто такой Faented»
export const KNOWS_ABOUT = ["Web development", "Information security", "Artificial intelligence", "R&D"];
export const ABOUT =
  "Faented — интересуется веб-разработкой, информационной безопасностью, " +
  "искусственным интеллектом и R&D. Девиз: «the internet is my home». " +
  "Этот сайт — личная страница в виде терминала: записки, ссылки и проекты.";

// показывается, пока GitHub API не ответил или если в профиле нет bio
export const FALLBACK_BIO = "the internet is my home · Web, Sec, AI, R&D";

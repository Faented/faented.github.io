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

// показывается, пока GitHub API не ответил или если в профиле нет bio
export const FALLBACK_BIO = "the internet is my home · Web, Sec, AI, R&D";

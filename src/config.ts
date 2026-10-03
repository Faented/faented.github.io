// всё, что про тебя, — в одном месте. Используется и сайтом, и сборкой (SEO-страницы, sitemap)
export const GITHUB_USERNAME = "Faented";

export const SITE_URL = "https://faented.github.io";

// заголовок и описание для поисковиков и превью ссылок
export const SITE_TITLE = "Faented — терминал, записки, R&D";
export const SITE_DESCRIPTION =
  "Faented: R&D, коты, кофеин и компьютеры. Личный сайт в виде терминала — записки, ссылки, проекты.";

export const LINKS = [
  { name: "telegram", href: "https://t.me/faented" },
  { name: "github", href: `https://github.com/${GITHUB_USERNAME}` },
];

// показывается, пока GitHub API не ответил или если в профиле нет bio
export const FALLBACK_BIO = "love cats · addict of caffeine & computer · R&D";

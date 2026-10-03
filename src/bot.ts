// поисковые и AI-роботы: им не нужны заставка и видео — только контент.
// Это не подмена: робот видит ровно то, что человек увидит после загрузки, просто без декора.
//
// Только точные имена роботов, а не общие слова: «claude», «google», «gpt» встречаются и в обычных
// браузерах (например, встроенный браузер приложения Claude — «Claude/2.x»), и человек остался бы без заставки
const BOTS = new RegExp(
  [
    "googlebot",
    "google-inspectiontool",
    "googleother",
    "google-extended",
    "storebot-google",
    "bingbot",
    "bingpreview",
    "yandex(bot|images|additional|renderer|metrika)",
    "duckduckbot",
    "baiduspider",
    "slurp",
    "applebot",
    "petalbot",
    "seznambot",
    "facebookexternalhit",
    "meta-externalagent",
    "telegrambot",
    "twitterbot",
    "discordbot",
    "linkedinbot",
    "gptbot",
    "oai-searchbot",
    "chatgpt-user",
    "claudebot",
    "claude-user",
    "claude-searchbot",
    "anthropic-ai",
    "perplexitybot",
    "perplexity-user",
    "ccbot",
    "chrome-lighthouse",
    "headlesschrome",
    "\\bbot\\b",
    "crawler",
    "spider",
  ].join("|"),
  "i",
);

export const isBot = () => navigator.webdriver || BOTS.test(navigator.userAgent);

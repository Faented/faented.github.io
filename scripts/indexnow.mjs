// IndexNow: после деплоя сообщаем поисковикам (Bing → DuckDuckGo, Яндекс, Seznam, Naver, Yep),
// какие страницы изменились, — чтобы они переобошли их сразу, а не когда дойдёт очередь.
// Запускается из .github/workflows/deploy.yml. Протокол: https://www.indexnow.org/documentation
//
// Ключ — файл public/<key>.txt с самим ключом внутри. Он публичный по замыслу: поисковик скачивает его
// с сайта и так убеждается, что уведомление пришло от владельца.

import { execSync } from "node:child_process";
import { readdirSync } from "node:fs";

const SITE = "https://faented.github.io";
const HOST = new URL(SITE).host;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const keyFile = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) {
  console.log("IndexNow: ключ public/<hex>.txt не найден — пропускаю");
  process.exit(0);
}
const KEY = keyFile.replace(/\.txt$/, "");

const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const noteUrl = (file) => `${SITE}/notes/${encodeURIComponent(file.replace(/^.*\/|\.md$/g, ""))}/`;

// что поменялось с прошлого пуша. Нет точки отсчёта (ручной запуск, первый пуш) — отправляем все записки
const before = process.env.BEFORE ?? "";
const hasBefore = /^[0-9a-f]{40}$/.test(before) && !/^0+$/.test(before);
let changed, deleted;
try {
  if (!hasBefore) throw new Error("no base");
  // без «^{commit}»: в cmd.exe символ ^ — экранирование, и git получил бы испорченный аргумент
  if (git(`cat-file -t ${before}`) !== "commit") throw new Error("not a commit");
  const diff = (filter) =>
    git(`diff --name-only --diff-filter=${filter} ${before} HEAD -- src/notes`).split("\n").filter(Boolean);
  changed = diff("AMR");
  deleted = diff("D");
} catch {
  changed = git("ls-files src/notes").split("\n").filter((f) => f.endsWith(".md"));
  deleted = [];
}

// главная меняется каждым деплоем (хеш коммита в приглашении), список записок — когда меняются записки
const urls = [`${SITE}/`];
if (changed.length || deleted.length) urls.push(`${SITE}/notes/`);
urls.push(...changed.map(noteUrl));
// удалённые тоже отправляем: поисковик увидит 404 и уберёт страницу из выдачи
const gone = deleted.map(noteUrl);

// DRY_RUN=1 — только показать, что отправилось бы (для локальной проверки)
if (process.env.DRY_RUN) {
  console.log(`IndexNow (dry run), key ${KEY}:`);
  for (const u of [...urls, ...gone]) console.log(`  ${u}`);
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const status = async (u) => {
  try {
    return (await fetch(u, { method: "HEAD", cache: "no-store" })).status;
  } catch {
    return 0;
  }
};

// GitHub Pages публикует ветку gh-pages с задержкой. Ждём, пока ключ и новые страницы реально появятся,
// иначе поисковик придёт раньше нас и увидит старое
const mustBeLive = [`${SITE}/${KEY}.txt`, ...changed.map(noteUrl)];
for (let i = 0; i < 60; i++) {
  const codes = await Promise.all(mustBeLive.map(status));
  if (codes.every((c) => c === 200)) break;
  if (i === 59) {
    console.log(`IndexNow: страницы так и не появились (${codes.join(", ")}) — пропускаю`);
    process.exit(0);
  }
  await sleep(10_000);
}

const urlList = [...urls, ...gone];
const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});

// 200 — принято, 202 — принято, ключ ещё проверяется. Остальное — сообщаем, но деплой не роняем
console.log(`IndexNow: ${res.status} ${res.statusText}`);
for (const u of urlList) console.log(`  ${u}`);
if (res.status >= 400) console.log(await res.text());

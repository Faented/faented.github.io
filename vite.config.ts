/// <reference types="vite/client" />

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Marked } from 'marked';

// короткий SHA коммита, из которого собран сайт: в CI — GITHUB_SHA, локально — git
const commit = (() => {
  try {
    return (process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD').toString()).trim().slice(0, 7);
  } catch {
    return 'dev';
  }
})();

// кавычка в адресе или title ссылки не должна ломать HTML-атрибут
const attr = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// записки пишешь ты сам, поэтому HTML из Markdown доверенный.
// внешние ссылки открываем в новой вкладке, чтобы не уходить с сайта
const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const attrs = /^https?:\/\//.test(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a href="${attr(href)}"${title ? ` title="${attr(title)}"` : ''}${attrs}>${text}</a>`;
    },
  },
});

// `import x from './note.md?note'` → { title, body, html }.
// Markdown превращается в HTML при сборке, так что marked не попадает в бандл
const notes = (): Plugin => ({
  name: 'notes-markdown',
  load(id) {
    const [file, query] = id.split('?');
    if (query !== 'note') return;
    this.addWatchFile(file);
    const [first, ...rest] = readFileSync(file, 'utf-8').replace(/\r\n/g, '\n').trim().split('\n');
    const hasTitle = first.startsWith('# ');
    const body = (hasTitle ? rest : [first, ...rest]).join('\n').trim();
    const note = {
      title: hasTitle ? first.slice(2).trim() : null,
      body,
      html: md.parse(body, { async: false }),
    };
    return `export default ${JSON.stringify(note)};`;
  },
});

export default defineConfig({
  plugins: [react(), notes()],
  define: {
    __COMMIT__: JSON.stringify(commit)
  },
  build: {
    target: 'esnext',
    minify: true
  }
});

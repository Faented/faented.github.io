export interface Note {
  slug: string;
  date: string;
  title: string;
  body: string;
  html: string; // body, отрендеренный из Markdown при сборке (плагин notes-markdown в vite.config.ts)
}

const files = import.meta.glob<{ title: string | null; body: string; html: string }>("./notes/*.md", {
  query: "?note",
  import: "default",
  eager: true,
});

export const notes: Note[] = Object.entries(files)
  .map(([path, note]) => {
    const slug = path.replace(/^.*\/|\.md$/g, "");
    return {
      slug,
      date: slug.slice(0, 10),
      title: note.title ?? slug.slice(11),
      body: note.body,
      html: note.html,
    };
  })
  .sort((a, b) => b.slug.localeCompare(a.slug));

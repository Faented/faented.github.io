export interface Note {
  slug: string;
  date: string;
  title: string;
  body: string;
}

const files = import.meta.glob("./notes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const notes: Note[] = Object.entries(files)
  .map(([path, raw]) => {
    const slug = path.replace(/^.*\/|\.md$/g, "");
    const [first, ...rest] = raw.trim().split("\n");
    const hasTitle = first.startsWith("# ");
    return {
      slug,
      date: slug.slice(0, 10),
      title: hasTitle ? first.slice(2).trim() : slug.slice(11),
      body: (hasTitle ? rest : [first, ...rest]).join("\n").trim(),
    };
  })
  .sort((a, b) => b.slug.localeCompare(a.slug));

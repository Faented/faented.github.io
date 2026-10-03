import React from "react";
import { Prompt } from "../components/Prompt";
import { notes } from "../notes";
import { SiteLink, noteHref, noteSpa } from "../components/SiteLink";

const Back: React.FC<{ href: string }> = ({ href }) => (
  <a href={href} className="hover:text-accent transition-colors">
    [..]
  </a>
);

export const Notes: React.FC<{ slug?: string }> = ({ slug }) => {
  const note = slug && notes.find((n) => n.slug === slug);

  if (note) {
    return (
      <div className="space-y-3">
        <Prompt cmd={`cat notes/${note.slug}.md`} />
        <h2 className="text-lg text-white">{note.title}</h2>
        <p className="text-white/40">{note.date}</p>
        <div className="md select-text" dangerouslySetInnerHTML={{ __html: note.html }} />
        <Back href="#/notes" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Prompt cmd="ls notes/" />
      {slug && <p className="text-red-400">&gt; no such file: {slug}</p>}
      {notes.length === 0 && <p className="text-white/50">&gt; пусто</p>}
      <ul className="space-y-1">
        {notes.map((n) => (
          <li key={n.slug}>
            <SiteLink href={noteHref(n.slug)} spa={noteSpa(n.slug)} className="group flex gap-4">
              <span className="text-white/40">{n.date}</span>
              <span className="group-hover:text-accent transition-colors">{n.title}</span>
            </SiteLink>
          </li>
        ))}
      </ul>
      <Back href="#/" />
    </div>
  );
};

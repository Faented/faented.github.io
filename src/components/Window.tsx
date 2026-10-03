import React from "react";
import { useTerminal } from "../terminal";
import { notes } from "../notes";
import { SiteLink } from "./SiteLink";

interface Props {
  path: string;
  children: React.ReactNode;
}

const link = "hover:text-accent transition-colors";

// квадратное стеклянное окно терминала
export const Window: React.FC<Props> = ({ path, children }) => {
  const { user, host } = useTerminal();
  return (
    <div className="relative z-10 w-[92%] max-w-2xl bg-black/50 backdrop-blur-md animate-appear border border-white/15 shadow-2xl font-mono text-sm text-white/90">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-white/60">
        <span className="truncate">
          {user}@{host}:{path}
        </span>
        <a href="#/" className="hover:text-accent" aria-label="Home">
          [x]
        </a>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
      {/* строка состояния в духе tmux. Ссылки в ней настоящие (/notes/, /feed.xml): это постоянные
          внутренние ссылки, по которым поисковик находит записки с главной — команды он не вводит */}
      <nav
        aria-label="Разделы сайта"
        className="flex items-center justify-between gap-4 px-4 py-1.5 border-t border-white/10 bg-white/5 text-xs text-white/40"
      >
        <div className="flex gap-4">
          <SiteLink href="/notes/" spa="#/notes" className={link}>
            [notes:{notes.length}]
          </SiteLink>
          <a href="/feed.xml" className={link}>
            [rss]
          </a>
        </div>
        <span aria-hidden="true">utf-8 · ru</span>
      </nav>
    </div>
  );
};

import React from "react";
import { useTerminal } from "../terminal";

interface Props {
  path: string;
  children: React.ReactNode;
}

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
    </div>
  );
};

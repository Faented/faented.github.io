import { createContext, useContext } from "react";

export interface TerminalInfo {
  user: string; // ник с GitHub в нижнем регистре
  host: string; // короткий SHA коммита, из которого задеплоен сайт
  bio: string | null;
  cwd: string; // текущая папка терминала: "" это ~, "notes" это ~/notes
  setCwd: (dir: string) => void;
}

export const TerminalContext = createContext<TerminalInfo>({
  user: "faented",
  host: __COMMIT__,
  bio: null,
  cwd: "",
  setCwd: () => {},
});

export const useTerminal = () => useContext(TerminalContext);

import { createContext, useContext } from "react";

export interface TerminalInfo {
  user: string; // ник с GitHub в нижнем регистре
  host: string; // короткий SHA коммита, из которого задеплоен сайт
  bio: string | null;
}

export const TerminalContext = createContext<TerminalInfo>({
  user: "faented",
  host: __COMMIT__,
  bio: null,
});

export const useTerminal = () => useContext(TerminalContext);

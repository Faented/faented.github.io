import { useEffect } from "react";

// прячем меню правой кнопки на декоре, но не там, где оно нужно:
// на ссылках (открыть в новой вкладке, копировать), в полях ввода и в выделяемом тексте
const ALLOWED = "a, input, textarea, .select-text";

export const useDisableContextMenu = () => {
  useEffect(() => {
    const prevent = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(ALLOWED)) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", prevent);
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);
};

import { useEffect } from "react";

export const useDisableContextMenu = () => {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();

    // Attach handler when component mounts
    document.addEventListener("contextmenu", prevent);

    // Clean up when component unmounts
    return () => document.removeEventListener("contextmenu", prevent);
  }, []);
};

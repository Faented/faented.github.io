import { useEffect, useState } from "react";

// hash-роутинг: GitHub Pages не умеет отдавать index.html на /notes,
// а #/notes работает без 404 и без зависимостей
const read = () => window.location.hash.replace(/^#/, "") || "/";

export const useHashRoute = () => {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
};

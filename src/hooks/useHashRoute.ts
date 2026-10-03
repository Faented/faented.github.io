import { useEffect, useState } from "react";

// hash-роутинг: GitHub Pages не умеет отдавать index.html на /notes,
// а #/notes работает без 404 и без зависимостей.
// Декодируем (кириллица в имени записки) и убираем хвостовой слэш: #/notes/ == #/notes
const read = () => {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  let route = raw;
  try {
    route = decodeURIComponent(raw);
  } catch {}
  return route.length > 1 ? route.replace(/\/+$/, "") : route;
};

export const useHashRoute = () => {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
};

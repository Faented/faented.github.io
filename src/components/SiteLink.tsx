import React from "react";

interface Props extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string; // настоящий адрес статической страницы — его видят поисковики
  spa: string; // куда перейти внутри приложения — так кликает человек
}

// Ссылка с двумя адресами. В href — настоящая страница (/notes/<slug>/): поисковик видит обычную
// внутреннюю ссылку и идёт по ней (ссылки на #/... для него — та же главная). Обычный клик человека
// перехватываем и открываем то же самое внутри терминала. Ctrl/Cmd/средний клик не трогаем —
// откроется статическая страница в новой вкладке, как и ждёт человек
export const SiteLink: React.FC<Props> = ({ href, spa, onClick, children, ...rest }) => (
  <a
    href={href}
    onClick={(e) => {
      onClick?.(e);
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      window.location.hash = spa;
    }}
    {...rest}
  >
    {children}
  </a>
);

export const noteHref = (slug: string) => `/notes/${encodeURIComponent(slug)}/`;
export const noteSpa = (slug: string) => `#/notes/${encodeURIComponent(slug)}`;

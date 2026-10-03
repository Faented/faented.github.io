import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDisableContextMenu } from "./hooks/useDisableContextMenu";
import { useHashRoute } from "./hooks/useHashRoute";
import { Background } from "./components/Background";
import { Boot } from "./components/Boot";
import { Window } from "./components/Window";
import { Home, GitHubUser } from "./pages/Home";
import { Notes } from "./pages/Notes";
import { TerminalContext } from "./terminal";
import { GITHUB_USERNAME, SITE_TITLE } from "./config";
import { notes } from "./notes";

// поисковые роботы не нажимают «press any key» — им сразу показываем сайт.
// Это не подмена контента: роботы видят ровно то, что человек увидит после загрузки
const isBot = () =>
  navigator.webdriver ||
  /bot|crawl|spider|slurp|yandex|google|bing|duckduck|baidu|facebookexternalhit|telegram|lighthouse|headless|gpt|chatgpt|openai|claude|anthropic|perplexity|meta-external|ccbot/i.test(
    navigator.userAgent,
  );

const App: React.FC = () => {
  useDisableContextMenu();
  const route = useHashRoute();

  // загрузку показываем один раз за вкладку и не показываем тем, кто пришёл по прямой ссылке (#/notes/...)
  const [booted, setBooted] = useState(() => {
    if (route !== "/" || isBot()) return true;
    try {
      return sessionStorage.getItem("booted") === "1";
    } catch {
      return false;
    }
  });
  // текущая папка терминала — живёт здесь, чтобы её видел и заголовок окна
  const [cwd, setCwd] = useState("");
  const finishBoot = useCallback(() => {
    try {
      sessionStorage.setItem("booted", "1");
    } catch {}
    setBooted(true);
  }, []);

  const overlayRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);

  // GitHub API
  useEffect(() => {
    let cancelled = false;
    fetch(`https://api.github.com/users/${GITHUB_USERNAME}`)
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
        return res.json() as Promise<GitHubUser>;
      })
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, []);

  // курсор-подсветка
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      overlayRef.current?.style.setProperty("--mouse-x", `${e.clientX}px`);
      overlayRef.current?.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  const notesMatch = route.match(/^\/notes(?:\/(.+))?$/);

  // заголовок вкладки следует за страницей: его видно в истории, закладках и при шаринге
  useEffect(() => {
    const note = notesMatch?.[1] && notes.find((n) => n.slug === notesMatch[1]);
    document.title = note
      ? `${note.title} — ${GITHUB_USERNAME}`
      : notesMatch
        ? `Записки — ${GITHUB_USERNAME}`
        : SITE_TITLE;
  }, [route]);

  return (
    <div className="relative flex items-center justify-center min-h-screen min-h-[100dvh] overflow-hidden py-10">
      <Background visible={booted} />
      {!booted && <Boot onDone={finishBoot} />}
      {booted && (
        <TerminalContext.Provider
          value={{
            user: (user?.login ?? GITHUB_USERNAME).toLowerCase(),
            host: __COMMIT__,
            bio: user?.bio ?? null,
            cwd,
            setCwd,
          }}
        >
          {notesMatch ? (
            <Window path={`~/notes${notesMatch[1] ? `/${notesMatch[1]}` : ""}`}>
              <Notes slug={notesMatch[1]} />
            </Window>
          ) : (
            <Window path={cwd ? `~/${cwd}` : "~"}>
              <Home user={user} />
            </Window>
          )}
        </TerminalContext.Provider>
      )}
      <div ref={overlayRef} className="overlay" />
    </div>
  );
};

export default App;

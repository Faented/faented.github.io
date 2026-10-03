import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDisableContextMenu } from "./hooks/useDisableContextMenu";
import { useHashRoute } from "./hooks/useHashRoute";
import { Background } from "./components/Background";
import { Boot } from "./components/Boot";
import { Window } from "./components/Window";
import { Home, GitHubUser } from "./pages/Home";
import { Notes } from "./pages/Notes";
import { TerminalContext } from "./terminal";

const GITHUB_USERNAME = "Faented";

const App: React.FC = () => {
  useDisableContextMenu();
  const route = useHashRoute();

  // загрузку показываем один раз за вкладку и не показываем тем, кто пришёл по прямой ссылке (#/notes/...)
  const [booted, setBooted] = useState(() => {
    if (route !== "/") return true;
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

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden py-10">
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
              <Home user={user} username={GITHUB_USERNAME} />
            </Window>
          )}
        </TerminalContext.Provider>
      )}
      <div ref={overlayRef} className="overlay" />
    </div>
  );
};

export default App;

import React, { useEffect, useRef, useState } from "react";
import { useDisableContextMenu } from "./hooks/useDisableContextMenu";

const backgroundImage = "${import.meta.env.BASE_URL}background.jpg";

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
}

const GITHUB_USERNAME = "Faented";

const App: React.FC = () => {
  useDisableContextMenu();

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

  const socialLinks = [
    {
      href: "https://t.me/tryhaxme",
      label: "Telegram",
      icon: (
        <svg
          viewBox="0 0 32 32"
          fill="currentColor"
          aria-hidden="true"
          className="w-full h-full"
        >
          <path d="M22.122 10.040c0.006-0 0.014-0 0.022-0 0.209 0 0.403 0.065 0.562 0.177l-0.003-0.002c0.116 0.101 0.194 0.243 0.213 0.403l0 0.003c0.020 0.122 0.031 0.262 0.031 0.405 0 0.065-0.002 0.129-0.007 0.193l0-0.009c-0.225 2.369-1.201 8.114-1.697 10.766-0.21 1.123-0.623 1.499-1.023 1.535-0.869 0.081-1.529-0.574-2.371-1.126-1.318-0.865-2.063-1.403-3.342-2.246-1.479-0.973-0.52-1.51 0.322-2.384 0.221-0.23 4.052-3.715 4.127-4.031 0.004-0.019 0.006-0.040 0.006-0.062 0-0.078-0.029-0.149-0.076-0.203l0 0c-0.052-0.034-0.117-0.053-0.185-0.053-0.045 0-0.088 0.009-0.128 0.024l0.002-0.001q-0.198 0.045-6.316 4.174c-0.445 0.351-1.007 0.573-1.619 0.599l-0.006 0c-0.867-0.105-1.654-0.298-2.401-0.573l0.074 0.024c-0.938-0.306-1.683-0.467-1.619-0.985q0.051-0.404 1.114-0.827 6.548-2.853 8.733-3.761c1.607-0.853 3.47-1.555 5.429-2.010l0.157-0.031zM15.93 1.025c-8.302 0.020-15.025 6.755-15.025 15.060 0 8.317 6.742 15.060 15.060 15.060s15.060-6.742 15.060-15.060c0-8.305-6.723-15.040-15.023-15.060h-0.002q-0.035-0-0.070 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      {/* изображение */}
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* вуаль поверх фото */}
      {/* <div className="absolute inset-0 bg-[#fce0ef]/30" /> */}

      <div className="relative z-10 bg-black/[0.5] backdrop-blur p-8 rounded-2xl border border-white/[0.3] shadow-2xl animate-float w-[90%] max-w-xl">
        <div className="flex items-center gap-6 sm:gap-8">
          <a
            href={`https://github.com/${user?.login ?? GITHUB_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="group shrink-0"
          >
            <img
              src={
                user
                  ? `${user.avatar_url}&s=460`
                  : `https://github.com/${GITHUB_USERNAME}.png`
              }
              alt={user?.login ?? GITHUB_USERNAME}
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full object-cover border border-black/30 transition-transform duration-300 ease-out group-hover:scale-105"
            />
          </a>

          {/* имя ник иконки */}
          <div className="flex flex-col items-start min-w-0">
            <h1 className="font-bold text-3xl sm:text-4xl leading-tight text-white break-words">
              {user?.name ?? "Faented"}
            </h1>

            <p className="mt-1 w-fit text-base sm:text-lg text-white break-words">
              @{user?.login ?? GITHUB_USERNAME}
            </p>

            {user?.bio && (
              <p className="mt-2 text-sm text-white/60">{user.bio}</p>
            )}

            <div className="flex mt-4 space-x-4">
              {socialLinks.map(({ href, label, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-white w-9 h-9 flex items-center justify-center transition-transform hover:scale-125"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div ref={overlayRef} className="overlay" />
    </div>
  );
};

export default App;
import React from "react";
import { Shell } from "../components/Shell";
import { GITHUB_USERNAME as username } from "../config";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
}

export const Home: React.FC<{ user: GitHubUser | null }> = ({ user }) => (
  <>
    <div className="flex items-center gap-5 pb-5 border-b border-white/10 font-sans">
      <a
        href={`https://github.com/${user?.login ?? username}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub profile"
        className="shrink-0"
      >
        <img
          src={user ? `${user.avatar_url}&s=240` : `https://github.com/${username}.png`}
          alt={`Аватар ${user?.login ?? username}`}
          width={96}
          height={96}
          decoding="async"
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover border border-white/20"
        />
      </a>
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white break-words">
          {user?.name ?? username}
        </h1>
        <p className="text-white/60">@{user?.login ?? username}</p>
      </div>
    </div>

    <div className="mt-5 leading-relaxed">
      <Shell />
    </div>
  </>
);

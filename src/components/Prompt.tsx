import React from "react";
import { useTerminal } from "../terminal";

// path — текущая папка: "" это ~, "links" это ~/links
const show = (path = "") => (path ? `~/${path}` : "~");

export const PromptPrefix: React.FC<{ path?: string }> = ({ path }) => {
  const { user, host } = useTerminal();
  return (
    <>
      <span className="text-accent">
        {user}@{host}
      </span>
      <span className="text-white/50">:{show(path)}$&nbsp;</span>
    </>
  );
};

export const Prompt: React.FC<{ cmd: string; path?: string }> = ({ cmd, path }) => (
  <div>
    <PromptPrefix path={path} />
    {cmd}
  </div>
);

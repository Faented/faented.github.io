import React, { useEffect, useRef, useState } from "react";
import { Prompt, PromptPrefix } from "./Prompt";
import { useTerminal } from "../terminal";
import { notes } from "../notes";
import { FALLBACK_BIO, LINKS } from "../config";
import { SiteLink, noteHref, noteSpa } from "./SiteLink";

interface Entry {
  cmd: string;
  path: string; // папка, в которой команду запустили — для приглашения в истории
  out: React.ReactNode;
}

// что команда знает о терминале: текущая папка и как её сменить
interface Ctx {
  cwd: string;
  cd: (dir: string) => void;
}

const item = "hover:text-accent transition-colors";
const err = (text: string) => <span className="text-red-400">{text}</span>;

// «файловая система»: корень ~ → папки → содержимое. Глубже одного уровня не бывает
const dirs: Record<string, () => React.ReactNode> = {
  links: () => (
    <div className="flex flex-wrap gap-x-4">
      {LINKS.map((l) => (
        <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className={item}>
          {l.name}
        </a>
      ))}
    </div>
  ),
  notes: () =>
    notes.length === 0 ? (
      <span className="text-white/50">(пусто)</span>
    ) : (
      <div className="flex flex-col">
        {notes.map((n) => (
          <SiteLink key={n.slug} href={noteHref(n.slug)} spa={noteSpa(n.slug)} className={item}>
            {n.slug}.md
          </SiteLink>
        ))}
      </div>
    ),
};

// файлы внутри папки — для cat и Tab-дополнения
const files = (dir: string) => (dir === "notes" ? notes.map((n) => `${n.slug}.md`) : []);

// путь относительно cwd → папка ("" = ~) или null, если такой нет
const resolveDir = (cwd: string, target = ""): string | null => {
  let dir = /^[~/]/.test(target) ? "" : cwd;
  for (const part of target.replace(/^~/, "").split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") dir = "";
    else if (dir === "" && part in dirs) dir = part;
    else return null;
  }
  return dir;
};

// путь к файлу → [папка или null, имя файла]
const splitFile = (cwd: string, target: string): [string | null, string] => {
  const i = target.lastIndexOf("/");
  if (i === -1) return [cwd, target];
  return [resolveDir(cwd, target.slice(0, i) || "/"), target.slice(i + 1)];
};

const ls = ([target]: string[], { cwd }: Ctx) => {
  const dir = resolveDir(cwd, target);
  if (dir === null) return err(`ls: ${target}: no such directory`);
  if (dir) return dirs[dir]();
  return (
    <div className="flex gap-x-4">
      {Object.keys(dirs).map((d) => (
        <span key={d} className="text-accent">
          {d}/
        </span>
      ))}
    </div>
  );
};

const cd = ([target]: string[], ctx: Ctx) => {
  const dir = resolveDir(ctx.cwd, target ?? "~");
  if (dir === null) return err(`cd: ${target}: no such directory`);
  ctx.cd(dir);
  return null;
};

const CAT = String.raw`
 /\_/\
( o.o )  meow
 > ^ <`;

const cat = ([target]: string[], { cwd }: Ctx) => {
  if (!target) return <pre className="text-accent leading-tight">{CAT}</pre>;
  if (resolveDir(cwd, target) !== null) return err(`cat: ${target}: is a directory`);
  const [dir, file] = splitFile(cwd, target);
  const note = dir === "notes" && notes.find((n) => n.slug === file.replace(/\.md$/, ""));
  if (!note) return err(`cat: ${target}: no such file`);
  return (
    <div className="my-1 select-text">
      <p className="text-white">
        # {note.title} <span className="text-white/40">· {note.date}</span>
      </p>
      <div className="md" dangerouslySetInnerHTML={{ __html: note.html }} />
    </div>
  );
};

// bio приходит из GitHub API асинхронно — компонент перерисуется, когда оно загрузится
const WhoAmI: React.FC = () => {
  const { bio } = useTerminal();
  return <>{bio ?? FALLBACK_BIO}</>;
};

// команды: имя → [описание, обработчик]; обработчик возвращает вывод. Пустое описание — скрыта из help
const commands: Record<string, [string, (args: string[], ctx: Ctx) => React.ReactNode]> = {
  help: ["список команд", () => (
    <div className="grid grid-cols-[8rem_1fr] gap-x-2">
      {Object.entries(commands).filter(([, [d]]) => d).map(([name, [desc]]) => (
        <React.Fragment key={name}>
          <span className="text-accent">{name}</span>
          <span className="text-white/60">{desc}</span>
        </React.Fragment>
      ))}
    </div>
  )],
  whoami: ["кто я", () => <WhoAmI />],
  ls: ["ls [папка]", ls],
  cd: ["cd папка | .. | ~", cd],
  pwd: ["где я", (_, { cwd }) => (cwd ? `/home/faented/${cwd}` : "/home/faented")],
  cat: ["cat notes/файл.md, без аргумента — мяу", cat],
  open: [`open ${[...LINKS.map((l) => l.name), "notes"].join(" | ")}`, ([target]) => {
    const link = LINKS.find((l) => l.name === target?.toLowerCase());
    if (link) {
      window.open(link.href, "_blank", "noopener,noreferrer");
      return `> opening ${link.name}...`;
    }
    if (target === "notes") {
      window.location.hash = "#/notes";
      return null;
    }
    return `usage: open ${[...LINKS.map((l) => l.name), "notes"].join(" | ")}`;
  }],
  notes: ["последние записки", () =>
    notes.length === 0 ? "> пусто" : (
      <ul>
        {notes.slice(0, 5).map((n) => (
          <li key={n.slug}>
            <SiteLink href={noteHref(n.slug)} spa={noteSpa(n.slug)} className={item}>
              <span className="text-white/40">{n.date}</span> {n.title}
            </SiteLink>
          </li>
        ))}
      </ul>
    )],
  coffee: ["☕", () => {
    const cups = Math.floor(Math.random() * 5) + 1;
    return "☕".repeat(cups) + `  ${cups} cup${cups > 1 ? "s" : ""} today, not enough`;
  }],
  date: ["текущее время", () => new Date().toLocaleString()],
  echo: ["повторить текст", (args) => args.join(" ")],
  sudo: ["", () => err("nice try 😼")],
  clear: ["очистить экран", () => null],
};

const exec = (line: string, ctx: Ctx): Entry => {
  const [name, ...args] = line.split(/\s+/);
  const cmd = commands[name.toLowerCase()];
  const out = cmd ? cmd[1](args, ctx) : err(`command not found: ${name}. try help`);
  return { cmd: line, path: ctx.cwd, out };
};

// выполняем как обычные команды, чтобы они были частью истории: скроллятся и стираются `clear`
const initial = ["whoami", "help"];

// экран и история ввода живут дольше компонента: ушёл в записки и вернулся — терминал тот же
const session: { screen: Entry[] | null; typed: string[] } = { screen: null, typed: [] };

// мышь есть — значит, есть и клавиатура: фокусируем ввод сразу. На телефоне не трогаем, иначе выскочит клавиатура
const finePointer = () => window.matchMedia("(pointer: fine)").matches;

export const Shell: React.FC = () => {
  const { cwd, setCwd } = useTerminal();
  // screen — что видно на экране (clear стирает), typed — что ты вводил (для ↑/↓, clear не трогает)
  const [screen, setScreen] = useState<Entry[]>(
    () => session.screen ?? initial.map((line) => exec(line, { cwd: "", cd: () => {} })),
  );
  const [typed, setTyped] = useState<string[]>(session.typed);
  const [input, setInput] = useState("");
  const [pos, setPos] = useState(-1); // позиция в typed для ↑/↓
  const inputRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    session.screen = screen;
    session.typed = typed;
  }, [screen, typed]);

  useEffect(() => {
    if (finePointer()) inputRef.current?.focus({ preventScroll: true });
  }, []);

  // прокручиваем только сам терминал, а не всю страницу
  useEffect(() => {
    const el = outRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [screen]);

  const run = (raw: string) => {
    const line = raw.trim();
    setInput("");
    setPos(-1);
    if (!line) return;
    setTyped((t) => (t[t.length - 1] === line ? t : [...t, line]));
    if (line.split(/\s+/)[0].toLowerCase() === "clear") return setScreen([]);
    const entry = exec(line, { cwd, cd: setCwd });
    setScreen((h) => [...h, entry]);
  };

  // Tab: первое слово дополняем командой, остальные — папкой или файлом
  const complete = () => {
    const parts = input.split(" ");
    const last = parts[parts.length - 1];
    let options: string[];
    if (parts.length === 1) {
      options = Object.keys(commands);
    } else {
      const i = last.lastIndexOf("/");
      const base = last.slice(0, i + 1);
      const dir = resolveDir(cwd, base || ".");
      if (dir === null) return;
      const names = dir ? files(dir) : Object.keys(dirs).map((d) => `${d}/`);
      options = names.map((n) => base + n);
    }
    const match = options.find((o) => last && o.startsWith(last));
    if (match) setInput([...parts.slice(0, -1), match].join(" "));
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const cmds = typed;
    if (e.key === "Enter") run(input);
    else if (e.key === "ArrowUp" && cmds.length) {
      e.preventDefault();
      const next = pos === -1 ? cmds.length - 1 : Math.max(0, pos - 1);
      setPos(next);
      setInput(cmds[next]);
    } else if (e.key === "ArrowDown" && pos !== -1) {
      e.preventDefault();
      const next = pos + 1;
      setPos(next >= cmds.length ? -1 : next);
      setInput(next >= cmds.length ? "" : cmds[next]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    }
  };

  // клик по терминалу ставит курсор в ввод — но не когда жмут ссылку или выделяют текст,
  // и не на телефоне, где это открыло бы клавиатуру при каждой прокрутке
  const focusInput = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("a")) return;
    if (window.getSelection()?.toString()) return;
    if (!finePointer() && e.target !== e.currentTarget) return;
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div onClick={focusInput} className="cursor-text">
      <div
        ref={outRef}
        role="log"
        aria-live="polite"
        aria-label="terminal output"
        className="max-h-64 overflow-y-auto no-scrollbar space-y-1"
      >
        {screen.map((h, i) => (
          <div key={i}>
            <Prompt cmd={h.cmd} path={h.path} />
            {h.out != null && <div className="text-white/70">{h.out}</div>}
          </div>
        ))}
      </div>

      <label className="flex">
        <PromptPrefix path={cwd} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoComplete="off"
          aria-label="terminal input"
          enterKeyHint="send"
          autoCapitalize="off"
          autoCorrect="off"
          // 16px на телефоне: при меньшем шрифте iOS Safari зумит страницу при фокусе
          className="flex-1 min-w-0 bg-transparent outline-none caret-accent text-base sm:text-sm"
        />
      </label>
    </div>
  );
};

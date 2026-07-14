"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type Tab = {
  label: string;
  href: string;
  icon: string;
  id: "chat" | "history" | "metrics" | "settings";
};

type StudioChromeProps = {
  children: ReactNode;
  activeTab: Tab["id"];
};

type AppLanguage = "es" | "en-US";

const LANGUAGE_STORAGE_KEY = "app_language";

const tabs: Tab[] = [
  { id: "chat", label: "Chat", href: "/", icon: "💬" },
  { id: "history", label: "Historial", href: "/history", icon: "🕘" },
  { id: "metrics", label: "Métricas", href: "/metrics", icon: "📈" },
  { id: "settings", label: "Ajustes", href: "/settings", icon: "⚙" },
];

const textByLanguage: Record<
  AppLanguage,
  {
    title: string;
    settingsLabel: string;
    lightModeLabel: string;
    darkModeLabel: string;
    languageLabel: string;
    tabLabels: Record<Tab["id"], string>;
  }
> = {
  es: {
    title: "SIngIA",
    settingsLabel: "Ajustes",
    lightModeLabel: "Alternar a modo claro",
    darkModeLabel: "Alternar a modo oscuro",
    languageLabel: "Idioma",
    tabLabels: {
      chat: "Chat",
      history: "Historial",
      metrics: "Métricas",
      settings: "Ajustes",
    },
  },
  "en-US": {
    title: "SIngIA",
    settingsLabel: "Settings",
    lightModeLabel: "Switch to light mode",
    darkModeLabel: "Switch to dark mode",
    languageLabel: "Language",
    tabLabels: {
      chat: "Chat",
      history: "History",
      metrics: "Metrics",
      settings: "Settings",
    },
  },
};

function isAppLanguage(value: string | null): value is AppLanguage {
  return value === "es" || value === "en-US";
}

export function StudioChrome({ children, activeTab }: StudioChromeProps) {
  const [isDark, setIsDark] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>("es");
  const pathname = usePathname();
  const router = useRouter();

  const copy = textByLanguage[language];

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = stored === "dark" || (!stored && prefersDark);
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const resolvedLanguage = isAppLanguage(storedLanguage) ? storedLanguage : "es";

    setIsDark(shouldUseDark);
    setLanguage(resolvedLanguage);
    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.documentElement.lang = resolvedLanguage;
    setIsReady(true);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function updateLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage;
  }

  function requestNewChat() {
    // Marca la accion para casos donde la pagina de chat necesite leerla al montar.
    localStorage.setItem("chat_force_new", "1");
    window.dispatchEvent(new Event("app:new-chat-request"));
    router.push("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col border-x border-line bg-bg pb-24 dark:border-slate-800 dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold leading-tight text-accent sm:text-[34px]">{copy.title}</h1>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="app-language-select-mobile">
              {copy.languageLabel}
            </label>
            <select
              id="app-language-select-mobile"
              value={language}
              onChange={(event) => updateLanguage(event.target.value as AppLanguage)}
              className="h-10 rounded-xl border border-line bg-card px-2 text-sm font-semibold text-ink shadow-panel outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 lg:hidden"
              title={copy.languageLabel}
              aria-label={copy.languageLabel}
            >
              <option value="es">Español</option>
              <option value="en-US">EEUU</option>
            </select>
            <Link
              href="/settings"
              className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label={copy.settingsLabel}
              title={copy.settingsLabel}
            >
              ⚙
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label={isDark ? copy.lightModeLabel : copy.darkModeLabel}
              title={isDark ? copy.lightModeLabel : copy.darkModeLabel}
            >
              {isReady ? (isDark ? "☀" : "🌙") : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-bg dark:border-slate-800 dark:bg-slate-950">
        <ul className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2 px-3 py-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
          {tabs.map((tab) => {
            const active = tab.id === activeTab || pathname === tab.href;

            return (
              <li key={tab.id}>
                {tab.id === "chat" ? (
                  <div className="flex items-center gap-1">
                    <Link
                      href={tab.href}
                      className={`block flex-1 rounded-xl px-2 py-3 transition ${
                        active
                          ? "bg-accent text-white"
                          : "hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      {copy.tabLabels[tab.id]}
                    </Link>
                    <button
                      type="button"
                      onClick={requestNewChat}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-card text-lg font-bold text-ink transition hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      aria-label="Nuevo chat"
                      title="Nuevo chat"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <Link
                    href={tab.href}
                    className={`block rounded-xl px-2 py-3 transition ${
                      active
                        ? "bg-accent text-white"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="mr-1">{tab.icon}</span>
                    {copy.tabLabels[tab.id]}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="fixed bottom-24 right-3 z-40 hidden lg:right-5 lg:block">
        <label className="sr-only" htmlFor="app-language-select-desktop">
          {copy.languageLabel}
        </label>
        <select
          id="app-language-select-desktop"
          value={language}
          onChange={(event) => updateLanguage(event.target.value as AppLanguage)}
          className="h-10 rounded-xl border border-line bg-card px-3 text-sm font-semibold text-ink shadow-panel outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          title={copy.languageLabel}
          aria-label={copy.languageLabel}
        >
          <option value="es">Español</option>
          <option value="en-US">EEUU</option>
        </select>
      </div>
    </main>
  );
}

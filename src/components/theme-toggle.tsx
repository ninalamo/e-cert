"use client";

import * as React from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [dark, setDark] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("theme");
    return (
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme:dark)").matches)
    );
  });

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const toggleTheme = () => {
    setDark((prev) => !prev);
  };

  if (!mounted) {
    return <div className="size-8" aria-hidden />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      {dark ? (
        <SunIcon className="size-4 text-amber-400" />
      ) : (
        <MoonIcon className="size-4 text-tertiary" />
      )}
    </Button>
  );
}

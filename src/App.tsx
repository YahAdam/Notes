import { useEffect, useState } from "react";
import "./App.scss";
import { NotePad } from "./pages/RichTextEditor";
import type { ThemeName } from "./types/theme";

const THEME_STORAGE_KEY = "notes_theme";

function loadTheme(): ThemeName {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "forest" || saved === "dark-forest") {
    return saved;
  }
  return "light";
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(() => loadTheme());

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <div data-theme={theme} className="app-root">
      <NotePad theme={theme} setTheme={setTheme} />
    </div>
  );
}
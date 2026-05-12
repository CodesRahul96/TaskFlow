import { createContext, useContext, useEffect, useState } from "react";
import useAuthStore from "../store/authStore";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuthStore();
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Sync with user preference or system
  useEffect(() => {
    if (user) {
      if (user.theme) {
        setTheme(user.theme);
      } else {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        setTheme(systemTheme);
      }
    }
  }, [user, user?.theme]);

  // Handle system preference changes automatically
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only update if not logged in or if user theme is null (system)
      if (!user || user.theme === null) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [user, user?.theme]);

  const toggleTheme = () => {
    const root = window.document.documentElement;
    root.classList.add("theme-toggling");
    
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    
    setTimeout(() => {
      root.classList.remove("theme-toggling");
    }, 500);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useThemeToggle } from "@/components/ui/skiper-ui/skiper26";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Use skiper26 theme transition animation: clean bottom-to-top rectangle wipe, no blur
  const { setCrazyLightTheme, setCrazyDarkTheme, setCrazySystemTheme } =
    useThemeToggle({
      variant: "rectangle",
      start: "bottom-up",
      blur: false,
    });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-between p-1 rounded-xl bg-muted/40 border border-border/40 w-full min-w-[200px] h-8 animate-pulse" />
    );
  }

  const items = [
    {
      key: "light",
      label: "Light",
      icon: Sun,
      onClick: setCrazyLightTheme,
    },
    {
      key: "dark",
      label: "Dark",
      icon: Moon,
      onClick: setCrazyDarkTheme,
    },
    {
      key: "system",
      label: "System",
      icon: Monitor,
      onClick: setCrazySystemTheme,
    },
  ] as const;

  return (
    <div className="flex items-center justify-between p-1 rounded-xl bg-muted/40 border border-border/50 w-full min-w-[200px] gap-1 shadow-xs backdrop-blur-xs">
      {items.map(({ key, label, icon: Icon, onClick }) => {
        const isActive = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={onClick}
            title={`${label} mode`}
            aria-label={`${label} mode`}
            className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? "bg-background text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

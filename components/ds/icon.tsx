import { icons, Circle, type LucideProps } from "lucide-react";

/** kebab-case (design) → PascalCase (lucide-react export). */
function pascal(name: string): string {
  return name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/** Aliases for names that differ across lucide versions. */
const ALIASES: Record<string, string> = {
  ChartPie: "PieChart",
  ChartColumn: "BarChart3",
  ChartColumnBig: "BarChart3",
};

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
}

/**
 * Renders a Lucide icon by its kebab-case design name. Unknown names fall back
 * to a plain circle so a typo never crashes the page.
 */
export function Icon({ name, size = 16, color, className, style, strokeWidth = 2 }: IconProps) {
  const key = pascal(name);
  const Comp =
    (icons as Record<string, React.ComponentType<LucideProps>>)[key] ??
    (icons as Record<string, React.ComponentType<LucideProps>>)[ALIASES[key] ?? ""] ??
    Circle;

  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      color={color}
      style={{ flexShrink: 0, ...style }}
    />
  );
}

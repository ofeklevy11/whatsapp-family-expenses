"use client";

/**
 * Davidovici Expenses — interactive controls (client).
 * Buttons, inputs, selects, toggles, segmented controls. Ported from Nocturne.
 */
import { Icon } from "./icon";
import { buttonStyle, type ButtonVariant, type ButtonSize } from "./primitives";

type CSSProps = React.CSSProperties;

export function Button({
  variant = "glass",
  size = "md",
  icon,
  iconRight,
  children,
  onClick,
  active,
  className = "",
  style = {},
  title,
  type = "button",
  disabled,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  style?: CSSProps;
  title?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      className={`noc-btn ${className}`}
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{ ...buttonStyle(variant, size, active), ...(disabled ? { opacity: 0.5, cursor: "not-allowed" } : {}), ...style }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}

export function IconButton({
  icon,
  onClick,
  title,
  tone = "default",
  size = 36,
  type = "button",
}: {
  icon: string;
  onClick?: () => void;
  title?: string;
  tone?: "default" | "danger" | "accent";
  size?: number;
  type?: "button" | "submit";
}) {
  const tones = { default: "var(--fg-1)", danger: "var(--fg-danger)", accent: "var(--accent-400)" };
  return (
    <button
      type={type}
      className="noc-btn"
      onClick={onClick}
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: "var(--glass-2)",
        border: "1px solid var(--border)",
        color: tones[tone],
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        transition: "all 120ms var(--ease-out-expo)",
      }}
    >
      <Icon name={icon} size={size >= 36 ? 16 : 14} />
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  icon,
  type = "text",
  style = {},
  onKeyDown,
  name,
  defaultValue,
  required,
  step,
  min,
  autoFocus,
}: {
  value?: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  icon?: string;
  type?: string;
  style?: CSSProps;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  name?: string;
  defaultValue?: string;
  required?: boolean;
  step?: string;
  min?: string;
  autoFocus?: boolean;
}) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", ...style }}>
      {icon && (
        <Icon
          name={icon}
          size={15}
          style={{ position: "absolute", right: 12, color: "var(--fg-3)", pointerEvents: "none" }}
        />
      )}
      <input
        type={type}
        name={name}
        value={value === undefined ? undefined : value === null ? "" : value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        required={required}
        step={step}
        min={min}
        autoFocus={autoFocus}
        className="noc-input"
        style={{
          height: 38,
          padding: icon ? "0 36px 0 12px" : "0 12px",
          background: "var(--input-bg)",
          border: "1px solid var(--border)",
          borderRadius: 11,
          fontFamily: "var(--font-sans)",
          fontSize: 13.5,
          color: "var(--fg-0)",
          outline: "none",
          width: "100%",
          transition: "all 120ms var(--ease-out-expo)",
        }}
      />
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
}

export function Select({
  value,
  onChange,
  options,
  style = {},
  name,
  defaultValue,
}: {
  value?: string;
  onChange?: (v: string) => void;
  options: Option[];
  style?: CSSProps;
  name?: string;
  defaultValue?: string;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", ...style }}>
      <select
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="noc-input"
        style={{
          appearance: "none",
          height: 38,
          padding: "0 12px 0 34px",
          background: "var(--input-bg)",
          border: "1px solid var(--border)",
          borderRadius: 11,
          fontFamily: "var(--font-sans)",
          fontSize: 13.5,
          fontWeight: 500,
          color: "var(--fg-0)",
          outline: "none",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "var(--solid-panel)", color: "var(--fg-0)" }}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevron-down"
        size={15}
        style={{ position: "absolute", left: 12, color: "var(--fg-3)", pointerEvents: "none" }}
      />
    </div>
  );
}

export function Toggle({ on, onChange, size = 22 }: { on: boolean; onChange?: (v: boolean) => void; size?: number }) {
  const w = size === 22 ? 40 : 46;
  const knob = size - 6;
  return (
    <button
      type="button"
      onClick={() => onChange && onChange(!on)}
      style={{
        position: "relative",
        width: w,
        height: size,
        borderRadius: 999,
        background: on ? "var(--accent-400)" : "var(--glass-3)",
        border: `1px solid ${on ? "var(--accent-400)" : "var(--border)"}`,
        boxShadow: on ? "0 0 16px -3px var(--accent-glow)" : "none",
        cursor: "pointer",
        transition: "all 200ms var(--ease-out-expo)",
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          right: on ? w - knob - 4 : 2,
          width: knob,
          height: knob,
          borderRadius: 999,
          background: on ? "var(--fg-on-accent)" : "#EEF0F5",
          transition: "all 200ms var(--ease-out-expo)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
        }}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string }[];
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? 30 : 36;
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        background: "var(--glass-1)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 11,
      }}
    >
      {options.map((o) => {
        const sel = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: h,
              padding: "0 12px",
              borderRadius: 8,
              border: "none",
              background: sel ? "var(--glass-3)" : "transparent",
              color: sel ? "var(--fg-0)" : "var(--fg-3)",
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 120ms var(--ease-out-expo)",
              boxShadow: sel ? "var(--shadow-1)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {o.icon && <Icon name={o.icon} size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Labeled form field wrapper. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)" }}>{label}</span>
      {children}
    </label>
  );
}

import "./BaseColorPicker.scss";
import { useEffect, useRef, useState } from "react";

type BaseColorPickerProps = {
  value?: string;
  onChange: (color: string) => void;
  onClear?: () => void;
  label?: string;
  colors?: string[];
};

const DEFAULT_COLORS = [
  "#111827",
  "#6b7280",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
];

export function BaseColorPicker({
  value = "#22c55e",
  onChange,
  onClear,
  label = "Text Color",
  colors = DEFAULT_COLORS,
}: BaseColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomColor(value || "#22c55e");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function applyCustomColor() {
    const normalized = customColor.trim();
    if (!/^#([0-9a-fA-F]{6})$/.test(normalized)) return;

    onChange(normalized);
    setOpen(false);
  }

  return (
    <div className="base-color-picker" ref={ref}>
      <button
        className="base-color-picker-trigger"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="base-color-picker-preview"
          style={{ backgroundColor: value }}
        />
        <span>{label}</span>
      </button>

      {open && (
        <div className="base-color-picker-popover">
          <div className="base-color-picker-grid">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`base-color-picker-swatch ${value === color ? "active" : ""}`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setCustomColor(color);
                  onChange(color);
                  setOpen(false);
                }}
                aria-label={`Select ${color}`}
              />
            ))}
          </div>

          <div className="base-color-picker-custom-row">
            <input
              className="base-color-picker-native"
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                onChange(e.target.value);
              }}
            />
            <input
              className="base-color-picker-hex"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
            />
            <button
              className="base-color-picker-action"
              type="button"
              onClick={applyCustomColor}
            >
              Apply
            </button>
          </div>

          {onClear ? (
            <div className="base-color-picker-actions">
              <button
                className="base-color-picker-action"
                type="button"
                onClick={() => {
                  onClear();
                  setOpen(false);
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

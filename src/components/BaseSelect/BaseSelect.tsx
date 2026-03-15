import "./BaseSelect.scss";
import { useState, useRef, useEffect } from "react";

export function BaseSelect({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="base-select" ref={ref}>
      <button
        type="button"
        className="base-select-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selectedItem?.label ?? value}</span>
        <span className={`base-select-arrow ${open ? "open" : ""}`} />
      </button>

      {open && (
        <div className="base-select-menu">
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`base-select-item ${item.value === value ? "active" : ""}`}
              onClick={() => {
                onChange(item.value);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
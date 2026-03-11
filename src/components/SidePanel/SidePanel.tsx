import './SidePanel.scss';
import type { ThemeName } from "../../types";
import type { Note } from "../../types";
import { TrashIcon } from "../Icons";
import { formatEpochDate } from '../../utilities/date';

type SidePanelProps = {
  setTheme: (theme: ThemeName) => void;
  theme: ThemeName;
  notes: Note[];
  selectedId: string | null;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => Promise<void>;
};

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function SidePanel({
  setTheme,
  theme,
  notes,
  selectedId,
  query,
  setQuery,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onExportJson,
  onImportJson,
}: SidePanelProps) {
  return (
    <aside className="notes-sidebar flex h-full flex-col border-b md:border-b-0 md:border-r">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-base font-bold">Notes</h2>
          <button
            className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-2 text-sm font-semibold"
            type="button"
            onClick={onCreateNote}
          >
            + New
          </button>
        </div>
        <input
          className="input-base mt-3 w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-3 flex gap-2">
          <button
            className="btn-secondary inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold"
            type="button"
            onClick={onExportJson}
          >
            Export
          </button>
          <label className="btn-secondary inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold">
            Import
            <input
              className="hidden"
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImportJson(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
          <select
            className="input-base rounded-xl px-3 py-2 text-sm focus:outline-none"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeName)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="forest">Forest</option>
            <option value="dark-forest">Dark Forest</option>
            <option value="monokai">Monokai</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {notes.length === 0 ? (
          <div className="text-muted px-2 py-3 text-sm">No notes found.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((n) => {
              const isSelected = n.id === selectedId;
              const preview = stripHtml(n.content || "").slice(0, 80) || "—";

              return (
                <div
                  key={n.id}
                  className={[
                    "note-card group rounded-2xl border transition",
                    isSelected ? "note-card-selected" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => onSelectNote(n.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">
                            {n.title || "Untitled"}
                          </div>
                        </div>
                        <div className="text-muted shrink-0 whitespace-nowrap text-xs">
                          {formatEpochDate(n.updatedAt)}
                        </div>
                      </div>
                      <div className="text-soft mt-1 truncate text-sm">
                        {preview}
                      </div>
                    </button>
                   <div className="note-delete-icon">
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer"
                        type="button"
                        aria-label={`Delete ${n.title || "note"}`}
                        onClick={() => onDeleteNote(n.id)}
                      >
                        <TrashIcon size={20} color="red" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

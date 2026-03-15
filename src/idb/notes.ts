import { openDB } from "idb";
import type { Note } from "../types";

const DB_NAME = "notes-db";
const DB_VERSION = 2;
const NOTES_STORE = "notes";

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion) {
    if (oldVersion < 2) {
      if (db.objectStoreNames.contains(NOTES_STORE)) {
        db.deleteObjectStore(NOTES_STORE);
      }

      db.createObjectStore(NOTES_STORE, { keyPath: "id" });
    }
  },
});

export async function getNotes(): Promise<Note[]> {
  const db = await dbPromise;
  return db.getAll(NOTES_STORE);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await dbPromise;
  return db.get(NOTES_STORE, id);
}

export async function saveNote(note: Note): Promise<void> {
  const db = await dbPromise;
  await db.put(NOTES_STORE, note);
}

export async function saveNotes(notes: Note[]): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(NOTES_STORE, "readwrite");

  await tx.store.clear();

  for (const note of notes) {
    await tx.store.put(note);
  }

  await tx.done;
}

export async function deleteNoteFromIdb(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete(NOTES_STORE, id);
}

export async function clearNotes(): Promise<void> {
  const db = await dbPromise;
  await db.clear(NOTES_STORE);
}

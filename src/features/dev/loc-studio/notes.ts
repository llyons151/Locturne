import { useSyncExternalStore } from 'react';

/**
 * Your marks on Loc's moves and expressions in the studio: good or bad, and a note (user,
 * October 15, 2026: "a way to mark it as good or bad so you can keep track of the ones I like").
 * Kept in this browser, and, when the studio runs on its own (`npm run studio`), saved to
 * docs/loc-studio-notes.json through its server, so Claude can read them without a paste.
 */
export type Verdict = 'good' | 'bad';
export type Note = { verdict?: Verdict; text?: string; label?: string; at?: string };

const SAVED = 'locturne.loc-studio.notes';
/** The standalone studio's server (studio/vite.config.ts) reads and writes the file here. */
const SERVER = '/__loc-notes';

let notes: Record<string, Note> = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(): Record<string, Note> {
  try {
    const all = JSON.parse(localStorage.getItem(SAVED) ?? '{}') as Record<string, Omit<Note, 'verdict'> & { verdict?: string }>;
    // The first version had keep, tweak and cut.
    for (const n of Object.values(all)) {
      if (n.verdict === 'keep') n.verdict = 'good';
      else if (n.verdict === 'cut') n.verdict = 'bad';
      else if (n.verdict && n.verdict !== 'good' && n.verdict !== 'bad') delete n.verdict;
    }
    return all as Record<string, Note>;
  } catch {
    return {};
  }
}

let sendTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  try {
    localStorage.setItem(SAVED, JSON.stringify(notes));
  } catch {}
  // Typing a note sends once it pauses, not on every key.
  clearTimeout(sendTimer);
  sendTimer = setTimeout(() => {
    fetch(SERVER, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(notes) }).catch(() => {});
  }, 400);
}

// The file wins over this browser's copy, except for anything only this browser has.
fetch(SERVER)
  .then((r) => (r.ok ? r.json() : null))
  .then((file: Record<string, Note> | null) => {
    if (!file) return;
    const merged = { ...notes, ...file };
    const missing = Object.keys(notes).some((k) => !(k in file));
    notes = merged;
    if (missing) persist();
    else
      try {
        localStorage.setItem(SAVED, JSON.stringify(notes));
      } catch {}
    emit();
  })
  .catch(() => {});

/** `label`: the move's name, saved with the mark so the file reads on its own. */
export function setNote(id: string, patch: Note, label?: string) {
  const next: Note = { ...notes[id], ...patch, at: new Date().toISOString() };
  if (label) next.label = label;
  notes = { ...notes, [id]: next };
  if (!next.verdict && !next.text) {
    const { [id]: _, ...rest } = notes;
    notes = rest;
  }
  persist();
  emit();
}

export function clearNotes() {
  notes = {};
  persist();
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
export const useNotes = () => useSyncExternalStore(subscribe, () => notes, () => notes);

export const VERDICTS: { id: Verdict; label: string }[] = [
  { id: 'good', label: '👍 Good' },
  { id: 'bad', label: '👎 Bad' },
];

/** All the marks as text, good first, with each thing's name. */
export function notesText(all: Record<string, Note>, name: (id: string) => string): string {
  const lines = ['Loc studio notes', ''];
  const groups: [Verdict | undefined, string][] = [['good', 'Good'], ['bad', 'Bad'], [undefined, 'Notes only']];
  for (const [v, title] of groups) {
    const items = Object.entries(all).filter(([, n]) => n.verdict === v);
    if (!items.length) continue;
    lines.push(`${title}:`);
    for (const [id, n] of items) lines.push(`- ${name(id)} (${id})${n.text ? `: ${n.text}` : ''}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

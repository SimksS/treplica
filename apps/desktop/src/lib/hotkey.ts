/** Parse "Ctrl+Shift+O" style hotkeys for keyboard event matching. */
export function parseHotkey(hotkey: string): {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
} {
  const parts = hotkey.split("+").map((p) => p.trim());
  const last = parts[parts.length - 1] ?? "O";
  return {
    ctrl: parts.some((p) => /^ctrl$/i.test(p) || /^control$/i.test(p)),
    shift: parts.some((p) => /^shift$/i.test(p)),
    alt: parts.some((p) => /^alt$/i.test(p)),
    meta: parts.some((p) => /^meta$/i.test(p) || /^command$/i.test(p) || /^cmd$/i.test(p)),
    key: last.length === 1 ? last.toUpperCase() : last,
  };
}

export function matchesHotkey(event: KeyboardEvent, hotkey: string): boolean {
  const spec = parseHotkey(hotkey);
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const expectedKey =
    spec.key.length === 1 ? spec.key.toUpperCase() : spec.key;
  return (
    event.ctrlKey === spec.ctrl &&
    event.shiftKey === spec.shift &&
    event.altKey === spec.alt &&
    event.metaKey === spec.meta &&
    key.toUpperCase() === expectedKey.toUpperCase()
  );
}

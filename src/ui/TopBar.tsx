import { useStore } from '../store';

export function TopBar() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  return (
    <header className="topbar">
      <div className="logo">kiln</div>
      <div className="topbar-right">
        <button className="icon-btn" title="Undo (⌘Z)" disabled={!canUndo} onClick={undo}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6.5 3L3 6.5 6.5 10" stroke="currentColor" strokeWidth="1.4" />
            <path d="M3 6.5h6a4 4 0 014 4v.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button className="icon-btn" title="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M9.5 3L13 6.5 9.5 10" stroke="currentColor" strokeWidth="1.4" />
            <path d="M13 6.5H7a4 4 0 00-4 4v.5" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <span className="topbar-sep" />
        <button className="icon-btn" title="About">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}

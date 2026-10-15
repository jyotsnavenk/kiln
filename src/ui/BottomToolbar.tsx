import { useStore } from '../store';

const PALETTES = [
  { wall: '#eceae4', glaze: '#efe9d8', accent: '#3b8c68' },
  { wall: '#f0ece3', glaze: '#2e8757', accent: '#1d5c3a' },
  { wall: '#efe9df', glaze: '#5c2f24', accent: '#3a1d16' },
  { wall: '#e8e4de', glaze: '#9cb97e', accent: '#60814a' },
  { wall: '#eae6e1', glaze: '#30418f', accent: '#8fa3e8' },
  { wall: '#f2ede6', glaze: '#d9c4b8', accent: '#a4766a' },
  { wall: '#e5e7ea', glaze: '#f0d9a3', accent: '#c98f4a' },
  { wall: '#e9e4dc', glaze: '#1f1f1f', accent: '#8a8a8a' },
];

export function BottomToolbar() {
  const apply = useStore((s) => s.apply);
  const showHandles = useStore((s) => s.showHandles);
  const setUi = useStore((s) => s.setUi);

  const shuffleShape = () => apply({ seed: Math.floor(Math.random() * 100000) });

  const shufflePalette = () => {
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    apply({ wallColor: p.wall, glazeColor: p.glaze, accentColor: p.accent });
  };

  return (
    <div className="toolbar">
      <button className="tool active" title="Select">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 2l8 7-4 .6L6.5 13 4 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      </button>
      <button className="tool" title="Shuffle shape" onClick={shuffleShape}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h3l6 8h3M14 12l-1.8-1.8M14 12l-1.8 1.8" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2 12h3l1.6-2.1M9.4 6.1L11 4h3M14 4l-1.8 1.8M14 4l-1.8-1.8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      <button className="tool" title="Shuffle colors" onClick={shufflePalette}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="2.6" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5.6" cy="5.6" r="1" fill="currentColor" />
          <circle cx="10.4" cy="10.4" r="1" fill="currentColor" />
          <circle cx="8" cy="8" r="1" fill="currentColor" />
        </svg>
      </button>
      <span className="tool-sep" />
      <button
        className={`tool ${showHandles ? '' : 'dimmed'}`}
        title="Toggle handles"
        onClick={() => setUi({ showHandles: !showHandles })}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8 12.1 12.2 8 12.2 1.5 8 1.5 8z" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
    </div>
  );
}

import { useRef, useState, type ReactNode } from 'react';
import { useStore } from '../store';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button className="section-head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ transform: open ? 'none' : 'rotate(-90deg)' }}>
          <path d="M1 3l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="1.4" />
        </svg>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

interface ScrubProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** pixels of drag to traverse full range */
  travel?: number;
  decimals?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

/** label pill + value; drag horizontally anywhere on the row to scrub */
export function ScrubRow({ label, value, min, max, travel = 260, decimals = 2, format, onChange }: ScrubProps) {
  const commit = useStore((s) => s.commit);
  const start = useRef({ x: 0, v: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, v: value };
    commit();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    const dv = ((e.clientX - start.current.x) / travel) * (max - min);
    onChange(clamp(start.current.v + dv, min, max));
  };

  return (
    <div className="row scrub" onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
      <span className="row-label">{label}</span>
      <span className="row-value">{format ? format(value) : value.toFixed(decimals)}</span>
    </div>
  );
}

interface SegmentProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentRow<T extends string | number>({ options, value, onChange }: SegmentProps<T>) {
  const apply = useStore((s) => s.commit);
  return (
    <div className="segments">
      {options.map((o) => (
        <button
          key={String(o.value)}
          className={`seg ${o.value === value ? 'active' : ''}`}
          onClick={() => {
            if (o.value !== value) {
              apply();
              onChange(o.value);
            }
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const commit = useStore((s) => s.commit);
  const committed = useRef(false);
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <label className="color-chip-wrap">
        <span className="row-value mono">{value.toUpperCase()}</span>
        <span className="color-chip" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onPointerDown={() => (committed.current = false)}
          onChange={(e) => {
            if (!committed.current) {
              commit();
              committed.current = true;
            }
            onChange(e.target.value);
          }}
        />
      </label>
    </div>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="button-row">{children}</div>;
}

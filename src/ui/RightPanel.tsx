import { useRef, useState } from 'react';
import { useStore, type BaseShape, type Finish, type PhotoFilter, type PhotoShape } from '../store';
import { Section, ScrubRow, SegmentRow, ColorRow, ButtonRow } from './controls';
import { copyImage, exportImage } from '../lib/export';

export function RightPanel() {
  const design = useStore((s) => s.design);
  const set = useStore((s) => s.set);
  const setPhoto = useStore((s) => s.setPhoto);
  const commit = useStore((s) => s.commit);
  const apply = useStore((s) => s.apply);
  const selected = useStore((s) => s.selected);
  const setUi = useStore((s) => s.setUi);
  const exportW = useStore((s) => s.exportW);
  const exportH = useStore((s) => s.exportH);
  const exportScale = useStore((s) => s.exportScale);

  const fileRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const pi = Math.min(Math.max(selected, 0), design.photoCount - 1);
  const photo = design.photos[pi];

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    commit();
    if (photo.src?.startsWith('blob:')) URL.revokeObjectURL(photo.src);
    setPhoto(pi, { src: url });
    e.target.value = '';
  };

  return (
    <aside className="panel">
      <Section title="Wall">
        <ColorRow label="Color" value={design.wallColor} onChange={(v) => set({ wallColor: v })} />
      </Section>

      <Section title="Shape">
        <SegmentRow<BaseShape>
          options={[
            { value: 'pebble', label: 'Pebble' },
            { value: 'oval', label: 'Oval' },
            { value: 'square', label: 'Square' },
          ]}
          value={design.baseShape}
          onChange={(v) => set({ baseShape: v })}
        />
        <ScrubRow label="Width" value={design.frameAspect} min={0.55} max={1.8} onChange={(v) => set({ frameAspect: v })} />
        <ScrubRow label="Corners" value={design.cornerExtend} min={0} max={1} onChange={(v) => set({ cornerExtend: v })} />
        <ScrubRow label="Goopiness" value={design.goopiness} min={0} max={1} onChange={(v) => set({ goopiness: v })} />
        <ScrubRow label="Curviness" value={design.curviness} min={0} max={1} onChange={(v) => set({ curviness: v })} />
        <ScrubRow label="Depth" value={design.depth} min={0.1} max={0.55} onChange={(v) => set({ depth: v })} />
        <ScrubRow label="Size" value={design.frameScale} min={0.55} max={1.45} onChange={(v) => set({ frameScale: v })} />
      </Section>

      <Section title="Glaze">
        <SegmentRow<Finish>
          options={[
            { value: 'gloss', label: 'Gloss' },
            { value: 'matte', label: 'Matte' },
            { value: 'speckle', label: 'Speckle' },
          ]}
          value={design.finish}
          onChange={(v) => set({ finish: v })}
        />
        <SegmentRow<Finish>
          options={[
            { value: 'crackle', label: 'Crackle' },
            { value: 'twotone', label: 'Two-tone' },
          ]}
          value={design.finish}
          onChange={(v) => set({ finish: v })}
        />
        <ColorRow label="Base" value={design.glazeColor} onChange={(v) => set({ glazeColor: v })} />
        <ColorRow label="Accent" value={design.accentColor} onChange={(v) => set({ accentColor: v })} />
        <ScrubRow label="Gloss" value={design.gloss} min={0} max={1} onChange={(v) => set({ gloss: v })} />
        <ScrubRow label="Density" value={design.speckle} min={0} max={1} onChange={(v) => set({ speckle: v })} />
        <ScrubRow label="Dot size" value={design.speckleSize} min={0} max={1} onChange={(v) => set({ speckleSize: v })} />
      </Section>

      <Section title="Photos">
        <SegmentRow<number>
          options={[1, 2, 3, 4].map((n) => ({ value: n, label: String(n) }))}
          value={design.photoCount}
          onChange={(v) => {
            set({ photoCount: v });
            setUi({ selected: Math.min(pi, v - 1) });
          }}
        />
        {design.photoCount > 1 && (
          <SegmentRow<number>
            options={Array.from({ length: design.photoCount }, (_, i) => ({
              value: i,
              label: `Photo ${i + 1}`,
            }))}
            value={pi}
            onChange={(v) => setUi({ selected: v })}
          />
        )}
        <ButtonRow>
          <button className="btn wide" onClick={() => fileRef.current?.click()}>
            {photo.src ? 'Replace image' : 'Upload image'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </ButtonRow>
        <SegmentRow<PhotoShape>
          options={[
            { value: 'rect', label: 'Rect' },
            { value: 'rounded', label: 'Round' },
            { value: 'oval', label: 'Oval' },
            { value: 'circle', label: 'Circle' },
          ]}
          value={photo.shape}
          onChange={(v) => setPhoto(pi, { shape: v })}
        />
        <SegmentRow<PhotoFilter>
          options={[
            { value: 'original', label: 'Original' },
            { value: 'bw', label: 'B&W' },
            { value: 'vintage', label: 'Vintage' },
          ]}
          value={photo.filter}
          onChange={(v) => setPhoto(pi, { filter: v })}
        />
        <ScrubRow label="Pos X" value={photo.x} min={-1} max={1} onChange={(v) => setPhoto(pi, { x: v })} />
        <ScrubRow label="Pos Y" value={photo.y} min={-1} max={1} onChange={(v) => setPhoto(pi, { y: v })} />
        <ScrubRow label="Size" value={photo.scale} min={0.15} max={0.95} onChange={(v) => setPhoto(pi, { scale: v })} />
        {photo.shape !== 'circle' && (
          <ScrubRow label="Aspect" value={photo.aspect} min={0.5} max={2.2} onChange={(v) => setPhoto(pi, { aspect: v })} />
        )}
      </Section>

      <Section title="Export">
        <div className="export-size">
          <ScrubRow label="W" value={exportW} min={400} max={4000} decimals={0} travel={500} onChange={(v) => setUi({ exportW: Math.round(v) })} />
          <ScrubRow label="H" value={exportH} min={400} max={4000} decimals={0} travel={500} onChange={(v) => setUi({ exportH: Math.round(v) })} />
        </div>
        <SegmentRow<number>
          options={[1, 2, 3, 4].map((n) => ({ value: n, label: `${n}\u00d7` }))}
          value={exportScale}
          onChange={(v) => setUi({ exportScale: v })}
        />
        <ButtonRow>
          <button className="btn primary" onClick={() => exportImage('jpg', exportW * exportScale, exportH * exportScale)}>
            JPG
          </button>
          <button className="btn primary" onClick={() => exportImage('png', exportW * exportScale, exportH * exportScale)}>
            PNG
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              await copyImage(exportW * exportScale, exportH * exportScale);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </ButtonRow>
      </Section>

      <div className="panel-footer">
        <button
          className="btn subtle wide"
          onClick={() => apply({ seed: Math.floor(Math.random() * 100000) })}
        >
          Shuffle goop
        </button>
      </div>
    </aside>
  );
}

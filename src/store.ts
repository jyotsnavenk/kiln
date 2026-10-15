import { create } from 'zustand';

export type PhotoShape = 'rect' | 'rounded' | 'oval' | 'circle';
export type PhotoFilter = 'original' | 'bw' | 'vintage';
export type Finish = 'gloss' | 'matte' | 'speckle' | 'crackle' | 'twotone';
export type BaseShape = 'pebble' | 'oval' | 'square';

export interface PhotoSlot {
  src: string | null;
  shape: PhotoShape;
  filter: PhotoFilter;
  /** normalized position within the frame, -1..1 */
  x: number;
  y: number;
  /** window size relative to frame, 0.15..1 */
  scale: number;
  /** window aspect ratio w/h */
  aspect: number;
}

export interface Design {
  wallColor: string;
  baseShape: BaseShape;
  frameAspect: number; // width/height of the frame body
  cornerExtend: number; // 0..1 pull corners outward
  goopiness: number; // 0..1 organic noise
  curviness: number; // 0..1 squarish -> round
  depth: number; // ceramic thickness
  frameScale: number; // overall size
  seed: number;
  finish: Finish;
  glazeColor: string;
  accentColor: string;
  gloss: number; // 0..1
  speckle: number; // density 0..1
  speckleSize: number; // 0..1
  photoCount: number; // 1..4
  photos: PhotoSlot[];
}

const defaultPhotos = (): PhotoSlot[] => [
  { src: null, shape: 'rect', filter: 'bw', x: 0, y: -0.52, scale: 0.52, aspect: 1.55 },
  { src: null, shape: 'rect', filter: 'bw', x: 0, y: 0.62, scale: 0.44, aspect: 1.35 },
  { src: null, shape: 'circle', filter: 'bw', x: -0.72, y: 0.05, scale: 0.38, aspect: 1 },
  { src: null, shape: 'circle', filter: 'bw', x: 0.72, y: 0.05, scale: 0.38, aspect: 1 },
];

export const defaultDesign = (): Design => ({
  wallColor: '#eceae4',
  baseShape: 'pebble',
  frameAspect: 1.0,
  cornerExtend: 0.25,
  goopiness: 0.35,
  curviness: 0.55,
  depth: 0.3,
  frameScale: 1.0,
  seed: 7,
  finish: 'speckle',
  glazeColor: '#efe9d8',
  accentColor: '#3b8c68',
  gloss: 0.8,
  speckle: 0.6,
  speckleSize: 0.5,
  photoCount: 1,
  photos: defaultPhotos(),
});

interface Store {
  design: Design;
  past: Design[];
  future: Design[];
  // ui state (not in history)
  selected: number;
  showHandles: boolean;
  dragging: boolean;
  exportW: number;
  exportH: number;
  exportScale: number;

  set: (p: Partial<Design>) => void;
  setPhoto: (i: number, p: Partial<PhotoSlot>) => void;
  commit: () => void;
  apply: (p: Partial<Design>) => void;
  undo: () => void;
  redo: () => void;
  setUi: (
    p: Partial<
      Pick<Store, 'selected' | 'showHandles' | 'dragging' | 'exportW' | 'exportH' | 'exportScale'>
    >
  ) => void;
}

const clone = (d: Design): Design => ({
  ...d,
  photos: d.photos.map((p) => ({ ...p })),
});

export const useStore = create<Store>((set, get) => ({
  design: defaultDesign(),
  past: [],
  future: [],
  selected: 0,
  showHandles: true,
  dragging: false,
  exportW: 1600,
  exportH: 2000,
  exportScale: 1,

  set: (p) => set((s) => ({ design: { ...s.design, ...p } })),

  setPhoto: (i, p) =>
    set((s) => {
      const photos = s.design.photos.map((ph, idx) => (idx === i ? { ...ph, ...p } : ph));
      return { design: { ...s.design, photos } };
    }),

  commit: () => {
    const s = get();
    set({ past: [...s.past.slice(-99), clone(s.design)], future: [] });
  },

  apply: (p) => {
    get().commit();
    get().set(p);
  },

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({
      design: prev,
      past: s.past.slice(0, -1),
      future: [clone(s.design), ...s.future],
    });
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const next = s.future[0];
    set({
      design: next,
      future: s.future.slice(1),
      past: [...s.past, clone(s.design)],
    });
  },

  setUi: (p) => set(p),
}));

// expose for dev-tools debugging
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__store = useStore;
}

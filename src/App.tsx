import { useEffect } from 'react';
import { Scene } from './scene/Scene';
import { TopBar } from './ui/TopBar';
import { RightPanel } from './ui/RightPanel';
import { BottomToolbar } from './ui/BottomToolbar';
import { useStore } from './store';

export default function App() {
  const exportW = useStore((s) => s.exportW);
  const exportH = useStore((s) => s.exportH);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) useStore.getState().redo();
        else useStore.getState().undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <TopBar />
      <main className="stage">
        <div className="stage-inner" style={{ aspectRatio: `${exportW} / ${exportH}` }}>
          <Scene />
        </div>
      </main>
      <RightPanel />
      <BottomToolbar />
    </div>
  );
}

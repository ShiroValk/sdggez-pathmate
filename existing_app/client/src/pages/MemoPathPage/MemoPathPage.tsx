import React, { useEffect, useRef } from 'react';
import logoUrl from '@client/src/assets/memopath-logo.png';
import { mountMemoApp } from './memopath-engine';
import { MEMOPATH_CSS } from './memopath-styles';

const MemoPathPage: React.FC = () => {
  const appRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const app: HTMLElement | null = appRef.current;
    if (!app) return;
    return mountMemoApp(app, logoUrl);
  }, []);

  return (
    <div className="memopath-stage">
      <style>{MEMOPATH_CSS}</style>
      <main id="app" aria-live="polite" ref={appRef} />
    </div>
  );
};

export default MemoPathPage;

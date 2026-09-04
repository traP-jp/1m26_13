'use client';

import { useEffect, useRef } from 'react';
import { createApp, type App as VueApp } from 'vue/dist/vue.esm-bundler.js';
import BetaApp from '../ui/BetaApp';

export default function VueIsland() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const app: VueApp = createApp(BetaApp);
    app.mount(rootRef.current);

    return () => app.unmount();
  }, []);

  return <div ref={rootRef} />;
}

"use client";

import { useEffect, useRef } from "react";
import { createApp, type App as VueApp } from "vue/dist/vue.esm-bundler.js";
import DemoApp from "../ui/DemoApp";

export default function VueIsland() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) return;

    const app: VueApp = createApp(DemoApp);
    app.mount(rootRef.current);

    return () => app.unmount();
  }, []);

  return <div ref={rootRef} />;
}

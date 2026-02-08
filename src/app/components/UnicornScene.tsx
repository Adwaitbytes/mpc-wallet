'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized?: boolean;
      init: () => void;
      destroy: () => void;
    };
  }
}

let scriptLoaded = false;
let scriptLoading = false;

/**
 * Loads the Unicorn Studio runtime once, then calls init() which
 * scans all [data-us-project] elements on the page.
 * Place this component once per page — it handles everything.
 */
export function UnicornLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initUnicorn = () => {
      if (window.UnicornStudio?.init) {
        window.UnicornStudio.init();
        scriptLoaded = true;
        setReady(true);
      }
    };

    if (scriptLoaded) {
      // Re-init to pick up any new data-us-project divs
      initUnicorn();
      return;
    }

    if (scriptLoading) {
      // Another instance is loading — wait for it
      const interval = setInterval(() => {
        if (scriptLoaded) {
          clearInterval(interval);
          initUnicorn();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    scriptLoading = true;
    const script = document.createElement('script');
    script.src =
      'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js';
    script.async = true;
    script.onload = () => {
      // Give DOM a frame to stabilize before scanning
      requestAnimationFrame(() => {
        setTimeout(initUnicorn, 100);
      });
    };
    document.head.appendChild(script);
  }, []);

  return null; // This is a side-effect-only component
}

/**
 * A positioned container for a Unicorn Studio WebGL scene.
 * Must be paired with a <UnicornLoader /> somewhere on the page.
 */
export default function UnicornScene({
  projectId,
  className = '',
  opacity = 0.5,
  scale = 1,
}: {
  projectId: string;
  className?: string;
  opacity?: number;
  scale?: number;
}) {
  return (
    <div
      className={className}
      style={{
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div
        data-us-project={projectId}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

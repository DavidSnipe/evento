"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function TopLoaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  
  const startTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  const visibleRef = useRef(false);
  const activeRef = useRef(false);

  const setVisibleState = (val: boolean) => {
    visibleRef.current = val;
    setVisible(val);
  };

  const setActiveState = (val: boolean) => {
    activeRef.current = val;
    setActive(val);
  };

  const stopLoading = useCallback(() => {
    isNavigatingRef.current = false;
    
    // Clear starting timers
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const minVisibleDuration = 250;

    const finalize = () => {
      if (visibleRef.current) {
        setProgress(100);
        setActiveState(false); // start the fade out transition
        const fadeTimer = setTimeout(() => {
          setVisibleState(false);
          setProgress(0);
        }, 300); // match transition duration
        minDurationTimerRef.current = fadeTimer;
      } else {
        setProgress(0);
        setActiveState(false);
      }
    };

    // If it's visible, respect the minimum visible duration so it doesn't flash
    if (visibleRef.current && elapsed < minVisibleDuration) {
      const remaining = minVisibleDuration - elapsed;
      minDurationTimerRef.current = setTimeout(finalize, remaining);
    } else {
      finalize();
    }
  }, []);

  const startLoading = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    startTimeRef.current = Date.now();

    // Clear any ending timers
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }

    // Start delay to prevent flicker on rapid loads
    startTimerRef.current = setTimeout(() => {
      setVisibleState(true);
      setActiveState(true);
      setProgress(15);

      progressTimerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 85) {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            return 85;
          }
          return prev + Math.random() * 8;
        });
      }, 150);
    }, 120); // 120ms start delay to filter out fast loads
  }, []);

  // Complete loading when pathname or query parameters change
  useEffect(() => {
    stopLoading();
    return () => {
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (minDurationTimerRef.current) clearTimeout(minDurationTimerRef.current);
    };
  }, [pathname, searchParams, stopLoading]);

  useEffect(() => {
    // Intercept monkey-patched history operations
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      startLoading();
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      startLoading();
      return originalReplaceState.apply(this, args);
    };

    // Listen for browser back/forward history navigation
    const handlePopState = () => {
      startLoading();
    };
    window.addEventListener("popstate", handlePopState);

    // Click interception for internal links
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (
        anchor &&
        anchor.href &&
        anchor.target !== "_blank" &&
        !anchor.hasAttribute("download") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey &&
        anchor.origin === window.location.origin
      ) {
        const hrefAttr = anchor.getAttribute("href");
        if (
          hrefAttr &&
          !hrefAttr.startsWith("javascript:") &&
          !hrefAttr.startsWith("mailto:") &&
          !hrefAttr.startsWith("tel:") &&
          !hrefAttr.includes("#")
        ) {
          const currentUrl = window.location.pathname + window.location.search;
          const targetUrl = anchor.pathname + anchor.search;

          if (currentUrl !== targetUrl) {
            startLoading();
          }
        }
      }
    };

    document.addEventListener("click", handleLinkClick, { capture: true });

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleLinkClick, { capture: true });
    };
  }, [startLoading]);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none transition-opacity duration-300 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 6px hsl(350 42% 72%), 0 0 3px hsl(38 48% 68%)"
        }}
      />
    </div>
  );
}

export function TopLoader() {
  return (
    <Suspense fallback={null}>
      <TopLoaderInner />
    </Suspense>
  );
}

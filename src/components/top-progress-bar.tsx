"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Complete progress on route change
  useEffect(() => {
    if (visible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept clicks on same-origin links and form submissions
  useEffect(() => {
    function startProgress() {
      setVisible(true);
      setProgress(25);
      const t1 = setTimeout(() => setProgress(60), 200);
      const t2 = setTimeout(() => setProgress(85), 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore anchor jumps, new tabs, downloads, external links
      if (
        href.startsWith("#") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's an internal route
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin) {
          // If navigating to a different URL or search params
          if (
            url.pathname !== window.location.pathname ||
            url.search !== window.location.search
          ) {
            startProgress();
          }
        }
      } catch {
        // relative URL
        if (href.startsWith("/")) {
          startProgress();
        }
      }
    }

    function handleFormSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement;
      if (!form) return;
      if (form.target === "_blank") return;
      startProgress();
    }

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("submit", handleFormSubmit, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("submit", handleFormSubmit, {
        capture: true,
      });
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-0 left-0 z-50 h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-amber-700 via-amber-600 to-emerald-600 shadow-sm transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

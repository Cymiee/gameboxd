import { Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import Spinner from "./Spinner";
import { useIsMobile } from "../hooks/useIsMobile";

export default function Layout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [transitioning, setTransitioning] = useState(false);
  const prevKey = useRef(location.key);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useLayoutEffect fires synchronously after DOM mutation, before the browser
  // paints — so the overlay is guaranteed to appear before any new page content.
  useLayoutEffect(() => {
    if (prevKey.current === location.key) return;
    prevKey.current = location.key;

    setTransitioning(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    // Keep spinner for at least 350 ms; if the page's own data takes longer
    // its internal loading state (also using Spinner) takes over seamlessly.
    timerRef.current = setTimeout(() => setTransitioning(false), 350);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.key]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main
        style={{
          flex: 1,
          position: "relative",
          // Clear the fixed bottom nav on mobile
          ...(isMobile ? { paddingBottom: "calc(58px + env(safe-area-inset-bottom))" } : {}),
        }}
      >
        {transitioning && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--bg-base)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <Spinner size={42} />
          </div>
        )}
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}

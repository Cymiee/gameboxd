import { useEffect, useState } from "react";

const QUERY = "(max-width: 640px)";

// Viewport hook for responsive inline styles. Purely a view concern, so it
// lives in web/ rather than the shared lib/ package.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

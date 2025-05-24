"use client"; // Add this directive

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Ensure this code runs only on the client
    if (typeof window === 'undefined') {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Initial check
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Add event listener
    mql.addEventListener("change", onChange)

    // Cleanup listener on unmount
    return () => mql.removeEventListener("change", onChange)
  }, []) // Empty dependency array ensures this effect runs once on mount

  // Return !!isMobile to ensure it's always boolean (false if undefined)
  // Or handle the undefined state explicitly if needed in consuming components
  return isMobile; // Can return undefined during initial server render / hydration
}

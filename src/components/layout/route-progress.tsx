"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

/**
 * Slim progress bar shown at the top of the page during route transitions.
 * Automatically triggers on pathname changes and hides after a brief delay.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // When pathname changes, the new page has loaded — hide the bar
    setLoading(false)
    setProgress(100)
    const timer = setTimeout(() => setProgress(0), 200)
    return () => clearTimeout(timer)
  }, [pathname])

  // Listen for click events on links to start the progress bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return
      const href = target.getAttribute("href")
      if (!href || href.startsWith("http") || href.startsWith("#") || href === pathname) return
      // Internal navigation detected — start progress
      setLoading(true)
      setProgress(30)
      // Simulate incremental progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) { clearInterval(interval); return prev }
          return prev + Math.random() * 15
        })
      }, 200)
      // Safety cleanup
      const timeout = setTimeout(() => { clearInterval(interval); setLoading(false); setProgress(100) }, 5000)
      return () => { clearInterval(interval); clearTimeout(timeout) }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [pathname])

  if (progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2.5px]">
      <div
        className="h-full bg-primary transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: loading ? "300ms" : "150ms",
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  )
}

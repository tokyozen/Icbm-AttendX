"use client"
import { useEffect } from "react"
import NProgress from "nprogress"

export default function NavigationProgressBar() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return
      const href = target.getAttribute("href")
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http") ||
        href.startsWith("mailto") ||
        target.getAttribute("target") === "_blank"
      ) return
      NProgress.start()
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  return null
}

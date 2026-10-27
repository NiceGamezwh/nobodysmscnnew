"use client"

import { useEffect } from "react"

/** Netlify 边线注入的「Powered by Netlify」角标；从 DOM 移除，访客都看不到。 */
const HUD_KEYS = ["nl-hud:public:v1", "nl-hud:owner-private:v1"]

export function HideNetlifyBadge() {
  useEffect(() => {
    try {
      for (const key of HUD_KEYS) {
        localStorage.setItem(key, "hidden")
      }
    } catch {
      // ignore private-mode / storage errors
    }

    const strip = () => {
      document.getElementById("nl-badge-frame")?.remove()
      document.getElementById("nl-hud-frame")?.remove()
      document.querySelectorAll('iframe[src*="netlify"], iframe[id^="nl-"]').forEach((el) => {
        el.remove()
      })
    }

    strip()
    const observer = new MutationObserver(strip)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}

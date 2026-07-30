import { useSyncExternalStore } from "react"

const MOBILE_BREAKPOINT = 768

function getMediaQueryList() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

function subscribe(callback: () => void) {
  const mql = getMediaQueryList()
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return getMediaQueryList().matches
}

function getServerSnapshot() {
  return false
}

function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export { useIsMobile }

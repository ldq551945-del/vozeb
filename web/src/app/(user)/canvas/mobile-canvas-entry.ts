"use client";

const ENTRY_KEY = "dq:canvas-mobile-entry";

type RouterLike = { push: (href: string) => void };

function isTouchPhone() {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse) and (max-width: 1024px)").matches;
}

function ensureOverlay() {
    if (typeof document === "undefined") return null;
    let overlay = document.getElementById("dq-canvas-entry-transition");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "dq-canvas-entry-transition";
    overlay.className = "dq-canvas-entry-transition";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<span class="dq-canvas-entry-mark"></span><span class="dq-canvas-entry-ring"></span>';
    document.body.append(overlay);
    requestAnimationFrame(() => overlay?.classList.add("is-visible"));
    return overlay;
}

async function requestLandscapeOrientation() {
    try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (value: "landscape") => Promise<void> };
        await orientation.lock?.("landscape");
    } catch {
        // Orientation lock is optional and commonly unavailable outside installed apps.
    }
}

export function enterMobileCanvas(router: RouterLike, href: string) {
    if (!isTouchPhone()) {
        router.push(href);
        return;
    }
    window.sessionStorage.setItem(ENTRY_KEY, "1");
    ensureOverlay();
    void requestLandscapeOrientation();
    window.setTimeout(() => router.push(href), 180);
}

export function syncMobileCanvasEntry(ready: boolean) {
    if (!isTouchPhone()) return;
    const existing = document.getElementById("dq-canvas-entry-transition");
    if (window.sessionStorage.getItem(ENTRY_KEY) !== "1" && !existing) return;
    const overlay = existing || ensureOverlay();
    if (!overlay || !ready) return;
    window.sessionStorage.removeItem(ENTRY_KEY);
    overlay.classList.add("is-complete");
    window.setTimeout(() => overlay?.remove(), 260);
}

export function releaseMobileCanvasGameMode() {
    if (typeof window === "undefined") return;
    try {
        screen.orientation?.unlock?.();
    } catch {
        // Orientation unlock is best-effort.
    }
}

"use client";

import { select } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform, type D3ZoomEvent, type ZoomBehavior } from "d3-zoom";
import React, { useEffect, useRef } from "react";

import { canvasThemes, type CanvasBackgroundMode } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { ViewportTransform } from "../types";

type VozebCanvasProps = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    viewport: ViewportTransform;
    backgroundMode?: CanvasBackgroundMode;
    onViewportChange: (viewport: ViewportTransform) => void;
    onCanvasMouseDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onCanvasDeselect?: () => void;
    onContextMenu?: (event: React.MouseEvent) => void;
    onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
    onGestureStart?: () => void;
    children: React.ReactNode;
};

export function VozebCanvas({ containerRef, viewport, backgroundMode = "lines", onViewportChange, onCanvasMouseDown, onCanvasDeselect, onContextMenu, onDrop, onGestureStart, children }: VozebCanvasProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const viewportRef = useRef(viewport);
    const onViewportChangeRef = useRef(onViewportChange);
    const onCanvasDeselectRef = useRef(onCanvasDeselect);
    const onGestureStartRef = useRef(onGestureStart);
    const zoomBehaviorRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
    const frameRef = useRef<number | null>(null);
    const nextViewportRef = useRef<ViewportTransform | null>(null);
    const gestureRef = useRef({ sourceType: "", moved: false });

    viewportRef.current = viewport;
    onViewportChangeRef.current = onViewportChange;
    onCanvasDeselectRef.current = onCanvasDeselect;
    onGestureStartRef.current = onGestureStart;

    useEffect(
        () => () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        },
        [],
    );

    const scheduleViewportChange = (next: ViewportTransform) => {
        nextViewportRef.current = next;
        if (frameRef.current) return;
        frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            if (nextViewportRef.current) onViewportChangeRef.current(nextViewportRef.current);
        });
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest("[data-canvas-no-zoom],[data-connection-create-menu]")) return;
        const isBackgroundClick = !target?.closest("[data-node-id],[data-connection-id]");

        if (event.button === 0 && (event.ctrlKey || event.metaKey) && isBackgroundClick) {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            onCanvasMouseDown?.(event);
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const selection = select(container);
        const behavior = zoom<HTMLDivElement, unknown>()
            .scaleExtent([0.05, 5])
            .clickDistance(4)
            .tapDistance(8)
            .filter((event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (target?.closest("[data-canvas-no-zoom],.ant-modal,.ant-popover,.ant-dropdown,.ant-select-dropdown,.ant-picker-dropdown,[data-connection-create-menu]")) return false;
                const isBackground = !target?.closest("[data-node-id],[data-connection-id]");
                if (event.type === "wheel") return true;
                if (event.type.startsWith("touch")) return touchCount(event) >= 2 || isBackground;
                if (event.type === "mousedown") return !(event.ctrlKey || event.metaKey) && (event.button === 1 || (event.button === 0 && isBackground));
                return false;
            })
            .on("start.canvas", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
                const sourceType = event.sourceEvent?.type || "";
                gestureRef.current = { sourceType, moved: false };
                if (sourceType === "touchstart" && touchCount(event.sourceEvent) >= 2) onGestureStartRef.current?.();
                if (sourceType === "mousedown") container.style.cursor = "grabbing";
            })
            .on("zoom.canvas", (event: D3ZoomEvent<HTMLDivElement, unknown>) => {
                const next = { x: event.transform.x, y: event.transform.y, k: event.transform.k };
                const current = viewportRef.current;
                if (Math.abs(next.x - current.x) > 0.5 || Math.abs(next.y - current.y) > 0.5 || Math.abs(next.k - current.k) > 0.0005) gestureRef.current.moved = true;
                viewportRef.current = next;
                scheduleViewportChange(next);
            })
            .on("end.canvas", () => {
                if ((gestureRef.current.sourceType === "mousedown" || gestureRef.current.sourceType === "touchstart") && !gestureRef.current.moved) onCanvasDeselectRef.current?.();
                container.style.cursor = "grab";
            });

        zoomBehaviorRef.current = behavior;
        selection.call(behavior);
        selection.on("dblclick.zoom", null);
        const initial = viewportRef.current;
        selection.call(behavior.transform, zoomIdentity.translate(initial.x, initial.y).scale(initial.k));
        return () => {
            selection.on(".zoom", null);
            zoomBehaviorRef.current = null;
            container.style.cursor = "";
        };
    }, [containerRef]);

    useEffect(() => {
        const container = containerRef.current;
        const behavior = zoomBehaviorRef.current;
        if (!container || !behavior) return;
        const current = zoomTransform(container);
        if (Math.abs(current.x - viewport.x) < 0.5 && Math.abs(current.y - viewport.y) < 0.5 && Math.abs(current.k - viewport.k) < 0.0005) return;
        select(container).call(behavior.transform, zoomIdentity.translate(viewport.x, viewport.y).scale(viewport.k));
    }, [containerRef, viewport.k, viewport.x, viewport.y]);

    return (
        <div
            ref={containerRef}
            className="canvas-surface relative h-full w-full cursor-grab select-none overflow-hidden"
            style={{ background: theme.canvas.background, touchAction: "none", overscrollBehavior: "none" }}
            onPointerDown={handlePointerDown}
            onContextMenu={onContextMenu}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
        >
            <CanvasGrid viewport={viewport} mode={backgroundMode} />
            <div
                className="absolute origin-top-left"
                style={{
                    transform: "translate(" + viewport.x + "px, " + viewport.y + "px) scale(" + viewport.k + ")",
                }}
            >
                {children}
            </div>
        </div>
    );
}

function touchCount(event: Event | null | undefined) {
    return event && "touches" in event ? (event as TouchEvent).touches.length : 0;
}

function CanvasGrid({ viewport, mode }: { viewport: ViewportTransform; mode: CanvasBackgroundMode }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (mode === "blank") return null;

    const gridSize = 48 * viewport.k;
    const x = viewport.x % gridSize;
    const y = viewport.y % gridSize;
    const dotSize = viewport.k < 0.12 ? 0.8 : 1.15;
    const backgroundImage =
        mode === "dots" ? `radial-gradient(circle, ${theme.canvas.dot} ${dotSize}px, transparent ${dotSize + 0.2}px)` : `linear-gradient(${theme.canvas.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.canvas.line} 1px, transparent 1px)`;

    return (
        <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
                backgroundImage,
                backgroundSize: `${gridSize}px ${gridSize}px`,
                backgroundPosition: `${x}px ${y}px`,
            }}
        />
    );
}

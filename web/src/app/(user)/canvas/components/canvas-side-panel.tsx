"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { App, Empty, Input, Select } from "antd";
import { Check, ChevronRight, Download, FileText, Image as ImageIcon, ListChecks, Music2, Search, Settings2, Type, Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAssetStore, type Asset } from "@/stores/use-asset-store";
import { CanvasNodeType, type CanvasNodeData } from "../types";
import type { InsertAssetPayload } from "./asset-picker-modal";
import { exportCanvasNodes } from "../utils/canvas-export";
import { CANVAS_SIDE_PANEL_MAX_WIDTH, CANVAS_SIDE_PANEL_MIN_WIDTH, useCanvasSidePanelStore } from "../stores/use-canvas-side-panel-store";

type Props = {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    onFocusNode: (nodeId: string) => void;
    onInsertAsset: (payload: InsertAssetPayload) => void;
    mobile?: boolean;
    onCreateNode?: (type: CanvasNodeType) => void;
    onStartNodeDrag?: (type: CanvasNodeType, event: ReactPointerEvent<HTMLButtonElement>) => void;
};

const NODE_ICONS = {
    [CanvasNodeType.Image]: ImageIcon,
    [CanvasNodeType.Video]: Video,
    [CanvasNodeType.Audio]: Music2,
    [CanvasNodeType.Text]: Type,
    [CanvasNodeType.Config]: Settings2,
};

const NODE_FILTERS = [
    { label: "全部", value: "all" },
    { label: "图片", value: CanvasNodeType.Image },
    { label: "视频", value: CanvasNodeType.Video },
    { label: "文本", value: CanvasNodeType.Text },
    { label: "音频", value: CanvasNodeType.Audio },
    { label: "配置", value: CanvasNodeType.Config },
];

export function CanvasSidePanel({ nodes, selectedNodeIds, onFocusNode, onInsertAsset, mobile = false, onCreateNode, onStartNodeDrag }: Props) {
    const { message } = App.useApp();
    const width = useCanvasSidePanelStore((state) => state.width);
    const open = useCanvasSidePanelStore((state) => state.open);
    const setWidth = useCanvasSidePanelStore((state) => state.setWidth);
    const toggle = useCanvasSidePanelStore((state) => state.toggle);
    const [tab, setTab] = useState<"canvas" | "assets">("canvas");
    const [resizing, setResizing] = useState(false);

    const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        const onMove = (moveEvent: PointerEvent) => setWidth(startWidth + moveEvent.clientX - startX);
        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            setResizing(false);
        };
        setResizing(true);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    if (!open) {
        if (mobile) return null;
        return (
            <button type="button" className="absolute left-3 top-20 z-[60] grid size-9 place-items-center rounded-lg border bg-background/90 shadow-sm backdrop-blur" onClick={toggle} aria-label="打开画布侧栏" title="打开画布侧栏">
                <ChevronRight className="size-4" />
            </button>
        );
    }

    return (
        <aside
            className={cn("relative z-[60] flex h-full shrink-0 flex-col border-r bg-background/95 backdrop-blur", mobile && "canvas-mobile-side-panel fixed")}
            style={mobile ? undefined : { width, transition: resizing ? "none" : "width 180ms ease" }}
            data-canvas-no-zoom
        >
            <div className="flex items-center gap-4 border-b px-4 py-3">
                <button type="button" className={cn("border-b-2 pb-1 text-sm font-medium", tab === "canvas" ? "border-current" : "border-transparent opacity-50")} onClick={() => setTab("canvas")}>
                    画布
                </button>
                <button type="button" className={cn("border-b-2 pb-1 text-sm font-medium", tab === "assets" ? "border-current" : "border-transparent opacity-50")} onClick={() => setTab("assets")}>
                    资产
                </button>
                <button type="button" className="ml-auto grid size-7 place-items-center rounded-md opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10" onClick={toggle} aria-label="收起画布侧栏" title="收起画布侧栏">
                    <ChevronRight className="size-4 rotate-180" />
                </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
                {tab === "canvas" ? (
                    <CanvasNodesTab
                        nodes={nodes}
                        selectedNodeIds={selectedNodeIds}
                        onFocusNode={onFocusNode}
                        onExport={(count) => message.success("已导出 " + count + " 个元素")}
                        mobile={mobile}
                        onCreateNode={onCreateNode}
                        onStartNodeDrag={onStartNodeDrag}
                    />
                ) : (
                    <CanvasAssetsTab onInsert={onInsertAsset} />
                )}
            </div>
            {!mobile ? <button type="button" className="absolute inset-y-0 -right-2 z-10 w-4 cursor-col-resize" onPointerDown={startResize} aria-label="调整侧栏宽度" /> : null}
        </aside>
    );
}

function CanvasNodesTab({
    nodes,
    selectedNodeIds,
    onFocusNode,
    onExport,
    mobile = false,
    onCreateNode,
    onStartNodeDrag,
}: {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    onFocusNode: (nodeId: string) => void;
    onExport: (count: number) => void;
    mobile?: boolean;
    onCreateNode?: (type: CanvasNodeType) => void;
    onStartNodeDrag?: (type: CanvasNodeType, event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
    const [query, setQuery] = useState("");
    const [type, setType] = useState("all");
    const [selectMode, setSelectMode] = useState(false);
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [exporting, setExporting] = useState(false);
    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return nodes.filter((node) => (type === "all" || node.type === type) && (!keyword || `${node.title} ${node.metadata?.content || ""} ${node.metadata?.prompt || ""}`.toLowerCase().includes(keyword)));
    }, [nodes, query, type]);
    const toggleChecked = (id: string) =>
        setChecked((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const exportChecked = async () => {
        const targets = nodes.filter((node) => checked.has(node.id));
        if (!targets.length || exporting) return;
        setExporting(true);
        try {
            await exportCanvasNodes(targets, `DQ-画布元素-${targets.length}`);
            onExport(targets.length);
            setChecked(new Set());
            setSelectMode(false);
        } catch {
            // The export helper reports failures through the browser promise boundary.
        } finally {
            setExporting(false);
        }
    };
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 px-3 pb-2 pt-3">
                <span className="text-xs font-medium opacity-60">画布元素</span>
                <span className="text-xs opacity-35">{filtered.length}</span>
                <button
                    type="button"
                    className={cn("ml-auto flex items-center gap-1 rounded-md px-1.5 py-1 text-xs", selectMode ? "text-blue-600" : "opacity-70 hover:bg-black/5 dark:hover:bg-white/10")}
                    onClick={() => {
                        setSelectMode((value) => !value);
                        setChecked(new Set());
                    }}
                >
                    <ListChecks className="size-3.5" />
                    {selectMode ? "取消" : "选择"}
                </button>
                {!selectMode ? <Select size="small" variant="borderless" className="w-20" value={type} onChange={setType} options={NODE_FILTERS} /> : null}
            </div>
            {mobile ? <MobileNodePalette onCreateNode={onCreateNode} onStartNodeDrag={onStartNodeDrag} /> : null}
            <div className="px-3 pb-2">
                <Input size="small" allowClear prefix={<Search className="size-3.5 text-stone-400" />} placeholder="搜索节点" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {filtered.length ? (
                    filtered.map((node) => {
                        const Icon = NODE_ICONS[node.type] || FileText;
                        const preview = node.type === CanvasNodeType.Text ? node.metadata?.content || node.metadata?.prompt : node.metadata?.content;
                        const active = selectMode ? checked.has(node.id) : selectedNodeIds.has(node.id);
                        return (
                            <button
                                key={node.id}
                                type="button"
                                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition", active ? "bg-blue-500/10" : "hover:bg-black/5 dark:hover:bg-white/10")}
                                onClick={() => (selectMode ? toggleChecked(node.id) : onFocusNode(node.id))}
                            >
                                {selectMode ? (
                                    <span className={cn("grid size-4 shrink-0 place-items-center rounded border", checked.has(node.id) ? "border-blue-600 bg-blue-600 text-white" : "border-current/30")}>
                                        {checked.has(node.id) ? <Check className="size-3" /> : null}
                                    </span>
                                ) : null}
                                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                                    {node.type === CanvasNodeType.Image && preview ? <img src={preview} alt={node.title} className="size-full object-cover" /> : <Icon className="size-4 opacity-60" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium">{node.title || "未命名节点"}</span>
                                    <span className="block truncate text-xs opacity-50">{preview || node.type}</span>
                                </span>
                            </button>
                        );
                    })
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="画布暂无节点" className="py-12" />
                )}
            </div>
            {selectMode ? (
                <div className="flex items-center gap-2 border-t px-3 py-2 text-xs">
                    <span className="opacity-60">已选 {checked.size}</span>
                    <button type="button" className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-black/5 disabled:opacity-40 dark:hover:bg-white/10" disabled={!checked.size || exporting} onClick={() => void exportChecked()}>
                        <Download className="size-3.5" />
                        导出
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function CanvasAssetsTab({ onInsert }: { onInsert: (payload: InsertAssetPayload) => void }) {
    const assets = useAssetStore((state) => state.assets);
    const [query, setQuery] = useState("");
    const visible = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return assets.filter((asset) => !keyword || `${asset.title} ${asset.tags.join(" ")}`.toLowerCase().includes(keyword)).slice(0, 40);
    }, [assets, query]);
    const insert = (asset: Asset) => {
        if (asset.kind === "text") onInsert({ kind: "text", content: asset.data.content, title: asset.title });
        else if (asset.kind === "video") onInsert({ kind: "video", url: asset.data.url, storageKey: asset.data.storageKey, title: asset.title, width: asset.data.width, height: asset.data.height });
        else onInsert({ kind: "image", dataUrl: asset.data.dataUrl, storageKey: asset.data.storageKey, title: asset.title });
    };
    return (
        <div className="flex h-full flex-col">
            <div className="px-3 pb-2 pt-3">
                <Input size="small" allowClear prefix={<Search className="size-3.5 text-stone-400" />} placeholder="搜索资产" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                {visible.length ? (
                    visible.map((asset) => (
                        <button key={asset.id} type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10" onClick={() => insert(asset)}>
                            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-black/5 dark:bg-white/10">
                                {asset.kind === "image" && asset.data.dataUrl ? (
                                    <img src={asset.data.dataUrl} alt={asset.title} className="size-full object-cover" />
                                ) : asset.kind === "video" ? (
                                    <Video className="size-4 opacity-60" />
                                ) : (
                                    <FileText className="size-4 opacity-60" />
                                )}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm">{asset.title}</span>
                        </button>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无资产" className="py-12" />
                )}
            </div>
        </div>
    );
}

function MobileNodePalette({ onCreateNode, onStartNodeDrag }: { onCreateNode?: (type: CanvasNodeType) => void; onStartNodeDrag?: (type: CanvasNodeType, event: ReactPointerEvent<HTMLButtonElement>) => void }) {
    return (
        <div className="canvas-mobile-node-palette" aria-label="画布元素">
            {([CanvasNodeType.Text, CanvasNodeType.Image, CanvasNodeType.Video, CanvasNodeType.Audio, CanvasNodeType.Config] as CanvasNodeType[]).map((type) => {
                const Icon = NODE_ICONS[type];
                const label = type === CanvasNodeType.Text ? "文本" : type === CanvasNodeType.Image ? "图片" : type === CanvasNodeType.Video ? "视频" : type === CanvasNodeType.Audio ? "音频" : "配置";
                return (
                    <button key={type} type="button" className="canvas-mobile-node-palette-item" onPointerDown={(event) => onStartNodeDrag?.(type, event)} aria-label={"创建" + label + "节点"}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                    </button>
                );
            })}
        </div>
    );
}

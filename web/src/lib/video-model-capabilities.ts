export type VideoModelCapabilities = {
    hint: string;
    supportsTextToVideo: boolean;
    supportsReferenceImage: boolean;
    supportsReferenceVideo: boolean;
    supportsReferenceAudio: boolean;
    maxReferenceImages?: number;
};

export function videoModelCapabilities(model: string): VideoModelCapabilities | null {
    const name = model.includes("::") ? model.slice(model.indexOf("::") + 2) : model;
    if (!/^grok-imagine-video(?:-|$)/i.test(name.trim())) return null;
    return {
        hint: "Grok 视频仅支持图生视频；仅支持 1 张参考图作为首帧；不支持文生视频、参考视频或参考音频。",
        supportsTextToVideo: false,
        supportsReferenceImage: true,
        supportsReferenceVideo: false,
        supportsReferenceAudio: false,
        maxReferenceImages: 1,
    };
}

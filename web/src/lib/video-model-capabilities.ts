export type VideoModelCapabilities = {
    hint: string;
    supportsTextToVideo: boolean;
    supportsReferenceImage: boolean;
    supportsReferenceVideo: boolean;
    supportsReferenceAudio: boolean;
    maxReferenceImages?: number;
    supportedRatios?: string[];
    supportedQualities?: string[];
};

export function videoModelCapabilities(model: string): VideoModelCapabilities | null {
    const name = model.includes("::") ? model.slice(model.indexOf("::") + 2) : model;
    if (!/^grok-imagine-video(?:-|$)/i.test(name.trim())) return null;
    return {
        hint: "Grok 视频仅支持图生视频；仅支持 1 张参考图作为首帧；不支持文生视频、参考视频或参考音频；当前接口支持 720P、1080P，不支持 480P 和 1:1。",
        supportsTextToVideo: false,
        supportsReferenceImage: true,
        supportsReferenceVideo: false,
        supportsReferenceAudio: false,
        maxReferenceImages: 1,
        supportedRatios: ["2:3", "3:2", "16:9", "9:16"],
        supportedQualities: ["720", "1080"],
    };
}

export function videoCapabilityError(model: string, ratio: string, quality: string) {
    const capabilities = videoModelCapabilities(model);
    if (!capabilities) return "";
    if (capabilities.supportedRatios && !capabilities.supportedRatios.includes(ratio)) return "当前 Grok 视频接口不支持 1:1 比例，请选择其他比例";
    if (capabilities.supportedQualities && !capabilities.supportedQualities.includes(quality)) return "当前 Grok 视频接口最低支持 720P，请选择 720P 或 1080P";
    return "";
}

export function resolveGrokVideoPixelSize(ratio: string, quality: string) {
    const portrait = ratio === "2:3" || ratio === "9:16";
    if (quality === "1080") return portrait ? "1024x1792" : "1792x1024";
    return portrait ? "720x1280" : "1280x720";
}

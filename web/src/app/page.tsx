"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Image as ImageIcon, Layers3, Mail, MessageCircle, Send, ShieldCheck, Wand2 } from "lucide-react";
import { Button, Image, Modal } from "antd";

import { AuthForm } from "@/components/auth/auth-form";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { fetchPrompts, type Prompt } from "@/services/api/prompts";
import { APP_VERSION } from "@/constant/env";
import { navigationTools } from "@/constant/navigation-tools";
import { type LocalUser, useUserStore } from "@/stores/use-user-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { cn } from "@/lib/utils";

type SessionPayload = {
    user?: LocalUser | null;
    settings?: {
        site?: {
            title: string;
            logoUrl: string;
            seoDescription?: string;
            footerCopyright?: string;
            termsUrl?: string;
            privacyUrl?: string;
            homeShowcaseMode?: SiteShowcaseMode;
            homeShowcaseItems?: SiteShowcaseItem[];
            friendLinks?: SiteFriendLink[];
            socials?: SiteSocialSettings;
        };
    };
};

type SiteSocialKey = "email" | "telegram" | "x" | "wechat";

type SiteSocialSettings = Record<SiteSocialKey, { enabled: boolean; label: string; url: string }>;
type SiteFriendLink = { id: string; label: string; url: string; enabled: boolean };
type SiteShowcaseMode = "random" | "custom";
type SiteShowcaseItem = { id: string; title: string; coverUrl: string; prompt: string; tags: string[]; category: string };

const featureItems = [
    { icon: Layers3, title: "无限画布", text: "把图片、文字、视频、音频与配置节点串成连续创作流。" },
    { icon: Wand2, title: "多模态生成", text: "在同一套清晰参数中完成文生图、图生图、文字与视频生成。" },
    { icon: ImageIcon, title: "灵感资产", text: "把提示词、参考风格、参数和结果一起沉淀，随时继续下一次创作。" },
];

const defaultSite: {
    title: string;
    logoUrl: string;
    seoDescription: string;
    footerCopyright: string;
    termsUrl: string;
    privacyUrl: string;
    homeShowcaseMode: SiteShowcaseMode;
    homeShowcaseItems: SiteShowcaseItem[];
    friendLinks: SiteFriendLink[];
    socials: SiteSocialSettings;
} = {
    title: "DQ",
    logoUrl: "/logo.svg",
    seoDescription: "面向 AI 创作与管理的 DQ 工作台",
    footerCopyright: "© 2026 DQ. All rights reserved.",
    termsUrl: "/terms",
    privacyUrl: "/privacy",
    homeShowcaseMode: "random",
    homeShowcaseItems: [],
    friendLinks: [{ id: "xianyu", label: "咸鱼", url: "https://www.goofish.com/", enabled: true }],
    socials: {
        email: { enabled: true, label: "邮箱联系", url: "mailto:dq-contact@qq.com" },
        telegram: { enabled: false, label: "Telegram", url: "" },
        x: { enabled: false, label: "X", url: "" },
        wechat: { enabled: false, label: "联系反馈", url: "" },
    } satisfies SiteSocialSettings,
};

const socialIconByKey: Record<SiteSocialKey, ReactNode> = {
    email: <Mail className="size-4" />,
    telegram: <Send className="size-4" />,
    x: <span className="text-base font-black leading-none">X</span>,
    wechat: <MessageCircle className="size-4" />,
};

const publicPrefetchRoutes = ["/login", "/register", "/forgot-password", "/privacy", "/terms"];
const authenticatedPrefetchRoutes = navigationTools.map((tool) => `/${tool.slug}`);

export default function HomePage() {
    const router = useRouter();
    const [primaryTool] = navigationTools;
    const [promptShowcase, setPromptShowcase] = useState<Prompt[]>([]);
    const showcaseRef = useRef<HTMLElement | null>(null);
    const showcaseRequestedRef = useRef(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [isAdminHost, setIsAdminHost] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [site, setSite] = useState(defaultSite);
    const user = useUserStore((state) => state.user);
    const setUser = useUserStore((state) => state.setUser);
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const friendLinks = (site.friendLinks || []).filter((link) => link.enabled && link.url);
    const previewItems = promptShowcase.filter((item) => item.coverUrl);
    const hasVerifiedUser = sessionReady && Boolean(user);
    const showAdminEntry = hasVerifiedUser && user?.role === "admin" && isAdminHost;

    const openProtectedEntry = (path: string) => {
        if (hasVerifiedUser) {
            router.push(path);
            return;
        }
        setAuthOpen(true);
    };

    useEffect(() => {
        setIsAdminHost(window.location.hostname.toLowerCase() === "admin.dqin-666zj.top");
    }, []);

    useEffect(() => {
        const routes = user ? [...authenticatedPrefetchRoutes, "/profile", ...(showAdminEntry ? ["/admin"] : [])] : publicPrefetchRoutes;
        return prefetchRoutesAfterIdle(routes, router.prefetch);
    }, [router, showAdminEntry, user]);

    useEffect(() => {
        let cancelled = false;
        void fetch("/api/auth/session")
            .then((response) => response.json() as Promise<SessionPayload>)
            .then((data) => {
                if (cancelled) return;
                setUser(data.user || null);
                if (data.settings?.site) {
                    const nextSite = { ...defaultSite, ...data.settings.site, title: "DQ", friendLinks: (data.settings.site.friendLinks || []).filter((link) => !/(github|vozeb|csyqlz)/i.test(link.url)) };
                    setSite(nextSite);
                    if (nextSite.homeShowcaseMode === "custom") {
                        showcaseRequestedRef.current = true;
                        setPromptShowcase(siteShowcaseItemsToPrompts(nextSite.homeShowcaseItems));
                    }
                }
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setSessionReady(true);
            });
        return () => {
            cancelled = true;
        };
    }, [setUser]);

    useEffect(() => {
        if (site.homeShowcaseMode === "custom") {
            showcaseRequestedRef.current = true;
            setPromptShowcase(siteShowcaseItemsToPrompts(site.homeShowcaseItems));
            return;
        }

        showcaseRequestedRef.current = false;
        let cancelled = false;
        let idleHandle: number | undefined;
        let timeoutHandle: ReturnType<typeof globalThis.setTimeout> | undefined;
        let observer: IntersectionObserver | undefined;

        const loadShowcase = () => {
            void fetchPrompts({ pageSize: 8, random: true })
                .then((data) => {
                    if (!cancelled) setPromptShowcase(data.items);
                })
                .catch(() => undefined);
        };

        const scheduleLoad = () => {
            if (showcaseRequestedRef.current) return;
            showcaseRequestedRef.current = true;
            if ("requestIdleCallback" in window) {
                idleHandle = window.requestIdleCallback(loadShowcase, { timeout: 1800 });
            } else {
                timeoutHandle = globalThis.setTimeout(loadShowcase, 600);
            }
        };

        const section = showcaseRef.current;
        if (!section || !("IntersectionObserver" in window)) {
            timeoutHandle = globalThis.setTimeout(scheduleLoad, 1200);
            return () => {
                if (timeoutHandle) globalThis.clearTimeout(timeoutHandle);
            };
        }

        observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer?.disconnect();
                    scheduleLoad();
                }
            },
            { rootMargin: "360px 0px" },
        );
        observer.observe(section);

        return () => {
            cancelled = true;
            observer?.disconnect();
            if (idleHandle && "cancelIdleCallback" in window) window.cancelIdleCallback(idleHandle);
            if (timeoutHandle) globalThis.clearTimeout(timeoutHandle);
        };
    }, [site.homeShowcaseItems, site.homeShowcaseMode]);

    return (
        <main className="landing-editorial-bg relative h-dvh overflow-x-hidden overflow-y-auto">
            <header className="landing-editorial-header sticky top-0 z-50">
                <div className="mx-auto grid h-[72px] max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-5 px-6 lg:px-10">
                    <Link href="/" aria-label="返回 DQ 首页" className="landing-editorial-brand inline-flex min-w-0 items-center gap-3">
                        <SiteLogo logoUrl={site.logoUrl} className="size-8" />
                        <span className="truncate text-lg font-medium tracking-[-0.02em]">{site.title || "DQ"}</span>
                    </Link>
                    <nav className="landing-editorial-nav hidden items-center gap-7 md:flex" aria-label="首页导航">
                        {navigationTools.slice(0, 1).map((tool) => (
                            <Link key={tool.slug} href={"/" + tool.slug} prefetch className="landing-editorial-nav-link">
                                {tool.label}
                            </Link>
                        ))}
                        {showAdminEntry ? (
                            <Link href="/admin" prefetch className="landing-editorial-nav-link inline-flex items-center gap-1.5">
                                <ShieldCheck className="size-3.5" aria-hidden="true" />
                                管理入口
                            </Link>
                        ) : null}
                        {navigationTools.slice(1, 4).map((tool) => (
                            <Link key={tool.slug} href={"/" + tool.slug} prefetch className="landing-editorial-nav-link">
                                {tool.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="landing-editorial-header-actions flex items-center justify-end gap-2">
                        <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} className="landing-theme-toggle" aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"} />
                        <Button className="landing-login-button" onClick={() => openProtectedEntry("/canvas")}>
                            {hasVerifiedUser ? "进入工作台" : "登录"}
                        </Button>
                    </div>
                </div>
            </header>

            <section className="landing-editorial-hero mx-auto max-w-[1500px] px-6 lg:px-10">
                <div className="landing-editorial-kicker">
                    <span>AI CREATIVE WORKSPACE</span>
                    <span>DQ / {APP_VERSION}</span>
                </div>

                <div className="landing-editorial-title-stage" aria-label={site.title || "DQ"}>
                    <h1>{site.title || "DQ"}</h1>
                </div>

                <div className="landing-editorial-hero-summary">
                    <div className="landing-editorial-hero-copy">
                        <span className="landing-editorial-eyebrow">CREATE / CONNECT / REFINE</span>
                        <h2>让灵感、模型与结果，在一个创作空间里持续生长。</h2>
                        <p>生成图片、文字与视频，连接素材和配置，把一次尝试沉淀为可以继续推演的工作流。</p>
                    </div>
                    <div className="landing-editorial-hero-actions">
                        <Button className="landing-hero-cta" type="primary" size="large" onClick={() => openProtectedEntry("/" + primaryTool.slug)} icon={<ArrowRight className="size-4" aria-hidden="true" />} iconPlacement="end">
                            开始创作
                        </Button>
                        <Link href="/prompts" className="landing-editorial-text-link">
                            浏览提示词库
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>

                <div className="landing-editorial-capabilities">
                    {featureItems.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <article key={item.title} className="landing-editorial-capability">
                                <div className="landing-editorial-capability-meta">
                                    <span>0{index + 1}</span>
                                    <Icon className="size-[18px]" aria-hidden="true" />
                                </div>
                                <h3>{item.title}</h3>
                                <p>{item.text}</p>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section ref={showcaseRef} className="landing-editorial-showcase mx-auto max-w-[1500px] px-6 lg:px-10">
                <div className="landing-editorial-section-header">
                    <div>
                        <span className="landing-editorial-eyebrow">SELECTED PROMPTS</span>
                        <h2>沉淀每一次好结果</h2>
                    </div>
                    <div className="landing-editorial-section-intro">
                        <p>收藏稳定有效的提示词、参考风格与结果图片，让下一次创作从已有经验开始。</p>
                        <Link href="/prompts" className="landing-editorial-text-link">
                            查看全部
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>
                </div>

                <div className="landing-editorial-work-grid">
                    {promptShowcase.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={item.coverUrl ? "预览 " + item.title : item.title}
                            disabled={!item.coverUrl}
                            onClick={() => {
                                if (!item.coverUrl) return;
                                setPreviewIndex(
                                    Math.max(
                                        0,
                                        previewItems.findIndex((preview) => preview.id === item.id),
                                    ),
                                );
                                setPreviewOpen(true);
                            }}
                            className={cn("landing-editorial-work-card", index === 0 && "is-featured", index === 3 && "is-wide")}
                        >
                            <div className="landing-editorial-work-media">{item.coverUrl ? <img src={item.coverUrl} alt={item.title} loading="lazy" referrerPolicy="no-referrer" /> : <div className="landing-editorial-work-placeholder" />}</div>
                            <div className="landing-editorial-work-copy">
                                <div className="landing-editorial-work-meta">
                                    <span>{item.category || "PROMPT"}</span>
                                    <span>{item.tags[0] || "DQ"}</span>
                                </div>
                                <h3>{item.title}</h3>
                                <p>{item.prompt}</p>
                            </div>
                        </button>
                    ))}
                    {!promptShowcase.length
                        ? Array.from({ length: 4 }).map((_, index) => (
                              <div key={index} aria-hidden="true" className={cn("landing-editorial-work-card is-loading", index === 0 && "is-featured", index === 3 && "is-wide")}>
                                  <div className="landing-editorial-work-media" />
                                  <div className="landing-editorial-work-copy">
                                      <span />
                                      <span />
                                  </div>
                              </div>
                          ))
                        : null}
                </div>
            </section>

            <section className="landing-editorial-statement mx-auto max-w-[1500px] px-6 lg:px-10">
                <div className="landing-editorial-statement-label">ONE WORKSPACE</div>
                <p>不是堆叠更多工具，而是让创作过程更清楚、更连续，也更容易被再次使用。</p>
            </section>

            <footer className="landing-editorial-footer mx-auto max-w-[1500px] px-6 pb-10 lg:px-10">
                <div className="landing-footer-shell">
                    <div className="landing-footer-brand min-w-0">
                        <SiteLogo logoUrl={site.logoUrl} className="landing-footer-logo" />
                        <div className="landing-footer-brand-copy min-w-0">
                            <div className="landing-footer-title truncate">{site.title || "DQ"}</div>
                            <div className="landing-footer-copyright">{site.footerCopyright}</div>
                        </div>
                    </div>
                    <div className="landing-footer-actions">
                        <div className="landing-footer-links">
                            <div className="landing-footer-link-row landing-footer-policy-links">
                                <Link href="/announcements" className="landing-footer-link">
                                    网站公告
                                </Link>
                                <Link href={site.termsUrl || "/terms"} className="landing-footer-link">
                                    使用条款
                                </Link>
                                <Link href={site.privacyUrl || "/privacy"} className="landing-footer-link">
                                    隐私政策
                                </Link>
                            </div>
                            {friendLinks.length ? (
                                <div className="landing-footer-link-row landing-footer-friend-links">
                                    {friendLinks.map((link) => (
                                        <Link key={link.id} href={link.url} className="landing-footer-link" target={opensInNewTab(link.url) ? "_blank" : undefined} rel={opensInNewTab(link.url) ? "noreferrer" : undefined}>
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        <div className="landing-footer-socials">
                            {Object.entries(site.socials)
                                .filter(([, social]) => social.enabled && social.url)
                                .map(([key, social]) => (
                                    <Link key={key} href={social.url} className="landing-footer-social" title={social.label} target={opensInNewTab(social.url) ? "_blank" : undefined} rel={opensInNewTab(social.url) ? "noreferrer" : undefined}>
                                        {socialIconByKey[key as SiteSocialKey]}
                                        <span className={key === "wechat" ? "text-xs font-medium" : "sr-only"}>{social.label}</span>
                                    </Link>
                                ))}
                        </div>
                    </div>
                </div>
            </footer>

            <Image.PreviewGroup
                preview={{
                    open: previewOpen,
                    current: previewIndex,
                    onOpenChange: setPreviewOpen,
                    onChange: setPreviewIndex,
                }}
            >
                <div className="hidden">
                    {previewItems.map((item) => (
                        <Image key={item.id} src={item.coverUrl} alt={item.title} />
                    ))}
                </div>
            </Image.PreviewGroup>

            <Modal open={authOpen} footer={null} width={820} centered destroyOnHidden onCancel={() => setAuthOpen(false)} className="landing-auth-modal">
                <div className="landing-auth-modal-shell">
                    <section className="landing-auth-modal-brand">
                        <div className="inline-flex items-center gap-3 text-stone-950 dark:text-white">
                            <SiteLogo logoUrl={site.logoUrl} className="landing-auth-brand-logo bg-stone-950 dark:bg-white" />
                            <span className="text-2xl font-semibold">{site.title || "DQ"}</span>
                        </div>
                        <div className="landing-auth-modal-copy">
                            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">DQ Access</p>
                            <h2 className="mt-3 text-3xl font-semibold leading-tight text-stone-950 dark:text-white">继续你的创作现场</h2>
                            <p className="mt-4 text-sm leading-7 text-stone-500 dark:text-stone-300">登录后进入画布、素材、模型和提示词库。</p>
                        </div>
                        <div className="landing-auth-modal-bullets grid gap-2 text-sm text-stone-600 dark:text-stone-300">
                            {["无限画布编排", "远程提示词库", "用户积分与后台"].map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-stone-400 dark:bg-stone-500" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                    <div className="landing-auth-modal-form">
                        <AuthForm mode="login" variant="embedded" nextPath="/canvas" className="min-h-0 bg-transparent p-0 shadow-none" />
                    </div>
                </div>
            </Modal>
        </main>
    );
}

function siteShowcaseItemsToPrompts(items: SiteShowcaseItem[] = []): Prompt[] {
    const now = new Date().toISOString();
    return items
        .filter((item) => item.title.trim() && item.prompt.trim())
        .slice(0, 8)
        .map((item) => ({
            id: item.id,
            scope: "library" as const,
            title: item.title,
            coverUrl: item.coverUrl,
            prompt: item.prompt,
            tags: item.tags || [],
            category: item.category || "首页展示",
            preview: item.prompt,
            createdAt: now,
            updatedAt: now,
        }));
}

function prefetchRoutesAfterIdle(routes: string[], prefetch: (href: string) => void) {
    if (shouldSkipHomepagePrefetch()) return undefined;

    let cancelled = false;
    const timers: number[] = [];
    const idleWindow = window as Window & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
    };

    const run = () => {
        if (cancelled || document.visibilityState !== "visible") return;
        routes.forEach((route, index) => {
            const timer = window.setTimeout(
                () => {
                    if (!cancelled) prefetch(route);
                },
                450 + index * 650,
            );
            timers.push(timer);
        });
    };

    const idleId = idleWindow.requestIdleCallback?.(run, { timeout: 2400 });
    const fallbackTimer = idleId === undefined ? window.setTimeout(run, 1800) : undefined;

    return () => {
        cancelled = true;
        if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        timers.forEach((timer) => window.clearTimeout(timer));
    };
}

function shouldSkipHomepagePrefetch() {
    const nav = navigator as Navigator & {
        connection?: {
            saveData?: boolean;
            effectiveType?: string;
        };
    };
    const connection = nav.connection;
    if (connection?.saveData) return true;
    return /(^|-)2g$/i.test(connection?.effectiveType || "");
}

function opensInNewTab(url: string) {
    return /^https?:\/\//i.test(url);
}

function SiteLogo({ logoUrl, className }: { logoUrl: string; className: string }) {
    if (logoUrl && logoUrl !== "/logo.svg") return <img src={logoUrl} alt="" className={cn(className, "shrink-0 object-contain")} />;
    return (
        <span
            className={cn(className, "shrink-0")}
            style={{
                mask: "url(/logo.svg) center / contain no-repeat",
                WebkitMask: "url(/logo.svg) center / contain no-repeat",
            }}
        />
    );
}

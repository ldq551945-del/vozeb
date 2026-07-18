import Link from "next/link";
import { ArrowLeft, CheckCircle2, CloudCog, DatabaseBackup, Scale } from "lucide-react";

const terms = [
    {
        title: "服务用途",
        body: "DQ 提供图片、视频、文本和素材创作工具。你可以使用账号保存自己的创作内容，并根据页面显示的额度使用相关功能。",
        icon: <Scale className="size-5" />,
    },
    {
        title: "账号与额度",
        body: "请使用真实、可用的信息注册账号，并妥善保管登录凭据。额度和积分按照站点当前规则使用，具体消耗以生成前后的页面提示为准。",
        icon: <CloudCog className="size-5" />,
    },
    {
        title: "内容规范",
        body: "请勿上传、生成或传播违法、侵权、欺诈、恶意攻击、侵犯他人隐私或违反当地法律法规的内容。你应对自己提交的文字、图片、视频和生成结果负责。",
        icon: <CheckCircle2 className="size-5" />,
    },
    {
        title: "服务与反馈",
        body: "DQ 可能因为维护、升级、网络或不可控因素暂时无法使用。发现问题或需要帮助时，请通过页面提供的联系反馈方式与管理员沟通。",
        icon: <DatabaseBackup className="size-5" />,
    },
    {
        title: "规则调整",
        body: "服务功能、额度规则和页面内容可能根据运营需要进行调整。重要变化会通过站点公告或页面提示说明；继续使用服务即表示你接受调整后的规则。",
        icon: <CloudCog className="size-5" />,
    },
];

export default function TermsPage() {
    return (
        <main className="h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)] text-stone-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),linear-gradient(180deg,#0a0a0a_0%,#101010_58%,#171717_100%)] dark:text-stone-200">
            <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-10">
                <Link
                    href="/"
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm shadow-stone-200/50 backdrop-blur transition hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:shadow-black/30 dark:hover:border-cyan-500/50 dark:hover:text-cyan-200"
                >
                    <ArrowLeft className="size-4" />
                    返回首页
                </Link>

                <section className="mt-8 overflow-hidden rounded-lg border border-stone-200 bg-white/88 shadow-xl shadow-stone-200/60 backdrop-blur dark:border-white/10 dark:bg-stone-950/78 dark:shadow-black/30">
                    <div className="border-b border-stone-200 bg-stone-950 px-6 py-8 text-white sm:px-8 dark:border-white/10 dark:bg-white/[0.06]">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">
                            <Scale className="size-3.5" />
                            DQ Legal
                        </div>
                        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">使用条款</h1>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-200 dark:text-stone-300">使用 DQ 前，请了解账号、额度、内容规范和服务边界。</p>
                    </div>

                    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
                        {terms.map((item) => (
                            <article key={item.title} className="rounded-lg border border-stone-200 bg-stone-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/70 dark:bg-cyan-950/45 dark:text-cyan-200 dark:ring-cyan-800/60">{item.icon}</span>
                                    <h2 className="text-base font-semibold text-stone-950 dark:text-white">{item.title}</h2>
                                </div>
                                <p className="mt-4 text-sm leading-7 text-stone-600 dark:text-stone-400">{item.body}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}

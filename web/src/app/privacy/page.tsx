import Link from "next/link";
import { ArrowLeft, Database, KeyRound, MailCheck, ShieldCheck, Workflow } from "lucide-react";

const policies = [
    {
        title: "我们会保存什么",
        body: "DQ 可能保存用户名、邮箱、登录状态、积分记录、生成记录、画布内容和你主动提交的素材，用于提供账号、创作和历史记录功能。",
        icon: <Database className="size-5" />,
    },
    {
        title: "信息如何使用",
        body: "这些信息主要用于登录验证、额度计算、保存创作记录、处理反馈和维护账号安全。我们不会因为你使用某个功能而要求提供与该功能无关的额外资料。",
        icon: <MailCheck className="size-5" />,
    },
    {
        title: "生成内容与第三方服务",
        body: "当你使用 AI 生成功能时，必要的提示词、参考素材和参数会被发送给用于完成生成的 AI 服务。不同服务的处理规则可能不同，请不要提交不适合分享的敏感信息。",
        icon: <Workflow className="size-5" />,
    },
    {
        title: "邮箱与安全",
        body: "注册、修改邮箱或找回密码时，DQ 可能向你填写的邮箱发送验证码。验证码只用于当前操作，并会在有效期结束或使用后失效。请妥善保管账号信息，不要把验证码交给他人。",
        icon: <KeyRound className="size-5" />,
    },
    {
        title: "保存期限与反馈",
        body: "我们会在提供服务和处理安全问题所需的期限内保存相关信息。你可以通过联系反馈方式咨询账号信息、数据处理或删除请求，管理员会在合理范围内处理。",
        icon: <ShieldCheck className="size-5" />,
    },
];

export default function PrivacyPage() {
    return (
        <main className="h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.12),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)] text-stone-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_34%),linear-gradient(180deg,#0a0a0a_0%,#101010_58%,#171717_100%)] dark:text-stone-200">
            <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-10">
                <Link
                    href="/"
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm shadow-stone-200/50 backdrop-blur transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200 dark:shadow-black/30 dark:hover:border-emerald-500/50 dark:hover:text-emerald-200"
                >
                    <ArrowLeft className="size-4" />
                    返回首页
                </Link>

                <section className="mt-8 overflow-hidden rounded-lg border border-stone-200 bg-white/88 shadow-xl shadow-stone-200/60 backdrop-blur dark:border-white/10 dark:bg-stone-950/78 dark:shadow-black/30">
                    <div className="border-b border-stone-200 bg-stone-950 px-6 py-8 text-white sm:px-8 dark:border-white/10 dark:bg-white/[0.06]">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-emerald-100">
                            <ShieldCheck className="size-3.5" />
                            DQ Privacy
                        </div>
                        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">隐私政策</h1>
                        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-200 dark:text-stone-300">这里用简单的方式说明 DQ 如何处理账号、创作内容、邮箱和安全信息。</p>
                    </div>

                    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
                        {policies.map((item) => (
                            <article key={item.title} className="rounded-lg border border-stone-200 bg-stone-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                                <div className="flex items-center gap-3">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-950/45 dark:text-emerald-200 dark:ring-emerald-800/60">
                                        {item.icon}
                                    </span>
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

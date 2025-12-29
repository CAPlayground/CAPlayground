"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { ArrowLeft, Sun, Moon } from "lucide-react"

export default function PrivacyPage() {
  const { theme, setTheme } = useTheme()
  
  useEffect(() => {
    document.title = "CAPlayground - 隐私政策";
  }, []);

  return (
    <main className="relative min-h-screen px-4 py-10 sm:py-16 bg-gradient-to-b from-muted/40 to-transparent">
      {/* back */}
      <div className="absolute left-4 top-4">
        <Link href="/">
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <ArrowLeft className="h-4 w-4 mr-1" /> 返回
                      </Button>        </Link>
      </div>

      {/* theme */}
      <div className="absolute right-4 top-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="rounded-full h-9 w-9 p-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">隐私政策</h1>
          <p className="mt-2 text-sm text-muted-foreground">最后更新：2025年10月20日</p>
        </div>

        {/* Paper container */}
        <div className="rounded-2xl bg-card text-card-foreground shadow-lg ring-1 ring-black/5 border border-border p-6 sm:p-10 text-base sm:text-lg">
          <p className="mt-0 leading-7">
            本隐私政策解释了CAPlayground（"我们"、"我们"）如何收集、使用和保护您的信息。该政策适用于您对CAPlayground网站和应用程序（"服务"）的使用。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">1. 我们收集的信息</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
            <li>
              <strong>无本地项目</strong>: 默认情况下，您的项目存储在您的设备上（使用浏览器IndexedDB或OPFS）。除非您明确上传或共享，否则我们不会收到您的本地项目。
            </li>
            <li>
              <strong>云项目（可选）</strong>: 您可以通过登录Google Drive选择使用云项目。当您这样做时，您的项目文件将存储在您的Google Drive账户中，而不是CAPlayground服务器上。我们不会接收、存储或访问您的云项目。所有数据直接在您的浏览器和Google Drive之间传输。
            </li>
            <li>
              <strong>账户信息</strong>: 如果您通过Supabase使用电子邮件/密码或Google OAuth创建账户，
              我们将处理您的邮箱、必要的身份验证标识符（例如，提供商和用户ID）以及操作服务所需的可选个人资料
              信息。
            </li>
            <li>
              <strong>设备和使用情况</strong>: 基本技术信息，如设备/浏览器类型和操作服务所需的交互
              。
            </li>
            <li>
              <strong>Cookie和本地存储</strong>: 我们使用必要的cookies/localStorage用于会话、首选项和产品
              功能（例如，首次接受条款：<code>caplayground-tos-accepted</code>）。如果您登录Google Drive，我们将在安全的httpOnly cookies（<code>google_drive_access_token</code>，<code>google_drive_refresh_token</code>，<code>google_drive_token_expiry</code>）中存储身份验证令牌，以维护您的Drive会话并代表您进行API请求的身份验证。
            </li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">2. 我们如何使用信息</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
            <li>提供和改进服务及其功能。</li>
            <li>验证用户身份和保护账户。</li>
            <li>防止滥用并确保服务的可靠性。</li>
            <li>传达与您的账户或服务相关的重要更新。</li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">3. 分析</h2>
          <p className="mt-6 leading-7">
            我们使用注重隐私的分析来了解使用情况并改进CAPlayground。这包括：
          </p>
          <ul className="mt-4 list-disc pl-6 space-y-3">
            <li>
              <strong>页面浏览</strong>: 页面URL、标题、引荐来源、时间戳和会话ID。
            </li>
            <li>
              <strong>会话</strong>: 会话持续时间、开始/结束时间、访问的页面数量和基本跳出检测。
            </li>
            <li>
              <strong>性能</strong>: 页面加载时间、DOM内容加载、首次绘制/首次内容绘制和资源
              定时指标。
            </li>
            <li>
              <strong>聚合计数器</strong>: 我们还为某些产品事件（项目
              创建）保留仅聚合的计数。这些计数器在没有用户标识符的情况下存储，并用于产品规划。您的项目内容不会被收集。
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            我们不使用分析进行广告，也不故意为分析收集敏感标识符（如精确
            位置或设备指纹数据）。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">4. 第三方</h2>
          <p className="mt-6 leading-7">
            我们使用Supabase进行身份验证和后端基础设施。Supabase可能会处理提供这些
            服务所需的数据，并可能维护操作日志（例如，身份验证事件）。我们还使用PostHog进行注重隐私的
            分析，如上所述。PostHog数据通过我们自己的域进行代理，以提高可靠性。有关更多详细信息，请参阅这些提供商的文档/政策。
          </p>
          <p className="mt-4 leading-7">
            <strong>Google Drive（可选）</strong>: 如果您选择使用云项目，我们与Google Drive集成以存储您的项目文件。您的项目文件存储在您的Google Drive账户中，名为"CAPlayground"的文件夹中。我们仅访问由CAPlayground创建的文件。您对Google Drive的使用受<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">Google隐私政策</a>约束。您可以在Google账户设置中随时撤销CAPlayground对您Drive的访问权限。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">5. 数据保留</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
            <li>本地项目保留在您的设备上，直到您删除它们。</li>
            <li>云项目保留在您的Google Drive中，直到您删除它们。删除您的CAPlayground账户不会自动从Google Drive中删除您的云项目。您必须使用仪表板中的"全部删除"功能或直接从Google Drive手动删除它们。</li>
            <li>账户数据在您的账户处于活动状态时保留。如果您删除账户，我们将删除相关账户数据
              除非法律要求保留。</li>
            <li>Google Drive身份验证cookies在您从Google Drive注销或过期时清除。</li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">6. 您的权利</h2>
          <p className="mt-6 leading-7">
            根据您的所在地，您可能有权访问、更正或删除您的数据。我们正在计划在应用程序中添加账户
            删除端点。您也可以联系我们行使您的权利。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">7. 儿童隐私</h2>
          <p className="mt-6 leading-7">
            本服务不适用于《服务条款》中指定年龄以下的儿童。如果您认为儿童向我们提供了个人数据，请联系我们，我们将采取适当步骤。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">8. 国际传输</h2>
          <p className="mt-6 leading-7">
            数据可能会在我们的提供商运营的地区进行处理。我们采取措施确保符合
            适用法律的适当保障措施。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">9. 本政策的变更</h2>
          <p className="mt-6 leading-7">
            我们可能会不时更新本隐私政策。我们将更新上面的"最后更新"日期，并在
            适当情况下提供额外通知。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">10. 联系方式</h2>
          <p className="mt-6 leading-7">
            有问题吗？通过 <a className="underline" href="mailto:support@enkei64.xyz">support@enkei64.xyz</a> 联系我们。
          </p>

          <p className="mt-10 text-sm text-muted-foreground">
            另请参阅我们的 {" "}
            <Link href="/tos" className="underline">服务条款</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}

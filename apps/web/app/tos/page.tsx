"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { ArrowLeft, Sun, Moon } from "lucide-react"

export default function TermsPage() {
  const { theme, setTheme } = useTheme()
  
  useEffect(() => {
    document.title = "CAPlayground - 服务条款";
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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">服务条款</h1>
          <p className="mt-2 text-sm text-muted-foreground">最后更新：2025年12月9日</p>
        </div>
        {/* Paper container */}
        <div className="rounded-2xl bg-card text-card-foreground shadow-lg ring-1 ring-black/5 border border-border p-6 sm:p-10 text-base sm:text-lg">
          <p className="mt-0 leading-7">
            这些服务条款（"条款"）管辖您对CAPlayground的访问和使用。通过使用服务，您同意
            这些条款。
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">1. 定义</h2>
          <ul className="mt-4 list-disc pl-6 space-y-2">
          <li><strong>服务</strong>: CAPlayground应用程序和网站。</li>
          <li><strong>本地项目</strong>: 在您的浏览器/设备中创建和存储的项目。</li>
          <li><strong>云项目</strong>: 在您的Google账户的Google Drive中创建和存储的项目。</li>
          <li><strong>账户</strong>: 由Supabase支持的账户，用于身份验证和账户功能。</li>
          <li><strong>用户内容</strong>: 您在使用服务时创建或上传的内容。</li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">2. 范围与适用性</h2>
          <p className="mt-6 leading-8">
          某些条款适用于所有使用服务的用户（一般条款）。其他条款仅适用于创建或
          使用账户的用户（账户条款）。
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">3. 一般条款（适用于所有用户）</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
          <li>
            <strong>Acceptable Use</strong>: Do not misuse the Service or interfere with others’ use. Do not attempt to access
            non-public areas or disrupt the Service.
          </li>
          <li>
            <strong>Intellectual Property</strong>: We retain all rights to the Service. You retain rights to your User Content.
          </li>
          <li>
            <strong>Content Sharing & Attribution</strong>: If you share wallpapers or content created with CAPlayground on social media platforms (including but not limited to TikTok, Instagram, YouTube, Twitter/X), you must provide clear attribution to CAPlayground. Acceptable attribution includes: (a) linking to caplayground.vercel.app in your post description, bio, or pinned comment, or (b) visibly crediting "CAPlayground" in your content. You may not mislead viewers about the source of the wallpapers or direct them to fraudulent instructions, scam websites, or deceptive practices instead of proper attribution.
          </li>
          <li>
            <strong>Prohibited Conduct</strong>: You may not use content created with CAPlayground to: (a) deceive or defraud users, (b) promote scams or misleading instructions, (c) falsely claim creation of the Service or its features, or (d) engage in any activity that damages CAPlayground's reputation or misleads the public about the Service.
          </li>
          <li>
            <strong>Projects</strong>: By default, projects are stored locally on your device (using browser IndexedDB or OPFS). We do not receive your Local Projects.  
            You can optionally use Cloud Projects, which require signing in to your CAPlayground account and then connecting your Google Drive. This enables secure cloud storage and syncing of your projects across devices.  
            CAPlayground does not receive or store your Cloud Projects; access and storage are managed according to Google Drive's policies.
          </li>
          <li>
            <strong>Cloud Projects</strong>: Cloud storage via Google Drive allows you to sync your projects across devices. We provide no guarantees of data availability or reliability for Cloud Projects. You are responsible for maintaining backups of important projects. You must comply with Google's Terms of Service when using Cloud Projects.
          </li>
          <li>
            <strong>Google云端硬盘集成</strong>：当您登录Google云端硬盘时，您授权CAPlayground访问您云端硬盘中由CAPlayground创建的文件。我们使用浏览器Cookie来维护您的云端硬盘会话。您可以通过Google账户设置随时撤销此访问权限，或在仪表板中从Google云端硬盘登出。
          </li>
          <li>
            <strong>No Warranty</strong>: The Service is provided “as is” and “as available.” We disclaim warranties to the extent
            permitted by law.
          </li>
          <li>
            <strong>Limitation of Liability</strong>: To the extent permitted by law, we are not liable for indirect, incidental, or
            consequential damages.
          </li>
          <li>
            <strong>Changes to the Service</strong>: We may change or discontinue features at any time.
          </li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">4. 账户条款（适用于登录用户）</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
          <li>
            <strong>资格</strong>: 您必须年满13岁才能使用服务，或达到您国家/地区的数字
            同意的最低年龄。
          </li>
          <li>
            <strong>账户信息</strong>: 账户通过Supabase提供。我们可能会为安全和账户操作收集和处理您的邮箱、
            用户名（如果设置）和登录活动。
          </li>
          <li>
            <strong>安全性</strong>: 请确保您的凭据安全。您对账户下的活动负责。
          </li>
          <li>
            <strong>终止</strong>: 您可以随时删除您的账户。我们可能会暂停或终止
            违反这些条款的账户。注意：删除您的CAPlayground账户不会自动从Google Drive中删除您的云项目。您必须在删除账户之前手动从Drive中删除它们或使用仪表板中的"全部删除"功能。
          </li>
          </ul>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">5. 隐私与数据</h2>
          <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            <strong>本地处理</strong>: 本地项目保留在您的设备上，除非您明确上传/分享它们。
          </li>
          <li>
            <strong>账户数据</strong>: 如果您创建账户，我们将使用Supabase处理身份验证和配置文件
            功能所需的最少数据（邮箱、可选用户名）。
          </li>
          <li>
            <strong>操作日志</strong>: Supabase作为我们的后端提供商，维护操作日志（例如，身份验证事件，
            边缘/网络、API和数据库日志）以运营和保护平台。详情请参阅Supabase文档。
          </li>
          <li>
            <strong>仅聚合分析</strong>: 我们记录某些产品内事件的聚合计数（例如，何时创建项目）
            以了解使用情况。这些计数器不包括用户标识符，也不用于广告。
          </li>
          <li>
            <strong>分析（PostHog）</strong>: 我们使用注重隐私的分析工具来衡量页面浏览量（URL、标题、
            引荐来源、时间戳、会话ID）、会话（持续时间、开始/结束时间、页面计数、基本跳出）和性能
            指标（页面加载、DOM内容加载、首次绘制/首次内容绘制、资源计时）。分析数据通过我们自己的域进行代理。
          </li>
          <li>
            <strong>云项目数据</strong>: 当您使用云项目时，您的项目文件存储在您的Google Drive账户中，而不是CAPlayground服务器上。我们不会接收、存储或访问您的云项目。所有数据在您的浏览器和Google Drive之间直接传输。
          </li>
          <li>
            <strong>Google Drive Cookie</strong>: 当您登录Google Drive时，我们在浏览器cookie中存储身份验证令牌（httpOnly、安全）以维护您的会话。这些cookie仅用于代表您向Google Drive进行API请求的身份验证。
          </li>
          </ul>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">6. 第三方服务</h2>
          <p className="mt-3 leading-7">
          We use Supabase for authentication and backend infrastructure. Your use of those features may be subject to Supabase’s
          policies.
          </p>
          <p className="mt-3 leading-7">
          If you use Cloud Projects, we integrate with Google Drive to store your project files in YOUR Google Drive account. Your use of Google Drive is subject to Google's Terms of Service and Privacy Policy. CAPlayground accesses only files it creates in a "CAPlayground" folder in your Drive. You are responsible for your Google Drive storage limits and compliance with Google's terms.
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">7. 执行与违规</h2>
          <p className="mt-3 leading-7">
          我们保留调查违反这些条款行为的权利，包括滥用使用CAPlayground创建的内容。如果我们确定您违反了内容分享与归属或禁止行为条款，我们可能会：(a) 暂停或终止您的账户，(b) 要求从社交媒体平台删除侵权内容，(c) 在适用的情况下寻求法律补救措施，或 (d) 公开识别从事欺诈或欺骗行为的账户。我们还可能向相关平台和当局报告诈骗和欺诈活动。
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">8. 这些条款的变更</h2>
          <p className="mt-3 leading-7">
          我们可能会不时更新这些条款。我们将更新上面的"最后更新"日期。重大变更将
          合理地通知。
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">9. Contact</h2>
          <p className="mt-3 leading-7">
            Questions? Contact us at <a className="underline" href="mailto:support@enkei64.xyz">support@enkei64.xyz</a>.
          </p>

          <p className="mt-10 text-sm text-muted-foreground">
            Also see our {" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </main>
  )
}

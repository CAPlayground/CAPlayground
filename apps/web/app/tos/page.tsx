"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { ArrowLeft, Sun, Moon } from "lucide-react"

export default function TermsPage() {
  const { theme, setTheme } = useTheme()
  
  useEffect(() => {
    document.title = "CAPlayground - Terms of Service";
  }, []);

  return (
    <main className="relative min-h-screen px-4 py-10 sm:py-16 bg-gradient-to-b from-muted/40 to-transparent">
      {/* back */}
      <div className="absolute left-4 top-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
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
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last Updated: 9th December 2025</p>
        </div>
        {/* Paper container */}
        <div className="rounded-2xl bg-card text-card-foreground shadow-lg ring-1 ring-black/5 border border-border p-6 sm:p-10 text-base sm:text-lg">
          <p className="mt-0 leading-7">
            These Terms of Service ("Terms") govern your access to and use of CAPlayground. By using the Service, you agree to
            these Terms.
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">1. Definitions</h2>
          <ul className="mt-4 list-disc pl-6 space-y-2">
          <li><strong>Service</strong>: The CAPlayground application and website.</li>
          <li><strong>Local Projects</strong>: Projects created and stored locally in your browser/device.</li>
          <li><strong>Cloud Projects</strong>: Projects created and stored in your Google account's Google Drive.</li>
          <li><strong>Account</strong>: A Supabase-backed account enabling authentication and account features.</li>
          <li><strong>User Content</strong>: Content you create or upload while using the Service.</li>
          </ul>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">2. Scope & Applicability</h2>
          <p className="mt-6 leading-8">
          Some sections apply to everyone who uses the Service (General Terms). Other sections apply only to users who create or
          use an Account (Account Terms).
          </p>

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">3. General Terms (apply to all users)</h2>
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
            <strong>Google Drive Integration</strong>: When you sign in to Google Drive, you authorize CAPlayground to access files created by CAPlayground in your Drive. We use browser cookies to maintain your Drive session. You can revoke this access at any time through your Google account settings or by signing out from Google Drive in the dashboard.
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

          <h2 className="mt-12 text-3xl md:text-4xl font-semibold">4. Account Terms (apply if you sign in)</h2>
          <ul className="mt-6 list-disc pl-6 space-y-3">
          <li>
            <strong>Eligibility</strong>: You must be at least 13 years old to use the Service, or the minimum age of digital
            consent in your country.
          </li>
          <li>
            <strong>Account Information</strong>: Accounts are provided via Supabase. We may collect and process your email,
            username (if set), and sign-in activity for security and account operation.
          </li>
          <li>
            <strong>Security</strong>: Keep your credentials secure. You are responsible for activity under your account.
          </li>
          <li>
            <strong>Termination</strong>: You may delete your account at any time. We may suspend or terminate accounts that
            violate these Terms. Note: Deleting your CAPlayground account does not automatically delete your Cloud Projects from Google Drive. You must manually delete them from Drive or use the "Delete All" feature in the dashboard before deleting your account.
          </li>
          </ul>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">5. Privacy & Data</h2>
          <ul className="mt-4 list-disc pl-6 space-y-2">
          <li>
            <strong>Local Processing</strong>: Local Projects remain on your device unless you explicitly upload/share them.
          </li>
          <li>
            <strong>Account Data</strong>: If you create an Account, we process minimal data needed for authentication and profile
            features (email, optional username) using Supabase.
          </li>
          <li>
            <strong>Operational Logs</strong>: Supabase, as our backend provider, maintains operational logs (e.g., auth events,
            edge/network, API, and database logs) to operate and secure the platform. See Supabase docs for details.
          </li>
          <li>
            <strong>Aggregate-only Analytics</strong>: We record aggregate counts of certain in-product events (e.g., when a project
            is created) to understand usage. These counters do not include user identifiers and are not used for advertising.
          </li>
          <li>
            <strong>Analytics (PostHog)</strong>: We use a privacy focused analytics tool to measure page views (URL, title,
            referrer, timestamp, session ID), sessions (duration, start/end times, page count, basic bounce), and performance
            metrics (page load, DOM content loaded, first paint/first contentful paint, resource timing). Analytics data is proxied through our own domain.
          </li>
          <li>
            <strong>Cloud Projects Data</strong>: When you use Cloud Projects, your project files are stored in YOUR Google Drive account, not on CAPlayground servers. We do not receive, store, or have access to your Cloud Projects. All data is transmitted directly between your browser and Google Drive.
          </li>
          <li>
            <strong>Google Drive Cookies</strong>: When you sign in to Google Drive, we store authentication tokens in browser cookies (httpOnly, secure) to maintain your session. These cookies are used solely to authenticate API requests to Google Drive on your behalf.
          </li>
          </ul>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">6. Third-Party Services</h2>
          <p className="mt-3 leading-7">
          We use Supabase for authentication and backend infrastructure. Your use of those features may be subject to Supabase’s
          policies.
          </p>
          <p className="mt-3 leading-7">
          If you use Cloud Projects, we integrate with Google Drive to store your project files in YOUR Google Drive account. Your use of Google Drive is subject to Google's Terms of Service and Privacy Policy. CAPlayground accesses only files it creates in a "CAPlayground" folder in your Drive. You are responsible for your Google Drive storage limits and compliance with Google's terms.
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">7. Enforcement & Violations</h2>
          <p className="mt-3 leading-7">
          We reserve the right to investigate violations of these Terms, including misuse of content created with CAPlayground. If we determine that you have violated the Content Sharing & Attribution or Prohibited Conduct provisions, we may: (a) suspend or terminate your account, (b) request removal of infringing content from social media platforms, (c) pursue legal remedies where applicable, or (d) publicly identify accounts engaged in fraudulent or deceptive practices. We may also report scams and fraudulent activity to relevant platforms and authorities.
          </p>

          <h2 className="mt-10 text-2xl md:text-3xl font-semibold">8. Changes to These Terms</h2>
          <p className="mt-3 leading-7">
          We may update these Terms from time to time. We will update the "Last Updated" date above. Material changes will be
          communicated reasonably.
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

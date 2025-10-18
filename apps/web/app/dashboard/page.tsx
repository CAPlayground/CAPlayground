"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { SubmitWallpaperDialog } from "@/app/wallpapers/SubmitWallpaperDialog"

export default function DashboardPage() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const [displayName, setDisplayName] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        router.replace("/signin")
        return
      }
      const meta: any = user.user_metadata || {}
      const name = meta.full_name || meta.name || meta.username || user.email || "there"
      if (mounted) setDisplayName(name as string)
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
        if (mounted && profile?.username) setUsername(profile.username as string)
      } catch {}
    }
    load()
    return () => { mounted = false }
  }, [router, supabase])

  async function handleSignOut() {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.replace("/")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen px-4 py-20 flex items-start justify-center relative">
      {/* Back to home */}
      <div className="absolute left-4 top-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-5xl">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Welcome back{displayName ? `, ${displayName}` : ""}!</h1>
        <p className="mt-6 text-muted-foreground text-lg">More coming soon.</p>
        <div className="mt-8 space-y-6">
          {/* Submit Wallpaper (hidden) */}
          <div className="hidden">
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle>Submit Wallpaper</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Submit a wallpaper to the wallpaper gallery.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => setIsSubmitDialogOpen(true)}>Submit</Button>
                  <Link href="/wallpapers">
                    <Button variant="outline">Go to gallery</Button>
                  </Link>
                  <Link href={username
                    ? `/wallpapers?q=${encodeURIComponent(username)}`
                    : (displayName ? `/wallpapers?q=${encodeURIComponent(displayName)}` : "/wallpapers")
                  }>
                    <Button variant="secondary">View my wallpapers</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle>Account Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your email, username, password, or delete your account.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/account">
                  <Button variant="default">Manage Account</Button>
                </Link>
                <Button onClick={handleSignOut} disabled={loading} variant="outline">
                  {loading ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SubmitWallpaperDialog
        open={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
        username={username || displayName || "Anonymous"}
        isSignedIn={true}
      />
    </main>
  )
}

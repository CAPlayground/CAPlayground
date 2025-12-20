"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ArrowLeft, Cloud, Plus } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { SubmitWallpaperDialog } from "@/app/wallpapers/SubmitWallpaperDialog"

const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
  </svg>
)

function DashboardContent() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [displayName, setDisplayName] = useState<string>("")
  const [username, setUsername] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [hasGoogleLinked, setHasGoogleLinked] = useState(false)
  const [checkingGoogle, setCheckingGoogle] = useState(true)
  const [driveConnected, setDriveConnected] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [messageDialogTitle, setMessageDialogTitle] = useState('')
  const [messageDialogContent, setMessageDialogContent] = useState('')
  const [messageDialogVariant, setMessageDialogVariant] = useState<'success' | 'error'>('success')
  const [awaitingSubmissions, setAwaitingSubmissions] = useState<Array<{
    id: number
    name: string
    description: string
    status: 'awaiting_review' | 'approved' | 'rejected'
  }>>([])
  const [approvedSubmissions, setApprovedSubmissions] = useState<Array<{
    id: number
    name: string
    description: string
    status: 'awaiting_review' | 'approved' | 'rejected'
  }>>([])
  const [rejectedSubmissions, setRejectedSubmissions] = useState<Array<{
    id: number
    name: string
    description: string
    status: 'awaiting_review' | 'approved' | 'rejected'
    submitted_at?: string
  }>>([])
  const [submissionsLoading, setSubmissionsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    document.title = "CAPlayground - Dashboard";
  }, []);

  useEffect(() => {
    const driveConnected = searchParams?.get('drive_connected');
    const error = searchParams?.get('error');

    if (driveConnected === 'true') {
      setMessageDialogTitle('Success');
      setMessageDialogContent('Signed in to Google Drive successfully! You can now sync projects to the cloud.');
      setMessageDialogVariant('success');
      setMessageDialogOpen(true);
      setDriveConnected(true);
      setCheckingGoogle(false);
      window.history.replaceState({}, '', '/dashboard');
    } else if (error) {
      setMessageDialogTitle('Error');
      setMessageDialogContent(`Failed to sign in to Google Drive: ${error}`);
      setMessageDialogVariant('error');
      setMessageDialogOpen(true);
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

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
      } catch { }

      try {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('wallpaper_submissions')
          .select('id, name, description, status')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })

        if (submissionsError) {
          console.warn('Failed to load wallpaper submissions:', submissionsError)
        } else if (mounted && submissionsData) {
          const awaiting = submissionsData.filter((s: any) => s.status === 'awaiting_review').slice(0, 3)
          const approved = submissionsData.filter((s: any) => s.status === 'approved')

          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const rejected = submissionsData.filter((s: any) => {
            if (s.status !== 'rejected') return false
            if (!s.submitted_at) return true
            return new Date(s.submitted_at) > thirtyDaysAgo
          })

          setAwaitingSubmissions(awaiting as any)
          setApprovedSubmissions(approved as any)
          setRejectedSubmissions(rejected as any)
        }
      } catch (e) {
        console.error('Unexpected error loading wallpaper submissions:', e)
      } finally {
        if (mounted) setSubmissionsLoading(false)
      }

      try {
        const { data: identities } = await supabase.auth.getUserIdentities()
        if (mounted && identities?.identities) {
          const hasGoogle = identities.identities.some((identity: any) => identity.provider === 'google')
          setHasGoogleLinked(hasGoogle)
        }

        try {
          const driveRes = await fetch('/api/drive/auth')
          const driveData = await driveRes.json()
          if (mounted) setDriveConnected(driveData.connected === true)
        } catch (e) {
          console.error('Failed to check Drive connection:', e)
        }
      } catch (e) {
        console.error('Failed to check Google identity:', e)
      } finally {
        if (mounted) setCheckingGoogle(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [router, supabase])

  useEffect(() => {
    if (awaitingSubmissions.length === 0) return

    const syncStatuses = async () => {
      setIsSyncing(true)
      console.log('Syncing statuses for', awaitingSubmissions.length, 'submissions')
      const updates = await Promise.all(
        awaitingSubmissions.map(async (sub) => {
          try {
            const res = await fetch('/api/wallpapers/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ submission_id: sub.id })
            })
            if (res.ok) {
              const data = await res.json()
              if (data.updated) {
                return { id: sub.id, status: data.status }
              }
            }
          } catch (e) {
            console.error('Failed to sync submission', sub.id, e)
          }
          return null
        })
      )

      const validUpdates = updates.filter(Boolean) as Array<{ id: number, status: string }>
      if (validUpdates.length > 0) {
        console.log('Applying status updates:', validUpdates)

        setAwaitingSubmissions(prev => prev.filter(sub => !validUpdates.find(u => u.id === sub.id)))

        const newApproved = validUpdates
          .filter(u => u.status === 'approved')
          .map(u => {
            const original = awaitingSubmissions.find(s => s.id === u.id)
            return original ? { ...original, status: 'approved' as const } : null
          })
          .filter(Boolean) as typeof approvedSubmissions

        if (newApproved.length > 0) {
          setApprovedSubmissions(prev => [...newApproved, ...prev])
        }

        const newRejected = validUpdates
          .filter(u => u.status === 'rejected')
          .map(u => {
            const original = awaitingSubmissions.find(s => s.id === u.id)
            return original ? { ...original, status: 'rejected' as const } : null
          })
          .filter(Boolean) as typeof rejectedSubmissions

        if (newRejected.length > 0) {
          setRejectedSubmissions(prev => [...newRejected, ...prev])
        }
      }
      setIsSyncing(false)
    }

    syncStatuses()
  }, [awaitingSubmissions.length])

  async function handleSignOut() {
    setLoading(true)
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      await supabase.auth.signOut()
      router.replace("/")
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAllCloudProjects() {
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/drive/delete-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete cloud projects')
      }

      localStorage.removeItem('caplayground-sync')

      setDeleteAllOpen(false)
      setMessageDialogTitle('Success');
      setMessageDialogContent('All cloud projects deleted successfully!');
      setMessageDialogVariant('success');
      setMessageDialogOpen(true);

    } catch (error: any) {
      setMessageDialogTitle('Error');
      setMessageDialogContent(`Failed to delete: ${error.message}`);
      setMessageDialogVariant('error');
      setMessageDialogOpen(true);
    } finally {
      setDeleting(false)
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

      <div className="w-full max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Welcome back{displayName ? `, ${displayName}` : ""}!</h1>
        <p className="mt-6 text-muted-foreground text-lg">Manage your cloud projects and account settings.</p>
        <div className="mt-8 space-y-6">
          {/* Wallpaper Submissions */}
          <Card className="border-border/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Wallpaper Submissions</CardTitle>
                <Button onClick={() => setIsSubmitDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Wallpaper
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {submissionsLoading ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading your submissions...</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">Awaiting Review</h3>
                        {isSyncing && (
                          <span className="flex items-center text-[10px] text-muted-foreground animate-pulse">
                            <Cloud className="h-3 w-3 mr-1 animate-spin" />
                            Syncing...
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {awaitingSubmissions.length}/5 slots used
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can have up to five wallpapers awaiting review at a time.
                    </p>

                    {awaitingSubmissions.length === 0 ? (
                      <div className="border border-dashed border-border/70 rounded-lg py-6 px-4 text-center">
                        <p className="text-sm text-muted-foreground">No wallpapers awaiting review</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Submit Wallpaper" to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {awaitingSubmissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="flex items-start justify-between border border-border/80 rounded-lg p-3 bg-amber-50/50 dark:bg-amber-900/10"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <h3 className="font-semibold text-sm line-clamp-1 break-words">
                                {submission.name}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                {submission.description}
                              </p>
                            </div>
                            <span className="ml-3 flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100 border-amber-200 dark:border-amber-700">
                              Awaiting Review
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


                  {rejectedSubmissions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Rejected (Last 30 Days)</h3>
                        <span className="text-xs text-muted-foreground">
                          {rejectedSubmissions.length} rejected
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submissions that were not accepted. These will disappear after 30 days.
                      </p>

                      <div className="space-y-3">
                        {rejectedSubmissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="flex items-start justify-between border border-border/80 rounded-lg p-3 bg-red-50/50 dark:bg-red-900/10"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <h3 className="font-semibold text-sm line-clamp-1 break-words">
                                {submission.name}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                {submission.description}
                              </p>
                            </div>
                            <span className="ml-3 flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 border-red-200 dark:border-red-700">
                              Rejected
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Published</h3>
                      <span className="text-xs text-muted-foreground">
                        {approvedSubmissions.length === 0 ? 'None yet' : `${approvedSubmissions.length} published`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Wallpapers that have been approved and are live in the gallery.
                    </p>

                    {approvedSubmissions.length === 0 ? (
                      <div className="border border-dashed border-border/70 rounded-lg py-6 px-4 text-center">
                        <p className="text-sm text-muted-foreground">No published wallpapers yet</p>
                        <p className="text-xs text-muted-foreground mt-1">They'll appear here once approved</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {approvedSubmissions.map((submission) => (
                          <div
                            key={submission.id}
                            className="flex items-start justify-between border border-border/80 rounded-lg p-3 bg-emerald-50/50 dark:bg-emerald-900/10"
                          >
                            <div className="flex-1 min-w-0 space-y-1">
                              <h3 className="font-semibold text-sm line-clamp-1 break-words">
                                {submission.name}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                {submission.description}
                              </p>
                            </div>
                            <span className="ml-3 flex-shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700">
                              Published
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cloud Projects */}
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Cloud Projects
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-normal">
                  BETA
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sync and manage your projects in the cloud with Google Drive.
              </p>
              {checkingGoogle ? (
                <p className="text-sm text-muted-foreground">Checking connection...</p>
              ) : driveConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <GoogleDriveIcon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        Signed in to Google Drive
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-300">
                        Your projects can be synced to the cloud
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link href="/projects" className="flex-1">
                        <Button variant="outline" className="w-full">
                          Manage Projects
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteAllOpen(true)}
                        className="text-destructive hover:text-destructive"
                      >
                        Delete All
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await fetch('/api/auth/signout', { method: 'POST' });
                          setDriveConnected(false);
                          setMessageDialogTitle('Success');
                          setMessageDialogContent('Signed out from Google Drive successfully.');
                          setMessageDialogVariant('success');
                          setMessageDialogOpen(true);
                        } catch (error) {
                          console.error('Failed to sign out from Drive:', error);
                        }
                      }}
                      className="w-full"
                    >
                      <Cloud className="h-4 w-4 mr-2" />
                      Sign out from Google Drive
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button onClick={async () => {
                    try {
                      const response = await fetch('/api/drive/auth');
                      const data = await response.json();
                      if (data.authUrl) {
                        window.location.href = data.authUrl;
                      } else if (data.error) {
                        setMessageDialogTitle('Error');
                        setMessageDialogContent(`Error: ${data.error}`);
                        setMessageDialogVariant('error');
                        setMessageDialogOpen(true);
                      }
                    } catch (error) {
                      console.error('Failed to sign in to Drive:', error);
                    }
                  }}>
                    <GoogleDriveIcon className="h-4 w-4 mr-2" />
                    Sign in to Google Drive
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Once signed in, you can sync projects directly from the projects page.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
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

      {/* Delete All Cloud Projects Dialog */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Cloud Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will permanently delete the entire CAPlayground folder and all projects from your Google Drive.
            </p>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-800 dark:text-red-300">
                <strong>⚠️ Warning:</strong> This action cannot be undone. All cloud projects will be permanently deleted from Drive. Projects on your device will not be affected.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllCloudProjects}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{messageDialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className={`text-sm ${messageDialogVariant === 'error' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
              {messageDialogContent}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setMessageDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen px-4 py-20 flex items-start justify-center">
        <div className="w-full max-w-5xl">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">Loading...</h1>
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  )
}

"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Upload, ArrowLeft, ArrowRight, Github, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Link from "next/link"
import { Octokit } from "octokit"
import { getSupabaseBrowserClient } from "@/lib/supabase"

interface SubmitWallpaperDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username?: string
  isSignedIn?: boolean
}

type Step = "form" | "preview" | "submitting" | "success"

interface SubmissionStatus {
  message: string
}

interface WallpaperEntry {
  name: string
  id: number
  creator: string
  description: string
  file: string
  preview: string
  date: number
  from: string
}

export function SubmitWallpaperDialog({ open, onOpenChange, username = "Anonymous", isSignedIn = false }: SubmitWallpaperDialogProps) {
  const [step, setStep] = useState<Step>("form")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [tendiesFile, setTendiesFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>({ message: "" })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)

  const tendiesInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleTendiesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTendiesFile(file)
    }
  }

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setVideoFile(file)
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl)
      }
      const url = URL.createObjectURL(file)
      setVideoPreviewUrl(url)
    }
  }

  const handleContinue = () => {
    if (!name.trim() || !description.trim() || !tendiesFile || !videoFile) {
      return
    }
    setStep("preview")
  }

  const handleBack = () => {
    if (step === "preview") setStep("form")
  }

  const handleCancel = () => {
    setStep("form")
    setName("")
    setDescription("")
    setTendiesFile(null)
    setVideoFile(null)
    setSubmitError(null)
    setPrUrl(null)
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl)
    }
    setVideoPreviewUrl(null)
    onOpenChange(false)
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  const handleSubmit = async () => {
    if (!tendiesFile || !videoFile) return

    setStep("submitting")
    setSubmitError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error("You must be signed in to submit.")
      }

      setSubmissionStatus({ message: "Checking existing submissions..." })
      const { count: awaitingCount, error: awaitingError } = await supabase
        .from('wallpaper_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'awaiting_review')

      if (awaitingError) {
        console.warn('Failed to check existing submissions limit:', awaitingError)
      } else if (typeof awaitingCount === 'number' && awaitingCount >= 5) {
        throw new Error('You already have 5 wallpapers awaiting review. Please wait until one is approved or rejected before submitting more.')
      }

      setSubmissionStatus({ message: "Authenticating..." })

      const tokenResponse = await fetch('/api/github/token')
      if (!tokenResponse.ok) {
        throw new Error("Failed to authenticate with GitHub service")
      }
      const { token } = await tokenResponse.json()

      const octokit = new Octokit({ auth: token })
      const upstreamOwner = "CAPlayground"
      const upstreamRepo = "wallpapers"

      const wallpaperId = Math.floor(Math.random() * 9000000) + 1000000
      const idString = wallpaperId.toString()

      setSubmissionStatus({ message: "Registering submission..." })
      const { data: dbData, error: dbError } = await supabase
        .from('wallpaper_submissions')
        .insert({
          id: wallpaperId,
          user_id: session.user.id,
          name: name,
          description: description,
          status: 'awaiting_review',
          github_username: username
        })
        .select()

      if (dbError) {
        console.error("Failed to track submission in DB:", {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        })
        throw new Error(`Failed to save submission to database: ${dbError.message}`)
      }

      console.log("Submission saved to database!:", dbData)

      setSubmissionStatus({ message: "Preparing repository..." })

      const { data: refData } = await octokit.rest.git.getRef({
        owner: upstreamOwner,
        repo: upstreamRepo,
        ref: "heads/dev",
      })
      const latestCommitSha = refData.object.sha
      const { data: commitData } = await octokit.rest.git.getCommit({
        owner: upstreamOwner,
        repo: upstreamRepo,
        commit_sha: latestCommitSha,
      })
      const treeSha = commitData.tree.sha

      setSubmissionStatus({ message: "Uploading files..." })

      const tendiesContent = arrayBufferToBase64(await tendiesFile.arrayBuffer())
      const { data: tendiesBlob } = await octokit.rest.git.createBlob({
        owner: upstreamOwner,
        repo: upstreamRepo,
        content: tendiesContent,
        encoding: "base64",
      })

      const videoContent = arrayBufferToBase64(await videoFile.arrayBuffer())
      const { data: videoBlob } = await octokit.rest.git.createBlob({
        owner: upstreamOwner,
        repo: upstreamRepo,
        content: videoContent,
        encoding: "base64",
      })

      const safeName = name.replace(/[^a-z0-9]/gi, '_')
      const tendiesPath = `wallpapers/${safeName}.tendies`
      const jsonPath = `jsons/${safeName}.json`
      const videoExtension = videoFile.name.split('.').pop()
      const videoUploadPath = `previews/video/${safeName}.${videoExtension}`
      const gifPreviewPath = `previews/gif/${safeName}.gif`

      const newEntry: WallpaperEntry = {
        name: name,
        id: wallpaperId,
        creator: username,
        description: description,
        file: tendiesPath,
        preview: gifPreviewPath,
        date: new Date().getTime(),
        from: "website"
      }

      const { data: jsonBlob } = await octokit.rest.git.createBlob({
        owner: upstreamOwner,
        repo: upstreamRepo,
        content: JSON.stringify(newEntry, null, 2),
        encoding: "utf-8",
      })

      const { data: newTree } = await octokit.rest.git.createTree({
        owner: upstreamOwner,
        repo: upstreamRepo,
        base_tree: treeSha,
        tree: [
          {
            path: tendiesPath,
            mode: "100644",
            type: "blob",
            sha: tendiesBlob.sha,
          },
          {
            path: videoUploadPath,
            mode: "100644",
            type: "blob",
            sha: videoBlob.sha,
          },
          {
            path: jsonPath,
            mode: "100644",
            type: "blob",
            sha: jsonBlob.sha,
          },
        ],
      })

      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner: upstreamOwner,
        repo: upstreamRepo,
        message: `Add wallpaper: ${name}`,
        tree: newTree.sha,
        parents: [latestCommitSha],
      })

      const slugUsername = (username || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'user'
      const branchName = `${slugUsername}/${idString}`
      await octokit.rest.git.createRef({
        owner: upstreamOwner,
        repo: upstreamRepo,
        ref: `refs/heads/${branchName}`,
        sha: newCommit.sha,
      })

      setSubmissionStatus({ message: "Creating Pull Request..." })
      const tendiesUrl = `https://raw.githubusercontent.com/${upstreamOwner}/${upstreamRepo}/${branchName}/${tendiesPath}`
      const { data: pr } = await octokit.rest.pulls.create({
        owner: upstreamOwner,
        repo: upstreamRepo,
        title: `Submission: ${name}`,
        body: `Wallpaper submission from ${username}\n\nDescription: ${description}\nID: ${idString}\n[Download .tendies file](${tendiesUrl})`,
        head: branchName,
        base: "dev",
      })

      setPrUrl(pr.html_url)
      setStep("success")

    } catch (error: any) {
      console.error("GitHub submission error:", error)
      setStep("preview")
      setSubmitError(error.message || "Failed to submit to GitHub")
    }
  }

  const isFormValid = name.trim() && description.trim() && tendiesFile && videoFile

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {!isSignedIn ? (
          <>
            <DialogHeader>
              <DialogTitle>Sign In Required</DialogTitle>
              <DialogDescription>
                You need to be signed in to submit wallpapers
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 text-center space-y-4">
              <p className="text-muted-foreground">
                Please sign in to your account to submit wallpapers to the gallery.
              </p>
              <Link href="/signin">
                <Button className="w-full sm:w-auto">Sign In</Button>
              </Link>
            </div>
          </>
        ) : step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Submit Wallpaper</DialogTitle>
              <DialogDescription>
                Share your wallpaper with the CAPlayground community
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Wallpaper Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Wallpaper Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter wallpaper name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={42}
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/42 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your wallpaper..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={60}
                  className="resize-none whitespace-pre-wrap break-words"
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/60 characters
                </p>
              </div>

              {/* Tendies file upload */}
              <div className="space-y-2">
                <Label htmlFor="tendies-file">.tendies File *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tendies-file"
                    type="file"
                    accept=".tendies"
                    ref={tendiesInputRef}
                    onChange={handleTendiesFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => tendiesInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {tendiesFile ? tendiesFile.name : "Choose .tendies file"}
                  </Button>
                </div>
              </div>

              {/* Video file upload */}
              <div className="space-y-2">
                <Label htmlFor="video-file">Preview Video *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="video-file"
                    type="file"
                    accept="video/mp4,video/quicktime,.mp4,.mov"
                    ref={videoInputRef}
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {videoFile ? videoFile.name : "Choose video file"}
                  </Button>
                </div>
                {videoPreviewUrl && videoPreviewUrl.startsWith('blob:') && (
                  <div className="mt-2 rounded-md border overflow-hidden">
                    <video
                      src={videoPreviewUrl}
                      className="w-full h-auto max-h-48 object-contain"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                )}
              </div>

              {/* Author (username) */}
              <div className="space-y-2">
                <Label>Author</Label>
                <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {username}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your username will be displayed as the wallpaper creator
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleContinue} disabled={!isFormValid}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : step === "preview" ? (
          <>
            <DialogHeader>
              <DialogTitle>Preview Submission</DialogTitle>
              <DialogDescription>
                This is how your wallpaper will appear in the gallery
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <Card className="overflow-hidden">
                <div className="pt-0 px-5">
                  <div className="mb-3 overflow-hidden rounded-md border bg-background">
                    <AspectRatio ratio={1} className="flex items-center justify-center">
                      {videoPreviewUrl && videoPreviewUrl.startsWith('blob:') && (
                        <video
                          src={videoPreviewUrl}
                          className="w-full h-full object-contain"
                          autoPlay
                          muted
                          loop
                          playsInline
                          aria-label={`${name} preview`}
                        />
                      )}
                    </AspectRatio>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-1">{name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    by {username} (submitted on website)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{description}</p>
                  <div className="flex flex-col gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <Button className="w-full bg-accent hover:bg-accent/90 text-white" disabled>
                              Download .tendies
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download not available in preview</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>

              {submitError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <p>{submitError}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit}>
                <Github className="h-4 w-4 mr-2" />
                Submit Wallpaper
              </Button>
            </DialogFooter>
          </>
        ) : step === "submitting" ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Submitting Wallpaper</h3>
              <p className="text-muted-foreground">{submissionStatus.message}</p>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-xl">Submission Successful!</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Your wallpaper has been submitted as a Pull Request. Once approved, it will appear in the gallery.
              </p>
            </div>

            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Github className="h-4 w-4" />
                View Pull Request
              </a>
            )}

            <Button onClick={handleCancel} className="w-full sm:w-auto min-w-[120px]">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

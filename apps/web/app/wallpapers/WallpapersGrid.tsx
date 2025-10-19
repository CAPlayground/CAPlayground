"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { useSearchParams, useRouter } from "next/navigation"
import { Upload, Edit, Download, X } from "lucide-react"
import { SubmitWallpaperDialog } from "./SubmitWallpaperDialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import type { CAAsset } from "@/lib/ca/types"
import { ensureUniqueProjectName, createProject, listProjects, putBlobFile, putTextFile } from "@/lib/storage"

interface WallpaperItem {
  id: string | number
  name: string
  creator: string
  description: string
  file: string
  preview: string
  from: string
}

interface WallpapersResponse {
  base_url: string
  wallpapers: WallpaperItem[]
}

function isVideo(src: string) {
  const lower = src.toLowerCase()
  return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.includes("/video/")
}

export function WallpapersGrid({ data }: { data: WallpapersResponse }) {
  console.log('WallpapersGrid loaded with data:', data.wallpapers.map(w => ({ name: w.name, id: w.id })))
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [q, setQ] = useState("")
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
  const [username, setUsername] = useState<string>("")
  const [displayName, setDisplayName] = useState<string>("")
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [importingWallpaper, setImportingWallpaper] = useState<string | null>(null)
  const [downloadStats, setDownloadStats] = useState<Record<string, number>>({})
  const [sortBy, setSortBy] = useState<'default' | 'downloads'>('downloads')
  const [isIOS, setIsIOS] = useState(false)
  const [expandedWallpaper, setExpandedWallpaper] = useState<WallpaperItem | null>(null)

  useEffect(() => {
    const initial = (searchParams?.get("q") || "").trim()
    setQ(initial)
    
    const wallpaperId = searchParams?.get("id")
    if (wallpaperId && data.wallpapers) {
      const wallpaper = data.wallpapers.find(w => w.id === wallpaperId)
      if (wallpaper) {
        setExpandedWallpaper(wallpaper)
      }
    }
  }, [searchParams, data.wallpapers])

  useEffect(() => {
    console.log('Fetching download stats...')
    fetch('/api/wallpapers/stats')
      .then(res => res.json())
      .then((stats: Array<{ id: string; downloads: number }>) => {
        console.log('Download stats received:', stats)
        const statsMap = stats.reduce((acc, stat) => {
          acc[stat.id] = stat.downloads
          return acc
        }, {} as Record<string, number>)
        console.log('Stats map:', statsMap)
        setDownloadStats(statsMap)
      })
      .catch(err => console.error('Failed to fetch download stats:', err))
  }, [])

  useEffect(() => {
    let mounted = true
    async function loadUser() {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!user) {
          if (mounted) setIsSignedIn(false)
          return
        }
        
        if (mounted) setIsSignedIn(true)
        
        const meta: any = user.user_metadata || {}
        const name = meta.full_name || meta.name || meta.username || user.email || ""
        if (mounted) setDisplayName(name as string)
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
        if (mounted && profile?.username) setUsername(profile.username as string)
      } catch {}
    }
    loadUser()
    return () => { mounted = false }
  }, [supabase])

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(ios)
  }, [])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    let result = data.wallpapers
    
    if (t) {
      result = result.filter((w) => {
        const name = (w?.name || "").toString().toLowerCase()
        const creator = (w?.creator || "").toString().toLowerCase()
        const desc = (w?.description || "").toString().toLowerCase()
        return name.includes(t) || creator.includes(t) || desc.includes(t)
      })
    }
  
    if (sortBy === 'downloads') {
      result = [...result].sort((a, b) => {
        const aDownloads = downloadStats[a.id] || 0
        const bDownloads = downloadStats[b.id] || 0
        return bDownloads - aDownloads
      })
    }
    
    return result
  }, [q, data.wallpapers, sortBy, downloadStats])

  const trackDownload = (wallpaperId: string, wallpaperName: string) => {
    console.log('Tracking download for wallpaper:', wallpaperId, wallpaperName)
    fetch('/api/wallpapers/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallpaperId }),
    })
      .then(res => {
        console.log('Download tracking response:', res.status, res.statusText)
        return res.json()
      })
      .then(data => {
        console.log('Download tracking result:', data)
        if (data.counted === false) {
          console.warn('Download not counted due to rate limit')
        }
      })
      .catch(err => console.error('Failed to track download:', err))
  }

  const handleOpenInEditor = async (item: WallpaperItem) => {
    try {
      setImportingWallpaper(item.name)
      trackDownload(String(item.id), item.name)
      
      const fileUrl = `${data.base_url}${item.file}`
      
      const response = await fetch(fileUrl)
      if (!response.ok) throw new Error('Failed to download wallpaper')
      const blob = await response.blob()
      
      const { unpackTendies } = await import('@/lib/ca/ca-file')
      const tendies = await unpackTendies(blob)
      
      const id = Date.now().toString()
      const name = await ensureUniqueProjectName(item.name || "Imported Wallpaper")
      const width = Math.round(tendies.project.width)
      const height = Math.round(tendies.project.height)
      await createProject({ id, name, createdAt: new Date().toISOString(), width, height })
      const folder = `${name}.ca`
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>rootDocument</key>\n  <string>main.caml</string>\n</dict>\n</plist>`
      const assetManifest = `<?xml version="1.0" encoding="UTF-8"?>\n\n<caml xmlns="http://www.apple.com/CoreAnimation/1.0">\n  <MicaAssetManifest>\n    <modules type="NSArray"/>\n  </MicaAssetManifest>\n</caml>`
      
      const { serializeCAML } = await import('@/lib/ca/caml')
      
      const mkCaml = async (doc: { root: any; assets?: Record<string, CAAsset>; states?: string[]; stateOverrides?: any; stateTransitions?: any }, docName: string) => {
        const root = doc.root as any
        const layers = root?.type === 'group' && Array.isArray(root.children) ? root.children : (root ? [root] : [])
        const group = {
          id: `${id}-${docName}`,
          name: `${name} ${docName}`,
          type: 'group',
          position: { x: Math.round(width/2), y: Math.round(height/2) },
          size: { w: width, h: height },
          backgroundColor: root?.backgroundColor ?? '#e5e7eb',
          geometryFlipped: tendies.project.geometryFlipped,
          children: layers,
        } as any
        return serializeCAML(group, { id, name, width, height, background: root?.backgroundColor ?? '#e5e7eb', geometryFlipped: tendies.project.geometryFlipped } as any, doc.states as any, doc.stateOverrides as any, doc.stateTransitions as any)
      }

      const creditComment = `<!--\n  Original wallpaper: ${item.name}\n  Created by: ${item.creator}\n  Imported from CAPlayground Gallery\n-->\n`
      
      const floatingDoc = tendies.wallpaper || tendies.floating
      if (floatingDoc) {
        const camlFloating = await mkCaml(floatingDoc, 'Floating')
        const camlWithCredit = camlFloating.replace('<?xml version="1.0" encoding="UTF-8"?>', `<?xml version="1.0" encoding="UTF-8"?>\n${creditComment}`)
        await putTextFile(id, `${folder}/Floating.ca/main.caml`, camlWithCredit)
        await putTextFile(id, `${folder}/Floating.ca/index.xml`, indexXml)
        await putTextFile(id, `${folder}/Floating.ca/assetManifest.caml`, assetManifest)

        const flAssets = (floatingDoc.assets || {}) as Record<string, CAAsset>
        for (const [filename, asset] of Object.entries(flAssets)) {
          try {
            const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer])
            await putBlobFile(id, `${folder}/Floating.ca/assets/${filename}`, data)
          } catch {}
        }
      } else {
        const emptyFloatingCaml = `<?xml version="1.0" encoding="UTF-8"?><caml xmlns="http://www.apple.com/CoreAnimation/1.0"/>`
        await putTextFile(id, `${folder}/Floating.ca/main.caml`, emptyFloatingCaml)
        await putTextFile(id, `${folder}/Floating.ca/index.xml`, indexXml)
        await putTextFile(id, `${folder}/Floating.ca/assetManifest.caml`, assetManifest)
      }
      
      if (tendies.background) {
        const camlBackground = await mkCaml(tendies.background, 'Background')
        const camlBackgroundWithCredit = camlBackground.replace('<?xml version="1.0" encoding="UTF-8"?>', `<?xml version="1.0" encoding="UTF-8"?>\n${creditComment}`)
        await putTextFile(id, `${folder}/Background.ca/main.caml`, camlBackgroundWithCredit)
        await putTextFile(id, `${folder}/Background.ca/index.xml`, indexXml)
        await putTextFile(id, `${folder}/Background.ca/assetManifest.caml`, assetManifest)
        
        const bgAssets = (tendies.background.assets || {}) as Record<string, CAAsset>
        for (const [filename, asset] of Object.entries(bgAssets)) {
          try {
            const data = asset.data instanceof Blob ? asset.data : new Blob([asset.data as ArrayBuffer])
            await putBlobFile(id, `${folder}/Background.ca/assets/${filename}`, data)
          } catch {}
        }
      } else {
        const emptyBackgroundCaml = `<?xml version="1.0" encoding="UTF-8"?><caml xmlns="http://www.apple.com/CoreAnimation/1.0"/>`
        await putTextFile(id, `${folder}/Background.ca/main.caml`, emptyBackgroundCaml)
        await putTextFile(id, `${folder}/Background.ca/index.xml`, indexXml)
        await putTextFile(id, `${folder}/Background.ca/assetManifest.caml`, assetManifest)
      }
      
      router.push(`/editor/${id}`)
    } catch (err) {
      console.error('Failed to open wallpaper in editor', err)
      alert(`Failed to open wallpaper in editor: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setImportingWallpaper(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xl mx-auto w-full space-y-3">
        <div className="flex gap-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search wallpapers by name, creator, or description..."
            className="flex-1"
          />
          <Select value={sortBy} onValueChange={(value: 'default' | 'downloads') => setSortBy(value)}>
            <SelectTrigger className="w-[180px] bg-background border shadow-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Order</SelectItem>
              <SelectItem value="downloads">Most Downloads</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Submit button (hidden) */}
        <div className="hidden">
          <div className="flex justify-center">
            <Button onClick={() => setIsSubmitDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Submit Wallpaper
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:gap-7 md:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => {
          const previewUrl = `${data.base_url}${item.preview}`
          const fileUrl = `${data.base_url}${item.file}`
          return (
            <Card 
              key={`${item.name}-${item.file}`} 
              className="overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] p-0"
              onClick={() => {
                setExpandedWallpaper(item)
                const params = new URLSearchParams(window.location.search)
                params.set('id', String(item.id))
                router.push(`/wallpapers?${params.toString()}`, { scroll: false })
              }}
            >
              <CardContent className="p-4">
                <div className="mb-3 overflow-hidden rounded-md border bg-background">
                  <AspectRatio ratio={1} className="flex items-center justify-center">
                    {isVideo(previewUrl) ? (
                      <video
                        src={previewUrl}
                        className="w-full h-full object-contain"
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-label={`${item.name} preview`}
                      />
                    ) : (
                      <img src={previewUrl} alt={`${item.name} preview`} className="w-full h-full object-contain" />
                    )}
                  </AspectRatio>
                </div>

                <h3 className="font-medium line-clamp-1 mb-1">{item.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  by {item.creator} (submitted on {item.from})
                </p>
                {downloadStats[item.id] > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <Download className="h-3.5 w-3.5" />
                    <span>{downloadStats[item.id]}</span>
                    <span>{downloadStats[item.id] === 1 ? 'Download' : 'Downloads'}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{item.description}</p>
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenInEditor(item)
                    }}
                    disabled={importingWallpaper === item.name}
                    className="w-full"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {importingWallpaper === item.name ? 'Opening...' : 'Open in Editor'}
                  </Button>
                  {isIOS ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        trackDownload(String(item.id), item.name)
                        window.location.href = `pocketposter://download?url=${fileUrl}`
                      }}
                    >
                      Open in Pocket Poster
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        trackDownload(String(item.id), item.name)
                        window.open(fileUrl, '_blank')
                      }}
                    >
                      Download .tendies
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SubmitWallpaperDialog
        open={isSubmitDialogOpen}
        onOpenChange={setIsSubmitDialogOpen}
        username={username || displayName || "Anonymous"}
        isSignedIn={isSignedIn}
      />

      {/* Expanded Wallpaper */}
      <Dialog open={!!expandedWallpaper} onOpenChange={(open) => {
        if (!open) {
          setExpandedWallpaper(null)
          const params = new URLSearchParams(window.location.search)
          params.delete('id')
          const newUrl = params.toString() ? `/wallpapers?${params.toString()}` : '/wallpapers'
          router.push(newUrl, { scroll: false })
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {expandedWallpaper && (() => {
            const previewUrl = `${data.base_url}${expandedWallpaper.preview}`
            const fileUrl = `${data.base_url}${expandedWallpaper.file}`
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl">{expandedWallpaper.name}</DialogTitle>
                  <DialogDescription className="text-base">
                    by {expandedWallpaper.creator} (submitted on {expandedWallpaper.from})
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 mt-4">
                  {/* Preview */}
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <AspectRatio ratio={1} className="flex items-center justify-center">
                      {isVideo(previewUrl) ? (
                        <video
                          src={previewUrl}
                          className="w-full h-full object-contain"
                          autoPlay
                          muted
                          loop
                          playsInline
                          aria-label={`${expandedWallpaper.name} preview`}
                        />
                      ) : (
                        <img 
                          src={previewUrl} 
                          alt={`${expandedWallpaper.name} preview`} 
                          className="w-full h-full object-contain" 
                        />
                      )}
                    </AspectRatio>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{expandedWallpaper.description}</p>
                  </div>

                  {/* Download Stats */}
                  {downloadStats[expandedWallpaper.id] > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Download className="h-4 w-4" />
                      <span>{downloadStats[expandedWallpaper.id]}</span>
                      <span>{downloadStats[expandedWallpaper.id] === 1 ? 'Download' : 'Downloads'}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={() => {
                        setExpandedWallpaper(null)
                        handleOpenInEditor(expandedWallpaper)
                      }}
                      disabled={importingWallpaper === expandedWallpaper.name}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {importingWallpaper === expandedWallpaper.name ? 'Opening...' : 'Open in Editor'}
                    </Button>
                    {isIOS ? (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          trackDownload(String(expandedWallpaper.id), expandedWallpaper.name)
                          window.location.href = `pocketposter://download?url=${fileUrl}`
                        }}
                      >
                        Open in Pocket Poster
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          trackDownload(String(expandedWallpaper.id), expandedWallpaper.name)
                          window.open(fileUrl, '_blank')
                        }}
                      >
                        Download .tendies
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

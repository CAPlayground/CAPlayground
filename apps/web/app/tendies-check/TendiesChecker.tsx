"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle2, XCircle, Info, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import type { TendiesBundle } from "@/lib/ca/ca-file"
import type { AnyLayer } from "@/lib/ca/types"

interface TendiesDocAnalysis {
  docType: "floating" | "background" | "wallpaper"
  hasCapRootLayer: boolean
  hasCapBanner: boolean
  hasRemixCredit: boolean
  layerCount: number
  stateCount: number
  transitionCount: number
  animationCount: number
}

interface AnalysisResult {
  width: number
  height: number
  docs: TendiesDocAnalysis[]
  totalLayers: number
  totalStates: number
  totalTransitions: number
  totalAnimations: number
  hasCapRootLayer: boolean
  hasCapBanner: boolean
  hasRemixCredit: boolean
  isRemixed: boolean
  floatingHasWork: boolean
  backgroundHasWork: boolean
  wallpaperHasWork: boolean
}

function countOccurrences(text: string, regex: RegExp): number {
  let count = 0
  let m: RegExp | RegExpExecArray | null
  const r = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g")
  while ((m = r.exec(text)) !== null) {
    count++
  }
  return count
}

function analyseCaml(xml: string, docType: "floating" | "background" | "wallpaper"): TendiesDocAnalysis {
  const lower = xml.toLowerCase()

  const hasCapRootLayer = lower.includes("id=\"__caprootlayer__\"") && lower.includes("name=\"caplayground root layer\"")
  const hasCapBanner = lower.includes("caplayground") && lower.includes("create beautiful core animation wallpapers for ios")
  const hasRemixCredit = lower.includes("imported from caplayground gallery")

  const layerCount = countOccurrences(xml, /<CALayer\b/gi)
  const stateCount = countOccurrences(xml, /<LKState\b/gi)

  const transitionCount = countOccurrences(xml, /<LKStateTransition\b/gi)
  const animationCount = countOccurrences(xml, /<animation\b/gi)

  return {
    docType,
    hasCapRootLayer,
    hasCapBanner,
    hasRemixCredit,
    layerCount,
    stateCount,
    transitionCount,
    animationCount,
  }
}

async function extractCamlFromTendies(file: File): Promise<{
  width: number
  height: number
  xmlByDoc: Partial<Record<"floating" | "background" | "wallpaper", string>>
  bundle: TendiesBundle
}> {
  const { default: JSZip } = await import("jszip")
  const { unpackTendies } = await import("@/lib/ca/ca-file")

  const blob = file as Blob
  const bundle = await unpackTendies(blob)

  const width = Math.round(bundle.project.width)
  const height = Math.round(bundle.project.height)

  const zip = await JSZip.loadAsync(blob)
  const paths = Object.keys(zip.files).map((p) => p.replace(/\\/g, "/"))

  const findMainCaml = async (baseDir: string): Promise<string | null> => {
    const norm = (p: string) => p.replace(/\\/g, "/")
    const byLower = new Map(paths.map((p) => [p.toLowerCase(), p] as const))
    const get = (rel: string) => {
      const full = norm(`${baseDir}${rel}`)
      const hit = byLower.get(full.toLowerCase())
      return zip.file(hit || full)
    }

    let indexXml = await get("index.xml")?.async("string")
    if (!indexXml) indexXml = await get("Index.xml")?.async("string")

    let sceneName = "main.caml"
    if (indexXml) {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(indexXml, "application/xml")
        const el = doc.getElementsByTagName("rootDocument")[0]
        if (el && el.textContent) sceneName = el.textContent.trim()
      } catch {}
    }

    let camlEntry = get(sceneName)
    if (!camlEntry) {
      const base = sceneName.split("/").pop() || sceneName
      const candidate = paths.find(
        (p) => p.toLowerCase().startsWith(baseDir.toLowerCase()) && (p.split("/").pop() || "") === base,
      )
      if (candidate) camlEntry = zip.file(candidate)
    }
    if (!camlEntry) return null
    return await camlEntry.async("string")
  }

  const findDir = (predicate: (segments: string[]) => boolean): string | null => {
    const candidate = paths.find((p) => {
      const segments = p.toLowerCase().split("/")
      return predicate(segments)
    })
    if (!candidate) return null
    const parts = candidate.split("/")
    const idx = parts.length - 2 >= 0 ? parts.length - 2 : 0
    return parts.slice(0, idx + 1).join("/") + "/"
  }

  const xmlByDoc: Partial<Record<"floating" | "background" | "wallpaper", string>> = {}

  const floatingDir = findDir((segments) => segments.some((seg) => seg.includes("floating") && seg.endsWith(".ca")))
  const backgroundDir = findDir((segments) => segments.some((seg) => seg.includes("background") && seg.endsWith(".ca")))
  const wallpaperDir = findDir((segments) => segments.some((seg) => seg === "wallpaper.ca"))

  if (floatingDir) {
    const xml = await findMainCaml(floatingDir)
    if (xml) xmlByDoc.floating = xml
  }
  if (backgroundDir) {
    const xml = await findMainCaml(backgroundDir)
    if (xml) xmlByDoc.background = xml
  }
  if (wallpaperDir) {
    const xml = await findMainCaml(wallpaperDir)
    if (xml) xmlByDoc.wallpaper = xml
  }

  return { width, height, xmlByDoc, bundle }
}

function computeEffortScore(docs: TendiesDocAnalysis[]): AnalysisResult {
  const totalLayers = docs.reduce((sum, d) => sum + d.layerCount, 0)
  const totalStates = docs.reduce((sum, d) => sum + d.stateCount, 0)
  const totalTransitions = docs.reduce((sum, d) => sum + d.transitionCount, 0)
  const totalAnimations = docs.reduce((sum, d) => sum + d.animationCount, 0)

  const hasCapRootLayer = docs.some((d) => d.hasCapRootLayer)
  const hasCapBanner = docs.some((d) => d.hasCapBanner)
  const hasRemixCredit = docs.some((d) => d.hasRemixCredit)

  const isRemixed = hasRemixCredit

  const floating = docs.find((d) => d.docType === "floating")
  const background = docs.find((d) => d.docType === "background")
  const wallpaper = docs.find((d) => d.docType === "wallpaper")

  const floatingHasWork = !!floating && (floating.layerCount > 1 || floating.stateCount > 0 || floating.transitionCount > 0)
  const backgroundHasWork = !!background && (background.layerCount > 1 || background.stateCount > 0 || background.transitionCount > 0)
  const wallpaperHasWork = !!wallpaper && (wallpaper.layerCount > 0 || wallpaper.stateCount > 0 || wallpaper.transitionCount > 0)

  return {
    width: 0,
    height: 0,
    docs,
    totalLayers,
    totalStates,
    totalTransitions,
    totalAnimations,
    hasCapRootLayer,
    hasCapBanner,
    hasRemixCredit,
    isRemixed,
    floatingHasWork,
    backgroundHasWork,
    wallpaperHasWork,
  }
}

function summarizeLayerTypes(root: AnyLayer | undefined) {
  const counts: Record<string, number> = {}
  if (!root) return counts
  const visit = (l: AnyLayer) => {
    const t = l.type || "unknown"
    counts[t] = (counts[t] || 0) + 1
    if (Array.isArray(l.children)) {
      for (const child of l.children) visit(child)
    }
  }
  visit(root)
  return counts
}

function buildLayerTreeLines(root: AnyLayer | undefined, maxDepth: number = 4, maxNodes: number = 80): string[] {
  const lines: string[] = []
  if (!root) return lines
  let count = 0

  const visit = (l: AnyLayer, depth: number) => {
    if (count >= maxNodes) return
    const name = l.name || l.id || l.type || "Layer"
    const indent = "  ".repeat(depth)
    lines.push(`${indent}- ${name}`)
    count++
    if (depth >= maxDepth) return
    if (Array.isArray(l.children)) {
      for (const child of l.children) {
        if (count >= maxNodes) break
        visit(child, depth + 1)
      }
    }
  }

  visit(root, 0)
  return lines
}

interface ImageInfo {
  url: string
  filename: string
  isImage: boolean
}

function collectImageInfos(
  assets: TendiesBundle["floating"] | TendiesBundle["background"] | TendiesBundle["wallpaper"],
): ImageInfo[] {
  const infos: ImageInfo[] = []
  if (!assets || !assets.assets) return infos
  for (const [name, asset] of Object.entries(assets.assets)) {
    const data = asset.data instanceof Blob ? asset.data : new Blob([(asset.data as any) || new ArrayBuffer(0)])
    try {
      const url = URL.createObjectURL(data)
      const filename = name || "asset"
      const lower = filename.toLowerCase()
      const isImage =
        data.type.startsWith("image/") ||
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".svg")
      infos.push({ url, filename, isImage })
    } catch {}
  }
  return infos
}

function hasVideoFrameSequence(root: AnyLayer | undefined): boolean {
  if (!root) return false
  const frameRe = /_frame_\d+$/

  const visit = (l: AnyLayer): boolean => {
    if ((l as unknown as { caplayKind?: string }).caplayKind === "video" && Array.isArray(l.children)) {
      const frames = l.children.filter((c) => {
        const n = c.name || c.id || ""
        return frameRe.test(String(n))
      })
      if (frames.length >= 5) return true
    }
    if (Array.isArray(l.children)) {
      for (const child of l.children) {
        if (visit(child)) return true
      }
    }
    return false
  }

  return visit(root)
}

export default function TendiesChecker() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [projectSize, setProjectSize] = useState<{ width: number; height: number } | null>(null)
  const [bundle, setBundle] = useState<TendiesBundle | null>(null)
  const [previewImages, setPreviewImages] = useState<ImageInfo[] | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number>(0)

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setFileName(file.name)
    setError(null)
    setResult(null)
    setIsAnalysing(true)

    try {
      const { width, height, xmlByDoc, bundle } = await extractCamlFromTendies(file)
      setProjectSize({ width, height })
      setBundle(bundle)

      const docs: TendiesDocAnalysis[] = []
      if (xmlByDoc.floating) docs.push(analyseCaml(xmlByDoc.floating, "floating"))
      if (xmlByDoc.background) docs.push(analyseCaml(xmlByDoc.background, "background"))
      if (xmlByDoc.wallpaper) docs.push(analyseCaml(xmlByDoc.wallpaper, "wallpaper"))

      if (docs.length === 0) {
        throw new Error("No CAML documents found in tendies file")
      }

      const analysis = computeEffortScore(docs)
      analysis.width = width
      analysis.height = height
      setResult(analysis)
    } catch (e: any) {
      console.error("Tendies analysis failed", e)
      setError(e?.message || "Failed to analyse tendies file")
    } finally {
      setIsAnalysing(false)
    }
  }, [])

  const closePreview = useCallback(() => {
    setPreviewImages(null)
    setPreviewIndex(0)
  }, [])

  const showPreview = useCallback((images: ImageInfo[], index: number) => {
    if (!images.length) return
    setPreviewImages(images)
    setPreviewIndex(Math.max(0, Math.min(index, images.length - 1)))
  }, [])

  const showNext = useCallback(() => {
    if (!previewImages || previewImages.length === 0) return
    setPreviewIndex((prev) => (prev + 1) % previewImages.length)
  }, [previewImages])

  const showPrev = useCallback(() => {
    if (!previewImages || previewImages.length === 0) return
    setPreviewIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length)
  }, [previewImages])

  useEffect(() => {
    if (!previewImages || previewImages.length === 0) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        closePreview()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        showNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        showPrev()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [previewImages, closePreview, showNext, showPrev])

  const capStatus = useMemo(() => {
    if (!result) return null
    const { hasCapRootLayer, hasCapBanner } = result
    if (hasCapRootLayer && hasCapBanner) return { label: "Yes", color: "text-emerald-600" }
    if (!hasCapRootLayer && !hasCapBanner) return { label: "No", color: "text-red-600" }
    return { label: "Maybe", color: "text-amber-600" }
  }, [result])

  const isVideoWallpaper = useMemo(() => {
    if (!bundle) return false
    return (
      hasVideoFrameSequence(bundle.floating?.root as AnyLayer | undefined) ||
      hasVideoFrameSequence(bundle.background?.root as AnyLayer | undefined) ||
      hasVideoFrameSequence(bundle.wallpaper?.root as AnyLayer | undefined)
    )
  }, [bundle])

  const onDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const files = e.dataTransfer?.files
      if (files && files.length) {
        void handleFiles(files)
      }
    },
    [handleFiles],
  )

  const onDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback<React.DragEventHandler<HTMLDivElement>>((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Tendies File Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
            isDragging ? "border-accent bg-accent/5" : "border-muted-foreground/30 bg-muted/40"
          }`}
          onClick={() => {
            const input = document.getElementById("tendies-file-input") as HTMLInputElement | null
            if (input) input.click()
          }}
        >
          <Upload className="h-8 w-8 mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">Drop a .tendies file here, or click to choose one</p>
          <p className="text-xs text-muted-foreground">This tool will show CAPlayground info and per file breakdowns.</p>
          {fileName && !isAnalysing && (
            <p className="mt-3 text-xs text-muted-foreground">Selected file: {fileName}</p>
          )}
          {isAnalysing && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analysing tendies...
            </div>
          )}
        </div>

        <Input
          id="tendies-file-input"
          type="file"
          accept=".tendies,.ca,.zip"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {projectSize && (
          <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Info className="h-3 w-3" />
              Project size: {projectSize.width} × {projectSize.height}
            </span>
            {isVideoWallpaper && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" />
                Video wallpaper detected (CAPlayground video layer with frame sequence)
              </span>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* CAPlayground Info */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">CAPlayground Info</div>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Made in CAPlayground?</div>
                  <div className="flex items-center gap-2">
                    {capStatus && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${capStatus.color}`}
                      >
                        {capStatus.label}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Requires both CA root layer and banner to be considered &quot;Yes&quot;.
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Was the wallpaper remixed?</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        result.isRemixed ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {result.isRemixed ? "Yes" : "No"}
                    </span>
                    <span className="text-xs text-muted-foreground">Detected via &quot;Imported from CAPlayground Gallery&quot;.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Per file breakdown */}
            <div className="space-y-3 text-sm">
              <div className="text-sm font-semibold">Per file breakdown</div>
              <div className="space-y-4">
                {(["floating", "background", "wallpaper"] as const).map((kind) => {
                  const doc = result.docs.find((d) => d.docType === kind)
                  if (!doc) return null
                  const title =
                    kind === "floating" ? "Floating.ca" : kind === "background" ? "Background.ca" : "Wallpaper.ca"
                  const layerTypes = summarizeLayerTypes(
                    kind === "floating" ? (bundle?.floating?.root as AnyLayer | undefined) :
                    kind === "background" ? (bundle?.background?.root as AnyLayer | undefined) :
                    (bundle?.wallpaper?.root as AnyLayer | undefined),
                  )
                  const treeLines = buildLayerTreeLines(
                    kind === "floating" ? (bundle?.floating?.root as AnyLayer | undefined) :
                    kind === "background" ? (bundle?.background?.root as AnyLayer | undefined) :
                    (bundle?.wallpaper?.root as AnyLayer | undefined),
                  )
                  const imageInfos = collectImageInfos(
                    kind === "floating" ? bundle?.floating : kind === "background" ? bundle?.background : bundle?.wallpaper,
                  )

                  return (
                    <div key={kind} className="border rounded-md p-3 bg-muted/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{title}</div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold uppercase text-muted-foreground">Counts</div>
                          <div>Layers: {doc.layerCount}</div>
                          <div>States: {doc.stateCount}</div>
                          <div>State transitions: {doc.transitionCount}</div>
                          <div>Animations: {doc.animationCount}</div>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold uppercase text-muted-foreground">Layer types</div>
                          {Object.keys(layerTypes).length === 0 && <div className="text-muted-foreground">None</div>}
                          {Object.entries(layerTypes).map(([t, c]) => (
                            <div key={t}>{t}: {c}</div>
                          ))}
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="font-semibold uppercase text-muted-foreground">Structure</div>
                          {treeLines.length === 0 ? (
                            <div className="text-muted-foreground">No layers parsed</div>
                          ) : (
                            <pre className="text-[10px] leading-snug bg-background/60 rounded border p-2 max-h-40 overflow-auto">
                              {treeLines.join("\n")}
                            </pre>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold uppercase text-muted-foreground">Images</div>
                        {imageInfos.length === 0 ? (
                          <div className="text-muted-foreground">No images detected</div>
                        ) : (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {imageInfos.map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => showPreview(imageInfos, idx)}
                                className="w-16 h-16 rounded border bg-background flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                              >
                                {img.isImage ? (
                                  <img src={img.url} alt="asset" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-muted-foreground bg-muted/40">
                                    {img.filename.split(".").pop() || "file"}
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFileName(null)
                  setResult(null)
                  setError(null)
                  setProjectSize(null)
                  setBundle(null)
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      {previewImages && previewImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={closePreview}
        >
          <div
            className="bg-background rounded-lg p-4 max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-3 shadow-lg border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-3 w-[min(90vw,640px)] h-[min(90vh,420px)]">
              {previewImages.length > 1 && (
                <button
                  type="button"
                  onClick={showPrev}
                  className="p-2 rounded-full border bg-muted hover:bg-muted/80 flex items-center justify-center"
                  aria-label="Previous asset"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1 h-full flex items-center justify-center">
                {previewImages[previewIndex]?.isImage ? (
                  <img
                    src={previewImages[previewIndex]?.url}
                    alt={previewImages[previewIndex]?.filename || "expanded asset"}
                    className="max-h-full max-w-full rounded object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="px-4 py-2 rounded border bg-muted text-sm font-mono">
                      {(previewImages[previewIndex]?.filename.split(".").pop() || "file").toUpperCase()}
                    </div>
                  </div>
                )}
              </div>
              {previewImages.length > 1 && (
                <button
                  type="button"
                  onClick={showNext}
                  className="p-2 rounded-full border bg-muted hover:bg-muted/80 flex items-center justify-center"
                  aria-label="Next asset"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 mt-2">
              <div className="text-xs text-muted-foreground break-all">
                {previewImages[previewIndex]?.filename}
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <a href={previewImages[previewIndex]?.url} download={previewImages[previewIndex]?.filename}>
                    Download
                  </a>
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={closePreview}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

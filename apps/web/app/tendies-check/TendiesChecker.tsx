"use client"

import { useCallback, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileText, CheckCircle2, XCircle, Info, Loader2 } from "lucide-react"
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
    const t = (l as any).type || "unknown"
    counts[t] = (counts[t] || 0) + 1
    if (Array.isArray((l as any).children)) {
      for (const child of (l as any).children as AnyLayer[]) visit(child)
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
    const name = (l as any).name || (l as any).id || (l as any).type || "Layer"
    const indent = "  ".repeat(depth)
    lines.push(`${indent}- ${name}`)
    count++
    if (depth >= maxDepth) return
    if (Array.isArray((l as any).children)) {
      for (const child of (l as any).children as AnyLayer[]) {
        if (count >= maxNodes) break
        visit(child, depth + 1)
      }
    }
  }

  visit(root, 0)
  return lines
}

function collectImageUrls(assets: TendiesBundle["floating"] | TendiesBundle["background"] | TendiesBundle["wallpaper"]): string[] {
  const urls: string[] = []
  if (!assets || !assets.assets) return urls
  for (const asset of Object.values(assets.assets)) {
    const data = asset.data instanceof Blob ? asset.data : new Blob([(asset.data as any) || new ArrayBuffer(0)])
    try {
      const url = URL.createObjectURL(data)
      urls.push(url)
    } catch {}
  }
  return urls
}

function hasVideoFrameSequence(root: AnyLayer | undefined): boolean {
  if (!root) return false
  const frameRe = /_frame_\d+$/

  const visit = (l: AnyLayer): boolean => {
    const any = l as any
    if (any.caplayKind === "video" && Array.isArray(any.children)) {
      const frames = (any.children as AnyLayer[]).filter((c) => {
        const n = (c as any).name || (c as any).id || ""
        return frameRe.test(String(n))
      })
      if (frames.length >= 5) return true
    }
    if (Array.isArray(any.children)) {
      for (const child of any.children as AnyLayer[]) {
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
                  const imageUrls = collectImageUrls(
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
                        {imageUrls.length === 0 ? (
                          <div className="text-muted-foreground">No images detected</div>
                        ) : (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {imageUrls.map((url, idx) => (
                              <div key={idx} className="w-16 h-16 rounded border bg-background flex-shrink-0 overflow-hidden">
                                <img src={url} alt="asset" className="w-full h-full object-cover" />
                              </div>
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
    </Card>
  )
}

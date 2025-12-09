import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import Link from "next/link"
import { Send, Filter as NotificationIcon, Github, Star, Download } from "lucide-react"
import Image from "next/image"

export const runtime = 'nodejs'

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

export default async function HomePage() {
  let stars: number | null = null
  let mostDownloaded: { wallpaper: WallpaperItem; baseUrl: string; downloads: number } | null = null
  try {
    const res = await fetch(
      "https://api.github.com/repos/CAPlayground/CAPlayground",
      { next: { revalidate: 3600 }, headers: { Accept: "application/vnd.github+json" } }
    )
    if (res.ok) {
      const data = await res.json()
      stars = typeof data?.stargazers_count === "number" ? data.stargazers_count : null
    }
    try {
      const wallpapersRes = await fetch(
        "https://raw.githubusercontent.com/CAPlayground/wallpapers/refs/heads/main/wallpapers.json",
        {
          next: { revalidate: 1800 },
          headers: { Accept: "application/json" },
        }
      )

      if (wallpapersRes.ok) {
        const data = (await wallpapersRes.json()) as WallpapersResponse

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (supabaseUrl && supabaseAnonKey && Array.isArray(data.wallpapers)) {
          const statsRes = await fetch(
            `${supabaseUrl}/rest/v1/wallpaper_stats?select=id,downloads&order=downloads.desc&limit=1`,
            {
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
              cache: "no-store",
            }
          )

          if (statsRes.ok) {
            const stats = (await statsRes.json()) as Array<{ id: string; downloads: number }>
            if (Array.isArray(stats) && stats.length > 0) {
              const top = stats[0]
              const wallpaper = data.wallpapers.find((w) => String(w.id) === String(top.id))
              if (wallpaper) {
                mostDownloaded = {
                  wallpaper,
                  baseUrl: data.base_url,
                  downloads: top.downloads || 0,
                }
              }
            }
          }
        }
      }
    } catch (e) {
    }
  } catch (e) {
    stars = null
  }
  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative">
        <Navigation />

        {/* Hero */}
        <main className="">
          <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-start">
            <div className="relative container mx-auto px-3 min-[600px]:px-4 lg:px-6 pt-16 pb-24 min-[600px]:pt-20 min-[600px]:pb-32">
              <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center animate-in fade-in-0 slide-in-from-bottom-6 duration-2000 ease-out fill-mode-forwards">
                {/* Left: content */}
                <div className="space-y-8 text-center lg:text-left">
                  {/* notification */}
                  <Link href="/projects">
                    <div className="inline-flex items-center justify-center lg:justify-start px-6 py-2.5 rounded-full bg-accent/10 backdrop-blur-sm border border-accent/20 transition-all duration-200 hover:bg-accent/20 hover:border-accent/30 hover:shadow-sm cursor-pointer w-auto">
                      <NotificationIcon className="h-4 w-4 text-accent mr-2" aria-hidden="true" />
                      <span className="text-accent font-sans font-medium text-sm">Blending Modes and Filters are out!</span>
                    </div>
                  </Link>

                  {/* title */}
                  <h1 className="font-heading text-4xl min-[600px]:text-6xl lg:text-6xl font-bold text-foreground leading-tight mt-6 min-[600px]:mt-8">
                    <span className="block">The Open Source</span>
                    <span className="block text-accent mt-1">CA Wallpaper Editor.</span>
                  </h1>

                  {/* description */}
                  <p className="text-xl min-[600px]:text-2xl text-muted-foreground max-w-3xl leading-relaxed mx-auto lg:mx-0">
                    Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer with CAPlayground.
                  </p>

                  <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-3 max-[600px]:hidden">
                    <div className="relative flex flex-col items-center lg:items-start">
                      <Link href="/projects">
                        <Button
                          size="lg"
                          className="px-6 bg-accent hover:bg-accent/90 text-white font-semibold"
                        >
                          <span className="inline-flex items-center gap-2">
                            Get Started
                            <Send className="h-5 w-5" aria-hidden="true" />
                          </span>
                        </Button>
                      </Link>
                      <span className="absolute left-0 top-full mt-1 text-[11px] leading-none text-muted-foreground opacity-70 select-none pointer-events-none">
                        No sign in required!
                      </span>
                    </div>

                    <Link href="https://github.com/CAPlayground/CAPlayground" target="_blank" rel="noopener noreferrer">
                      <Button size="lg" variant="outline" className="px-6">
                        <span className="inline-flex items-center gap-2">
                          <Github className="h-5 w-5" aria-hidden="true" />
                          <span>View GitHub{stars !== null ? ` ${new Intl.NumberFormat().format(stars)}` : ""}</span>
                          {stars !== null && <Star className="h-4 w-4 fill-current" aria-hidden="true" />}
                        </span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* hero video */}
                <div className="pt-10 lg:pt-0 hidden lg:block">
                  <Link href="/wallpapers?id=0000001" className="block">
                    <div className="relative w-full max-w-5xl min-[600px]:max-w-none rounded-xl border-8 border-zinc-200/80 dark:border-white/30 shadow-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]">
                      <video
                        src="/featured.mp4"
                        className="w-full h-auto select-none pointer-events-none"
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-label="CAPlayground featured wallpaper"
                      />
                      <span className="absolute bottom-2 left-2 text-xs text-white/90 dark:text-white/80 bg-black/40 dark:bg-black/60 backdrop-blur-sm px-2 py-1 rounded select-none pointer-events-none">
                        Wallpaper by M4xi
                      </span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* app screenshots */}
              <div className="pt-6 min-[600px]:pt-8">
                <div className="max-w-7xl mx-auto rounded-xl border-8 border-zinc-200/80 dark:border-white/30 shadow-lg overflow-hidden">
                  <Image
                    src="/app-light.png"
                    alt="CAPlayground app preview (light)"
                    width={1920}
                    height={1080}
                    priority
                    className="w-full h-auto select-none pointer-events-none block dark:hidden"
                  />
                  <Image
                    src="/app-dark.png"
                    alt="CAPlayground app preview (dark)"
                    width={1920}
                    height={1080}
                    priority
                    className="w-full h-auto select-none pointer-events-none hidden dark:block"
                  />
                </div>
                {/* mobile buttons */}
                <div className="mt-4 hidden max-[600px]:flex flex-col items-stretch gap-3">
                  <Link href="/projects" className="w-full">
                    <Button size="lg" className="w-full h-12 text-base px-6 bg-accent hover:bg-accent/90 text-white font-semibold">
                      <span className="inline-flex items-center justify-center gap-2">
                        Get Started
                        <Send className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </Button>
                  </Link>
                  <Link href="https://github.com/CAPlayground/CAPlayground" target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button size="lg" variant="outline" className="w-full h-12 text-base px-6">
                      <span className="inline-flex items-center justify-center gap-2">
                        <Github className="h-5 w-5" aria-hidden="true" />
                        <span>View GitHub{stars !== null ? ` ${new Intl.NumberFormat().format(stars)}` : ""}</span>
                        {stars !== null && <Star className="h-4 w-4 fill-current" aria-hidden="true" />}
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {mostDownloaded && (
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-3 min-[600px]:px-4 lg:px-6">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div>
                <Card className="overflow-hidden border-8 border-zinc-200/80 dark:border-white/30 shadow-lg">
                  <CardContent className="p-4">
                    <div className="mb-3 overflow-hidden rounded-md border bg-background">
                      <AspectRatio ratio={1} className="flex items-center justify-center">
                        {(() => {
                          const previewUrl = `${mostDownloaded.baseUrl}${mostDownloaded.wallpaper.preview}`
                          return isVideo(previewUrl) ? (
                            <video
                              src={previewUrl}
                              className="w-full h-full object-contain"
                              autoPlay
                              muted
                              loop
                              playsInline
                              aria-label={`${mostDownloaded.wallpaper.name} preview`}
                            />
                          ) : (
                            <img
                              src={previewUrl}
                              alt={`${mostDownloaded.wallpaper.name} preview`}
                              className="w-full h-full object-contain"
                            />
                          )
                        })()}
                      </AspectRatio>
                    </div>
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">
                      {mostDownloaded.wallpaper.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      by {mostDownloaded.wallpaper.creator} (submitted on {mostDownloaded.wallpaper.from})
                    </p>
                    {mostDownloaded.downloads > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                        <Download className="h-3.5 w-3.5" />
                        <span>{mostDownloaded.downloads}</span>
                        <span>{mostDownloaded.downloads === 1 ? "Download" : "Downloads"}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {mostDownloaded.wallpaper.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4 text-center lg:text-left">
                <h2 className="font-heading text-3xl md:text-4xl font-bold">
                  Explore the most downloaded wallpaper
                </h2>
                <p className="text-muted-foreground text-lg max-w-xl mx-auto lg:mx-0">
                  See what the community loves most, then dive into the full gallery to discover more animated
                  wallpapers for your devices.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
                  <Link href={`/wallpapers?id=${mostDownloaded.wallpaper.id}`}>
                    <Button size="lg" className="px-6 bg-accent hover:bg-accent/90 text-white font-semibold">
                      View this wallpaper
                    </Button>
                  </Link>
                  <Link href="/wallpapers">
                    <Button size="lg" variant="outline" className="px-6">
                      View wallpaper gallery
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}

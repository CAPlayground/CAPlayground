import { Suspense } from "react"
import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { WallpapersGrid } from "./WallpapersGrid"

const WALLPAPERS_JSON_URL =
  "https://raw.githubusercontent.com/CAPlayground/wallpapers/refs/heads/main/wallpapers.json"

// 30 min
export const revalidate = 1800
export const runtime = 'edge'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { id?: string }
}): Promise<Metadata> {
  const wallpaperId = searchParams.id

  if (wallpaperId) {
    try {
      // Fetch wallpaper data
      const wallpapersRes = await fetch(WALLPAPERS_JSON_URL, {
        next: { revalidate },
        headers: { Accept: "application/json" },
      })
      
      if (wallpapersRes.ok) {
        const data = (await wallpapersRes.json()) as WallpapersResponse
        const wallpaper = data.wallpapers.find(w => String(w.id) === wallpaperId)
        
        if (wallpaper) {
          // Fetch download stats
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          let downloads = 0
          
          if (supabaseUrl && supabaseAnonKey) {
            try {
              const statsRes = await fetch(
                `${supabaseUrl}/rest/v1/wallpaper_stats?id=eq.${wallpaperId}&select=downloads`,
                {
                  headers: {
                    "apikey": supabaseAnonKey,
                    "Authorization": `Bearer ${supabaseAnonKey}`,
                  },
                  cache: 'no-store',
                }
              )
              
              if (statsRes.ok) {
                const stats = await statsRes.json()
                if (stats && stats.length > 0) {
                  downloads = stats[0].downloads || 0
                }
              }
            } catch (err) {
              console.error('Failed to fetch download stats for metadata:', err)
            }
          }
          
          const downloadText = downloads === 1 ? '1 download' : `${downloads} downloads`
          const description = `${downloadText} • by ${wallpaper.creator}`
          const previewUrl = `${data.base_url}${wallpaper.preview}`
          
          return {
            title: `CAPlayground Community - ${wallpaper.name}`,
            description,
            openGraph: {
              title: `CAPlayground Community - ${wallpaper.name}`,
              description,
              type: "website",
              images: [
                {
                  url: previewUrl,
                  alt: `${wallpaper.name} preview`,
                },
              ],
            },
            twitter: {
              card: "summary_large_image",
              title: `CAPlayground Community - ${wallpaper.name}`,
              description,
              images: [previewUrl],
            },
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate wallpaper metadata:', err)
    }
  }

  // Default metadata for wallpapers page
  return {
    title: "CAPlayground - Wallpapers",
    description: "Browse wallpapers made by the CAPlayground community",
    openGraph: {
      title: "CAPlayground - Wallpapers",
      description: "Browse wallpapers made by the CAPlayground community",
      type: "website",
    },
  }
}

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

async function getWallpapers(): Promise<WallpapersResponse | null> {
  try {
    const res = await fetch(WALLPAPERS_JSON_URL, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    })
    if (!res.ok) return null
    const data = (await res.json()) as WallpapersResponse
    if (!data || !Array.isArray(data.wallpapers) || typeof data.base_url !== "string") {
      return null
    }
    return data
  } catch {
    return null
  }
}

function isVideo(src: string) {
  const lower = src.toLowerCase()
  return lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.includes("/video/")
}

export default async function WallpapersPage() {
  const data = await getWallpapers()

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative">
        <div className="squares-bg" aria-hidden="true" />
        <Navigation />

        <main className="relative">
          <section className="py-8 md:py-12">
            <div className="container mx-auto px-3 min-[600px]:px-4 lg:px-6">
              <div className="max-w-5xl mx-auto text-center mb-8 md:mb-10">
                <h1 className="font-heading text-5xl md:text-[50px] font-bold">Wallpaper Gallery</h1>
                <p className="text-muted-foreground mt-3">
                  Browse wallpapers made by the CAPlayground community.
                </p>
              </div>

              {!data && (
                <div className="max-w-xl mx-auto text-center text-sm text-muted-foreground">
                  Unable to load wallpapers right now. Please try again later.
                </div>
              )}

              {data && (
                <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
                  <WallpapersGrid data={data} />
                </Suspense>
              )}
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}

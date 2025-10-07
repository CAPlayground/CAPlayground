import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { WallpapersGrid } from "./WallpapersGrid"

const WALLPAPERS_JSON_URL =
  "https://raw.githubusercontent.com/CAPlayground/wallpapers/refs/heads/main/wallpapers.json"

// 30 min
export const revalidate = 1800

interface WallpaperItem {
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

              {data && <WallpapersGrid data={data} />}
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Send, Map as MapIcon } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative">
        <div className="squares-bg" aria-hidden="true" />
        <Navigation />

        {/* Hero */}
        <main className="">
          <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">

            <div className="relative container mx-auto px-4 py-24 md:py-32">
              <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in-0 slide-in-from-bottom-6 duration-2000 ease-out">
                {/* notification */}
                <Link href="/projects">
                  <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-accent/10 backdrop-blur-sm border border-accent/20 mb-4 transition-all duration-200 hover:bg-accent/20 hover:border-accent/30 hover:shadow-sm cursor-pointer">
                    <MapIcon className="h-4 w-4 text-accent mr-2" aria-hidden="true" />
                    <span className="text-accent font-sans font-medium text-sm">Animations and State Transitions can be added to your project!</span>
                  </div>
                </Link>
                
                {/* title */}
                <h1 className="font-heading text-5xl md:text-7xl lg:text-7xl font-bold text-foreground leading-tight">
                  <span className="block">The Open Source</span>
                  <span className="block text-accent mt-1">CoreAnimation Editor</span>
                </h1>

                {/* description */}
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                  Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer with CAPlayground.
                </p>

                {/* button */}
                <div className="pt-8">
                  <Link href="/projects">
                    <Button
                      size="lg"
                      className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      <span className="inline-flex items-center gap-2">
                        Try Beta
                        <Send className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Send } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div className="squares-bg" aria-hidden="true" />
      <Navigation />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden min-h-[calc(100vh-4rem)] flex items-center">

          <div className="relative container mx-auto px-4 py-24 md:py-32">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Main Heading */}
              <h1 className="font-heading text-5xl md:text-7xl lg:text-7xl font-bold text-foreground leading-tight">
                <span className="block">The Open Source</span>
                <span className="block text-accent mt-1">CoreAnimation Editor</span>
              </h1>

              {/* Description */}
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer
              </p>

              {/* Button */}
              <div className="pt-8">
                <Link href="#projects">
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

      <Footer />
    </div>
  )
}

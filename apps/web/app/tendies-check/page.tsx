import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Suspense } from "react"
import TendiesChecker from "./TendiesChecker"

export const runtime = "nodejs"

export default function TendiesCheckPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative">
        <Navigation />
        <main className="relative">
          <section className="py-8 md:py-12">
            <div className="container mx-auto px-3 min-[600px]:px-4 lg:px-6">
              <div className="max-w-5xl mx-auto text-center mb-8 md:mb-10">
                <h1 className="font-heading text-4xl md:text-5xl font-bold">Tendies Checker</h1>
                <p className="text-muted-foreground mt-3 text-sm md:text-base">
                  Upload a .tendies file to see the info for the wallpaper.
                </p>
              </div>
              <Suspense fallback={<div className="text-center text-muted-foreground">Loading checker...</div>}>
                <TendiesChecker />
              </Suspense>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </div>
  )
}

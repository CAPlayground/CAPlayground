import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Wordmark } from "@/components/wordmark"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-8 md:px-16 py-12 space-y-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">Ready to get started?</h2>
          <p className="text-muted-foreground mt-3">Build your first animated wallpaper in minutes. No sign in required.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/projects">
              <Button className="px-6 bg-accent hover:bg-accent/90 text-white font-semibold">
                <span className="inline-flex items-center gap-2">Get Started</span>
              </Button>
            </Link>
            <Link href="https://github.com/CAPlayground/CAPlayground" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="px-6">
                <span className="inline-flex items-center gap-2">View GitHub</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {/* light icon */}
              <Image
                src="/icon-light.png"
                alt="CAPlayground icon"
                width={32}
                height={32}
                className="rounded-lg block dark:hidden"
                priority
              />
              {/* dark icon */}
              <Image
                src="/icon-dark.png"
                alt="CAPlayground icon"
                width={32}
                height={32}
                className="rounded-lg hidden dark:block"
              />
              <span className="font-helvetica-neue text-xl font-bold">CAPlayground</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Create beautiful animated wallpapers for iOS and iPadOS on any desktop computer.
            </p>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="font-heading font-semibold">Resources</h3>
            <div className="space-y-2">
              <Link href="/docs" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Documentation
              </Link>
              <Link href="/roadmap" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Roadmap
              </Link>
              <Link
                href="/tendies-check"
                className="block text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Tendies Checker
              </Link>
            </div>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-heading font-semibold">Community</h3>
            <div className="space-y-2">
              <Link
                href="/contributors"
                className="block text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Contributors
              </Link>
              <Link href="https://github.com/CAPlayground/CAPlayground" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                GitHub
              </Link>
              <Link href="https://discord.gg/8rW3SHsK8b" className="block text-sm text-muted-foreground hover:text-accent transition-colors">
                Discord
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">© 2025 CAPlayground. All rights reserved.</p>
            <div className="flex space-x-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Privacy Policy
              </Link>
              <Link href="/tos" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
          <div className="mt-12">
            <Wordmark />
          </div>
        </div>
      </div>
    </footer>
  )
}

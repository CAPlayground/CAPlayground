import type { Metadata } from "next"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Github, Users, GitCommit, AlertCircle } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "CAPlayground - Contributors",
}

interface GitHubContributor {
  id: number
  login: string
  avatar_url: string
  html_url: string
  contributions: number
}

async function getContributors(): Promise<GitHubContributor[]> {
  try {
    const response = await fetch(
      'https://api.github.com/repos/CAPlayground/CAPlayground/contributors',
      {
        next: { revalidate: 3600 },
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const contributors = await response.json()
    return contributors
  } catch (error) {
    console.error('Error fetching contributors:', error)
    return []
  }
}

export default async function ContributorsPage() {
  const contributors = await getContributors()
  const totalContributors = contributors.length
  const totalContributions = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0)

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center space-y-6 mb-16">
              {/* Open Source Badge */}
              <div className="flex justify-center">
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent border-accent/20 px-4 py-2 text-sm font-medium"
                >
                  <Github className="w-4 h-4 mr-2" />
                  开源
                </Badge>
              </div>

              {/* Title */}
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">贡献者</h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                认识为社区构建出色Core Animation编辑器的优秀开发人员，制作
                精美的壁纸
              </p>

              {/* Stats */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-foreground">{totalContributors}</div>
                    <div className="text-sm text-muted-foreground">贡献者</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <GitCommit className="w-6 h-6 text-accent" />
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-foreground">{totalContributions}</div>
                    <div className="text-sm text-muted-foreground">贡献次数</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error State */}
            {contributors.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">无法加载贡献者</h3>
                <p className="text-muted-foreground mb-6">
                  无法从GitHub获取贡献者数据。请稍后重试。
                </p>
                <Link
                  href="https://github.com/CAPlayground/CAPlayground/graphs/contributors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  <Github className="w-5 h-5" />
                  <span>View on GitHub</span>
                </Link>
              </div>
            )}

            {/* Contributors Grid */}
            {contributors.length > 0 && (
              <div className="grid grid-cols-[repeat(1,max-content)] sm:grid-cols-[repeat(2,max-content)] lg:grid-cols-[repeat(3,max-content)] justify-center gap-6">
                {contributors.map((contributor) => (
                  <Link
                    key={contributor.id}
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group w-80"
                  >
                    <Card className="h-full w-full transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 hover:border-accent/30 group-hover:scale-105">
                      <CardContent className="p-6 text-center space-y-4">
                        {/* Avatar */}
                        <div className="relative mx-auto w-20 h-20">
                          <img
                            src={contributor.avatar_url}
                            alt={`${contributor.login}'s avatar`}
                            className="w-full h-full rounded-full border-2 border-border group-hover:border-accent/50 transition-colors"
                          />
                        </div>

                        {/* Username */}
                        <div>
                          <h3 className="font-sfpro font-semibold text-lg text-foreground group-hover:text-accent transition-colors">
                            @{contributor.login}
                          </h3>
                        </div>

                        {/* Contributions */}
                        <div className="pt-2">
                          <div className="inline-flex items-center space-x-2 bg-muted/50 rounded-full px-3 py-1">
                            <GitCommit className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {contributor.contributions} 次贡献
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center mt-16 p-8 bg-muted/30 rounded-2xl">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-4">想要贡献？</h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                CAPlayground是开源的，欢迎来自世界各地的开发人员贡献。加入我们的
                社区，帮助构建动画壁纸的未来。
              </p>
              <Link
                href="https://github.com/CAPlayground/CAPlayground"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
                <span>View on GitHub</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

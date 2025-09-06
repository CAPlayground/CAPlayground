import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { getDocsTree, getTitlesMap } from "@/lib/docs"
import { DocsSidebar } from "@/components/docs/sidebar"

export default async function DocsPage() {
  let tree: Awaited<ReturnType<typeof getDocsTree>> = []
  try {
    tree = await getDocsTree("")
  } catch {}
  const titles = await (async () => {
    try {
      const files = flattenFiles(tree)
      return await getTitlesMap(files)
    } catch {
      return {}
    }
  })()
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
            <aside className="md:sticky md:top-20 h-fit md:max-h-[80vh] md:overflow-auto border rounded-md p-3">
              <DocsSidebar tree={tree} activePath={""} titles={titles} />
            </aside>
            <div className="prose dark:prose-invert max-w-none">
              <h1>Documentation</h1>
              <p className="text-muted-foreground">Choose a page from the sidebar to get started.</p>
              <p className="text-muted-foreground">If the sidebar is empty, view the source on GitHub while it populates.</p>
              <p>
                <Link href="https://github.com/CAPlayground/docs" className="text-accent hover:underline">Open docs repository →</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function flattenFiles(tree: Awaited<ReturnType<typeof getDocsTree>>): string[] {
  const out: string[] = []
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.type === "file") out.push(n.path)
      if (n.type === "dir" && n.children) walk(n.children)
    }
  }
  walk(tree as any[])
  return out
}

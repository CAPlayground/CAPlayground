import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"

export default function RoadmapPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <section className="container mx-auto px-12 md:px-30 py-16 md:py-24">
        <header className="mb-10 space-y-2">
          <h1 className="font-heading text-4xl md:text-5xl font-bold">Project Roadmap</h1>
          <p className="text-muted-foreground">What's cooking in CAPlayground? (Last Updated: 24th August, 2025)</p>
        </header>

        {/* Status Badges
          <Badge className="align-middle mr-1">Done</Badge>
          <Badge variant="secondary" className="align-middle mx-1">In Progress</Badge>
          <Badge variant="outline" className="align-middle mx-1">Not Started</Badge>
        */}

        <div className="space-y-6">
          <RoadmapItem index={1} title="The Start" status={<Badge>Done: 24th August, 2025</Badge>}>
            Starting the project on 24th August, 2025 because Lemin said it's time for a second wallpaper competition. Creating the project.
          </RoadmapItem>
          <RoadmapItem index={2} title="Projects and Base Editor" status={<Badge>Done: 24th August, 2025</Badge>}>
            Projects page, base editor, and create .ca files.
          </RoadmapItem>
          <RoadmapItem index={3} title="Viewing and Editing Layers" status={<Badge variant="secondary">Delayed, In progress</Badge>}>
            Viewing and Editing layers of a imported Core Animation file.
          </RoadmapItem>
          <RoadmapItem index={4} title="Core Animation Layer Properties" status={<Badge>Done: 5th August, 2025</Badge>}>
            Adjusting position, bounds, opacity, rotation, and more of layers.
          </RoadmapItem>
          <RoadmapItem index={5} title="Creating Animations, Viewing and Editing States" status={<Badge>Done: 15th August, 2025</Badge>}>
            Creating state transitions and keyframe animations.
          </RoadmapItem>
          <RoadmapItem index={6} title="CAPlayground App" status={<Badge variant="outline">Starting Soon</Badge>}>
            CAPlayground app to work inside an app.
          </RoadmapItem>
          <RoadmapItem index={7} title="Continue with Improvements" status={<Badge variant="outline">Not Started</Badge>}>
            Continue with improvements and features to perfect CAPlayground. This includes more inspector functionality, animations, and layer types.
          </RoadmapItem>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  )
}

function RoadmapItem({
  index,
  title,
  status,
  children,
}: {
  index: number
  title: string
  status: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <article className="rounded-xl border border-border bg-card text-card-foreground p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground font-semibold"
          >
            {index}
          </span>
          <h2 className="font-heading text-xl md:text-2xl font-semibold">{title}</h2>
        </div>
        <div aria-label="status" className="mt-2 md:mt-0 md:shrink-0">
          {status}
        </div>
      </div>
      {children ? <p className="mt-3 text-sm md:text-base text-muted-foreground">{children}</p> : null}
    </article>
  )
}

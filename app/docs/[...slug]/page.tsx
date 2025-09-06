import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import Link from "next/link";
import React from "react";
import { fetchMarkdown } from "@/lib/docs";
import { getDocsTree } from "@/lib/docs";
import { getRawBaseForDir } from "@/lib/docs";
import { getTitlesMap } from "@/lib/docs";
import type { DocNode } from "@/lib/docs";
import { getDefaultDocForDir } from "@/lib/docs";
import { redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import { DocsSidebar } from "@/components/docs/sidebar";
import { cn } from "@/lib/utils";

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema as any).tagNames,
    "iframe",
    "video",
    "source",
    "img",
    "pre",
    "code",
    "span",
  ],
  attributes: {
    ...(defaultSchema as any).attributes,
    a: [
      ...(((defaultSchema as any).attributes?.a as any[]) || []),
      "target",
      "rel",
      "href",
    ],
    pre: ["data-theme", "data-language"],
    code: ["data-theme", "data-language"],
    span: ["className"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    iframe: [
      "src",
      "width",
      "height",
      "allow",
      "allowfullscreen",
      "frameborder",
      "loading",
      "referrerpolicy",
    ],
    video: [
      "src",
      "width",
      "height",
      "controls",
      "autoplay",
      "muted",
      "loop",
      "poster",
    ],
    source: ["src", "type"],
    img: [
      "src",
      "alt",
      "title",
      "width",
      "height",
      "loading",
      "decoding",
      "referrerpolicy",
    ],
  },
} as const;

export default async function DocPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;

  try {
    const { content, resolvedPath } = await fetchMarkdown(slug);
    let tree = [] as Awaited<ReturnType<typeof getDocsTree>>;
    try {
      tree = await getDocsTree("");
    } catch {
      tree = [] as any;
    }

function normalizeMarkdown(src: string): string {
  let s = src.replace(/\r\n?/g, "\n");
  s = s.replace(/^(#{1,6})([^#\s].*)$/gm, (_m, hashes: string, rest: string) => `${hashes} ${rest}`);
  s = s.replace(/\n{3,}/g, "\n\n");
  return s;
}
    if (/\/(README\.(md|mdx))$/i.test(resolvedPath) || /^README\.(md|mdx)$/i.test(resolvedPath)) {
      const dir = toDirPath(resolvedPath);
      const better = await getDefaultDocForDir(dir);
      if (better && !/README\.(md|mdx)$/i.test(better)) {
        return redirect(`/docs/${better.replace(/\.(md|mdx)$/i, "")}`);
      }
      if (!dir) {
        const first = await (await import("@/lib/docs")).getFirstDocPath();
        if (first && !/README(\.(md|mdx))?$/i.test(first)) {
          return redirect(`/docs/${first.replace(/\.(md|mdx)$/i, "")}`);
        }
      }
    }
    const rawBase = await getRawBaseForDir(toDirPath(resolvedPath));
    const filePaths = flattenFiles(tree);
    const titles = await getTitlesMap(filePaths);
    const normalized = normalizeMarkdown(content);

    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-8">
              <aside className="md:sticky md:top-20 h-fit md:max-h-[80vh] md:overflow-auto border rounded-md p-3">
                <DocsSidebar tree={tree} activePath={resolvedPath} titles={titles} />
              </aside>
              <article className="prose prose-lg md:prose-xl dark:prose-invert max-w-3xl">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkFrontmatter]}
                  rehypePlugins={[
                    rehypeRaw,
                    rehypeSlug,
                    [rehypeAutolinkHeadings, { behavior: "wrap" }],
                    [rehypeSanitize, sanitizeSchema],
                  ]}
                  components={{
                    h1: (props) => <h1 {...props} className={cn("text-3xl md:text-4xl font-bold tracking-tight mb-4", props.className)} />,
                    h2: (props) => <h2 {...props} className={cn("text-2xl md:text-3xl font-semibold mt-8 mb-3", props.className)} />,
                    h3: (props) => <h3 {...props} className={cn("text-xl md:text-2xl font-semibold mt-6 mb-2", props.className)} />,
                    p: (props) => <p {...props} className={cn("text-base md:text-lg leading-7", props.className)} />,
                    ul: (props) => <ul {...props} className={cn("list-disc pl-6 my-4", props.className)} />,
                    ol: (props) => <ol {...props} className={cn("list-decimal pl-6 my-4", props.className)} />,
                    a: (props) => {
                      const hrefRaw = String(props.href || "");
                      const isAbsolute = /^(https?:)?\/\//i.test(hrefRaw) || hrefRaw.startsWith("/");
                      let finalHref = hrefRaw;
                      if (!isAbsolute) {
                        if (/\.(md|mdx)$/i.test(hrefRaw)) {
                          const url = new URL(hrefRaw, rawBase);
                          const path = url.pathname.replace(/^\//, "");
                          finalHref = `/docs/${path.replace(/\.(md|mdx)$/i, "")}`;
                        } else {
                          const url = new URL(hrefRaw, rawBase);
                          finalHref = url.toString();
                        }
                      }
                      const href = finalHref;
                      const absolute = /^(https?:)?\/\//i.test(href);
                      const isVideo = /\.(mp4|webm|mov)(\?.*)?$/i.test(href);
                      const yt = href.match(/^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+)|^https?:\/\/(?:www\.)?youtu\.be\/([^?&/]+)/i);
                      const vimeo = href.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/i);
                      if (absolute && isVideo) {
                        return (
                          // @ts-ignore
                          <video src={href} controls className="w-full rounded-md" />
                        );
                      }
                      if (yt) {
                        const id = yt[1] || yt[2];
                        const src = `https://www.youtube.com/embed/${id}`;
                        return (
                          // @ts-ignore
                          <iframe src={src} className="w-full aspect-video rounded-md" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        );
                      }
                      if (vimeo) {
                        const id = vimeo[1];
                        const src = `https://player.vimeo.com/video/${id}`;
                        return (
                          // @ts-ignore
                          <iframe src={src} className="w-full aspect-video rounded-md" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                        );
                      }
                      const external = absolute && !href.startsWith("/docs/");
                      return <a {...props} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} />;
                    },
                    img: (props) => {
                      const src = String(props.src || "");
                      const isAbsolute = /^(https?:)?\/\//i.test(src) || src.startsWith("/");
                      const finalSrc = isAbsolute ? src : new URL(src, rawBase).toString();
                      return <img {...props} src={finalSrc} className={(props.className ? props.className + " " : "") + "rounded-md"} />;
                    },
                    video: (props) => {
                      const src = String((props as any).src || "");
                      const isAbsolute = /^(https?:)?\/\//i.test(src) || src.startsWith("/");
                      const finalSrc = src ? (isAbsolute ? src : new URL(src, rawBase).toString()) : undefined;
                      return (
                        // @ts-ignore
                        <video {...props} src={finalSrc} className={(props as any).className ? (props as any).className + " w-full rounded-md" : "w-full rounded-md"} controls />
                      );
                    },
                    iframe: (props) => {
                      const src = String((props as any).src || "");
                      const isAbsolute = /^(https?:)?\/\//i.test(src) || src.startsWith("/");
                      const finalSrc = src ? (isAbsolute ? src : new URL(src, rawBase).toString()) : undefined;
                      return (
                        // @ts-ignore
                        <iframe {...props} src={finalSrc} className={(props as any).className ? (props as any).className + " w-full aspect-video rounded-md" : "w-full aspect-video rounded-md"} />
                      );
                    },
                  }}
                >
                  {normalized}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  } catch (e) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <h1 className="font-heading text-3xl font-bold">Not Found</h1>
              <p className="text-muted-foreground">We couldn't find that doc.</p>
              <div className="pt-4">
                <Link href="/docs" className="text-accent hover:underline">← Back to Docs</Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
}

function toDirPath(resolvedPath: string): string {
  return resolvedPath.replace(/[^/]+$/, "");
}

function toSlugPath(repoPath: string): string {
  return repoPath.replace(/\.(md|mdx)$/i, "");
}

function displayName(p: string): string {
  const name = p.split("/").pop() || p;
  return name.replace(/\.(md|mdx)$/i, "");
}

function isActive(itemPath: string, resolvedPath: string): boolean {
  const a = itemPath.replace(/\.(md|mdx)$/i, "");
  const b = resolvedPath.replace(/\.(md|mdx)$/i, "");
  return a === b;
}

function flattenFiles(tree: DocNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: DocNode[]) => {
    for (const n of nodes) {
      if (n.type === "file") out.push(n.path);
      if (n.type === "dir" && n.children) walk(n.children);
    }
  };
  walk(tree);
  return out;
}

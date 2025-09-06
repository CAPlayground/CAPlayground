import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { DocNode } from "@/lib/docs";

type Props = {
  tree: DocNode[]
  activePath: string
  titles?: Record<string, string>
}

export function DocsSidebar({ tree, activePath, titles }: Props) {
  const expanded = collectExpandedKeys(tree, activePath);
  return (
    <div className="space-y-2">
      <Accordion type="multiple" defaultValue={expanded} className="w-full">
        {tree.map((node) => (
          <SidebarNode key={node.path} node={node} activePath={activePath} titles={titles} />
        ))}
      </Accordion>
    </div>
  );
}

function SidebarNode({ node, activePath, titles }: { node: DocNode; activePath: string; titles?: Record<string, string> }) {
  if (node.type === "file") {
    const label = titles?.[node.path] || node.name;
    return (
      <Link
        href={`/docs/${toSlug(node.path)}`}
        className={cn(
          "block rounded px-2 py-1 text-sm hover:bg-muted/60",
          isActive(node.path, activePath) && "bg-muted font-medium"
        )}
      >
        {label}
      </Link>
    );
  }
  const hasChildren = node.children && node.children.length > 0;
  const id = node.path || node.name;
  return (
    <AccordionItem value={id} className="border-none">
      <AccordionTrigger className="px-2 text-sm">{node.name}</AccordionTrigger>
      <AccordionContent className="pl-2">
        <div className="space-y-1">
          {hasChildren ? (
            node.children!.map((child) => (
              <SidebarNode key={child.path} node={child} activePath={activePath} titles={titles} />
            ))
          ) : null}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function toSlug(p: string): string {
  return p.replace(/\.(md|mdx)$/i, "");
}

function isActive(itemPath: string, activePath: string): boolean {
  const a = itemPath.replace(/\.(md|mdx)$/i, "");
  const b = activePath.replace(/\.(md|mdx)$/i, "");
  return a === b;
}

function collectExpandedKeys(tree: DocNode[], activePath: string): string[] {
  const keys: string[] = [];
  const walk = (nodes: DocNode[], parentKey?: string): boolean => {
    let found = false;
    for (const n of nodes) {
      if (n.type === "file" && isActive(n.path, activePath)) {
        found = true;
        if (parentKey) keys.push(parentKey);
      } else if (n.type === "dir" && n.children) {
        const childFound = walk(n.children, n.path || n.name);
        if (childFound) {
          keys.push(n.path || n.name);
          found = true;
        }
      }
    }
    return found;
  };
  walk(tree);
  return Array.from(new Set(keys));
}

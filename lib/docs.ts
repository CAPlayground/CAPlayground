export type RepoItem = {
  name: string
  path: string
  type: "file" | "dir"
  download_url?: string | null
  url: string
};

export type DocNode = {
  name: string
  path: string
  type: "file" | "dir"
  children?: DocNode[]
};

export const OWNER = "CAPlayground";
export const REPO = "docs";

const CONTENTS_API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;
const TREES_API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`;

function githubHeaders(): HeadersInit | undefined {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "CAPlaygroundDocs/1.0",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  } else {
    return { Accept: "application/vnd.github.v3+json", "User-Agent": "CAPlaygroundDocs/1.0", "X-GitHub-Api-Version": "2022-11-28" };
  }
}

let DEFAULT_BRANCH: string = "main";
export async function getDefaultBranch(): Promise<string> {
  if (DEFAULT_BRANCH) return DEFAULT_BRANCH;
  const repoRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers: githubHeaders() });
  if (repoRes.ok) {
    const info = await repoRes.json();
    DEFAULT_BRANCH = info.default_branch || "main";
  } else {
    DEFAULT_BRANCH = "main";
  }
  return DEFAULT_BRANCH;
}

export async function toRepoAbsolutePath(rel: string): Promise<string> {
  await getBasePath();
  return withBase(rel);
}

export async function getRawUrlFor(rel: string): Promise<string> {
  const branch = await getDefaultBranch();
  const abs = await toRepoAbsolutePath(rel);
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/${encodePath(abs)}`;
}

export async function getRawBaseForDir(dirRel: string): Promise<string> {
  const branch = await getDefaultBranch();
  const abs = await toRepoAbsolutePath(dirRel);
  const base = abs.endsWith("/") ? abs : `${abs}/`;
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${branch}/${encodePath(base)}`;
}

let BASE_PATH: string | null = null;

async function getBasePath(): Promise<string> {
  if (BASE_PATH !== null) return BASE_PATH;
  const root = await listRepoPathRaw("");
  const hasDocsDir = root.some((i) => i.type === "dir" && i.name.toLowerCase() === "docs");
  BASE_PATH = hasDocsDir ? "docs" : "";
  return BASE_PATH;
}

function withBase(path: string): string {
  if (!path) return BASE_PATH || "";
  if (!BASE_PATH) return path;
  return BASE_PATH ? [BASE_PATH, path].filter(Boolean).join("/") : path;
}

async function listRepoPath(path: string = ""): Promise<RepoItem[]> {
  const base = await getBasePath();
  const raw = await listRepoPathRaw(withBase(path));
  return raw.map((i) => ({ ...i, path: toRelative(i.path, base) }));
}

async function listRepoPathRaw(path: string = ""): Promise<RepoItem[]> {
  const tree = await fetchRepoTree();
  const prefix = path ? (path.endsWith("/") ? path : `${path}/`) : "";
  const items = tree
    .filter((t) => t.path.startsWith(prefix) && t.path !== prefix && t.path.split("/").length === (prefix ? prefix.split("/").length : 0) + 1)
    .map((t) => ({
      name: t.path.split("/").pop() as string,
      path: t.path,
      type: t.type === "tree" ? "dir" : "file",
      download_url: undefined,
      url: "",
    } as RepoItem));
  return items;
}

export async function fetchMarkdown(slugSegments?: string[]): Promise<{ content: string; resolvedPath: string }>{
  const base = await getBasePath();
  const rawPath = (slugSegments && slugSegments.length > 0) ? slugSegments.join("/") : "";
  if (!rawPath) {
    const first = await getFirstDocPath();
    const target = first ?? await getDefaultDocForDir("");
    if (target) {
      const url = await getRawUrlFor(target);
      const res = await fetch(url, { headers: githubHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch markdown: ${target}`);
      return { content: await res.text(), resolvedPath: target };
    }
  }
  const tries = [] as string[];
  const pathNoExt = rawPath.replace(/\.(md|mdx)$/i, "");
  tries.push(`${pathNoExt}.md`);
  tries.push(`${pathNoExt}.mdx`);
  for (const rel of tries) {
    const url = await getRawUrlFor(rel);
    const res = await fetch(url, { headers: githubHeaders() });
    if (res.ok) {
      const text = await res.text();
      return { content: text, resolvedPath: rel };
    }
  }
  const dir = ensureDirPath(withBase(pathNoExt));
  const names = ["README.md", "index.md", "home.md", "README.mdx", "index.mdx", "home.mdx"];
  for (const name of names) {
    const rel = toRelative(`${dir}${name}`, base);
    const url = await getRawUrlFor(rel);
    const res = await fetch(url, { headers: githubHeaders() });
    if (res.ok) return { content: await res.text(), resolvedPath: rel };
  }
  const tree = await fetchRepoTree();
  const inDir = tree
    .filter((t) => t.type === "blob" && /\.(md|mdx)$/i.test(t.path) && t.path.startsWith(withBase(pathNoExt)))
    .map((t) => toRelative(t.path, base))
    .sort((a, b) => (isReadme(a) && !isReadme(b) ? 1 : !isReadme(a) && isReadme(b) ? -1 : a.localeCompare(b)));
  if (inDir.length) {
    const rel = inDir[0];
    const url = await getRawUrlFor(rel);
    const res = await fetch(url, { headers: githubHeaders() });
    if (res.ok) return { content: await res.text(), resolvedPath: rel };
  }
  throw new Error(`Failed to resolve path: ${rawPath || "/"}`);
}

function normalizeMarkdownPath(slugSegments?: string[]): string {
  let path = (slugSegments && slugSegments.length > 0) ? slugSegments.join("/") : "README.md";
  if (!path.endsWith(".md") && !path.endsWith(".mdx")) {
    path = path.replace(/\/$/, "");
    path = `${path}.md`;
  }
  return path;
}

function ensureDirPath(p: string): string {
  return p.endsWith("/") ? p : p.replace(/\.(md|mdx)$/i, "/");
}

export function isReadme(name: string): boolean {
  return /^readme\.(md|mdx)$/i.test(name);
}

export async function listDirectory(path: string = ""): Promise<RepoItem[]> {
  const items = await listRepoPath(path);
  return items.filter((i) => {
    if (i.type === "dir") return true;
    if (!/\.(md|mdx)$/i.test(i.name)) return false;
    if (isReadme(i.name)) return false;
    return true;
  });
}

function encodePath(p: string): string {
  return p.split("/").filter(Boolean).map(encodeURIComponent).join("/");
}

async function resolveDownloadUrl(path: string): Promise<string | null> {
  const url = `${CONTENTS_API_BASE}/${encodePath(path)}`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) return null;
  const data = await res.json();
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.download_url) return data.download_url as string;
  }
  return null;
}

function toRelative(p: string, base: string): string {
  if (!base) return p;
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return p.startsWith(prefix) ? p.slice(prefix.length) : p;
}

export async function getDocsTree(path: string = ""): Promise<DocNode[]> {
  const base = await getBasePath();
  const tree = await fetchRepoTree();
  const relTree = tree.map((t) => ({ ...t, path: toRelative(t.path, base) }));
  const prefix = path ? (path.endsWith("/") ? path : `${path}/`) : "";
  const dirsSet = new Set<string>();
  const files: DocNode[] = [];
  for (const t of relTree) {
    if (!t.path.startsWith(prefix)) continue;
    const rest = t.path.slice(prefix.length);
    if (!rest) continue;
    const parts = rest.split("/");
    if (parts.length === 1) {
      if (t.type === "blob" && /\.(md|mdx)$/i.test(parts[0]) && !isReadme(parts[0])) {
        files.push({ name: stripExt(parts[0]), path: t.path, type: "file" });
      } else if (t.type === "tree") {
        dirsSet.add(t.path);
      }
    } else {
      dirsSet.add(`${prefix}${parts[0]}`);
    }
  }
  const dirs = Array.from(dirsSet).sort();
  const dirNodes: DocNode[] = [];
  for (const d of dirs) {
    const name = d.split("/").pop() as string;
    const children = await getDocsTree(d);
    dirNodes.push({ name, path: d, type: "dir", children });
  }
  const uniqueFiles = dedupeBy(files, (x) => x.path).sort((a, b) => a.name.localeCompare(b.name));
  return [...dirNodes, ...uniqueFiles];
}

export async function getFirstDocPath(tree?: DocNode[] | null): Promise<string | null> {
  const t = tree ?? (await getDocsTree(""));
  for (const node of t) {
    if (node.type === "file" && !isReadme(node.path)) return toSlug(node.path);
    if (node.children && node.children.length) {
      const deep = await getFirstDocPath(node.children);
      if (deep) return deep;
    }
    const defaultPath = await getDefaultDocForDir(node.path);
    if (defaultPath) return toSlug(defaultPath);
  }
  return null;
}

export async function getDefaultDocForDir(dir: string): Promise<string | null> {
  const base = await getBasePath();
  const names = ["index.md", "home.md", "index.mdx", "home.mdx", "README.md", "README.mdx"];
  for (const name of names) {
    const rel = dir ? `${dir.replace(/\/$/, "")}/${name}` : name;
    const url = await getRawUrlFor(rel);
    const res = await fetch(url, { headers: githubHeaders() });
    if (res.ok) return rel;
  }
  const tree = await fetchRepoTree();
  const prefix = withBase(dir ? dir.replace(/\/$/, "") + "/" : "");
  const hit = tree
    .filter((t) => t.type === "blob" && /\.(md|mdx)$/i.test(t.path) && t.path.startsWith(prefix))
    .map((t) => toRelative(t.path, base))
    .sort((a, b) => (isReadme(a) && !isReadme(b) ? 1 : !isReadme(a) && isReadme(b) ? -1 : a.localeCompare(b)))[0];
  return hit || null;
}

function stripExt(n: string): string {
  return n.replace(/\.(md|mdx)$/i, "");
}

function toSlug(p: string): string {
  return p.replace(/\.(md|mdx)$/i, "");
}

type TreeItem = { path: string; type: "blob" | "tree" };
let TREE_CACHE: { items: TreeItem[]; ts: number } | null = null;
async function fetchRepoTree(): Promise<TreeItem[]> {
  const now = Date.now();
  if (TREE_CACHE && now - TREE_CACHE.ts < 5 * 60 * 1000) return TREE_CACHE.items;
  const branch = await getDefaultBranch();
  const url = `${TREES_API_BASE}/${encodeURIComponent(branch)}?recursive=1`;
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) return [];
  const json = await res.json();
  const items: TreeItem[] = Array.isArray(json.tree)
    ? json.tree.map((t: any) => ({ path: t.path as string, type: t.type === "tree" ? "tree" : "blob" }))
    : [];
  TREE_CACHE = { items, ts: now };
  return items;
}

function dedupeBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = key(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

export function extractTitle(markdown: string): string | null {
  const fm = /^---\n([\s\S]*?)\n---/m.exec(markdown);
  if (fm) {
    const titleMatch = /^title:\s*(.+)$/m.exec(fm[1]);
    if (titleMatch) return titleMatch[1].trim().replace(/^"|"$/g, "");
  }
  const h1 = /^#\s+(.+)$/m.exec(markdown);
  if (h1) return h1[1].trim();
  return null;
}

export async function getTitlesMap(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p) => /\.(md|mdx)$/i.test(p))));
  const out: Record<string, string> = {};
  const limit = 6;
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const rel = unique[idx];
      try {
        const url = await getRawUrlFor(rel);
        const res = await fetch(url, { headers: githubHeaders() });
        if (!res.ok) continue;
        const text = await res.text();
        const t = extractTitle(text);
        if (t) out[rel] = t;
      } catch {}
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, unique.length) }, () => worker()));
  return out;
}

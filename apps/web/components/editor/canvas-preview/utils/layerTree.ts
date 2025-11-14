import { AnyLayer } from "@/lib/ca/types";

export const findPathTo = (layers: AnyLayer[], id: string): AnyLayer[] | null => {
  const dfs = (arr: AnyLayer[], path: AnyLayer[]): AnyLayer[] | null => {
    for (const l of arr) {
      if (l.id === id) return [...path, l];
      if (l.children?.length) {
        const sub = dfs(l.children, [...path, l]);
        if (sub) return sub;
      }
    }
    return null;
  };
  return dfs(layers, []);
};

export const findSiblingsOf = (layers: AnyLayer[], id: string): { siblings: AnyLayer[]; index: number } | null => {
  const walk = (arr: AnyLayer[]): { siblings: AnyLayer[]; index: number } | null => {
    const idx = arr.findIndex((l) => l.id === id);
    if (idx >= 0) return { siblings: arr, index: idx };
    for (const l of arr) {
      if (l.children?.length) {
        const res = walk(l.children);
        if (res) return res;
      }
    }
    return null;
  };
  return walk(layers);
};

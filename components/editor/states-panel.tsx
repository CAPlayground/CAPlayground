"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEditor } from "./editor-context";

export function StatesPanel() {
  const { doc, setActiveState } = useEditor();
  const key = doc?.activeCA ?? 'floating';
  const current = doc?.docs?.[key];
  const states = current?.states ?? [];
  const active = current?.activeState || 'Base State';

  return (
    <Card className="p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">States</div>
      </div>

      <div className="text-sm rounded border bg-muted/30 divide-y overflow-hidden">
        <div className="px-2 py-2 font-medium select-none">Project States</div>
        <div className="max-h-64 overflow-auto">
          {/* base state */}
          <button
            type="button"
            className={`w-full text-left px-2 py-2 flex items-center justify-between select-none ${active === 'Base State' ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
            onClick={() => setActiveState('Base State')}
          >
            <div className="truncate flex-1">Base State</div>
          </button>
          {states.map((s) => (
            <button
              key={s}
              type="button"
              className={`w-full text-left px-2 py-2 flex items-center justify-between ${active === s ? 'bg-accent/30' : 'hover:bg-muted/50'}`}
              onClick={() => setActiveState(s as any)}
            >
              <div className="truncate flex-1">{s}</div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}

"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { KeyPath } from "@/lib/ca/types";

interface BulkAnimationInputProps {
  keyPath: KeyPath;
  currentValues: Array<{ x: number; y: number } | { w: number; h: number } | number>;
  onValuesChange: (values: Array<{ x: number; y: number } | { w: number; h: number } | number>) => void;
  disabled?: boolean;
}

export function BulkAnimationInput({ keyPath, currentValues, onValuesChange, disabled }: BulkAnimationInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      const textValues = currentValues.map(val => {
        if (typeof val === 'number') {
          return keyPath === 'opacity' ? Math.round(val * 100).toString() : Math.round(val).toString();
        } else if ('x' in val) {
          return `${Math.round(val.x)}, ${Math.round(val.y)}`;
        } else if ('w' in val) {
          return `${Math.round(val.w)}, ${Math.round(val.h)}`;
        }
        return '';
      }).join('\n');
      setBulkText(textValues);
    }
  }, [currentValues, keyPath]);

  const parseBulkText = useCallback((text: string) => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const values: any[] = [];
    let error: string | null = null;

    try {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (keyPath === 'position' || keyPath === 'bounds') {
          const parts = trimmed.split(',').map(p => p.trim());
          if (parts.length !== 2) {
            throw new Error(`Invalid format for ${keyPath}. Expected "x, y" or "w, h" format.`);
          }
          const [first, second] = parts.map(Number);
          if (!Number.isFinite(first) || !Number.isFinite(second)) {
            throw new Error(`Invalid numbers in line: ${trimmed}`);
          }
          if (keyPath === 'position') {
            values.push({ x: Math.round(first), y: Math.round(second) });
          } else {
            values.push({ w: Math.round(first), h: Math.round(second) });
          }
        } else {
          const num = Number(trimmed);
          if (!Number.isFinite(num)) {
            throw new Error(`Invalid number: ${trimmed}`);
          }
          if (keyPath === 'opacity') {
            const percentage = Math.max(0, Math.min(100, Math.round(num)));
            values.push(percentage / 100);
          } else {
            values.push(Math.round(num));
          }
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Invalid format';
    }

    return { values, error };
  }, [keyPath]);

  const handleBulkTextChange = useCallback((text: string) => {
    setBulkText(text);
    const { error } = parseBulkText(text);
    setParseError(error);
  }, [parseBulkText]);

  const applyBulkValues = useCallback(() => {
    const { values, error } = parseBulkText(bulkText);
    if (!error && values.length > 0) {
      onValuesChange(values);
      setIsOpen(false);
    }
  }, [bulkText, parseBulkText, onValuesChange]);

  const formatDescription = useMemo(() => {
    switch (keyPath) {
      case 'position':
        return 'Format: x, y (one per line)\nExample:\n100, 50\n200, 100\n300, 150';
      case 'bounds':
        return 'Format: width, height (one per line)\nExample:\n100, 50\n150, 75\n200, 100';
      case 'opacity':
        return 'Format: percentage (one per line)\nExample:\n0\n50\n100';
      default:
        return `Format: ${keyPath.includes('rotation') ? 'degrees' : 'number'} (one per line)\nExample:\n0\n45\n90`;
    }
  }, [keyPath]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          className="gap-1 h-7 px-2 text-xs"
        >
          <Zap className="w-3 h-3" />
          Bulk
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Bulk Animation Values - {keyPath}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Animation Values</Label>
            <div className="text-xs text-muted-foreground whitespace-pre-line">
              {formatDescription}
            </div>
            <Textarea
              value={bulkText}
              onChange={(e) => handleBulkTextChange(e.target.value)}
              placeholder={formatDescription.split('\n').slice(2).join('\n')}
              className="min-h-[200px] font-mono text-sm"
            />
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}
          </div>
          <div className="space-y-2">
            <Label>Import from File</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                id="bulk-file-input"
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const text = event.target?.result as string;
                      setBulkText(text);
                      handleBulkTextChange(text);
                    };
                    reader.readAsText(file);
                  } else {
                    setFileName("");
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <span className="text-xs text-muted-foreground truncate">
                {fileName || "No file chosen"}
              </span>
            </div>
          </div>

          <div className="flex justify-between">
            <Badge variant="secondary">
              {bulkText.trim().split('\n').filter(l => l.trim()).length} values
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={applyBulkValues} 
                disabled={!!parseError || !bulkText.trim()}
              >
                Apply Values
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

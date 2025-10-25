"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { type InspectorTabProps } from "../types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEditor } from "../../editor-context";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface EmitterTabProps extends InspectorTabProps {
  assets?: Record<string, { filename: string; dataURL: string }>;
  activeState?: string;
  addEmitterCellImage: (layerId: string, file: File) => Promise<void>;
}

export function EmitterTab({
  assets,
  selected,
  updateLayer,
  updateLayerTransient,
  activeState,
  getBuf,
  setBuf,
  fmt0,
  fmt2,
  clearBuf,
  addEmitterCellImage,
}: EmitterTabProps) {
  const { removeEmitterCell } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inState = !!activeState && activeState !== 'Base State';
  
  if (selected.type !== 'emitter') return null;

  return (
    <div className="grid grid-cols-2 gap-x-1.5 gap-y-3">
      <div className="space-y-1">
        <Label htmlFor="emitterPosition-x" className="text-xs">X</Label>
        <Input
          id="emitterPosition-x"
          type="number"
          step="1"
          value={getBuf('emitterPosition.x', fmt0((selected as any).emitterPosition.x || 0))}
          onChange={(e) => {
            setBuf('emitterPosition.x', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = Math.round(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterPosition: { ...selected.emitterPosition, x: num } as any } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? 0 : Math.round(Number(v));
            updateLayer(selected.id, { emitterPosition: { ...selected.emitterPosition, x: num } as any } as any);
            clearBuf('emitterPosition.x');
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="emitterPosition-y" className="text-xs">Y</Label>
        <Input
          id="emitterPosition-y"
          type="number"
          step="1"
          value={getBuf('emitterPosition.y', fmt0((selected as any).emitterPosition.y))}
          onChange={(e) => {
            setBuf('emitterPosition.y', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = Math.round(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterPosition: { ...selected.emitterPosition, y: num } as any } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? 0 : Math.round(Number(v));
            updateLayer(selected.id, { emitterPosition: { ...selected.emitterPosition, y: num } as any } as any);
            clearBuf('emitterPosition.y');
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="emitterSize-w" className="text-xs">Width</Label>
        <Input
          id="emitterSize-w"
          type="number"
          step="1"
          value={getBuf('emitterSize.w', fmt0((selected as any).emitterSize.w))}
          onChange={(e) => {
            setBuf('emitterSize.w', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = Math.round(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterSize: { ...selected.emitterSize, w: num } as any } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? 0 : Math.round(Number(v));
            updateLayer(selected.id, { emitterSize: { ...selected.emitterSize, w: num } as any } as any);
            clearBuf('emitterSize.w');
          }}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="emitterSize-h" className="text-xs">Height</Label>
        <Input
          id="emitterSize-h"
          type="number"
          step="1"
          value={getBuf('emitterSize.h', fmt0((selected as any).emitterSize.h))}
          onChange={(e) => {
            setBuf('emitterSize.h', e.target.value);
            const v = e.target.value.trim();
            if (v === "") return;
            const num = Math.round(Number(v));
            if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterSize: { ...selected.emitterSize, h: num } as any } as any);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
          onBlur={(e) => {
            const v = e.target.value.trim();
            const num = v === "" ? 0 : Math.round(Number(v));
            updateLayer(selected.id, { emitterSize: { ...selected.emitterSize, h: num } as any } as any);
            clearBuf('emitterSize.h');
          }}
        />
      </div>
      <div className="space-y-1 col-span-2">
        <Label>Render Mode</Label>
        <Select
          value={((selected as any)?.renderMode ?? 'unordered') as any}
          onValueChange={(v) => {
            const renderMode = v;
            const current = (selected as any)?.renderMode;
            if (current === renderMode) return;
            updateLayer(selected.id, { ...selected, renderMode } as any);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="Select render mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unordered">unordered</SelectItem>
            <SelectItem value="additive">additive</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Shape</Label>
        <Select
          value={((selected as any)?.emitterShape ?? 'point') as any}
          onValueChange={(v) => {
            const emitterShape = v;
            const current = (selected as any)?.emitterShape;
            if (current === emitterShape) return;
            updateLayer(selected.id, { ...selected, emitterShape } as any);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="Select emitter shape" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="point">point</SelectItem>
            <SelectItem value="line">line</SelectItem>
            <SelectItem value="rectangle">rectangle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Mode</Label>
        <Select
          value={((selected as any)?.emitterMode ?? 'volume') as any}
          onValueChange={(v) => {
            const current = (selected as any)?.emitterMode;
            if (current === v) return;
            updateLayer(selected.id, { ...selected, emitterMode: v } as any);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-full">
            <SelectValue placeholder="Select emitter mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="volume">volume</SelectItem>
            <SelectItem value="outline">outline</SelectItem>
            <SelectItem value="surface">surface</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <div className="flex items-center justify-between">
          <Label>Cells</Label>
          <Button
            type="button"
            variant="secondary"
            disabled={inState}
            onClick={() => fileInputRef.current?.click()}
          >
            + Add Cell
          </Button>
        </div>
        <Accordion
          type="multiple"
        >
          {selected.emitterCells?.map((cell, i) => (
            <AccordionItem key={cell.id} value={cell.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <img
                    src={assets?.[cell.id]?.dataURL}
                    alt={`Cell ${i}`}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                  Cell {i + 1}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-6 gap-3 items-end" key={i}>
                  <div className="col-span-3 space-y-1">
                    <Label>Birth Rate</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].birthRate', fmt2(cell.birthRate))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].birthRate', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, birthRate: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, birthRate: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].birthRate');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Lifetime</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].lifetime', fmt0(cell.lifetime))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].lifetime', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Math.round(Number(v));
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, lifetime: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Math.round(Number(v));
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, lifetime: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].lifetime');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Velocity</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].velocity', fmt0(cell.velocity))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].velocity', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Math.round(Number(v));
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, velocity: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Math.round(Number(v));
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, velocity: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].velocity');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Emission Range</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].emissionRange', fmt0(cell.emissionRange))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].emissionRange', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, emissionRange: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, emissionRange: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].emissionRange');
                      }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Scale</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].scale', fmt2(cell.scale))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].scale', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, scale: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, scale: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].scale');
                      }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Scale Range</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].scaleRange', fmt2(cell.scaleRange))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].scaleRange', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, scaleRange: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, scaleRange: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].scaleRange');
                      }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label>Scale Speed</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].scaleSpeed', fmt2(cell.scaleSpeed))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].scaleSpeed', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, scaleSpeed: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, scaleSpeed: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].scaleSpeed');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Alpha Range</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].alphaRange', fmt2(cell.alphaRange))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].alphaRange', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, alphaRange: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, alphaRange: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].alphaRange');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Alpha Speed</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].alphaSpeed', fmt2(cell.alphaSpeed))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].alphaSpeed', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, alphaSpeed: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, alphaSpeed: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].alphaSpeed');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Spin</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].spin', fmt0(cell.spin))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].spin', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, spin: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, spin: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].spin');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Spin Range</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].spinRange', fmt2(cell.spinRange))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].spinRange', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, spinRange: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, spinRange: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].spinRange');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>X Acceleration</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].xAcceleration', fmt0(cell.xAcceleration))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].xAcceleration', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, xAcceleration: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, xAcceleration: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].xAcceleration');
                      }}
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <Label>Y Acceleration</Label>
                    <Input
                      type="number"
                      step="1"
                      value={getBuf('emitterCells[' + i + '].yAcceleration', fmt0(cell.yAcceleration))}
                      disabled={inState}
                      onChange={(e) => {
                        setBuf('emitterCells[' + i + '].yAcceleration', e.target.value);
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const num = Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, yAcceleration: num } as any;
                        if (Number.isFinite(num)) updateLayerTransient(selected.id, { emitterCells: cells as any } as any);
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); e.preventDefault(); } }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        const num = v === "" ? 0 : Number(v);
                        const cells = selected.emitterCells?.slice() || [];
                        cells[i] = { ...cell, yAcceleration: num } as any;
                        updateLayer(
                          selected.id,
                          { emitterCells: cells as any } as any);
                        clearBuf('emitterCells[' + i + '].yAcceleration');
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={inState}
                    onClick={() => removeEmitterCell(selected.id, i)}
                    className="col-span-6 justify-self-center"
                  >
                    Remove
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp,image/svg+xml"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await addEmitterCellImage(selected.id, file);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      </div>

    </div>
  );
}

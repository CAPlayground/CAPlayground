import { GradientLayer } from "@/lib/ca/types";

interface GradientRendererProps {
  layer: GradientLayer;
}

export default function GradientRenderer({
  layer,
}: GradientRendererProps) {
  const gradType = layer.gradientType || 'axial';
  const startX = (layer.startPoint?.x ?? 0) * 100;
  const startY = (layer.startPoint?.y ?? 0) * 100;
  const endX = (layer.endPoint?.x ?? 1) * 100;
  const endY = (layer.endPoint?.y ?? 1) * 100;

  const colors = (layer.colors || []).map((c: any) => {
    const opacity = c.opacity ?? 1;
    const hex = c.color || '#000000';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }).join(', ');

  let background = '';

  const isSamePoint = Math.abs(startX - endX) < 0.01 && Math.abs(startY - endY) < 0.01;

  if (isSamePoint) {
    const firstColor = (layer.colors || [])[0];
    if (firstColor) {
      const opacity = firstColor.opacity ?? 1;
      const hex = firstColor.color || '#000000';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
  } else if (gradType === 'axial') {
    const dx = endX - startX;
    const dy = -(endY - startY);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    background = `linear-gradient(${angle}deg, ${colors})`;
  } else if (gradType === 'radial') {
    background = `radial-gradient(circle at ${startX}% ${100 - startY}%, ${colors})`;
  } else if (gradType === 'conic') {
    const dx = endX - startX;
    const dy = -(endY - startY);
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    background = `conic-gradient(from ${angle}rad at ${startX}% ${100 - startY}%, ${colors})`;
  }

  return (
    <div
      style={{
        background,
        width: "100%",
        height: "100%",
        borderRadius: layer.cornerRadius,
      }}
    />
  );
}

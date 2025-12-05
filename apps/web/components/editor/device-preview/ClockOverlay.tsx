interface ClockOverlayProps {
  docWidth: number;
  docHeight: number;
  clockDepthEffect: boolean;
}

export function ClockOverlay({ docWidth, docHeight, clockDepthEffect }: ClockOverlayProps) {
  const targetRatio = 1170 / 2532;
  const currentRatio = docWidth / docHeight;
  const isMatchingAspectRatio = Math.abs(currentRatio - targetRatio) < 0.01;

  if (!isMatchingAspectRatio) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'url(/clock.png)',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: clockDepthEffect ? 50 : 500,
      }}
    />
  );
}

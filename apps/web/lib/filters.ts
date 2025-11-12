export type SupportedFilterTypes = 'gaussianBlur' | 'colorContrast' | 'colorHueRotate' | 'colorInvert' | 'colorSaturate' | 'CISepiaTone';

export type Filter = {
  name: string;
  type: SupportedFilterTypes;
  value: number;
  enabled?: boolean;
  valueLabel?: string;
};

export const supportedFilters: Record<SupportedFilterTypes, Filter> = {
  gaussianBlur: {
    name: 'Gaussian Blur',
    type: 'gaussianBlur',
    enabled: true,
    value: 10,
    valueLabel: 'Radius',
  },
  colorContrast: {
    name: 'Contrast',
    type: 'colorContrast',
    value: 1,
    valueLabel: 'Amount',
    enabled: true,
  },
  colorHueRotate: {
    name: 'Hue Rotate',
    type: 'colorHueRotate',
    value: 0,
    valueLabel: 'Angle',
    enabled: true,
  },
  colorInvert: {
    name: 'Invert',
    type: 'colorInvert',
    value: 0,
    enabled: true,
  },
  colorSaturate: {
    name: 'Saturate',
    type: 'colorSaturate',
    value: 0,
    valueLabel: 'Amount',
    enabled: true,
  },
  CISepiaTone: {
    name: 'Sepia',
    type: 'CISepiaTone',
    value: 1,
    valueLabel: 'Intensity',
    enabled: true,
  },
};

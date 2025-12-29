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
    name: '高斯模糊',
    type: 'gaussianBlur',
    enabled: true,
    value: 10,
    valueLabel: '半径',
  },
  colorContrast: {
    name: '对比度',
    type: 'colorContrast',
    value: 1,
    valueLabel: '数量',
    enabled: true,
  },
  colorHueRotate: {
    name: '色相旋转',
    type: 'colorHueRotate',
    value: 0,
    valueLabel: '角度',
    enabled: true,
  },
  colorInvert: {
    name: '反相',
    type: 'colorInvert',
    value: 0,
    enabled: true,
  },
  colorSaturate: {
    name: '饱和度',
    type: 'colorSaturate',
    value: 0,
    valueLabel: '数量',
    enabled: true,
  },
  CISepiaTone: {
    name: '棕褐色调',
    type: 'CISepiaTone',
    value: 1,
    valueLabel: '强度',
    enabled: true,
  },
};

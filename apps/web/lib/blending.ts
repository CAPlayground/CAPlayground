type BlendMode = {
  id: string;
  css: React.CSSProperties['mixBlendMode'];
  name: string;
};

export const blendModes: Record<string, BlendMode> = {
  normalBlendMode: {
    id: 'normalBlendMode',
    css:'normal',
    name:'正常',
  },
  colorBlendMode: {
    id: 'colorBlendMode',
    css:'color',
    name:'颜色',
  },
  colorBurnBlendMode: {
    id: 'colorBurnBlendMode',
    css:'color-burn',
    name:'颜色加深',
  },
  colorDodgeBlendMode: {
    id: 'colorDodgeBlendMode',
    css:'color-dodge',
    name:'颜色减淡',
  },
  darkenBlendMode: {
    id: 'darkenBlendMode',
    css:'darken',
    name:'变暗',
  },
  differenceBlendMode: {
    id: 'differenceBlendMode',
    css:'difference',
    name:'差值',
  },
  exclusionBlendMode: {
    id: 'exclusionBlendMode',
    css:'exclusion',
    name:'排除',
  },
  hueBlendMode: {
    id: 'hueBlendMode',
    css:'hue',
    name:'色相',
  },
  lightenBlendMode: {
    id: 'lightenBlendMode',
    css:'lighten',
    name:'变亮',
  },
  luminosityBlendMode: {
    id: 'luminosityBlendMode',
    css:'luminosity',
    name:'明度',
  },
  multiplyBlendMode: {
    id: 'multiplyBlendMode',
    css:'multiply',
    name:'正片叠底',
  },
  overlayBlendMode: {
    id: 'overlayBlendMode',
    css:'overlay',
    name:'叠加',
  },
  saturationBlendMode: {
    id: 'saturationBlendMode',
    css:'saturation',
    name:'饱和度',
  },
  screenBlendMode: {
    id: 'screenBlendMode',
    css:'screen',
    name:'滤色',
  },
};

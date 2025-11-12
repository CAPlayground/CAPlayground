type BlendMode = {
  id: string;
  css: React.CSSProperties['mixBlendMode'];
  name: string;
};

export const blendModes: Record<string, BlendMode> = {
  normalBlendMode: {
    id: 'normalBlendMode',
    css:'normal',
    name:'Normal',
  },
  colorBlendMode: {
    id: 'colorBlendMode',
    css:'color',
    name:'Color',
  },
  colorBurnBlendMode: {
    id: 'colorBurnBlendMode',
    css:'color-burn',
    name:'Color Burn',
  },
  colorDodgeBlendMode: {
    id: 'colorDodgeBlendMode',
    css:'color-dodge',
    name:'Color Dodge',
  },
  darkenBlendMode: {
    id: 'darkenBlendMode',
    css:'darken',
    name:'Darken',
  },
  differenceBlendMode: {
    id: 'differenceBlendMode',
    css:'difference',
    name:'Difference',
  },
  exclusionBlendMode: {
    id: 'exclusionBlendMode',
    css:'exclusion',
    name:'Exclusion',
  },
  hueBlendMode: {
    id: 'hueBlendMode',
    css:'hue',
    name:'Hue',
  },
  lightenBlendMode: {
    id: 'lightenBlendMode',
    css:'lighten',
    name:'Lighten',
  },
  luminosityBlendMode: {
    id: 'luminosityBlendMode',
    css:'luminosity',
    name:'Luminosity',
  },
  multiplyBlendMode: {
    id: 'multiplyBlendMode',
    css:'multiply',
    name:'Multiply',
  },
  overlayBlendMode: {
    id: 'overlayBlendMode',
    css:'overlay',
    name:'Overlay',
  },
  saturationBlendMode: {
    id: 'saturationBlendMode',
    css:'saturation',
    name:'Saturation',
  },
  screenBlendMode: {
    id: 'screenBlendMode',
    css:'screen',
    name:'Screen',
  },
};

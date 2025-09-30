export type Vec2 = { x: number; y: number };
export type Size = { w: number; h: number };

export type CAProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  background?: string;
  // Flip Geometry for the root layer (0 = bottom-left origin, 1 = top-left origin)
  geometryFlipped?: 0 | 1;
};

export type LayerBase = {
  id: string;
  name: string;
  position: Vec2;
  size: Size;
  opacity?: number;
  rotation?: number;
  rotationX?: number;
  rotationY?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  visible?: boolean;
  // Anchor point in unit coordinates (0..1). Default is { x: 0.5, y: 0.5 }.
  anchorPoint?: { x: number; y: number };
  // Flip Geometry for this layer and its sublayers (0 = bottom-left origin, 1 = top-left origin)
  geometryFlipped?: 0 | 1;
  animations?: {
    enabled?: boolean;
    keyPath?: 'position' | 'position.x' | 'position.y' | 'transform.rotation.x' | 'transform.rotation.y' | 'transform.rotation.z';
    autoreverses?: 0 | 1;
    values?: Array<Vec2 | number>;
    durationSeconds?: number;
    infinite?: 0 | 1;
    repeatDurationSeconds?: number;
  };
};

export type ImageLayer = LayerBase & {
  type: 'image';
  src: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
};

export type TextLayer = LayerBase & {
  type: 'text';
  text: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  // Horizontal alignment. Backwards-compatible with prior implementation.
  align?: 'left' | 'center' | 'right' | 'justified';
  // When 1, text is wrapped within the bounds width. When 0, no wrapping.
  wrapped?: 0 | 1;
};

export type ShapeKind = 'rect' | 'circle' | 'rounded-rect';
export type ShapeLayer = LayerBase & {
  type: 'shape';
  shape: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
};

export type GroupLayer = LayerBase & {
  type: 'group';
  children: AnyLayer[];
};

export type VideoLayer = LayerBase & {
  type: 'video';
  frameCount: number;
  fps?: number;
  duration?: number;
  autoReverses?: boolean;
  framePrefix?: string;
  frameExtension?: string;
};

export type AnyLayer = ImageLayer | TextLayer | ShapeLayer | GroupLayer | VideoLayer;

export type CAAsset = {
  path: string;
  data: Blob | ArrayBuffer | string;
};

export type CAStateOverride = {
  targetId: string;
  keyPath: string;
  value: string | number;
};

export type CAStateOverrides = Record<string, CAStateOverride[]>;

export type CAStateTransitionAnim = {
  type: 'CASpringAnimation' | string;
  damping?: number;
  mass?: number;
  stiffness?: number;
  velocity?: number;
  duration?: number;
  fillMode?: string;
  keyPath?: string;
};

export type CAStateTransitionElement = {
  targetId: string;
  keyPath: string;
  animation?: CAStateTransitionAnim;
};
export type CAStateTransition = {
  fromState: string;
  toState: string;
  elements: CAStateTransitionElement[];
};

export type CAStateTransitions = CAStateTransition[];

export type CAProjectBundle = {
  project: CAProject;
  root: AnyLayer;
  assets?: Record<string, CAAsset>;
  states?: string[];
  stateOverrides?: CAStateOverrides;
  stateTransitions?: CAStateTransitions;
};

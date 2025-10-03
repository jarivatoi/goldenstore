// TypeScript declarations for draggable.js
export interface DraggableBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}

export interface DraggableVars {
  type?: string;
  bounds?: DraggableBounds | Element | string;
  edgeResistance?: number;
  dragResistance?: number;
  throwResistance?: number;
  overshootTolerance?: number;
  allowEventDefault?: boolean;
  allowNativeTouchScrolling?: boolean;
  lockAxis?: boolean;
  force3D?: boolean;
  minimumMovement?: number;
  autoScroll?: number | boolean;
  scrollSensitivity?: number;
  inertia?: boolean | any;
  maxDuration?: number;
  minDuration?: number;
  onDrag?: (this: Draggable) => void;
  onDragStart?: (this: Draggable) => void;
  onDragEnd?: (this: Draggable) => void;
  onThrowUpdate?: (this: Draggable) => void;
  onThrowComplete?: (this: Draggable) => void;
  onClick?: (this: Draggable) => void;
  onPress?: (this: Draggable) => void;
  onRelease?: (this: Draggable) => void;
  trigger?: Element | Element[] | string;
  handle?: Element | Element[] | string;
  cursor?: string;
  zIndexBoost?: boolean;
  callbackScope?: any;
  snap?: any;
}

export interface DraggableInstance {
  x: number;
  y: number;
  rotation: number;
  isDragging: boolean;
  isPressed: boolean;
  isThrowing: boolean;
  target: Element;
  vars: DraggableVars;
  maxX: number;
  minX: number;
  maxY: number;
  minY: number;
  deltaX: number;
  deltaY: number;
  pointerX: number;
  pointerY: number;
  pointerEvent: Event;
  
  // Methods
  kill(): void;
  disable(): DraggableInstance;
  enable(): DraggableInstance;
  enabled(value?: boolean): boolean | DraggableInstance;
  endDrag(): DraggableInstance;
  startDrag(event?: Event): DraggableInstance;
  update(applyBounds?: boolean): DraggableInstance;
  hitTest(target: Element | string, threshold?: string | number): boolean;
  applyBounds(bounds?: any): DraggableInstance;
  getDirection(from?: string): string;
  addEventListener(type: string, callback: Function): void;
  removeEventListener(type: string, callback: Function): void;
  dispatchEvent(type: string): boolean;
}

export interface DraggableStatic {
  new (target: Element | Element[] | string, vars?: DraggableVars): DraggableInstance;
  create(target: Element | Element[] | string, vars?: DraggableVars): DraggableInstance[];
  get(target: Element | string): DraggableInstance | null;
  hitTest(obj1: any, obj2: any, threshold?: string | number): boolean;
  version: string;
}

export const Draggable: DraggableStatic;
export default Draggable;
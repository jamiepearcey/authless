declare module '@declarative-gridstack/react' {
  import { ReactNode } from 'react';

  export interface GridstackItemProps {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    children?: ReactNode;
    className?: string;
    noResize?: boolean;
    noMove?: boolean;
    locked?: boolean;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  }

  export interface GridstackContainerProps {
    items: Array<{
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      content?: string;
    }>;
    setLayout: (layout: any[]) => void;
    column?: number;
    margin?: number;
    cellHeight?: number | string;
    animate?: boolean;
    draggable?: {
      handle?: string;
      appendTo?: string;
      scroll?: boolean;
    };
    resizable?: {
      handles?: string;
    };
    children?: ReactNode;
  }

  export const GridstackContainer: React.FC<GridstackContainerProps>;
  export const GridstackItem: React.FC<GridstackItemProps>;
}

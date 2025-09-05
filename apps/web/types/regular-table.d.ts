declare module 'regular-table' {
  interface RegularTableDataModel {
    numRows: () => number;
    numColumns: () => number;
    columnHeader: (x: number) => string;
    data: (x: number, y: number) => any;
  }

  interface ScrollDimensions {
    width: number;
    height: number;
  }

  interface RegularTableElement extends HTMLTableElement {
    setDataModel: (model: RegularTableDataModel) => void;
    setDataListener?: (listener: (x0: number, y0: number, x1: number, y1: number) => Promise<any>) => void;
    setScrollDimensions: (dimensions: ScrollDimensions) => void;
    draw: () => void;
    scrollToCell: (x: number, y: number) => void;
  }

  declare global {
    namespace JSX {
      interface IntrinsicElements {
        'regular-table': React.DetailedHTMLProps<React.HTMLAttributes<RegularTableElement>, RegularTableElement>;
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'regular-table': RegularTableElement;
  }
}

export {};
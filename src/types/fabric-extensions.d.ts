// Fabric.js 类型扩展
// 用于解决 TypeScript 类型定义不完整的问题

declare module 'fabric' {
  namespace fabric {
    interface Canvas {
      // Fabric.js 特有的底层 canvas 元素
      lowerCanvasEl?: HTMLCanvasElement;
      upperCanvasEl?: HTMLCanvasElement;
      
      // 扩展的导出方法
      toDataURL(options?: {
        format?: string;
        quality?: number;
        multiplier?: number;
        enableRetinaScaling?: boolean;
        left?: number;
        top?: number;
        width?: number;
        height?: number;
      }): string;
    }
    
    interface Object {
      // 自定义属性标记
      isMosaic?: boolean;
      isNumber?: boolean;
    }
    
    interface IText {
      // 序号文本的特殊标记
      isNumber?: boolean;
    }
    
    interface Group {
      // 马赛克组的特殊标记
      isMosaic?: boolean;
    }
    
    interface Rect {
      // 矩形的特殊标记
      isMosaic?: boolean;
    }
  }
}

// 全局类型扩展
declare global {
  interface Window {
    // 全局绘图工具实例
    activePaintingTools?: any;
  }
  
  // HTMLCanvasElement 的 toBlob 方法类型确保
  interface HTMLCanvasElement {
    toBlob(
      callback: (blob: Blob | null) => void,
      type?: string,
      quality?: number
    ): void;
  }
}

export {};

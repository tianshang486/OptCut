import { fabric } from 'fabric'
import { listen } from "@tauri-apps/api/event"

export class PaintingTools {
  private canvas: fabric.Canvas
  private isDrawing: boolean = false
  private startX: number = 0
  private startY: number = 0
  private currentShape: any = null
  private shapes: any[] = []
  private hoveredShape: any = null
  private store: any = {
    currentTool: null,  // 初始设置为 null，表示没有选择工具
    currentColor: '#FF0000'
  }
  private boundHandleKeyDown: (e: KeyboardEvent) => void = () => {}
  // @ts-ignore
  private currentTool: string = 'rect'
// 用于画笔
  private currentText: any = null // 用于文本输入

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas
    // 禁用默认选中样式
    canvas.selection = false
    canvas.hoverCursor = 'default'
    console.log('PaintingTools 初始化')
    console.log('初始工具: rect')

    // 绑定键盘事件处理函数
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    document.addEventListener('keydown', this.boundHandleKeyDown)

    // 监听工具切换事件
    listen('toolbar-tool-change', async (event: any) => {
      const {tool} = event.payload
      this.store.currentTool = tool
      this.currentTool = tool
      
      // 切换工具时的处理
      if(tool === 'brush') {
        this.canvas.isDrawingMode = true
        this.canvas.freeDrawingBrush.color = this.store.currentColor
        this.canvas.freeDrawingBrush.width = 2
        
        // 监听路径创建完成事件
        this.canvas.on('path:created', (e: any) => {
          const path = e.path
          // 禁用控制框
          path.set({
            selectable: true,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true
          })
          // 将路径添加到 shapes 数组
          this.shapes.push(path)
        })
      } else {
        this.canvas.isDrawingMode = false
        // 移除路径创建事件监听
        this.canvas.off('path:created')
      }
    })

    // 监听颜色变化事件
    listen('toolbar-color-change', async (event: any) => {
      const { color } = event.payload
      this.setColor(color)
      console.log('颜色变化:', color)
    })

    this.initializeEvents()
    
    // 将实例存储在全局对象中，方便在其他地方访问
    // @ts-ignore
    window.activePaintingTools = this;
  }

  // 导出混合后的画布内容
  public exportCanvas() {
    try {
      // 创建一个新的canvas元素
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) {
        console.error('无法获取导出画布的2D上下文');
        return null;
      }
      
      // 设置导出画布尺寸与当前画布相同
      const canvasElement = this.canvas.getElement();
      exportCanvas.width = canvasElement.width;
      exportCanvas.height = canvasElement.height;
      
      // 创建临时图像
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // 返回一个Promise以处理异步绘制
      return new Promise((resolve) => {
        // 先绘制原始画布内容
        img.onload = () => {
          // 绘制图像
          ctx.drawImage(img, 0, 0);
          
          // 获取所有对象并按顺序绘制
          this.canvas.forEachObject((obj) => {
            if (!(obj instanceof fabric.Image)) { // 跳过背景图像
              // 计算对象的边界框
              const bound = obj.getBoundingRect();
              
              // 绘制对象
              ctx.save();
              ctx.translate(bound.left, bound.top);
              if (obj.angle) {
                ctx.rotate(obj.angle * Math.PI / 180);
              }
              
              // 根据对象类型设置样式
              if (obj instanceof fabric.Line) {
                ctx.strokeStyle = String(obj.stroke || '#000');
                ctx.lineWidth = obj.strokeWidth || 1;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(bound.width, bound.height);
                ctx.stroke();
              } else if (obj instanceof fabric.Rect) {
                ctx.strokeStyle = String(obj.stroke || '#000');
                ctx.lineWidth = obj.strokeWidth || 1;
                ctx.strokeRect(0, 0, bound.width, bound.height);
              } else if (obj instanceof fabric.IText) {
                ctx.fillStyle = String(obj.fill || '#000');
                ctx.font = `${obj.fontSize}px ${obj.fontFamily || 'Arial'}`;
                ctx.fillText(obj.text || '', 0, 0);
              }
              
              ctx.restore();
            }
          });
          
          // 导出最终画布为数据URL
          resolve(exportCanvas.toDataURL('image/png'));
        };
        
        // 设置图像源为当前画布的背景图像URL
        img.src = this.canvas.toDataURL({
          format: 'png',
          quality: 1,
          withoutTransform: true,
          withoutShadow: true
        });
      });
    } catch (e) {
      console.error('导出画布失败:', e);
      return null;
    }
  }

  // 获取是否有绘图内容
  public hasDrawings() {
    return this.shapes.length > 0;
  }

  // 初始化鼠标事件
  private initializeEvents() {
    this.canvas.on('mouse:down', (e) => this.onMouseDown(e))
    this.canvas.on('mouse:move', (e) => this.onMouseMove(e))
    this.canvas.on('mouse:up', () => this.onMouseUp())
    // 添加鼠标悬停事件
    this.canvas.on('mouse:over', (e) => this.onMouseOver(e))
    this.canvas.on('mouse:out', (e) => this.onMouseOut(e))
    this.canvas.on('mouse:wheel', (e) => this.onMouseWheel(e))  // 添加滚轮事件
  }

  // 鼠标悬停事件处理
  private onMouseOver(e: any) {
    if (e.target && !this.isDrawing && !(e.target instanceof fabric.Image)) {
      this.hoveredShape = e.target
      if (e.target instanceof fabric.Path) {
        e.target.set({
          shadow: new fabric.Shadow({
            color: 'rgba(0,123,255,0.3)',
            blur: 10,
            offsetX: 0,
            offsetY: 0
          }),
          opacity: 0.8
        })
      } else if (e.target instanceof fabric.IText) {
        // 文本特殊处理
        if (!e.target.isEditing) {
          e.target.set({
            shadow: new fabric.Shadow({
              color: 'rgba(0,123,255,0.3)',
              blur: 10,
              offsetX: 0,
              offsetY: 0
            })
          })
        }
      } else {
        e.target.set({
          shadow: new fabric.Shadow({
            color: 'rgba(0,123,255,0.3)',
            blur: 10,
            offsetX: 0,
            offsetY: 0
          }),
          stroke: '#0d6efd',
          strokeWidth: 2.5
        })
      }
      this.canvas.renderAll()
    }
  }

  // 鼠标移出事件处理
  private onMouseOut(e: any) {
    if (e.target && !(e.target instanceof fabric.Image)) {
      if (e.target instanceof fabric.Path) {
        e.target.set({
          shadow: null,
          opacity: 1
        })
      } else if (e.target instanceof fabric.IText) {
        if (!e.target.isEditing) {
          e.target.set({
            shadow: null
          })
        }
      } else {
        e.target.set({
          shadow: null,
          stroke: 'red',
          strokeWidth: 2
        })
      }
      this.canvas.renderAll()
    }
    this.hoveredShape = null
  }

  // 处理键盘事件
  private handleKeyDown(e: KeyboardEvent) {
    if ((e.key === 'Backspace' || e.key === 'Delete') && this.hoveredShape) {
      // 删除当前悬停的图形
      this.removeShape(this.hoveredShape)
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      this.undo()
    }
  }

  // 删除指定图形
  private removeShape(shape: any) {
    const index = this.shapes.indexOf(shape)
    if (index > -1) {
      this.shapes.splice(index, 1)
      this.canvas.remove(shape)
      this.hoveredShape = null  // 清除 hoveredShape 引用
      this.canvas.renderAll()
    }
  }

  // 删除最后创建的图形
  private removeLastShape() {
    if (this.shapes.length > 0) {
      const lastShape = this.shapes.pop()
      if (Array.isArray(lastShape)) {
        // 如果是箭头这样的组合图形
        lastShape.forEach(shape => {
          this.canvas.remove(shape)
        })
      } else {
        this.canvas.remove(lastShape)
      }
      this.canvas.renderAll()
    }
  }

  // 撤销上一步操作
  private undo() {
    this.removeLastShape()
  }

  private onMouseDown(e: any) {
    if (!this.store.currentTool) return

    const pointer = this.canvas.getPointer(e.e)
    this.isDrawing = true
    this.startX = pointer.x
    this.startY = pointer.y

    switch (this.store.currentTool) {
      case 'rect':
        this.currentShape = new fabric.Rect({
          left: this.startX,
          top: this.startY,
          width: 0,
          height: 0,
          stroke: this.store.currentColor,
          strokeWidth: 2,
          fill: 'transparent'
        })
        break
      case 'line':
        this.currentShape = new fabric.Line([this.startX, this.startY, this.startX, this.startY], {
          stroke: this.store.currentColor,
          strokeWidth: 2
        })
        break
      case 'arrow':
        this.currentShape = this.createArrowFromSVG({
          x1: this.startX,
          y1: this.startY,
          x2: this.startX,
          y2: this.startY,
          stroke: this.store.currentColor
        })
        break
      case 'text':
        this.currentText = new fabric.IText('', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: this.store.currentColor,
          editable: true,
          cursorWidth: 1,
          cursorDuration: 600,
          cursorColor: this.store.currentColor,
          // hideDefaultStyle: false,
          padding: 7,
          selectable: true,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true
        })
        this.canvas.add(this.currentText)
        this.currentText.enterEditing()
        this.canvas.requestRenderAll()
        // 将文本对象添加到 shapes 数组中
        this.shapes.push(this.currentText)
        break
    }

    if (this.currentShape) {
      this.canvas.add(this.currentShape)
      this.canvas.renderAll()
    }
  }

  // 判断点是否在矩形内
  private isPointInShape(pointer: { x: number, y: number }, shape: any): boolean {
    if (shape instanceof fabric.Group) {
      // 处理箭头组
      const line = shape.getObjects()[0] as fabric.Line;  // 获取线条
      const arrowHead = shape.getObjects()[1] as fabric.Triangle;  // 获取箭头头部
      
      // 转换指针坐标到组的本地坐标系
      const groupPoint = shape.toLocalPoint(
        new fabric.Point(pointer.x, pointer.y), 
        'left', 
        'center'
      );
      
      // 检查线条部分
      const tolerance = 8;
      const x1 = line.x1 || 0;
      const y1 = line.y1 || 0;
      const x2 = line.x2 || 0;
      const y2 = line.y2 || 0;

      // 计算点到线段的距离
      const A = groupPoint.x - x1;
      const B = groupPoint.y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;

      if (lenSq !== 0) {
        param = dot / lenSq;
      }

      let xx, yy;
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      const dx = groupPoint.x - xx;
      const dy = groupPoint.y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 检查箭头头部
      const headBoundingRect = arrowHead.getBoundingRect();
      const inHead = groupPoint.x >= headBoundingRect.left &&
                    groupPoint.x <= headBoundingRect.left + headBoundingRect.width &&
                    groupPoint.y >= headBoundingRect.top &&
                    groupPoint.y <= headBoundingRect.top + headBoundingRect.height;

      // 如果点在线条容差范围内或在箭头头部内，则返回true
      return distance <= tolerance || inHead;
    }
    
    // 保持原有的其他形状检测逻辑
    if (shape instanceof fabric.Rect) {
      // 矩形检测
      const shapeLeft = shape.left || 0
      const shapeTop = shape.top || 0
      const shapeWidth = shape.width || 0
      const shapeHeight = shape.height || 0
      
      const shapeRight = shapeLeft + shapeWidth
      const shapeBottom = shapeTop + shapeHeight

      return (
        pointer.x >= shapeLeft &&
        pointer.x <= shapeRight &&
        pointer.y >= shapeTop &&
        pointer.y <= shapeBottom
      )
    } else if (shape instanceof fabric.Line) {
      // 增加线条的容差
      const tolerance = 8
      const x1 = shape.x1 || 0
      const y1 = shape.y1 || 0
      const x2 = shape.x2 || 0
      const y2 = shape.y2 || 0

      // 计算点到线段的距离
      const A = pointer.x - x1
      const B = pointer.y - y1
      const C = x2 - x1
      const D = y2 - y1
      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1

      if (lenSq !== 0) {
        param = dot / lenSq
      }

      let xx, yy
      if (param < 0) {
        xx = x1
        yy = y1
      } else if (param > 1) {
        xx = x2
        yy = y2
      } else {
        xx = x1 + param * C
        yy = y1 + param * D
      }

      const dx = pointer.x - xx
      const dy = pointer.y - yy
      const distance = Math.sqrt(dx * dx + dy * dy)

      return distance <= tolerance
    } else if (shape instanceof fabric.Path) {
      // 使用 Fabric.js 内置的点击检测方法
      return shape.containsPoint(new fabric.Point(pointer.x, pointer.y))
    } else if (shape instanceof fabric.IText) {
      // 文本框检测
      const shapeLeft = shape.left || 0
      const shapeTop = shape.top || 0
      const shapeWidth = shape.width || 0
      const shapeHeight = shape.height || 0
      
      return (
        pointer.x >= shapeLeft &&
        pointer.x <= shapeLeft + shapeWidth &&
        pointer.y >= shapeTop &&
        pointer.y <= shapeTop + shapeHeight
      )
    }
    return false
  }

  // 修改鼠标移动事件
  private onMouseMove(e: any) {
    if (this.isDrawing && this.currentShape) {
      const pointer = this.canvas.getPointer(e.e)

      // 使用 store 中的工具类型
      switch (this.store.currentTool) {
        case 'rect':
          const width = Math.abs(pointer.x - this.startX)
          const height = Math.abs(pointer.y - this.startY)
          this.currentShape.set({
            left: Math.min(this.startX, pointer.x),
            top: Math.min(this.startY, pointer.y),
            width: width,
            height: height
          })
          break
        case 'line':
          this.currentShape.set({
            x2: pointer.x,
            y2: pointer.y
          })
          break
        case 'arrow':
          if (this.currentShape instanceof fabric.Group) {
            const line = this.currentShape.getObjects()[0] as fabric.Line;
            const arrowHead = this.currentShape.getObjects()[1] as fabric.Triangle;
            
            const dx = pointer.x - this.startX;
            const dy = pointer.y - this.startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            line.set({
              x2: length,
              y2: 0
            });

            arrowHead.set({
              left: length,
              top: 0,
              angle: 90
            });

            this.currentShape.set({
              angle: angle * 180 / Math.PI
            });

            this.currentShape.setCoords();
          }
          break
      }
      this.canvas.renderAll()
    } else {
      const pointer = this.canvas.getPointer(e.e)
      let foundShape = null

      // 从后向前遍历（从上层到下层）
      for (let i = this.shapes.length - 1; i >= 0; i--) {
        const shape = this.shapes[i]
        if (this.isPointInShape(pointer, shape)) {
          foundShape = shape
          break
        }
      }

      // 处理浮状态变化
      if (foundShape !== this.hoveredShape) {
        // 清除之前的悬停效果
        if (this.hoveredShape) {
          this.hoveredShape.set({
            shadow: null
          })
        }

        // 设置新的悬浮效果
        if (foundShape) {
          foundShape.set({
            shadow: new fabric.Shadow({
              color: 'rgba(33, 150, 243, 0.9)',  // 蓝色光圈，高不透明度
              blur: 12,                          // 增加模糊半径
              offsetX: 0,
              offsetY: 0
            })
          })
          this.canvas.defaultCursor = 'pointer'
        } else {
          if (this.hoveredShape) {
            this.hoveredShape.set({
              shadow: null
            })
          }
          this.canvas.defaultCursor = 'default'
        }

        this.hoveredShape = foundShape
        this.canvas.renderAll()
      }
    }
  }

  private onMouseUp() {
    if (this.currentShape) {
      this.shapes.push(this.currentShape)
      this.store.canDraw = false  // 画完个图形后禁止继续画
    }
    this.isDrawing = false
    this.currentShape = null
  }

  // 创建矩形
  createRect(options: {
    left: number
    top: number
    width: number
    height: number
    stroke?: string
    strokeWidth?: number
  }) {
    const rect = new fabric.Rect({
      left: options.left,
      top: options.top,
      width: options.width,
      height: options.height,
      fill: 'transparent',
      stroke: options.stroke || 'red',
      strokeWidth: options.strokeWidth || 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'circle',
      transparentCorners: false
    })
    this.canvas.add(rect)
    return rect
  }

  // 创建直线
  createLine(options: {
    x1: number
    y1: number
    x2: number
    y2: number
    stroke?: string
    strokeWidth?: number
  }) {
    const line = new fabric.Line([options.x1, options.y1, options.x2, options.y2], {
      stroke: options.stroke || 'red',
      strokeWidth: options.strokeWidth || 2,
      selectable: true,
      evented: true,
      hasBorders: true,
      hasControls: true,
      perPixelTargetFind: true,
      strokeUniform: true
    })
    this.canvas.add(line)
    return line
  }

  // 创建箭头
  createArrowFromSVG(options: {
    x1: number
    y1: number
    x2: number
    y2: number
    stroke?: string
    strokeWidth?: number
  }) {
    // 创建主干线条
    const line = new fabric.Line([0, 0, 0, 0], {
      stroke: options.stroke || this.store.currentColor,  // 使用传入的颜色或当前颜色
      strokeWidth: options.strokeWidth || 2,
      strokeUniform: true
    });

    // 创建箭头头部
    const arrowHead = new fabric.Triangle({
      width: 15,
      height: 15,
      fill: options.stroke || this.store.currentColor,  // 使用传入的颜色或当前颜色
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      strokeUniform: true
    });

    // 创建组
    const group = new fabric.Group([line, arrowHead], {
      left: options.x1,
      top: options.y1,
      selectable: true,
      hasControls: false,  // 禁用所有控制点
      hasBorders: false,   // 禁用边框
      originX: 'left',
      originY: 'center',
      strokeUniform: true,
      objectCaching: false
    });

    // 添加到画布并初始化
    this.canvas.add(group);

    // 设置初始状态
    const dx = options.x2 - options.x1;
    const dy = options.y2 - options.y1;
    const initialLength = Math.sqrt(dx * dx + dy * dy);
    const initialAngle = Math.atan2(dy, dx) * 180 / Math.PI;

    line.set({
      x1: 0,
      y1: 0,
      x2: initialLength,
      y2: 0
    });

    arrowHead.set({
      left: initialLength,
      top: 0,
      angle: 90
    });

    group.set({
      angle: initialAngle
    });

    // 处理鼠标移动
    const moveHandler = (e: any) => {
      if (this.isDrawing && this.currentShape === group) {
        const pointer = this.canvas.getPointer(e.e);
        // @ts-ignore
        const dx = pointer.x - group.left;
        // @ts-ignore
        const dy = pointer.y - group.top;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        line.set({
          x2: length,
          y2: 0
        });

        arrowHead.set({
          left: length,
          top: 0,
          angle: 90
        });

        group.set({
          angle: angle
        });

        group.setCoords();
        this.canvas.requestRenderAll();
      }
    };

    this.canvas.on('mouse:move', moveHandler);

    // 清理事件监听
    this.canvas.on('mouse:up', () => {
      if (this.currentShape === group) {
        this.canvas.off('mouse:move', moveHandler);
      }
    });

    return group;
  }

  // 创建马赛克效果
  async createMosaic(options: {
    left: number
    top: number
    width: number
    height: number
    blockSize?: number
  }) {
    const blockSize = options.blockSize || 10
    // 获取区域的图像数据
    const ctx = this.canvas.getContext()
    const imageData = ctx.getImageData(
        options.left,
        options.top,
        options.width,
        options.height
    )

    // 创建马赛克效果
    for (let y = 0; y < options.height; y += blockSize) {
      for (let x = 0; x < options.width; x += blockSize) {
        const i = (y * options.width + x) * 4
        const r = imageData.data[i]
        const g = imageData.data[i + 1]
        const b = imageData.data[i + 2]
        const a = imageData.data[i + 3]

        ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
        ctx.fillRect(
            options.left + x,
            options.top + y,
            blockSize,
            blockSize
        )
      }
    }

    this.canvas.renderAll()
  }

  // 处理鼠标滚轮事件
  private onMouseWheel(e: any) {
    if(this.store.currentTool === 'brush') {
      const delta = e.e.deltaY
      e.e.preventDefault()
      
      let newWidth = this.canvas.freeDrawingBrush.width - (delta / 100)
      newWidth = Math.max(0.5, Math.min(20, newWidth))
      this.canvas.freeDrawingBrush.width = newWidth
    } else {
      if (!this.hoveredShape) return

      const delta = e.e.deltaY
      e.e.preventDefault()

      if (this.hoveredShape instanceof fabric.Group) {
        // 箭头组
        const line = this.hoveredShape.getObjects()[0] as fabric.Line;
        const arrowHead = this.hoveredShape.getObjects()[1] as fabric.Triangle;
        // @ts-ignore
        let newWidth = line.strokeWidth - (delta / 100);
        newWidth = Math.max(0.5, Math.min(20, newWidth));

        line.set('strokeWidth', newWidth);
        arrowHead.set({
          strokeWidth: newWidth,
          fill: line.stroke  // 保持填充色与线条颜色一致
        });

        this.canvas.requestRenderAll();
      } else if ('strokeWidth' in this.hoveredShape) {
        // 其他形状
        let newWidth = this.hoveredShape.strokeWidth - (delta / 100);
        newWidth = Math.max(0.5, Math.min(20, newWidth));
        this.hoveredShape.set('strokeWidth', newWidth);
        this.canvas.requestRenderAll();
      }
    }
  }
  // 添加公共的清理方法
  cleanup() {
    // 移除键盘事件监听
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    // 可以添加其他需要清理的内容
    
    // 清除全局引用
    // @ts-ignore
    window.activePaintingTools = null;
  }

  // 添加设置颜色的方法
  setColor(color: string) {
    this.store.currentColor = color
    
    // 如果当前是画笔模式,更新画笔颜色
    if(this.store.currentTool === 'brush') {
      this.canvas.freeDrawingBrush.color = color
    }
    
    // 如果有选中的对象，更新其颜色
    const activeObject = this.canvas.getActiveObject()
    if (activeObject) {
      if (activeObject instanceof fabric.Group) {
        // 如果是箭头（Group），需要更新所有子对象
        const objects = activeObject.getObjects()
        objects.forEach((obj: any) => {
          if (obj instanceof fabric.Line) {
            obj.set({
              stroke: color
            })
          } else if (obj instanceof fabric.Triangle) {
            obj.set({
              fill: color,
              stroke: color
            })
          }
        })
      } else {
        // 其他形状
        activeObject.set({
          stroke: color
        })
      }
      this.canvas.requestRenderAll()
    }
  }

  // 添加画笔宽度调整方法
  setBrushWidth(width: number) {
    if(this.store.currentTool === 'brush') {
      this.canvas.freeDrawingBrush.width = width
    }
  }
}
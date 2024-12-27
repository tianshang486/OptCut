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
    currentTool: 'rect',
    canDraw: true
  }
  private boundHandleKeyDown: (e: KeyboardEvent) => void = () => {}
  private currentTool: string = 'rect'

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
      const {tool, targetLabel} = event.payload
      console.log('工具切换:', tool)
      console.log('目标标签:', targetLabel)
      this.store.currentTool = tool
      this.currentTool = tool
    }).then(r => { console.log('监听工具切换事件成功:', r) })

    this.initializeEvents()
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
    this.canvas.on('mouse:dblclick', () => {
      this.store.canDraw = true  // 双击后允许继续画图
    })
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
    if (!this.store.canDraw) return

    const pointer = this.canvas.getPointer(e.e)
    console.log('===== 绘制调试信息 =====')
    console.log('当前工具 (this.currentTool):', this.currentTool)
    console.log('Store中的工具 (store.currentTool):', this.store.currentTool)
    console.log('是否可以绘制 (store.canDraw):', this.store.canDraw)
    console.log('========================')

    this.isDrawing = true
    this.startX = pointer.x
    this.startY = pointer.y

    // 直接从 store 获取当前工具
    const currentTool = this.store.currentTool
    console.log('准备创建图形，使用工具:', currentTool)

    switch (currentTool) {  // 改用 store 中的工具
      case 'rect':
        console.log('创建矩形')
        this.currentShape = this.createRect({
          left: this.startX,
          top: this.startY,
          width: 0,
          height: 0
        })
        break
      case 'line':
        console.log('创建直线')
        this.currentShape = this.createLine({
          x1: this.startX,
          y1: this.startY,
          x2: this.startX,
          y2: this.startY
        })
        break
      case 'arrow':
        console.log('创建箭头')
        this.currentShape = this.createArrowFromSVG({
          x1: this.startX,
          y1: this.startY,
          x2: this.startX,
          y2: this.startY
        })
        break
      default:
        console.log('未知工具类型:', currentTool)
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
      const tolerance = 15

      // 获取箭头的变换信息
      const angle = shape.angle || 0
      const radians = angle * Math.PI / 180
      const scaleX = shape.scaleX || 1

      // 获取箭头的起点
      const startX = shape.left || 0
      const startY = shape.top || 0

      // 计算箭头的实际长度
      const arrowLength = 1000 * scaleX

      // 计算箭头的终点
      const endX = startX + arrowLength * Math.cos(radians)
      const endY = startY + arrowLength * Math.sin(radians)

      const mouseX = pointer.x
      const mouseY = pointer.y

      const A = mouseX - startX
      const B = mouseY - startY
      const C = endX - startX
      const D = endY - startY

      const dot = A * C + B * D
      const lenSq = C * C + D * D
      let param = -1

      if (lenSq !== 0) {
        param = dot / lenSq
      }

      let nearestX, nearestY
      if (param < 0) {
        nearestX = startX
        nearestY = startY
      } else if (param > 1) {
        nearestX = endX
        nearestY = endY
      } else {
        nearestX = startX + param * C
        nearestY = startY + param * D
      }

      const dx = mouseX - nearestX
      const dy = mouseY - nearestY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const headTolerance = param > 0.8 ? tolerance * 2 : tolerance

      return distance <= headTolerance
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
            
            // 计算新的位置和角度
            const dx = pointer.x - this.startX;
            const dy = pointer.y - this.startY;
            const angle = Math.atan2(dy, dx);
            const length = Math.sqrt(dx * dx + dy * dy);

            // 更新线条
            line.set({
              x2: length,
              y2: 0
            });

            // 更新箭头头部
            arrowHead.set({
              left: length,
              top: 0
            });

            // 更新组的角度
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
      stroke: options.stroke || 'red',
      strokeWidth: options.strokeWidth || 2,
      strokeUniform: true
    });

    // 创建箭头头部
    const arrowHead = new fabric.Triangle({
      width: 15,
      height: 15,
      fill: options.stroke || 'red',
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
      hasControls: true,
      hasBorders: false,
      originX: 'left',
      originY: 'center',
      strokeUniform: true,
      objectCaching: false
    });

    // 自定义控制点
    const controls = {
      start: new fabric.Control({
        positionHandler: function(dim, finalMatrix, fabricObject) {
          // 起点控制点位置
          const x = -fabricObject.width / 2;  // 在线条起点
          const y = 0;
          return fabric.util.transformPoint(
            new fabric.Point(x, y),
            fabric.util.multiplyTransformMatrices(
              fabricObject.canvas.viewportTransform,
              fabricObject.calcTransformMatrix()
            )
          );
        },
        render: function(ctx, left, top) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(left, top, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#0d6efd';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        },
        actionHandler: function(eventData, transform, x, y) {
          const line = transform.target.getObjects()[0] as fabric.Line;
          const newLength = Math.sqrt(x * x + y * y);
          line.set({ x1: -newLength });
          transform.target.setCoords();
          return true;
        }
      }),
      middle: new fabric.Control({
        positionHandler: function(dim, finalMatrix, fabricObject) {
          // 中点控制点位置
          const x = 0;  // 在线条中点
          const y = -30;  // 向上偏移
          return fabric.util.transformPoint(
            new fabric.Point(x, y),
            fabric.util.multiplyTransformMatrices(
              fabricObject.canvas.viewportTransform,
              fabricObject.calcTransformMatrix()
            )
          );
        },
        render: function(ctx, left, top) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(left, top, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#0d6efd';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        },
        actionHandler: function(eventData, transform, x, y) {
          const group = transform.target;
          const line = group.getObjects()[0] as fabric.Line;
          const arrowHead = group.getObjects()[1] as fabric.Triangle;

          // 计算曲线控制点
          const startPoint = { x: line.x1, y: line.y1 };
          const endPoint = { x: line.x2, y: line.y2 };
          const midPoint = {
            x: (startPoint.x + endPoint.x) / 2,
            y: (startPoint.y + endPoint.y) / 2 + y * 100  // 调整控制点的垂直偏移
          };

          // 创建二次贝塞尔曲线
          const curve = new fabric.Path(`M ${startPoint.x} ${startPoint.y} Q ${midPoint.x} ${midPoint.y} ${endPoint.x} ${endPoint.y}`, {
            fill: '',
            stroke: line.stroke,
            strokeWidth: line.strokeWidth
          });

          // 更新组
          if (group.item(2)) {
            group.remove(group.item(2));
          }
          group.add(curve);
          line.set('visible', false);

          // 更新箭头位置和角度
          const tangentAngle = Math.atan2(
            endPoint.y - midPoint.y,
            endPoint.x - midPoint.x
          ) * 180 / Math.PI;

          arrowHead.set({
            left: endPoint.x,
            top: endPoint.y,
            angle: tangentAngle + 90
          });

          group.setCoords();
          return true;
        }
      }),
      end: new fabric.Control({
        positionHandler: function(dim, finalMatrix, fabricObject) {
          // 终点控制点位置
          const x = fabricObject.width / 2;  // 在线条终点
          const y = 0;
          return fabric.util.transformPoint(
            new fabric.Point(x, y),
            fabric.util.multiplyTransformMatrices(
              fabricObject.canvas.viewportTransform,
              fabricObject.calcTransformMatrix()
            )
          );
        },
        render: function(ctx, left, top, styleOverride, fabricObject) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(left, top, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#0d6efd';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        },
        actionHandler: function(eventData, transform, x, y) {
          const line = transform.target.getObjects()[0] as fabric.Line;
          const arrowHead = transform.target.getObjects()[1] as fabric.Triangle;
          const newLength = Math.sqrt(x * x + y * y);
          line.set({ x2: newLength });
          arrowHead.set({ left: newLength });
          transform.target.setCoords();
          return true;
        }
      })
    };

    group.controls = controls;

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

    // 更新箭头位置和角度的函数
    const updateArrow = (endX: number, endY: number) => {
      const dx = endX - group.left;
      const dy = endY - group.top;
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
    };

    // 处理鼠标移动
    const moveHandler = (e: any) => {
      if (this.isDrawing && this.currentShape === group) {
        const pointer = this.canvas.getPointer(e.e);
        updateArrow(pointer.x, pointer.y);
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
    if (!this.hoveredShape) return

    const delta = e.e.deltaY
    e.e.preventDefault()

    if (this.hoveredShape instanceof fabric.Group) {
      // 箭头组
      const line = this.hoveredShape.getObjects()[0] as fabric.Line;
      const arrowHead = this.hoveredShape.getObjects()[1] as fabric.Triangle;

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
  // 添加公共的清理方法
  cleanup() {
    // 移除键盘事件监听
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    // 可以添加其他需要清理的内容
  }
}
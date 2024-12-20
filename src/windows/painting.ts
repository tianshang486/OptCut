import { Canvas, Rect, Line, Path, Shadow } from 'fabric'
import {listen} from "@tauri-apps/api/event";

export class PaintingTools {
  private canvas: Canvas
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
  private readonly boundHandleKeyDown: (e: KeyboardEvent) => void = () => {}
  private currentTool: string = 'rect'

  constructor(canvas: Canvas) {
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
    if (e.target && !this.isDrawing && !(e.target instanceof Image)) {
      this.hoveredShape = e.target
      if (e.target instanceof Path) {
        // 为箭头设置特殊的悬停效果
        e.target.set({
          shadow: new Shadow({
            color: 'rgba(0,123,255,0.3)',
            blur: 10,
            offsetX: 0,
            offsetY: 0
          }),
          opacity: 0.8  // 添加透明度变化
        })
      } else {
        // 其他图形的原有效��
        e.target.set({
          shadow: new Shadow({
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
    if (e.target && !(e.target instanceof Image)) {
      if (e.target instanceof Path) {
        // 箭头的鼠标移出效果
        e.target.set({
          shadow: null,
          opacity: 1
        })
      } else {
        // 其他图形的原有效果
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
    if (shape instanceof Rect) {
      // 矩形检测
      const shapeLeft = shape.left
      const shapeTop = shape.top
      const shapeRight = shape.left + shape.width
      const shapeBottom = shape.top + shape.height

      return (
        pointer.x >= shapeLeft &&
        pointer.x <= shapeRight &&
        pointer.y >= shapeTop &&
        pointer.y <= shapeBottom
      )
    } else if (shape instanceof Line) {
      // 增加线条的��中容差
      const tolerance = 8  // 增加选中容差值
      const x1 = shape.x1
      const y1 = shape.y1
      const x2 = shape.x2
      const y2 = shape.y2

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
    } else if (shape instanceof Path) {
      const tolerance = 15  // 容差值
      
      // 获取箭头的变换信息
      const angle = shape.angle || 0
      const radians = angle * Math.PI / 180
      const scaleX = shape.scaleX || 1
      
      // 获取箭头的起点（这是箭头的实际位置）
      const startX = shape.left
      const startY = shape.top
      
      // 计算箭头的实际长度（考虑缩放）
      const arrowLength = 1000 * scaleX  // 1000是原始SVG的参考长度
      
      // 计算箭头的终点
      const endX = startX + arrowLength * Math.cos(radians)
      const endY = startY + arrowLength * Math.sin(radians)
      
      // 计算鼠标点到箭头线段的距离
      const mouseX = pointer.x
      const mouseY = pointer.y
      
      // 使用点到线段的距离公式
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
      
      // 计算鼠标点到最近点的距离
      const dx = mouseX - nearestX
      const dy = mouseY - nearestY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // 检查距离是否在容差范围内
      // 为箭头头部增加更大的检测范围
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
          const dx = pointer.x - this.startX
          const dy = pointer.y - this.startY
          const angle = Math.atan2(dy, dx) * (180 / Math.PI)
          const length = Math.sqrt(dx * dx + dy * dy)

          this.currentShape.set({
            angle: angle,
            scaleX: length / 1000  // 根据拖动距离调整箭头长度
          })
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
            shadow: new Shadow({
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
    const rect = new Rect({
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
    const line = new Line([options.x1, options.y1, options.x2, options.y2], {
      stroke: options.stroke || 'red',
      strokeWidth: options.strokeWidth || 2,
      // 添加这些属性使线条可选中和控制
      selectable: true,
      evented: true,
      hasBorders: true,
      hasControls: true,
      perPixelTargetFind: true,  // 启用像素级选中检测
      strokeUniform: true        // 保持线条宽度一致
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
    const ARROW_PATH = "M853.333333 507.733333H128v42.666667h733.866667l-145.066667 145.066667 29.866667 29.866666 192-192L746.666667 341.333333l-29.866667 29.866667 136.533333 136.533333z"

    const arrow = new Path(ARROW_PATH, {
      stroke: options.stroke || 'red',
      strokeWidth: options.strokeWidth || 2,
      fill: options.stroke || 'red',
      selectable: false,  // 禁用默认选择框
      evented: true,
      hasBorders: false,  // 禁用边框
      hasControls: false, // 禁用控制点
      originX: 'left',
      originY: 'center',
      scaleX: 0.05,
      scaleY: 0.05,
      perPixelTargetFind: true  // 启用像素级检测
    })

    // 计算箭头位置和旋转
    const dx = options.x2 - options.x1
    const dy = options.y2 - options.y1
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const length = Math.sqrt(dx * dx + dy * dy)

    arrow.set({
      left: options.x1,
      top: options.y1,
      angle: angle,
      scaleX: length / 1000,  // 根据长度调整箭头大小
      scaleY: 0.05           // 保持箭头宽度比例
    })

    this.canvas.add(arrow)
    return arrow
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

    if (Array.isArray(this.hoveredShape)) {
      // 箭头组合图形
      const [line, arrowHead] = this.hoveredShape
      let newWidth = line.strokeWidth - (delta / 100)
      newWidth = Math.max(0.5, Math.min(20, newWidth))
      line.set('strokeWidth', newWidth)
      arrowHead.set('strokeWidth', newWidth)
    } else if ('strokeWidth' in this.hoveredShape) {
      // 单个图形（形或线条）
      let newWidth = this.hoveredShape.strokeWidth - (delta / 100)
      newWidth = Math.max(0.5, Math.min(20, newWidth))
      this.hoveredShape.set('strokeWidth', newWidth)
    }

    this.canvas.renderAll()
  }
  // 添加公共的清理方法
  cleanup() {
    // 移除键盘事件监听
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    // 可以添加其他需要清理的内容
  }
}

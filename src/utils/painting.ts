import {fabric} from 'fabric'
import {listen} from "@tauri-apps/api/event"

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
    private boundHandleKeyDown: (e: KeyboardEvent) => void = () => {
    }
    private boundHandleKeyUp: (e: KeyboardEvent) => void = () => {
    } // 添加keyup事件处理
    private isCtrlPressed: boolean = false // 跟踪Ctrl键状态
    // @ts-ignore
    private currentTool: string = 'rect'
// 用于画笔
    private currentText: any = null // 用于文本输入

    // 添加特殊标记用于跟踪最后创建的箭头
    // @ts-ignore
    private lastArrow: any = null

    // 添加拖动相关属性
    private dragObject: fabric.Object | null = null
    private dragStartX: number = 0
    private dragStartY: number = 0
    private dragObjectStartLeft: number = 0
    private dragObjectStartTop: number = 0
    private wasDrawing: boolean = false // 保存绘图状态的变量

    // 添加对象状态缓存
    private objectStateCache: Map<fabric.Object, {
        stroke?: string,
        fill?: string,
        strokeWidth?: number,
        left?: number,
        top?: number,
        angle?: number,
        scaleX?: number,
        scaleY?: number
    }> = new Map();

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas
        // 启用对象选择和移动功能
        canvas.selection = false  // 关闭多选
        canvas.hoverCursor = 'pointer'
        // 设置控制点样式，使其不那么明显
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerColor = 'rgba(128,128,128,0.5)';
        fabric.Object.prototype.cornerSize = 6;
        fabric.Object.prototype.borderColor = 'rgba(128,128,128,0.5)';
        fabric.Object.prototype.borderOpacityWhenMoving = 0.2;

        // 重要：启用所有对象的事件处理
        fabric.Object.prototype.evented = true;

        console.log('PaintingTools 初始化')
        console.log('初始工具: rect')

        // 添加一个全局的Ctrl状态检测，确保Ctrl始终有效
        // 这是为了防止由于失去焦点等原因导致的Ctrl键状态丢失
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if ((e.key === 'Control' || e.key === 'Meta')) {
                if (!this.isCtrlPressed) {
                    // 模拟调用Ctrl键按下处理函数
                    this.handleKeyDown(e);
                }
            }
        });

        document.addEventListener('keyup', (e: KeyboardEvent) => {
            if ((e.key === 'Control' || e.key === 'Meta')) {
                if (this.isCtrlPressed) {
                    // 模拟调用Ctrl键释放处理函数
                    this.handleKeyUp(e);
                }
            }
        });

        // 绑定窗口失焦处理函数
        this.handleWindowBlur = this.handleWindowBlur.bind(this);

        // 处理窗口失焦事件，释放Ctrl键状态
        window.addEventListener('blur', this.handleWindowBlur);

        // 添加对象移动时的事件监听
        canvas.on('object:moving', (e) => {
            console.log('对象正在移动:', e.target);
        });

        canvas.on('object:moved', (e) => {
            console.log('对象完成移动:', e.target);
        });

        // 监听对象修改事件，更新缓存
        canvas.on('object:modified', (e) => {
            if (e.target && !(e.target instanceof fabric.Image)) {
                this.updateObjectCache(e.target);
                console.log('对象已修改，缓存已更新:', e.target);
            }
        });

        // 在canvas上添加对象时，确保它们可以被正确处理
        canvas.on('object:added', (e) => {
            if (e.target && !(e.target instanceof fabric.Image)) {
                const obj = e.target;

                // 尝试从缓存中恢复对象属性
                this.restoreObjectFromCache(obj);

                // 确保所有添加的对象都可以接收事件并具有正确的光标样式
                obj.evented = true;
                obj.hoverCursor = 'move';

                // 根据当前Ctrl键状态设置对象可选择性
                if (this.isCtrlPressed) {
                    obj.selectable = true;
                    obj.hasControls = true;
                    obj.hasBorders = true;
                    obj.lockMovementX = false;
                    obj.lockMovementY = false;
                } else {
                    obj.selectable = false;
                    obj.hasControls = false;
                    obj.hasBorders = false;
                    obj.lockMovementX = true;
                    obj.lockMovementY = true;
                }

                // 如果是组，处理内部对象
                if (obj instanceof fabric.Group) {
                    obj.getObjects().forEach(groupObj => {
                        // 尝试从缓存中恢复组内对象属性
                        this.restoreObjectFromCache(groupObj);

                        groupObj.evented = true;
                        groupObj.hoverCursor = 'move';

                        if (this.isCtrlPressed) {
                            groupObj.selectable = true;
                            groupObj.hasControls = true;
                            groupObj.hasBorders = true;
                            groupObj.lockMovementX = false;
                            groupObj.lockMovementY = false;
                        } else {
                            groupObj.selectable = false;
                            groupObj.hasControls = false;
                            groupObj.hasBorders = false;
                            groupObj.lockMovementX = true;
                            groupObj.lockMovementY = true;
                        }
                    });

                    // 如果是箭头组，设置标记
                    if (obj.getObjects().length === 2 &&
                        obj.getObjects()[0] instanceof fabric.Line &&
                        obj.getObjects()[1] instanceof fabric.Triangle) {
                        (obj as any).isArrow = true;
                    }
                }

                // 更新缓存
                this.updateObjectCache(obj);

                console.log('对象已添加并正确设置:', obj);
            }
        });

        // 将之前绘制的对象也设为可拖动（如果按下了Ctrl键）
        canvas.on('mouse:down', (e) => {
            if (e.target && this.isCtrlPressed) {
                console.log('点击对象 (Ctrl模式):', e.target);
                this.makeObjectSelectable(e.target);
            }
        });

        // 记录历史操作，用于撤销
        // @ts-ignore
        window._debug_shapes = this.shapes;

        // 绑定键盘事件处理函数并立即添加监听器
        this.bindKeyboardEvents();

        // 原始撤销功能
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();  // 阻止默认行为
                console.log('快捷键触发撤销，当前图形数量:', this.shapes.length);

                if (this.shapes.length > 0) {
                    try {
                        // 弹出最后一个元素
                        this.shapes.pop();
                        console.log('已从shapes数组移除最后一个对象，剩余对象数:', this.shapes.length);

                        // 清空画布，只保留背景图像
                        const backgroundImage = this.findBackgroundImage();
                        this.canvas.clear();

                        // 如果有背景图片，重新添加它
                        if (backgroundImage) {
                            this.canvas.add(backgroundImage);
                        }

                        // 使用shapes数组重新绘制所有对象
                        for (const shape of this.shapes) {
                            this.canvas.add(shape);
                        }

                        // 更新画布
                        this.canvas.requestRenderAll();
                        console.log('撤销完成，画布已重绘，当前对象数量:', this.canvas.getObjects().length);
                    } catch (error) {
                        console.error('撤销操作失败:', error);
                    }
                } else {
                    console.log('没有可撤销的操作');
                }
            }
        });

        // 监听工具切换事件
        listen('toolbar-tool-change', async (event: any) => {
            const {tool} = event.payload
            this.store.currentTool = tool
            this.currentTool = tool

            console.log('工具切换:', tool);

            // 重置拖动状态，但维持Ctrl键状态
            this.dragObject = null;
            this.wasDrawing = false;

            // 首先，取消当前选择
            this.canvas.discardActiveObject();

            // 移除所有事件监听器，防止冲突
            this.setupDefaultEventListeners();

            // 根据当前Ctrl键状态设置光标
            this.canvas.defaultCursor = this.isCtrlPressed ? 'move' : 'default';

            if (tool === 'brush') {
                // 启用绘图模式
                this.canvas.isDrawingMode = true
                this.canvas.freeDrawingBrush.color = this.store.currentColor
                this.canvas.freeDrawingBrush.width = 2

                // 禁用所有对象选择
                this.disableSelection();

                // 监听路径创建完成事件
                this.canvas.on('path:created', (e: any) => {
                    const path = e.path
                    // 默认不可选择和移动
                    this.makeObjectUnselectable(path);
                    // 但确保能被Ctrl选择拖动
                    path.evented = true;
                    this.shapes.push(path)
                })
            } else if (tool) {
                // 如果选择了其他绘图工具
                this.canvas.isDrawingMode = false
                this.canvas.off('path:created')

                // 禁用所有对象选择，但保留事件处理能力
                this.canvas.forEachObject(obj => {
                    if (!(obj instanceof fabric.Image)) {
                        this.makeObjectUnselectable(obj);
                        // 确保对象可响应事件
                        obj.evented = true;
                    }
                });
            } else {
                // 如果没有选择任何工具，进入选择模式
                this.canvas.isDrawingMode = false
                this.canvas.off('path:created')

                // 启用所有对象的选择和移动
                this.enableSelection();
            }

            // 如果当前按下了Ctrl键，重新启用所有对象选择
            if (this.isCtrlPressed) {
                this.enableSelection();
            }

            // 更新画布以反映变化
            this.canvas.requestRenderAll();
        })

        // 监听颜色变化事件
        listen('toolbar-color-change', async (event: any) => {
            const {color} = event.payload
            this.setColor(color)
            console.log('颜色变化:', color)
        })

        this.initializeEvents()

        // 将实例存储在全局对象中，方便在其他地方访问
        // @ts-ignore
        window.activePaintingTools = this;
    }

    // 设置默认事件监听器
    private setupDefaultEventListeners() {
        // 移除所有现有事件
        this.canvas.off('mouse:down');
        this.canvas.off('mouse:move');
        this.canvas.off('mouse:up');
        this.canvas.off('mouse:over');
        this.canvas.off('mouse:out');
        this.canvas.off('mouse:wheel');
        this.canvas.off('object:moving');
        this.canvas.off('object:moved');
        this.canvas.off('selection:created');
        this.canvas.off('selection:updated');

        // 重新添加基本事件
        this.canvas.on('mouse:down', (e) => this.onMouseDown(e));
        this.canvas.on('mouse:move', (e) => this.onMouseMove(e));
        this.canvas.on('mouse:up', () => this.onMouseUp());
        this.canvas.on('mouse:over', (e) => this.onMouseOver(e));
        this.canvas.on('mouse:out', (e) => this.onMouseOut(e));
        this.canvas.on('mouse:wheel', (e) => this.onMouseWheel(e));

        // 添加对象选择事件
        this.canvas.on('selection:created', () => {
            console.log('对象被选中');
        });

        // 监听对象移动
        this.canvas.on('object:moving', (e) => {
            console.log('对象正在移动:', e.target);
        });
    }

    // 初始化鼠标事件
    private initializeEvents() {
        this.setupDefaultEventListeners();

        // 添加全局点击监听，确保点击到其他地方可以取消选择
        document.addEventListener('click', (e) => {
            // 检查点击是否在canvas外
            const canvasElement = this.canvas.getElement();
            if (e.target !== canvasElement && !canvasElement.contains(e.target as Node)) {
                // 如果按下的不是Ctrl，且点击在画布外，则清除选择
                if (!this.isCtrlPressed) {
                    this.canvas.discardActiveObject();
                    this.canvas.requestRenderAll();
                }
            }
        });
    }

    // 绑定键盘事件
    private bindKeyboardEvents() {
        // 解绑旧的事件处理（如果存在）
        this.unbindKeyboardEvents();

        // 重新绑定事件处理函数
        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);

        // 添加新的事件监听
        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);

        console.log('键盘事件绑定成功');
    }

    // 解绑键盘事件
    private unbindKeyboardEvents() {
        if (this.boundHandleKeyDown) {
            document.removeEventListener('keydown', this.boundHandleKeyDown);
        }

        if (this.boundHandleKeyUp) {
            document.removeEventListener('keyup', this.boundHandleKeyUp);
        }

        console.log('键盘事件解绑成功');
    }

    // 检查对象是否可以被选择和拖动
    private checkObjectProperties(obj: fabric.Object) {
        console.log(`对象属性检查 - 
      可选择: ${obj.selectable}, 
      可拖动: ${!obj.lockMovementX && !obj.lockMovementY}, 
      可接收事件: ${obj.evented}`);
    }

    // 处理键盘按下事件
    private handleKeyDown(e: KeyboardEvent) {
        // 如果按下Delete或Backspace键，删除当前悬停的图形
        if ((e.key === 'Backspace' || e.key === 'Delete') && this.hoveredShape) {
            console.log('删除当前悬停的图形');
            this.removeShape(this.hoveredShape);
        }

        // 检测Ctrl键
        if ((e.key === 'Control' || e.key === 'Meta') && !this.isCtrlPressed) {
            this.isCtrlPressed = true;
            console.log('Ctrl键按下，进入拖动模式');

            // 保存当前模式，以便稍后恢复
            this.wasDrawing = this.isDrawing;

            // 临时暂停绘图
            this.isDrawing = false;

            // 变更光标
            this.canvas.defaultCursor = 'move';

            // 启用对象选择能力
            this.enableSelection();

            // 检查所有对象的可拖动状态
            console.log("检查所有对象的状态:");
            this.canvas.forEachObject(obj => {
                if (!(obj instanceof fabric.Image)) {
                    this.checkObjectProperties(obj);
                }
            });

            // 重要：强制更新渲染
            this.canvas.requestRenderAll();
        }
    }

    // 处理键盘释放事件
    private handleKeyUp(e: KeyboardEvent) {
        if (e.key === 'Control' || e.key === 'Meta') {
            this.isCtrlPressed = false;
            console.log('Ctrl键释放，恢复绘图模式');

            // 恢复默认光标
            this.canvas.defaultCursor = 'default';

            // 恢复绘图状态
            this.isDrawing = this.wasDrawing;

            // 如果有绘图工具激活，禁用选择
            if (this.store.currentTool && this.store.currentTool !== 'text') {
                // 禁用对象选择能力
                this.canvas.forEachObject((obj) => {
                    if (!(obj instanceof fabric.Image)) {
                        this.makeObjectUnselectable(obj);
                    }
                });

                // 取消当前选择
                this.canvas.discardActiveObject();
            }

            // 重要：强制更新渲染
            this.canvas.requestRenderAll();
        }
    }

    private onMouseDown(e: any) {
        // 获取鼠标位置和目标对象
        const pointer = this.canvas.getPointer(e.e);
        const target = e.target;

        console.log('mouseDown事件', '按Ctrl:', this.isCtrlPressed, '目标:', target ? '有对象' : '无对象');

        // 如果按下了Ctrl键，优先处理拖动操作
        if (this.isCtrlPressed) {
            // 如果点击到对象，准备拖动
            if (target && !(target instanceof fabric.Image)) {
                // 确保对象可拖动
                this.makeObjectSelectable(target);

                // 记录当前被拖动的对象
                this.dragObject = target;

                // 记录开始拖动的位置
                this.dragStartX = pointer.x;
                this.dragStartY = pointer.y;

                // 记录对象的初始位置
                this.dragObjectStartLeft = target.left || 0;
                this.dragObjectStartTop = target.top || 0;

                // 选择此对象
                this.canvas.setActiveObject(target);

                console.log('开始拖动对象:', target, '位置:', this.dragObjectStartLeft, this.dragObjectStartTop, '可选择:', target.selectable);
            }
            return;
        }

        // 如果点击在对象上，但没有按Ctrl键
        if (target && !(target instanceof fabric.Image)) {
            // 取消当前选择，准备绘图
            this.canvas.discardActiveObject();
            this.canvas.requestRenderAll();
        }

        // 如果没有选择工具，不处理绘图
        if (!this.store.currentTool || !['rect', 'line', 'arrow', 'text'].includes(this.store.currentTool)) {
            return;
        }

        // 开始绘图
        this.isDrawing = true;
        this.startX = pointer.x;
        this.startY = pointer.y;

        // 根据工具类型创建不同的形状
        switch (this.store.currentTool) {
            case 'rect':
                this.currentShape = new fabric.Rect({
                    left: this.startX,
                    top: this.startY,
                    width: 0,
                    height: 0,
                    stroke: this.store.currentColor,
                    strokeWidth: 2,
                    fill: 'transparent',
                    selectable: false,
                    hasControls: false,
                    hasBorders: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    evented: true, // 确保可以响应事件
                    hoverCursor: 'move' // 悬停时显示移动光标
                });
                break;
            case 'line':
                this.currentShape = new fabric.Line([this.startX, this.startY, this.startX, this.startY], {
                    stroke: this.store.currentColor,
                    strokeWidth: 2,
                    selectable: false,
                    hasControls: false,
                    hasBorders: false,
                    lockMovementX: true,
                    lockMovementY: true,
                    evented: true, // 确保可以响应事件
                    hoverCursor: 'move' // 悬停时显示移动光标
                });
                break;
            case 'arrow':
                this.currentShape = this.createArrowFromSVG({
                    x1: this.startX,
                    y1: this.startY,
                    x2: this.startX,
                    y2: this.startY,
                    stroke: this.store.currentColor
                });
                break;
            case 'text':
                // 文本框特殊处理 - 总是可选择的
                this.currentText = new fabric.IText('', {
                    left: pointer.x,
                    top: pointer.y,
                    fontSize: 20,
                    fill: this.store.currentColor,
                    editable: true,
                    cursorWidth: 1,
                    cursorDuration: 600,
                    cursorColor: this.store.currentColor,
                    padding: 7,
                    selectable: true,
                    hasControls: true,
                    hasBorders: true,
                    lockMovementX: false,
                    lockMovementY: false
                });
                this.canvas.add(this.currentText);
                this.currentText.enterEditing();
                this.canvas.requestRenderAll();
                this.shapes.push(this.currentText);
                break;
        }

        // 将新创建的形状添加到画布
        if (this.currentShape) {
            this.canvas.add(this.currentShape);
            this.canvas.renderAll();
        }
    }

    private onMouseMove(e: any) {
        const pointer = this.canvas.getPointer(e.e);

        // 如果处于移动模式（按下Ctrl键）且正在拖动对象
        if (this.isCtrlPressed && this.dragObject) {
            this.canvas.defaultCursor = 'move';

            // 计算位移
            const dx = pointer.x - this.dragStartX;
            const dy = pointer.y - this.dragStartY;

            // 更新对象位置
            this.dragObject.set({
                left: this.dragObjectStartLeft + dx,
                top: this.dragObjectStartTop + dy
            });

            // 如果是箭头，特殊处理一下
            if ((this.dragObject as any).isArrow) {
                console.log('正在拖动箭头对象');
            }

            // 确保位置更新并计算坐标
            this.dragObject.setCoords();

            // 重新渲染画布
            this.canvas.renderAll();

            console.log('拖动中:', dx, dy, '对象位置:', this.dragObject.left, this.dragObject.top);
            return;
        }

        // 处理绘图状态
        if (this.isDrawing && this.currentShape) {
            switch (this.store.currentTool) {
                case 'rect':
                    const width = Math.abs(pointer.x - this.startX);
                    const height = Math.abs(pointer.y - this.startY);
                    this.currentShape.set({
                        left: Math.min(this.startX, pointer.x),
                        top: Math.min(this.startY, pointer.y),
                        width: width,
                        height: height
                    });
                    break;
                case 'line':
                    this.currentShape.set({
                        x2: pointer.x,
                        y2: pointer.y
                    });
                    break;
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
                    break;
            }
            this.canvas.renderAll();
            return;
        }

        // 处理悬停效果
        if (!this.isCtrlPressed) {
            const object = this.canvas.findTarget(e.e, false);

            if (object !== this.hoveredShape) {
                // 清除之前的悬停效果
                if (this.hoveredShape) {
                    this.hoveredShape.set({shadow: null});
                }

                // 设置新的悬停效果
                if (object && !(object instanceof fabric.Image)) {
                    object.set({
                        shadow: new fabric.Shadow({
                            color: 'rgba(33, 150, 243, 0.9)',
                            blur: 12,
                            offsetX: 0,
                            offsetY: 0
                        })
                    });
                    this.canvas.defaultCursor = 'pointer';
                    this.hoveredShape = object;
                } else {
                    this.canvas.defaultCursor = 'default';
                    this.hoveredShape = null;
                }

                this.canvas.renderAll();
            }
        }
    }

    private onMouseUp() {
        // 如果正在拖动对象
        if (this.isCtrlPressed && this.dragObject) {
            console.log('完成拖动对象:', this.dragObject, '到位置:', this.dragObject.left, this.dragObject.top);

            // 先移除拖动的对象
            const draggedObject = this.dragObject;

            // 保存对象的关键属性
            draggedObject instanceof fabric.Group ?
                (draggedObject.getObjects()[1] as fabric.Triangle).fill :
                draggedObject.fill;
// 更新缓存
            this.updateObjectCache(draggedObject);

            // 如果是组对象，更新子对象缓存
            if (draggedObject instanceof fabric.Group) {
                draggedObject.getObjects().forEach(obj => {
                    this.updateObjectCache(obj);
                });
            }

            // 从shapes数组中更新引用
            const index = this.shapes.indexOf(draggedObject);
            if (index !== -1) {
                this.shapes[index] = draggedObject;
            }

            // 重新渲染画布确保更新
            this.canvas.requestRenderAll();

            // 清除拖动状态
            this.dragObject = null;
            this.dragStartX = 0;
            this.dragStartY = 0;
            this.dragObjectStartLeft = 0;
            this.dragObjectStartTop = 0;

            return;
        }

        if (this.isDrawing && this.currentShape) {
            // 完成绘制，设置属性
            this.currentShape.set({
                selectable: this.isCtrlPressed, // 根据Ctrl键状态决定可选择性
                hasControls: this.isCtrlPressed,
                hasBorders: this.isCtrlPressed,
                lockMovementX: !this.isCtrlPressed,
                lockMovementY: !this.isCtrlPressed,
                evented: true, // 确保可以响应Ctrl按下的事件
                hoverCursor: 'move' // 鼠标悬停显示移动光标
            });

            // 箭头特殊处理
            if (this.currentShape instanceof fabric.Group) {
                // 确保组内所有对象都有相同设置
                this.currentShape.getObjects().forEach((obj) => {
                    obj.selectable = this.isCtrlPressed;
                    obj.hasControls = this.isCtrlPressed;
                    obj.hasBorders = this.isCtrlPressed;
                    obj.lockMovementX = !this.isCtrlPressed;
                    obj.lockMovementY = !this.isCtrlPressed;
                    obj.evented = true; // 确保可以响应Ctrl按下的事件
                    obj.hoverCursor = 'move'; // 鼠标悬停显示移动光标
                });

                // 为箭头对象添加标记
                (this.currentShape as any).isArrow = true;
            }

            // 关键修复：保存当前对象
            const newShape = this.currentShape;

            // 先更新缓存，然后再添加到shapes数组
            this.updateObjectCache(newShape);

            // 添加到shapes数组
            this.shapes.push(newShape);
            console.log(`形状创建完成: ${this.store.currentTool}, Ctrl模式: ${this.isCtrlPressed}`);

            // 关键修复：结合之前的两种方法
            // 1. 先移除对象再添加，确保事件系统完全刷新
            this.canvas.remove(newShape);

            // 2. 保存对象的所有属性，确保不会丢失
            const stroke = newShape.stroke;
            const fill = newShape instanceof fabric.Group ? (newShape.getObjects()[1] as fabric.Triangle).fill : newShape.fill;
            const strokeWidth = newShape.strokeWidth;

            // 3. 重新添加对象
            this.canvas.add(newShape);

            // 4. 恢复对象属性
            newShape.set({
                stroke: stroke,
                fill: fill,
                strokeWidth: strokeWidth,
                selectable: this.isCtrlPressed,
                hasControls: this.isCtrlPressed,
                hasBorders: this.isCtrlPressed,
                lockMovementX: !this.isCtrlPressed,
                lockMovementY: !this.isCtrlPressed,
                evented: true,
                hoverCursor: 'move'
            });

            // 5. 对于组对象，恢复子对象属性
            if (newShape instanceof fabric.Group) {
                const lineObj = newShape.getObjects()[0] as fabric.Line;
                const arrowHeadObj = newShape.getObjects()[1] as fabric.Triangle;

                lineObj.set({
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    selectable: this.isCtrlPressed,
                    hasControls: this.isCtrlPressed,
                    hasBorders: this.isCtrlPressed,
                    lockMovementX: !this.isCtrlPressed,
                    lockMovementY: !this.isCtrlPressed,
                    evented: true,
                    hoverCursor: 'move'
                });

                arrowHeadObj.set({
                    fill: stroke,
                    stroke: stroke,
                    strokeWidth: strokeWidth,
                    selectable: this.isCtrlPressed,
                    hasControls: this.isCtrlPressed,
                    hasBorders: this.isCtrlPressed,
                    lockMovementX: !this.isCtrlPressed,
                    lockMovementY: !this.isCtrlPressed,
                    evented: true,
                    hoverCursor: 'move'
                });
            }

            // 6. 更新对象缓存
            this.updateObjectCache(newShape);

            // 7. 设置活动对象状态
            if (this.isCtrlPressed) {
                this.canvas.setActiveObject(newShape);
            } else {
                this.canvas.discardActiveObject();
            }

            // 重新渲染画布
            this.canvas.requestRenderAll();
        }

        // 重置状态
        this.isDrawing = false;
        this.currentShape = null;
    }

    // 鼠标悬停事件处理
    private onMouseOver(e: any) {
        if (e.target && !this.isDrawing && !(e.target instanceof fabric.Image)) {
            this.hoveredShape = e.target;

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
            this.canvas.renderAll();
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
                // 从缓存中恢复颜色和线宽，而不是硬编码
                const cachedState = this.objectStateCache.get(e.target);
                e.target.set({
                    shadow: null,
                    stroke: cachedState?.stroke || this.store.currentColor,
                    strokeWidth: cachedState?.strokeWidth || 2
                })
            }
            this.canvas.renderAll();
        }
        this.hoveredShape = null;
    }

    // 删除指定图形
    private removeShape(shape: any) {
        const index = this.shapes.indexOf(shape);

        if (index > -1) {
            try {
                // 从数组中移除
                this.shapes.splice(index, 1);

                // 清空画布上的所有对象
                const backgroundImage = this.findBackgroundImage();
                this.canvas.clear();

                // 如果有背景图片，重新添加它
                if (backgroundImage) {
                    this.canvas.add(backgroundImage);
                }

                // 重新添加所有剩余的图形
                for (const s of this.shapes) {
                    this.canvas.add(s);
                }

                // 清除当前悬停的引用
                this.hoveredShape = null;

                // 更新画布
                this.canvas.requestRenderAll();
            } catch (error) {
                console.error('删除图形时出错:', error);
            }
        }
    }

    // 添加查找背景图片的辅助方法
    private findBackgroundImage(): fabric.Image | null {
        const objects = this.canvas.getObjects();
        for (const obj of objects) {
            if (obj instanceof fabric.Image) {
                return obj;
            }
        }
        return null;
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
        // 创建主线
        const line = new fabric.Line([0, 0, 0, 0], {
            stroke: options.stroke || this.store.currentColor,
            strokeWidth: options.strokeWidth || 2,
            strokeUniform: true,
            selectable: this.isCtrlPressed,
            evented: true, // 确保可以响应事件
            hoverCursor: 'move' // 悬停时显示移动光标
        });

        // 创建箭头头部
        const arrowHead = new fabric.Triangle({
            width: 15,
            height: 15,
            fill: options.stroke || this.store.currentColor,
            left: 0,
            top: 0,
            originX: 'center',
            originY: 'center',
            strokeUniform: true,
            selectable: this.isCtrlPressed,
            evented: true, // 确保可以响应事件
            hoverCursor: 'move' // 悬停时显示移动光标
        });

        // 创建组
        const group = new fabric.Group([line, arrowHead], {
            left: options.x1,
            top: options.y1,
            selectable: this.isCtrlPressed, // 根据当前Ctrl状态决定是否可选择
            hasControls: this.isCtrlPressed,
            hasBorders: this.isCtrlPressed,
            originX: 'left',
            originY: 'center',
            strokeUniform: true,
            objectCaching: false,
            lockMovementX: !this.isCtrlPressed,
            lockMovementY: !this.isCtrlPressed,
            evented: true, // 确保可以响应事件
            hoverCursor: 'move' // 悬停时显示移动光标
        }) as fabric.Group & { isArrow?: boolean };

        // 添加自定义属性标记这是箭头
        group.isArrow = true;

        // 保存对箭头的引用
        this.lastArrow = group;

        console.log('箭头创建完成，可拖动:', this.isCtrlPressed);
        this.checkObjectProperties(group);

        this.canvas.add(group);

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

        // 箭头绘制过程中的处理
        const moveHandler = (e: any) => {
            if (this.isDrawing && this.currentShape === group) {
                const pointer = this.canvas.getPointer(e.e);
                const groupLeft = (group.left || 0) as number;
                const groupTop = (group.top || 0) as number;
                const dx = pointer.x - groupLeft;
                const dy = pointer.y - groupTop;
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
                this.canvas.renderAll();
            }
        };

        this.canvas.on('mouse:move', moveHandler);

        this.canvas.on('mouse:up', () => {
            if (this.currentShape === group) {
                this.canvas.off('mouse:move', moveHandler);
            }
        });

        return group;
    }

    // 创建马赛克效果
// 修改鼠标滚轮事件处理，确保缩放值被保存
    private onMouseWheel(e: any) {
        if (this.store.currentTool === 'brush') {
            const delta = e.e.deltaY
            e.e.preventDefault()

            let newWidth = this.canvas.freeDrawingBrush.width - (delta / 100)
            newWidth = Math.max(0.5, Math.min(20, newWidth))
            this.canvas.freeDrawingBrush.width = newWidth
            console.log('画笔宽度调整为:', newWidth);
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

                console.log('箭头宽度调整为:', newWidth);

                // 更新子对象缓存
                this.updateObjectCache(line);
                this.updateObjectCache(arrowHead);

                // 更新组缓存
                this.updateObjectCache(this.hoveredShape);

                // 保存到shapes数组中的对应对象
                const index = this.shapes.indexOf(this.hoveredShape);
                if (index !== -1) {
                    this.shapes[index] = this.hoveredShape;
                }

                this.canvas.requestRenderAll();
            } else if ('strokeWidth' in this.hoveredShape) {
                // 其他形状
                let newWidth = this.hoveredShape.strokeWidth - (delta / 100);
                newWidth = Math.max(0.5, Math.min(20, newWidth));
                this.hoveredShape.set('strokeWidth', newWidth);

                console.log('形状宽度调整为:', newWidth);

                // 更新缓存
                this.updateObjectCache(this.hoveredShape);

                // 保存到shapes数组中的对应对象
                const index = this.shapes.indexOf(this.hoveredShape);
                if (index !== -1) {
                    this.shapes[index] = this.hoveredShape;
                }

                this.canvas.requestRenderAll();
            }
        }
    }

    // 修改 cleanup 方法，确保正确清理资源
    cleanup() {
        console.log('正在清理 PaintingTools 资源...');

        // 移除键盘事件监听
        this.unbindKeyboardEvents();

        // 移除画布事件监听
        this.canvas.off('mouse:down');
        this.canvas.off('mouse:move');
        this.canvas.off('mouse:up');
        this.canvas.off('mouse:over');
        this.canvas.off('mouse:out');
        this.canvas.off('mouse:wheel');
        this.canvas.off('object:moving');
        this.canvas.off('object:moved');
        this.canvas.off('selection:created');
        this.canvas.off('path:created');
        this.canvas.off('object:added');

        // 移除全局监听
        window.removeEventListener('blur', this.handleWindowBlur);

        console.log('PaintingTools 清理完成');

        // 移除全局引用
        // @ts-ignore
        if (window.activePaintingTools === this) {
            // @ts-ignore
            window.activePaintingTools = null;
        }
    }

    // 添加设置颜色的方法
    setColor(color: string) {
        console.log('设置颜色:', color);
        this.store.currentColor = color

        // 如果当前是画笔模式,更新画笔颜色
        if (this.store.currentTool === 'brush') {
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
                        // 更新缓存
                        this.updateObjectCache(obj);
                    } else if (obj instanceof fabric.Triangle) {
                        obj.set({
                            fill: color,
                            stroke: color
                        })
                        // 更新缓存
                        this.updateObjectCache(obj);
                    }
                })
                // 更新组缓存
                this.updateObjectCache(activeObject);
            } else if (activeObject instanceof fabric.Path) {
                // 如果是路径，更新其颜色
                activeObject.set({
                    stroke: color
                });
                // 更新缓存
                this.updateObjectCache(activeObject);
            } else {
                // 其他形状
                activeObject.set({
                    stroke: color
                })
                // 更新缓存
                this.updateObjectCache(activeObject);
            }

            // 重要：先移除再添加，确保事件系统完全刷新
            const index = this.shapes.indexOf(activeObject);
            if (index !== -1) {
                // 记住当前位置和其他属性
                this.shapes[index] = activeObject;
            }

            this.canvas.requestRenderAll()
        }
    }

    // 添加画笔宽度调整方法
// 获取是否有绘图内容
    public hasDrawings() {
        return this.shapes.length > 0;
    }

    // 添加 hasOcr 方法以解决类型错误
    public hasOcr() {
        return false; // 默认实现，根据实际需求修改
    }

    // 让对象可选择
    private makeObjectSelectable(obj: fabric.Object) {
        obj.selectable = true;
        obj.hasControls = true;
        obj.hasBorders = true;
        obj.lockMovementX = false;
        obj.lockMovementY = false;
        obj.evented = true; // 确保可以响应事件

        // 如果是组，处理内部对象
        if (obj instanceof fabric.Group) {
            obj.getObjects().forEach(groupObj => {
                groupObj.selectable = true;
                groupObj.hasControls = true;
                groupObj.hasBorders = true;
                groupObj.lockMovementX = false;
                groupObj.lockMovementY = false;
                groupObj.evented = true; // 确保可以响应事件
            });
        }
    }

    // 让对象不可选择
    private makeObjectUnselectable(obj: fabric.Object) {
        obj.selectable = false;
        obj.hasControls = false;
        obj.hasBorders = false;
        obj.lockMovementX = true;
        obj.lockMovementY = true;
        obj.evented = true; // 即使是不可选择的对象，也保留事件响应能力以便Ctrl拖动

        // 如果是组，处理内部对象
        if (obj instanceof fabric.Group) {
            obj.getObjects().forEach(groupObj => {
                groupObj.selectable = false;
                groupObj.hasControls = false;
                groupObj.hasBorders = false;
                groupObj.lockMovementX = true;
                groupObj.lockMovementY = true;
                groupObj.evented = true; // 即使是不可选择的对象，也保留事件响应能力以便Ctrl拖动
            });
        }
    }

    // 启用所有对象选择
    private enableSelection() {
        console.log('启用所有对象的选择能力');
        let count = 0;
        this.canvas.forEachObject(obj => {
            if (!(obj instanceof fabric.Image)) {
                this.makeObjectSelectable(obj);
                count++;
            }
        });
        console.log(`已设置 ${count} 个对象为可选择状态`);
    }

    // 禁用所有对象选择
    private disableSelection() {
        console.log('禁用所有对象的选择能力');
        let count = 0;
        this.canvas.forEachObject(obj => {
            if (!(obj instanceof fabric.Image)) {
                this.makeObjectUnselectable(obj);
                count++;
            }
        });
        console.log(`已设置 ${count} 个对象为不可选择状态`);
    }

    // 显式清理Ctrl键状态
// 处理窗口失焦的方法
    private handleWindowBlur = () => {
        if (this.isCtrlPressed) {
            this.isCtrlPressed = false;
            this.dragObject = null;
            this.canvas.defaultCursor = 'default';
            console.log('窗口失焦，清除Ctrl状态');

            if (this.store.currentTool && this.store.currentTool !== 'text') {
                this.disableSelection();
            }

            this.canvas.requestRenderAll();
        }
    }

    // 更新对象缓存
    private updateObjectCache(obj: fabric.Object) {
        const state: any = {};

        // 保存颜色和线宽
        if ('stroke' in obj && obj.stroke) {
            state.stroke = obj.stroke;
        }
        if ('fill' in obj && obj.fill) {
            state.fill = obj.fill;
        }
        if ('strokeWidth' in obj && obj.strokeWidth) {
            state.strokeWidth = obj.strokeWidth;
        }

        // 添加位置和变换属性
        if ('left' in obj && obj.left !== undefined) {
            state.left = obj.left;
        }
        if ('top' in obj && obj.top !== undefined) {
            state.top = obj.top;
        }
        if ('angle' in obj && obj.angle !== undefined) {
            state.angle = obj.angle;
        }
        if ('scaleX' in obj && obj.scaleX !== undefined) {
            state.scaleX = obj.scaleX;
        }
        if ('scaleY' in obj && obj.scaleY !== undefined) {
            state.scaleY = obj.scaleY;
        }

        // 保存到缓存
        this.objectStateCache.set(obj, state);

        // 打印调试信息
        console.log('对象缓存已更新:', obj.type, state);

        // 如果是组，保存组内对象
        if (obj instanceof fabric.Group) {
            obj.getObjects().forEach(groupObj => {
                this.updateObjectCache(groupObj);
            });
        }
    }

    // 从缓存中恢复对象属性
    private restoreObjectFromCache(obj: fabric.Object) {
        const cachedState = this.objectStateCache.get(obj);
        if (cachedState) {
            // 恢复属性
            if (cachedState.stroke !== undefined) {
                obj.set('stroke', cachedState.stroke);
            }
            if (cachedState.fill !== undefined) {
                obj.set('fill', cachedState.fill);
            }
            if (cachedState.strokeWidth !== undefined) {
                obj.set('strokeWidth', cachedState.strokeWidth);
            }

            // 恢复位置和变换属性
            if (cachedState.left !== undefined) {
                obj.set('left', cachedState.left);
            }
            if (cachedState.top !== undefined) {
                obj.set('top', cachedState.top);
            }
            if (cachedState.angle !== undefined) {
                obj.set('angle', cachedState.angle);
            }
            if (cachedState.scaleX !== undefined) {
                obj.set('scaleX', cachedState.scaleX);
            }
            if (cachedState.scaleY !== undefined) {
                obj.set('scaleY', cachedState.scaleY);
            }

            console.log('从缓存恢复对象属性:', obj.type, cachedState);
        }
    }

    // 添加专门的初始化函数，可以在创建对象后调用确保对象可拖动
}
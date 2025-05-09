import { invoke } from "@tauri-apps/api/core";
import {queryAuth} from "@/utils/dbsql.ts";
import {emit} from "@tauri-apps/api/event";
import {Ref, UnwrapRef} from "vue";

interface OcrItem {
    text: string;
    box: number[][];
    translatedText?: string;
}

// 添加新的接口定义
interface OcrOptions {
    image_path: Ref<string>;
    is_ocr: Ref<boolean>;
    image_ocr: Ref<UnwrapRef<{ code: any; data: OcrItem[] }>>;
    isTranslated: Ref<boolean>;
    originalOcrData: Ref<UnwrapRef<{ code: any; data: any[] } | null>>;
    showOcrPanel: Ref<boolean>;
    label: string;
    resize: (width: number, height: number) => void;
    getSize: () => Promise<{ width: number; height: number } | null>;
}

// 修改 calculateFontSize 函数
const calculateFontSize = (item: OcrItem) => {
    const boxHeight = Math.round(item.box[2][1] - item.box[0][1]);
    return boxHeight * 0.85;  // 从 0.95 调整为 0.85，缩小 10%
};

// 调整字符宽度系数
const getCharWidth = (char: string) => {
    // 汉字宽度
    if (/[\u4e00-\u9fa5]/.test(char)) {
        return 0.8; // 汉字宽度系数调整为 1.0
    }
    // 数字和字母宽度
    if (/[0-9a-zA-Z]/.test(char)) {
        return 0.6; // 数字和字母宽度系数调整为 0.6
    }
    // 其他字符
    return 0.6; // 默认宽度系数调整为 0.8
};

// 优化计算框宽度的逻辑
const calculateBoxWidth = (text: string, fontSize: number) => {
    let totalWidth = 0;
    for (const char of text) {
        totalWidth += getCharWidth(char) * fontSize;
    }
    const charSpacing = 0.5; // 减少字符间距
    totalWidth += (text.length - 1) * charSpacing; // 计算总字符间距
    return totalWidth; // 直接返回计算的总宽度，不再限制最大宽度
};


// 测试腾讯云配置
export async function testTencentOCR(secretId: string, secretKey: string): Promise<boolean> {
    try {
        const result = await invoke<string>('tencent_ocr_test', { secretId, secretKey });
        console.log('测试腾讯云配置成功:', result);
        return true;
    } catch (error) {
        console.error('测试腾讯云配置失败:', error);
        return false;
    }
}

// 腾讯云 OCR 调用方法
export async function tencentOCR(imagePath: string) {
    try {
        // 直接调用 Rust 端的 OCR 方法
        const result = await invoke<string>('tencent_ocr', { imagePath });
        const parsedResult = JSON.parse(result);
        console.log(parsedResult)
        // 验证返回结果格式
        if (parsedResult.code !== 100 || !Array.isArray(parsedResult.data)) {
            throw new Error('Invalid OCR result format');
        }
        
        // 打印转换后的结果
        console.log('OCR 结果:', parsedResult.data);
        
        // 直接返回 Rust 处理好的结果
        return parsedResult;
    } catch (error) {
        console.error('腾讯云 OCR 调用失败:', error);
        throw error;
    }
}

// 重构 ocr 方法
export const ocr = async (options: OcrOptions) => {
    const {
        image_path,
        is_ocr,
        image_ocr,
        isTranslated,
        originalOcrData,
        showOcrPanel,
        label,
        resize,
        getSize
    } = options;

    if (image_path.value === '' || image_path.value === null) {
        alert('请先截图');
        return;
    }

    try {
        // 获取 OCR 模式
        const modeResult = await queryAuth(
            'system_config',
            "SELECT config_value FROM system_config WHERE config_key = 'ocr_mode'"
        ) as { config_value: string }[];

        const mode = modeResult[0]?.config_value || 'offline';

        let result: any;

        if (mode === 'online') {
            // 使用腾讯云 OCR
            result = await tencentOCR(image_path.value);
        } else {
            // 使用离线 OCR
            const engineResult = await queryAuth(
                'system_config',
                "SELECT config_value FROM system_config WHERE config_key = 'ocr_engine'"
            ) as { config_value: string }[];

            const engine = engineResult[0]?.config_value || 'RapidOCR';
            result = await invoke(
                engine === 'RapidOCR' ? 'ps_ocr' : 'ps_ocr_pd',
                {image_path: image_path.value}
            );
        }

        console.log('OCR 结果:', result);

        let parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

        // 因为结果是数组，取第一个元素
        const ocrData = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;

        if (ocrData && ocrData.code === 100 && Array.isArray(ocrData.data)) {
            // 适配腾讯云 OCR 的 box 格式
            ocrData.data = ocrData.data.map((item: any) => {
                const [x, y] = item.box[0]; // 取第一个点作为左上角坐标
                const boxWidth = calculateBoxWidth(item.text, calculateFontSize(item)); // 动态计算框宽度

                const boxHeight = Math.abs(item.box[1][1] - item.box[2][1]); // 根据实际坐标计算高度
                // 取绝对值，防止负值
                console.log('boxHeight:', boxHeight)
                return {
                    ...item,
                    box: [
                        [x, y], // 左上角
                        [x + boxWidth, y], // 右上角
                        [x + boxWidth, y + boxHeight], // 右下角
                        [x, y + boxHeight] // 左下角
                    ]
                };
            });

            console.log('OCR completed, data:', ocrData)
            image_ocr.value = ocrData
            is_ocr.value = true
            originalOcrData.value = null
            isTranslated.value = false
            await emit('translationStatus', false)

            // OCR 成功后发送事件切换到取消绘图状态并禁用工具栏
            await emit('toolbar-tool-change', {
                tool: null,  // null 表示取消绘图状态
                targetLabel: label,
                disableTools: true  // 添加标志表示禁用工具
            })

            // 根据面板显示状态调整窗口大小
            const size = await getSize()
            if (size !== null && showOcrPanel.value) {
                resize(size.width + 300, size.height)
            }
        } else {
            console.error('数据格式不正确:', ocrData);
        }
    } catch (error) {
        console.error('OCR 处理错误:', error);
        alert('OCR 处理失败: ' + error);
    }
};

import { invoke } from "@tauri-apps/api/core";

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

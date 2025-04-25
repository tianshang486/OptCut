import {  updateAuth } from '@/windows/dbsql';
import { invoke } from '@tauri-apps/api/core';

// 获取百度翻译配置
// export const getBaiduConfig = async () => {
//   const [appIdResult, secretKeyResult] = await Promise.all([
//     queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'baidu_app_id'"),
//     queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'baidu_secret_key'")
//   ]) as { config_value: string }[][];
//
//   const appId = appIdResult[0]?.config_value || '';
//   const secretKey = secretKeyResult[0]?.config_value || '';
//
//   return { appId, secretKey };
// };

// 测试百度翻译配置
export const testBaiduConfigApi = async (appId: string, secretKey: string): Promise<boolean> => {
  try {
    console.log('测试百度翻译配置:', appId, secretKey)
    const result = await invoke('baidu_translate_test', {
      text: 'test',
      from: 'auto',
      to: 'zh',
      appId,
      secretKey
    });
    console.log('测试百度翻译配置结果:', result);
    return !JSON.parse(result as string).error_code;
  } catch (error) {
    console.error('测试百度翻译配置失败:', error);
    return false;
  }
};

// 保存百度翻译配置
export const saveBaiduConfigApi = async (appId: string, secretKey: string,translate_enabled: boolean): Promise<void> => {
  try {
    await Promise.all([
      updateAuth('system_config', { config_value: appId }, { config_key: 'baidu_app_id' }),
      updateAuth('system_config', { config_value: secretKey }, { config_key: 'baidu_secret_key' }),
        updateAuth('system_config', { config_value: translate_enabled }, { config_key: 'translate_enabled' }),
    ]);
  } catch (error) {
    console.error('保存百度翻译配置失败:', error);
  }
};

// 批量翻译调用
export const translateTexts = async (texts: string[], from: string = 'auto', to: string = 'zh'): Promise<string[]> => {
  try {
    // 检查输入文本是否有效
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error('翻译文本不能为空');
    }

    // 合并文本，用换行符分隔
    const combinedText = texts.join('\n');

    // 检查总字符数是否超过限制
    if (combinedText.length > 6000) {
      throw new Error('单次请求字符数超过6000限制');
    }

    const result = await invoke('baidu_translate', {
      text: combinedText,
      from,
      to
    });
    
    console.log('百度翻译原始结果:', result);
    
    const parsedResult = JSON.parse(result as string);
    
    // 检查错误码
    if (parsedResult.error_code) {
      throw new Error(`百度翻译错误: ${parsedResult.error_msg || '未知错误'}`);
    }
    
    // 检查翻译结果是否有效
    if (!parsedResult.trans_result || !parsedResult.trans_result[0]) {
      throw new Error('翻译结果无效');
    }

    // 拆分翻译结果
    const translatedTexts = parsedResult.trans_result.map((item: any, index: number) => {
      // 检查源文本是否匹配
      if (item.src !== texts[index]) {
        console.warn(`翻译结果顺序不匹配: 期望 ${texts[index]}, 实际 ${item.src}`);
      }
      return item.dst;
    });
    
    return translatedTexts;
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
};
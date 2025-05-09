import {queryAuth, updateAuth} from '@/utils/dbsql';
import {invoke} from '@tauri-apps/api/core';
import {emit} from "@tauri-apps/api/event";
import {Windows} from "@/windows/create.ts";

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
    return parsedResult.trans_result.map((item: any, index: number) => {
      // 检查源文本是否匹配
      if (item.src !== texts[index]) {
        console.warn(`翻译结果顺序不匹配: 期望 ${texts[index]}, 实际 ${item.src}`);
      }
      return item.dst;
    });
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
};
const NewWindows = new Windows();
async function translate_window(text: string) {
  try {
    // 获取鼠标位置
    const mousePositionStr = await invoke('get_mouse_position');
    const mousePosition = JSON.parse(mousePositionStr as string);
    
    // 获取所有显示器信息
    const monitorsStr = await invoke('get_all_monitors');
    const monitors = JSON.parse(monitorsStr as string);
    
    // 找到鼠标所在的显示器
    const currentMonitor = monitors.find((monitor: any) => {
      return mousePosition.x >= monitor.x 
        && mousePosition.x < (monitor.x + monitor.width)
        && mousePosition.y >= monitor.y 
        && mousePosition.y < (monitor.y + monitor.height);
    });

    if (!currentMonitor) {
      throw new Error('找不到当前显示器');
    }

    // 计算窗口位置，确保窗口不会超出屏幕
    const windowWidth = 450;
    const windowHeight = 800;
    
    let x = mousePosition.x;
    let y = mousePosition.y;

    // 确保窗口右边界不超出显示器
    if (x + windowWidth > currentMonitor.x + currentMonitor.width) {
      x = currentMonitor.x + currentMonitor.width - windowWidth;
    }

    // 确保窗口下边界不超出显示器
    if (y + windowHeight > currentMonitor.y + currentMonitor.height) {
      y = currentMonitor.y + currentMonitor.height - windowHeight;
    }

    await NewWindows.createWin({
      label: 'translate_window',
      title: '翻译',
      url: `/#/translate-interfaces?text=${encodeURIComponent(text)}`,
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      resizable: true,
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focus: true,
    }, {});
  } catch (error) {
    console.error('创建翻译窗口失败:', error);
  }
}
export async function  translateTheText(sourceFrom: string = 'fixed',translateTheText: string = '') {
  // 获取当前的语言设置
  const [fromResult, toResult] = await Promise.all([
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_from'"),
    queryAuth('system_config', "SELECT config_value FROM system_config WHERE config_key = 'translate_to'")
  ]);
  console.log('翻译', fromResult)
  const from = fromResult[0]?.config_value || '错误';
  const to = toResult[0]?.config_value || '错误';
  console.log('翻译', from + '->' + to)
  // 发送翻译事件，包含语言设置
  if (sourceFrom === 'fixed') {
    await emit('translateText', { from, to });
  } else if (sourceFrom === 'translate') {
    await translate_window(translateTheText);
  }

}
import {createI18n} from 'vue-i18n';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import {getSystemConfig} from '@/utils/dbsql';

const messages = {
    'en': en,
    'zh-CN': zhCN
};

// 动态加载语言配置
const loadLanguage = async () => {
  return await getSystemConfig('language') || 'zh-CN';
};

const i18n = createI18n({
    locale: await loadLanguage(), // 默认语言
    fallbackLocale: 'en', // 回退语言
    messages
});

export default i18n;
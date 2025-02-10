use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: "
            PRAGMA cache_size = -20000;  -- 20MB cache
            PRAGMA temp_store = MEMORY;  -- 使用内存存储临时表
            
            -- 创建快捷键表
            CREATE TABLE IF NOT EXISTS shortcutKey (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shortcut_key TEXT NOT NULL,
                function TEXT NOT NULL UNIQUE
            );
            INSERT INTO shortcutKey (shortcut_key, function) VALUES
                ('ctrl+alt+q', 'default'),
                ('ctrl+alt+w', 'fixed_copy'),
                ('ctrl+alt+e', 'fixed_ocr');
            
            -- 创建窗口池表
            CREATE TABLE IF NOT EXISTS windowPool (
                id INTEGER PRIMARY KEY,
                windowName TEXT NOT NULL UNIQUE,
                imgUrl TEXT NULL,
                imgBase64 TEXT NULL,
                state INTEGER NOT NULL DEFAULT 0,  -- 0: 未使用, 1: 使用中, 2: 预留
                if_show INTEGER NOT NULL DEFAULT 1,  -- 0: 不显示, 1: 显示
                CREATE_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                UPDATE_TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            INSERT INTO windowPool (windowName) VALUES
                ('fixed_0'),('fixed_1'),('fixed_2'),('fixed_3'),('fixed_4'),
                ('fixed_5'),('fixed_6'),('fixed_7'),('fixed_8'),('fixed_9'),
                ('fixed_10'),('fixed_11'),('fixed_12'),('fixed_13'),('fixed_14'),
                ('fixed_15'),('fixed_16'),('fixed_17'),('fixed_18'),('fixed_19'),
                ('fixed_20');
            CREATE TRIGGER IF NOT EXISTS update_windowPool_timestamp 
            AFTER UPDATE ON windowPool
            BEGIN
                UPDATE windowPool SET UPDATE_TIME = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;
            
            -- 创建系统配置表
            CREATE TABLE IF NOT EXISTS system_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                config_key TEXT NOT NULL UNIQUE,  -- 配置项（如 version, language 等）
                config_value TEXT NOT NULL,       -- 配置值（如 1.0.0, zh-CN 等）
                extra TEXT,                       -- 额外预留项
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            CREATE TRIGGER IF NOT EXISTS update_system_config_timestamp 
            AFTER UPDATE ON system_config
            BEGIN
                UPDATE system_config SET updated_at = CURRENT_TIMESTAMP
                WHERE id = NEW.id;
            END;
            
            -- 插入默认配置
            INSERT INTO system_config (config_key, config_value, extra) VALUES
                ('version', '1.0.0', '版本号'),
                ('language', 'zh-CN', '界面语言'),
                ('ocr_engine', 'RapidOCR', '离线OCR引擎'),
                ('ocr_mode', 'offline', 'OCR模式：online/offline'),
                ('tencent_secret_id', '', '腾讯云SecretId'),
                ('tencent_secret_key', '', '腾讯云SecretKey'),
                ('tencent_ocr_enabled', 'false', '腾讯云OCR是否启用'),
                ('baidu_app_id', '', '百度翻译App ID'),
                ('baidu_secret_key', '', '百度翻译Secret Key'),
                ('translate_enabled', 'false', '翻译功能是否启用');
            
            -- 创建翻译历史表
            CREATE TABLE IF NOT EXISTS translate_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_text TEXT NOT NULL,
                translated_text TEXT NOT NULL,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        ",
        kind: MigrationKind::Up,
    }]
}

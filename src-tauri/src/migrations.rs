use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "PRAGMA cache_size = -20000;  -- 20MB cache
                  PRAGMA temp_store = MEMORY;  -- 使用内存存储临时表
                  
                  CREATE TABLE IF NOT EXISTS shortcutKey (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      shortcutKey TEXT NOT NULL ,
                      function TEXT NOT NULL UNIQUE
                  );
                  INSERT INTO shortcutKey (shortcutKey, function) VALUES
                      ('ctrl+alt+q', 'default'),
                      ('ctrl+alt+w', 'fixed_copy'),
                      ('ctrl+alt+e', 'fixed_ocr');
                  
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
                  END;",
            kind: MigrationKind::Up,
        }
    ]
}


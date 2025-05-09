use crate::utils::sql::{get_shortcut_keys, init_db};
use serde_json::json;
use sqlx::SqlitePool;
use std::sync::OnceLock;

static DB_POOL: OnceLock<SqlitePool> = OnceLock::new();

pub async fn read_conf() -> Result<serde_json::Value, String> {
    // 获取或初始化数据库连接池
    let pool = if let Some(p) = DB_POOL.get() {
        p
    } else {
        let p = init_db().await?;
        DB_POOL.set(p.clone()).unwrap();
        DB_POOL.get().unwrap()
    };

    // 查询快捷键配置
    let shortcut_keys = get_shortcut_keys(&pool).await?;

    // 构建配置对象
    let config = json!({
        "shortcut_key": {
            "default": shortcut_keys.iter().find(|&x| x.function == "default").map_or("", |x| &x.shortcut_key),
            "fixed_copy": shortcut_keys.iter().find(|&x| x.function == "fixed_copy").map_or("", |x| &x.shortcut_key),
            "fixed_ocr": shortcut_keys.iter().find(|&x| x.function == "fixed_ocr").map_or("", |x| &x.shortcut_key),
            "paste_img" : shortcut_keys.iter().find(|&x| x.function == "paste_img").map_or("", |x| &x.shortcut_key),
            "select_text" : shortcut_keys.iter().find(|&x| x.function == "select_text").map_or("", |x| &x.shortcut_key),
        }
    });

    Ok(config)
}

use crate::utils::sql::{init_db, get_shortcut_keys};
use serde_json::json;

pub async fn read_conf() -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let pool = init_db().await?;

    // 读取快捷键配置
    let shortcut_keys = get_shortcut_keys(&pool).await?;

    // 构建 JSON 结构
    let json_value = json!({
        "shortcut_key": {
            "default": shortcut_keys.iter().find(|k| k.function == "default").map(|k| k.shortcut_key.as_str()).unwrap_or("ctrl+alt+q"),
            "fixed_copy": shortcut_keys.iter().find(|k| k.function == "fixed_copy").map(|k| k.shortcut_key.as_str()).unwrap_or("ctrl+alt+w"),
            "fixed_ocr": shortcut_keys.iter().find(|k| k.function == "fixed_ocr").map(|k| k.shortcut_key.as_str()).unwrap_or("ctrl+alt+e"),
        }
    });

    println!("{:?}", json_value);
    Ok(json_value)
}

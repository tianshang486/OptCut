use std::sync::Arc;
use serde_json::json;
use crate::utils::config::{Config, CONFIG};

pub async fn read_conf() -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let config: &Arc<Config> = &*CONFIG;
    
    let json_value = json!({
        "shortcut_key": config.shortcut_key,
        "database": config.database,
        "server": config.server
    });

    println!("配置信息: {}", json_value);
    Ok(json_value)
}



use std::sync::Arc;
use serde_json::json;
use tauri::utils::config::parse::ConfigError;
use crate::utils::config::Config;
use crate::utils::config::CONFIG;

pub async fn read_conf() -> Result<serde_json::Value, ConfigError> {
    // let config_str = std::fs::read_to_string("assets/config.toml").unwrap();
    // let config: Config = toml::from_str(&config_str).unwrap();
    let config:&Arc<Config> = &*CONFIG;
    use_config(&config);

    // 转为json格式返回给前端
    let json_value = json!({
        "shortcut_key": config.shortcut_key,
        "database": config.database,
        "server": config.server
    });

    println!("json_str: {}", json_value);
    Ok(json_value)
}

fn use_config(config: &Config) {
    println!("Database server: {}", config.database.server);
    println!("Server port: {}", config.server.port);
    println!("Server shortcut_key: {} {} {}", config.shortcut_key.screenshot_copy, config.shortcut_key.screenshot_fixed, config.shortcut_key.screenshot_fixed_ocr);
}
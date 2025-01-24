// // config.rs
// use dirs;
// use lazy_static::lazy_static;
// use serde::{Deserialize, Serialize};
// use std::sync::Arc;
//
// // 在文件顶部添加这些常量
// const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
// const APP_NAME: &str = env!("CARGO_PKG_NAME");
// const APP_AUTHOR: &str = env!("CARGO_PKG_AUTHORS");
// const APP_DESCRIPTION: &str = env!("CARGO_PKG_DESCRIPTION");
//
// #[derive(Deserialize, Serialize, Clone)]
// pub struct Config {
//     pub database: Database,
//     pub server: Server,
//     pub shortcut_key: ShortcutKey,
//     pub version: String,
//     pub author: String,
//     pub name: String,
//     pub description: String,
// }
//
// #[derive(Deserialize, Serialize, Clone)]
// pub struct Database {
//     pub server: String,
//     pub ports: Vec<u32>,
//     pub connection_max: i64,
// }
//
// #[derive(Deserialize, Serialize, Clone)]
// pub struct Server {
//     pub port: u32,
//     pub ip: String,
// }
//
// // 截图快捷键
// #[derive(Deserialize, Serialize, Clone)]
// pub struct ShortcutKey {
//     pub screenshot_fixed: String,
//     pub screenshot_copy: String,
//     pub screenshot_fixed_ocr: String,
// }
//
// fn merge(target: &mut serde_json::Value, source: &serde_json::Value) {
//     if let (Some(target_obj), Some(source_obj)) = (target.as_object_mut(), source.as_object()) {
//         for (key, source_value) in source_obj {
//             match target_obj.get_mut(key) {
//                 Some(target_value) => {
//                     // 如果两边都是对象，递归合并
//                     if target_value.is_object() && source_value.is_object() {
//                         merge(target_value, source_value);
//                     } else {
//                         // 如果目标值不存在或不是对象，直接使用源值
//                         *target_value = source_value.clone();
//                     }
//                 }
//                 None => {
//                     // 如果键不存在，直接插入
//                     target_obj.insert(key.clone(), source_value.clone());
//                 }
//             }
//         }
//     }
// }
//
// lazy_static! {
//     pub static ref CONFIG: Arc<Config> = {
//         // 获配置文件路径
//         let config_path = dirs::config_dir()
//             .expect("Failed to get config directory")
//             .join("OptCut")
//             .join("config.json");
//
//         // 确保目录存在
//         if let Some(parent) = config_path.parent() {
//             std::fs::create_dir_all(parent)
//                 .expect("Failed to create config directory");
//         }
//
//         // 默认配置
//         let default_config = Config {
//             author: APP_AUTHOR.to_string(),
//             name: APP_NAME.to_string(),
//             version: APP_VERSION.to_string(),
//             description: APP_DESCRIPTION.to_string(),
//             database: Database {
//                 server: "192.168.1.1".to_string(),
//                 ports: vec![8001],
//                 connection_max: 5000,
//             },
//             server: Server {
//                 port: 8080,
//                 ip: "10.0.0.1".to_string(),
//             },
//             shortcut_key: ShortcutKey {
//                 screenshot_fixed: "Ctrl+Alt+W".to_string(),
//                 screenshot_copy: "Ctrl+Alt+Q".to_string(),
//                 screenshot_fixed_ocr: "Ctrl+Alt+E".to_string(),
//             },
//         };
//
//         if !config_path.exists() {
//             // 创建新配置文件
//             let config_str = serde_json::to_string_pretty(&default_config)
//                 .expect("Failed to serialize default config");
//             std::fs::write(&config_path, config_str)
//                 .expect("Failed to write default config file");
//         } else {
//             // 读取现有配置
//             let current_config_str = std::fs::read_to_string(&config_path)
//                 .expect("Failed to read config file");
//             let mut current_config: serde_json::Value = serde_json::from_str(&current_config_str)
//                 .expect("Failed to parse config file");
//
//             // 检查版本号
//             if let Some(version) = current_config.get("version") {
//                 if version.as_str().unwrap_or("") != APP_VERSION {
//                     let default_value = serde_json::to_value(&default_config)
//                         .expect("Failed to convert default config to value");
//
//                     // 合并配置
//                     merge(&mut current_config, &default_value);
//
//                     // 确保更新版本号
//                     if let Some(obj) = current_config.as_object_mut() {
//                         obj.insert("version".to_string(), APP_VERSION.into());
//                     }
//
//                     let config_str = serde_json::to_string_pretty(&current_config)
//                         .expect("Failed to serialize merged config");
//                     std::fs::write(&config_path, config_str)
//                         .expect("Failed to write merged config file");
//                 }
//             }
//         }
//
//         // 读取最终配置
//         let config_str = std::fs::read_to_string(&config_path)
//             .expect("Failed to read final config file");
//         Arc::new(serde_json::from_str(&config_str)
//             .expect("Failed to parse final config file"))
//     };
// }

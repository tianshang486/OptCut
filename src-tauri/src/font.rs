use font_kit::source::SystemSource;
use serde::Serialize;
use tauri::command;

#[derive(Debug, Serialize)]
pub struct FontInfo {
    name: String,
    is_system: bool,
}

#[command]
pub fn get_system_fonts() -> Vec<FontInfo> {
    let mut fonts = Vec::new();

    // 添加默认字体选项
    fonts.push(FontInfo {
        name: "默认".to_string(),
        is_system: true,
    });

    // 获取系统字体
    let source = SystemSource::new();
    if let Ok(all_families) = source.all_families() {
        for family_name in all_families {
            if !fonts.iter().any(|f| f.name == family_name) {
                fonts.push(FontInfo {
                    name: family_name,
                    is_system: true,
                });
            }
        }
    }

    // 排序，确保"默认"在第一位
    fonts.sort_by(|a, b| {
        if a.name == "默认" {
            std::cmp::Ordering::Less
        } else if b.name == "默认" {
            std::cmp::Ordering::Greater
        } else {
            a.name.cmp(&b.name)
        }
    });

    fonts
}

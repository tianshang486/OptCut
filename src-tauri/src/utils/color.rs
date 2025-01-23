use image::GenericImageView;
use std::env;
use std::path::Path;
fn normalized(filename: &str) -> String {
    filename
        .replace("|", "")
        .replace("\\", "")
        .replace(":", "")
        .replace("/", "")
}

pub fn get_pixel_color(x: i32, y: i32) -> Result<String, String> {
    let image_path = env::temp_dir()
        .join(format!("{}.png", normalized("AGCut")))
        .to_string_lossy()
        .to_string();
    let image_path = Path::new(&image_path);

    // 读取图片
    let img = image::open(image_path).map_err(|e| e.to_string())?;

    // 处理 x 坐标
    let x_new: i32 = if x < 0 {
        img.width() as i32 + x
    } else if x >= img.width() as i32 {
        x - img.width() as i32
    } else {
        x
    };

    // 处理 y 坐标
    let y_new: i32 = if y < 0 {
        img.height() as i32 + y
    } else if y >= img.height() as i32 {
        y - img.height() as i32
    } else {
        y
    };

    // 确保坐标为非负数
    let img_x = x_new.max(0) as u32;
    let img_y = y_new.max(0) as u32;

    // 获取像素颜色
    let pixel = img.get_pixel(img_x, img_y);
    // println!("坐标: ({}, {}) -> ({}, {}), 颜色: #{:02x}{:02x}{:02x}",
    //          x, y, img_x, img_y, pixel[0], pixel[1], pixel[2]);

    // 转换为十六进制颜色格式
    Ok(format!("#{:02x}{:02x}{:02x}", pixel[0], pixel[1], pixel[2]))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_pixel_color() {
        // 测试正常坐标
        let result = get_pixel_color(100, 100);
        assert!(result.is_ok());
        println!("正常坐标: {:?}", result.unwrap());

        // 测试负坐标
        let result = get_pixel_color(-1, -1);
        assert!(result.is_ok());
        println!("负坐标: {:?}", result.unwrap());

        // 测试超出范围的坐标
        let result = get_pixel_color(10000, 10000);
        assert!(result.is_ok());
        println!("超出范围: {:?}", result.unwrap());
    }
}

// use arboard::ImageData;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use image::ImageReader;
use image::{self};
use std::io::Cursor;
use std::path::Path;
// 使用标准的 Base64 编码引擎

pub fn base64_encode(bytes: &[u8]) -> String {
    STANDARD.encode(bytes)
}

pub fn base64_decode(base64: &str) -> Vec<u8> {
    STANDARD.decode(base64).unwrap()
}


// pub fn rgba8_to_base64(img: &ImageData) -> String {
//     let mut bytes: Vec<u8> = Vec::new();
//     image::codecs::png::PngEncoder::new(BufWriter::new(Cursor::new(&mut bytes)))
//         .write_image(
//             &img.bytes,
//             img.width as u32,
//             img.height as u32,
//             ExtendedColorType::from(image::ColorType::Rgba8),
//         )
//         .unwrap();
//     base64_encode(bytes.as_slice())
// }

// pub fn rgba8_to_jpeg_base64(img: &ImageData, quality: u8) -> String {
//     let mut bytes: Vec<u8> = Vec::new();
//     image::codecs::jpeg::JpegEncoder::new_with_quality(
//         BufWriter::new(Cursor::new(&mut bytes)),
//         quality,
//     )
//         .write_image(
//             &img.bytes,
//             img.width as u32,
//             img.height as u32,
//             ExtendedColorType::from(image::ColorType::Rgba8),
//         )
//         .unwrap();
//     base64_encode(bytes.as_slice())
// }
//
// pub fn base64_to_rgba8(base64: &str) -> Result<ImageData, String> {
//     let bytes = base64_decode(base64);
//     let reader =
//         ImageReader::with_format(BufReader::new(Cursor::new(bytes)), image::ImageFormat::Png);
//     match reader.decode() {
//         Ok(img) => {
//             let rgba = img.into_rgba8();
//             let (width, height) = rgba.dimensions();
//             Ok(ImageData {
//                 width: width as usize,
//                 height: height as usize,
//                 bytes: rgba.into_raw().into(),
//             })
//         }
//         Err(_) => Err("Failed to decode base64 image".into()),
//     }
// }

pub fn image_to_base64(path: &Path) -> Result<String, image::ImageError> {
    // 使用 ImageReader 打开图像文件
    let img = ImageReader::open(path)?.decode()?;

    // 将图像转换为 PNG 格式的字节流
    let mut bytes: Vec<u8> = Vec::new();
    img.write_to(&mut Cursor::new(&mut bytes), image::ImageFormat::Png)?;

    // 使用 base64 crate 的 Engine::encode 方法将字节流编码为 Base64 字符串
    let base64_string = STANDARD.encode(bytes.as_slice());

    Ok(base64_string)
}
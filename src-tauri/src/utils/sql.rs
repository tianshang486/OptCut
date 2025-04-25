use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::env;

// 初始化数据库和配置表
pub async fn init_db() -> Result<SqlitePool, String> {
    // 获取 Roaming 目录路径
    let roaming_dir = env::var("APPDATA").expect("Failed to get APPDATA environment variable");

    // 构建数据库目录路径
    let app_dir = format!("{}\\com.OptCut.app", roaming_dir);
    // 构建数据库路径
    // 构建数据库路径
    let db_path = format!("{}\\OptCut.db", app_dir);

    // 连接数据库
    let database_url = format!("sqlite:{}", db_path);
    let pool = SqlitePool::connect(&database_url)
        .await
        .map_err(|e| e.to_string())?;
    print!("Connected to database: {}", &database_url);
    // 打印数据库有哪些表
    let tables: Vec<String> = query_tables(&pool).await?;
    println!("Tables: {:?}", tables);
    Ok(pool)
}

// 配置表结构
#[derive(FromRow, Serialize, Deserialize)]
pub struct Config {
    pub id: i32,
    pub key: String,
    pub value: String,
}
// 读取配置项
pub async fn get_config(pool: &SqlitePool, key: &str) -> Result<Option<String>, String> {
    let config: Option<Config> = sqlx::query_as("SELECT * FROM config WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(config.map(|c| c.value))
}

// 查询数据库中的表
pub async fn query_tables(pool: &SqlitePool) -> Result<Vec<String>, String> {
    #[derive(FromRow)]
    struct TableName {
        name: String,
    }

    let tables: Vec<TableName> =
        sqlx::query_as("SELECT name FROM sqlite_master WHERE type='table'")
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    let table_names: Vec<String> = tables.into_iter().map(|row| row.name).collect();
    Ok(table_names)
}

// 写入或更新配置项
pub async fn set_config(pool: &SqlitePool, key: &str, value: &str) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT INTO config (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
        "#,
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(FromRow)]
struct User {
    id: i32,
    name: String,
}

// 快捷键表结构
#[derive(FromRow, Serialize, Deserialize)]
pub struct ShortcutKey {
    pub id: i32,
    pub shortcut_key: String,
    pub function: String,
}

// 读取快捷键配置
pub async fn get_shortcut_keys(pool: &SqlitePool) -> Result<Vec<ShortcutKey>, String> {
    let shortcut_keys: Vec<ShortcutKey> = sqlx::query_as("SELECT * FROM shortcutKey")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(shortcut_keys)
}

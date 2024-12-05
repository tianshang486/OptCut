import Database from "@tauri-apps/plugin-sql";


// 初始化数据库连接
async function initDb() {
    // sqlite数据库，路径相对于tauri::api::path::BaseDirectory::App
    const db = await Database.load(
        "sqlite:example.db"
    );
    return db;
}

// 创建表
export async function createAuthTable() {
    const db = await initDb();
    await db.execute(`
    CREATE TABLE IF NOT EXISTS shortcutKey (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shortcutKey TEXT NOT NULL,
      function TEXT NOT NULL
    )
  `);
}

// 插入数据
export async function insertAuth(userId: string, scope: string) {
    const db = await initDb();
    await db.execute(`
    INSERT INTO auth (userId, scope) VALUES (?, ?)
  `, [userId, scope]);
}

// 查询数据
export async function queryAuth() {
    const db = await initDb();
    return await db.select("SELECT * FROM auth");
}

// 更新数据
export async function updateAuth(id: number, userId: string, scope: string) {
    const db = await initDb();
    await db.execute(`
    UPDATE auth SET userId = ?, scope = ? WHERE id = ?
  `, [userId, scope, id]);
}

// 删除数据
export async function deleteAuth(id: number) {
    const db = await initDb();
    await db.execute(`
    DELETE FROM auth WHERE id = ?
  `, [id]);
}
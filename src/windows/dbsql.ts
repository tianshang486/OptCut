import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

async function initDatabase() {
    try {
        db = await Database.load("sqlite:OptCut.db");
        console.log('数据库连接成功');
        return db;
    } catch (error) {
        console.error('数据库连接错误:', error);
        throw error;
    }
}


// 查询数据
export async function queryAuth(table: string, sql?: string) {
    try {
        if (!db) {
            await initDatabase();
        }

        return await db!.select(sql || `SELECT * FROM ${table}`);
    } catch (error) {
        console.error('数据库查询错误:', error);
        return []; 
    }
}

// 插入数据
export async function insertAuth(table: string, data: {[key: string]: any}) {
    if (!db) {
        await initDatabase();
    }
    await db!.execute(`
    INSERT INTO ${table} (${Object.keys(data).join(',')}) VALUES (${Object.values(data).join(',')})
    `, [data]);
}

// 更新数据
export async function updateAuth(table: string, data: {[key: string]: any}) {
    if (!db) {
        await initDatabase();
    }
    await db!.execute(`
    UPDATE ${table} SET ${Object.keys(data).join(',')} = ${Object.values(data).join(',')}
    `, [data]);
}

// 删除数据
export async function deleteAuth(table: string, data: {[key: string]: any}) {
    if (!db) {
        await initDatabase();
    }
    await db!.execute(`
    DELETE FROM ${table} WHERE ${Object.keys(data).join(',')} = ${Object.values(data).join(',')}
    `, [data]);
}
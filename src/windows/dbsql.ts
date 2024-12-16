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
    if (!table || !data || Object.keys(data).length === 0) {
        throw new Error('表名和数据不能为空');
    }
    
    if (!db) {
        await initDatabase();
    }
    const placeholders = Object.keys(data).map(() => '?').join(',');
    await db!.execute(`
    INSERT INTO ${table} (${Object.keys(data).join(',')}) 
    VALUES (${placeholders})
    `, Object.values(data));
}

// 更新数据
export async function updateAuth(table: string, data: {[key: string]: any}, where: {[key: string]: any }) {
    if (!table || !data || !where || Object.keys(data).length === 0 || Object.keys(where).length === 0) {
        throw new Error('表名、更新数据和条件不能为空');
    }

    if (!db) {
        await initDatabase();
    }
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(',');
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ')
    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    console.log(sql, [...Object.values(data),...Object.values(where)])
    await db!.execute( sql, [...Object.values(data),...Object.values(where)]);
}

// 删除数据
export async function deleteAuth(table: string, where: {[key: string]: any}) {
    if (!table || !where || Object.keys(where).length === 0) {
        throw new Error('表名和删除条件不能为空');
    }

    if (!db) {
        await initDatabase();
    }
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    await db!.execute(`
    DELETE FROM ${table} 
    WHERE ${whereClause}
    `, Object.values(where));
}
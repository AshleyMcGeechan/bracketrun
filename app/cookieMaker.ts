'use server'
 
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto';


const Database = require('better-sqlite3');
 
export async function createCookie() {
    const cookieStore = await cookies();
    const hasCookie = cookieStore.has("user_id");
    const db = new Database('./dbs/users.db');
    if(!hasCookie){
        const user_id : string = randomUUID();
        console.log(`ID ${user_id} added to database.`)
        db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run(user_id, " ", 0, 0, " ");

        cookieStore.set({
            name: 'user_id',
            value: user_id,
            httpOnly: true,
            expires: Date.now() + 99999*24*60*60*1000,
            path: '/',
        })
    } else {
        const uuid = cookieStore.get("user_id")?.value;
        db.prepare("INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?, ?)").run(uuid, " ", 0, 0, " ");
    };
    db.close();
    return(cookieStore.get("user_id"));
}
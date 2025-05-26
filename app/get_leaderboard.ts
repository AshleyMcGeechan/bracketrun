'use server'

import { unstable_cache } from 'next/cache';

const Database = require('better-sqlite3');

export const getLeaderboard = unstable_cache(
  async() => {
    const db3 = new Database('./dbs/users.db');

    const users = db3.prepare("SELECT username, wins, losses FROM users").all();

    db3.close();

    var sorted_users = users.sort(function(a:any,b:any) {return b["wins"] - a["wins"]});
    sorted_users = sorted_users.slice(0,10);

    return { sorted_users }
  },
  ['local_data'],
  {revalidate: 60, tags: ['local_data']}
)
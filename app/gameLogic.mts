"use server"
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const db = new Database("./dbs/melee_player_database.db");

const db_queries = {
    getLocalData(){
        const db2 = new Database('./dbs/playersdb.db');

        // Perform a database query to retrieve all items from the "items" table
        const players= db2.prepare("SELECT * FROM players").all();
        
        db2.close()
    
        const db3 = new Database('./dbs/tournamentsdb.db');
    
        const tournaments = db3.prepare("SELECT key, cleaned_name, start, city FROM tournament_info").all();
    
        db3.close();
    
        return { players, tournaments }
    },

    getPlayer(player_id:string){

        const items = db.prepare(`SELECT * FROM players WHERE player_id = ?`).bind(player_id).get();

        return items
    },

    getTournament(tournament_key:string){

        const items = db.prepare(`SELECT * FROM tournament_info WHERE key = ?`).bind(tournament_key).get();

        return items
    },

    getSet(player_ids: string[], tournament_key: string){
    
        const items = db.prepare(`SELECT * FROM sets WHERE p1_id IN (SELECT value from json_each(?)) AND p2_id IN (SELECT value from json_each(?)) AND tournament_key = ?`);

        const para_string = JSON.stringify(player_ids);
        const sets = items.all(para_string, para_string, tournament_key);
        
        return sets;
    },

    getStartingSet(){
        // Mango, Armada, Hungrybox, Mew2King, PPMD, Leffen, Plup, Axe, Hax, Shroomed, Wobbles,
        // Kirbykaze, SFAT, Westballz, Colbol, Wizzrobe, S2J, Zain, Amsa, Cody, Jmook, Slug,
        // Moky, Aklo, Joshman, Nicki

        const starting_player_ids = ["1000", "6189", "1004", "1003", "1002", "4465", "15990", "16342", "1007", "1013", "30544",
                                    "1022", "1019", "1008", "1009", "1028", "1017", "6126", "1021", "19554", "16105", "50259",
                                    "5080", "282096", "72157", "21553"                 
        ]

        const items = db.prepare(`SELECT * FROM sets WHERE p1_id IN ('${starting_player_ids.join("', '")}') AND p2_id IN ('${starting_player_ids.join("', '")}')`).all();
        return items;
    },

    insertUsername(uuid:string, username:string) {
        const db2 = new Database('./dbs/users.db');
        db2.prepare("UPDATE users set username = ? WHERE user_id = ?").bind(username, uuid).run();
        db2.close();
        console.log(`ID: ${uuid} with username ${username} updated.`)
    },

    insertWinLoss(winner:string, loser:string, game:string){
        const db2 = new Database('./dbs/users.db');
        db2.prepare("UPDATE users SET wins = wins + 1, games = games || ? WHERE user_id = ?").bind(game, winner).run();
        db2.prepare("UPDATE users SET losses = losses + 1, games = games || ? WHERE user_id = ?").bind(game, loser).run();
        db2.close();
    },
}

export default db_queries
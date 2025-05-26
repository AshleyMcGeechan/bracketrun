import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import db_queries from "./app/gameLogic.mts";
import { randomUUID } from 'crypto';
import { nameChecker } from "./app/name_checker.mts"
import { createRequire } from "module";
const require = createRequire(import.meta.url);


const fs = require('fs');
const extract = require('extract-zip')

const waitUntil = (condition:any, checkInterval=500) => {
    return new Promise<void>(resolve => {
        let interval = setInterval(() => {
            console.log("Waiting.");
            if (!condition()) return;
            clearInterval(interval);
            resolve();
        }, checkInterval)
    })
}

const dev = false;
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);



const app = next({ dev, hostname, port});
const handle = app.getRequestHandler();
var queue : string[] = []
var game_history : {[key:string] : {[key:string] : any}} = {}
var reconnecter : {[key:string] : string} = {}
const escapes = 1
const skips = 2
const top8s = 3
const local_data = db_queries.getLocalData();

app.prepare().then(() => {

    const httpServer = createServer(handle);
    const io = new Server(httpServer);
    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        var my_room : string = ""

        socket.on("check-reconnect", async (submitted:{uuid:string}) => {
            if(submitted && submitted.hasOwnProperty("uuid")){
                if(reconnecter.hasOwnProperty(submitted.uuid)){
                    my_room = reconnecter[submitted.uuid];
                    console.log(`User ${submitted.uuid} rejoined room ${my_room}`);
                    socket.join(my_room);
                    
                    var turn_check = game_history[my_room]["turn"]
                    var turn = game_history[my_room]["turn"];
                    const last_set = game_history[my_room]["sets"][game_history[my_room]["sets"].length - 1]
                    const assembled_set = await assembleSetData(last_set);
                    var send_string = buildString(assembled_set.player1, assembled_set.player2, assembled_set.tournament, last_set);
                    if(game_history[my_room]["players"][0]["id"] === submitted.uuid){
                        game_history[my_room]["players"][0]["socketid"] = socket.id;
                        socket.emit("details_accepted", {username: game_history[my_room]["players"][0]["username"]});
                        io.emit("player_reconnected", {player: game_history[my_room]["players"][0]["username"]});
                        socket.emit("starting_set", {   send_string, 
                                                        turn, 
                                                        player1: assembled_set.player1.tag, 
                                                        player2: assembled_set.player2.tag, 
                                                        tournament: assembled_set.tournament.cleaned_name
                        });
                        socket.emit("set_timer", {timer: game_history[my_room]["timecounter"]});
                    } else if(game_history[my_room]["players"][1]["id"] === submitted.uuid){
                        game_history[my_room]["players"][1]["socketid"] = socket.id;
                        socket.emit("details_accepted", {username: game_history[my_room]["players"][1]["username"]});
                        io.emit("player_reconnected", {player: game_history[my_room]["players"][1]["username"]});
                        socket.emit("starting_set", {   send_string, 
                                                        turn, 
                                                        player1: assembled_set.player1.tag, 
                                                        player2: assembled_set.player2.tag, 
                                                        tournament: assembled_set.tournament.cleaned_name
                        });
                        socket.emit("set_timer", {timer: game_history[my_room]["timecounter"]});
                    } else {
                        io.to(my_room).emit("reset");
                        io.to(my_room).emit("error_message", {send_string : "Server Error."});
                    }
                }
            }
        });


        socket.on("join-room", async (submitted:{uuid:string, username:string}) => {
            var random_set = null;
            var set_info = null;
            const obj_keys = {uuid: "", username: ""}
            
            var hasAll = Object.keys(obj_keys).every(Object.prototype.hasOwnProperty.bind(submitted));
            try{
                if(hasAll && !reconnecter.hasOwnProperty(submitted.uuid)){
                    const name_regex = submitted.username.replace(/[^a-zA-Z0-9]/g, "");
                    if (!nameChecker(submitted.username) && !nameChecker(name_regex) && submitted.username !== ""){
                        db_queries.insertUsername(submitted.uuid, submitted.username);
                        socket.emit("details_accepted", {username: submitted.username});
                        if (queue.length === 0){
                            const room_id : string = randomUUID();
                            queue.push(room_id);
                            my_room = room_id;
                            console.log(`Room ${my_room} created.`)
                            socket.join(my_room);
                            game_history[my_room] = {players: [], turn: 0, sets: []}
                            game_history[my_room]["players"].push({ id: submitted.uuid, 
                                                                    username: submitted.username,
                                                                    socketid: socket.id, 
                                                                    escape:escapes,
                                                                    skip:skips,
                                                                    top8: top8s,
                                                                });
                            game_history[my_room]["turn"] = 0;
                            game_history[my_room]["timer"] = {};
                            game_history[my_room]["timecounter"] = "X"
                            game_history[my_room]["timedout"] = false;
                            game_history[my_room]["links"] = {};
                            game_history[my_room]["skipcheck"] = false;
                            reconnecter[submitted.uuid] = my_room;
                            socket.emit("set_turn", 0);
                            console.log(`User ${submitted.uuid} joined room ${my_room}`);
                            io.to(my_room).emit("waiting_for_player");
                        } else {
                            my_room = queue.shift() ?? ""
                            console.log(`Room ${my_room} joined.`)
                            socket.join(my_room);
                            socket.emit("set_turn", 1);
                            reconnecter[submitted.uuid] = my_room;
                            game_history[my_room]["players"].push({ id: submitted.uuid, 
                                                                    username: submitted.username, 
                                                                    socketid: socket.id, 
                                                                    escape:escapes,
                                                                    skip:skips,
                                                                    top8: top8s,
                            });

                            console.log(`User ${submitted.uuid} joined room ${my_room}`);
                            io.to(my_room).emit("waiting_for_start");
    
                            console.log("Starting set query:");
                            var starting_sets = await db_queries.getStartingSet();
                            random_set = starting_sets[Math.floor(Math.random()*starting_sets.length)];
                            var assembled_set = await assembleSetData(random_set);
                            var send_string = buildString(assembled_set.player1, assembled_set.player2, assembled_set.tournament, random_set);
                            console.log(my_room);
                            game_history[my_room]["sets"] = [random_set];
                            game_history[my_room]["timecounter"] = "40";
                            game_history[my_room]["timetracker"] = setInterval(() => {visualCountdown(my_room)}, 1000);
                            game_history[my_room]["timer"] = setTimeout(() => {
                                io.to(my_room).emit("timeout_end", {winner: game_history[my_room]["players"][1]['username'], loser: game_history[my_room]["players"][0]['username']});
                                game_history[my_room]["timedout"] = true;
                                handleGameEnd(my_room, game_history[my_room]["players"][1]["id"], game_history[my_room]["players"][0]["id"]);
                            }, 45000);
                            console.log(send_string);
                            var turn = game_history[my_room]["turn"];
                            io.to(my_room).emit("starting_set", {   send_string, 
                                                            turn, 
                                                            player1: assembled_set.player1.tag, 
                                                            player2: assembled_set.player2.tag, 
                                                            tournament: assembled_set.tournament.cleaned_name
                                                        });

                        }


                    } else {
                        console.log(`Name Rejected: ${submitted.username}.`);
                        socket.emit("error_message", {send_string : "Please choose a different name."});
                    }
                } else if (hasAll) {
                    my_room = reconnecter[submitted.uuid];
                    console.log(`User ${submitted.uuid} rejoined room ${my_room}`);
                    socket.join(my_room);
                    
                    var turn_check = game_history[my_room]["turn"]
                    var turn = game_history[my_room]["turn"];
                    const last_set = game_history[my_room]["sets"][game_history[my_room]["sets"].length - 1]
                    const assembled_set = await assembleSetData(last_set);
                    var send_string = buildString(assembled_set.player1, assembled_set.player2, assembled_set.tournament, last_set);
                    if(game_history[my_room]["players"][0]["id"] === submitted.uuid){
                        game_history[my_room]["players"][0]["socketid"] = socket.id;
                        socket.emit("details_accepted", {username: game_history[my_room]["players"][0]["username"]});
                        io.emit("player_reconnected", {player: game_history[my_room]["players"][0]["username"]});
                        socket.emit("starting_set", {   send_string, 
                                                        turn, 
                                                        player1: assembled_set.player1.tag, 
                                                        player2: assembled_set.player2.tag, 
                                                        tournament: assembled_set.tournament.cleaned_name
                        });
                        socket.emit("set_timer", {timer: game_history[my_room]["timecounter"]});
                    } else if(game_history[my_room]["players"][1]["id"] === submitted.uuid){
                        game_history[my_room]["players"][1]["socketid"] = socket.id;
                        socket.emit("details_accepted", {username: game_history[my_room]["players"][1]["username"]});
                        io.emit("player_reconnected", {player: game_history[my_room]["players"][1]["username"]});
                        socket.emit("starting_set", {   send_string, 
                                                        turn, 
                                                        player1: assembled_set.player1.tag, 
                                                        player2: assembled_set.player2.tag, 
                                                        tournament: assembled_set.tournament.cleaned_name
                        });
                        socket.emit("set_timer", {timer: game_history[my_room]["timecounter"]});
                    } else {
                        io.to(my_room).emit("reset");
                        io.to(my_room).emit("error_message", {send_string : "Server Error."});
                    }
                }
             
            } catch (error) {
                console.log(error);
                socket.emit("reset");
                socket.emit("error_message", {send_string: "Server Error."});
            }


        });

        socket.on("id-search", (submitted:{mode:number, searchstring: string}) => {
            const obj_keys = {mode: 0, searchstring: ""};
            var hasAll = Object.keys(obj_keys).every(Object.prototype.hasOwnProperty.bind(submitted));
            if(hasAll && typeof submitted.mode === 'number' && typeof submitted.searchstring === 'string'){
                const items = [local_data.players, local_data.tournaments];
                const item_array = items[submitted.mode];
                let players: any[] = []
                const normalized_string = submitted.searchstring.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
                const regex = new RegExp(`^${submitted.searchstring.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "")}`, 'i');
                if(submitted.mode === 0 ){
                    if (submitted.searchstring.length > 0 && item_array.length > 0) {
                        players = item_array.filter((a:any) => a.tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() == submitted.searchstring.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

                        if(players.length < 10){
                            players = players.concat(item_array.sort(
                                function(a : any, b : any) { return ('' + a.tag).localeCompare(b.tag)}).filter(
                                    (x:any) => regex.test(x.tag.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, ""))));
                        }
                        if(players.length < 10){
                            players = players.concat(item_array.sort(
                                function(a : any, b : any) { return ('' + a.tag).localeCompare(b.tag)}).filter(
                                    (x:any) => x.all_tags.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ,]/g, "").split(",").some((y:any) => regex.test(y.trim()))));
                        }
                    }
                } else {
                    if (submitted.searchstring.length > 0 && item_array.length > 0) {
                        players = item_array.sort(
                            function(a : any, b : any) { return ('' + a.cleaned_name).localeCompare(b.cleaned_name)}).filter(
                                (x:any) => regex.test(x.cleaned_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "")));
                    }
                }
                players = [...new Set(players)];
                if (players.length > 10) {
                    players = players.slice(0, 10);
                }
                const suggestions: any[] = players
                socket.emit("search_result", {suggestions});
            }
        }),

        socket.on("id-submitted", async (submitted:{uuid: string, mode:number, player_entry_1:string, player_entry_2:string, tournament_entry:string}) => {
            try{
                if(game_history.hasOwnProperty(my_room)){
                    var turn_check = game_history[my_room]["turn"]
                    if(reconnecter.hasOwnProperty(submitted.uuid) && game_history[my_room]["players"].length > 1){
                        const last_played = game_history[my_room]["sets"][ game_history[my_room]["sets"].length - 1];

                        if(game_history[my_room]["players"][turn_check]["id"] === submitted.uuid){

                            var set_data = {}
                            var matching_player = "";
                            const obj_keys = {uuid: "", mode: 0, player_entry_1: "", player_entry_2: "", tournament_entry: ""}
                            var hasAll = Object.keys(obj_keys).every(Object.prototype.hasOwnProperty.bind(submitted));
                            if(hasAll){
                                console.log(`User ${submitted.uuid} submitted player ids ${submitted.player_entry_1} and ${submitted.player_entry_2} at tournament ${submitted.tournament_entry}`);
                                if(submitted.mode === 0){
                                    if(
                                        typeof submitted.player_entry_1 === 'string' &&
                                        typeof submitted.player_entry_2 === 'string'
                                    ){

                                        const arr1 : string[] = [submitted.player_entry_1, submitted.player_entry_2];
                                        console.log(arr1);
                                        const arr2 = [last_played.p1_id, last_played.p2_id];
                                        console.log(arr2);
                                        const intersection = arr1.filter(element => arr2.includes(element));
                                        console.log(intersection)
                                        if(intersection.length === 1){
                                            matching_player = intersection[0];
                                            const new_player = (arr1[0] === matching_player) ? arr1[1] : arr1[0];
                                            const link_check = (!game_history[my_room]["links"].hasOwnProperty(new_player) || game_history[my_room]["links"][new_player] < 3)
                                            if(link_check){
                                                var sets = await db_queries.getSet(arr1, last_played.tournament_key);
                                                for(const i in sets){
                                                    if(addSet(game_history[my_room]["sets"], sets[i])){
                                                        set_data = sets[i];
                                                        break;
                                                    }
                                                }
                                                console.log(set_data);
                                            } else {
                                                console.log("Link has been used 3 times.");
                                                socket.emit("error_message", {send_string: "This link has been used 3 times."});
                                            }

                                        } else if(intersection.length === 0) {
                                            console.log("Must include a player from the previous set.");
                                            socket.emit("error_message", {send_string: "Must include a player from the previous set."});
                                        } else if(intersection.length === 2) {
                                            console.log("Cannot include both players from the previous set.");
                                            socket.emit("error_message", {send_string: "Cannot include both players from the previous set."});
                                        }

                                    } else {
                                        console.log("Player entries invalid.");
                                        socket.emit("error_message", {send_string: "Player entry invalid."});
                                    }

                                } else if (submitted.mode === 1){
                                    if( typeof submitted.tournament_entry === 'string'){
                                            console.log(`User ${submitted.uuid} submitted tournament id ${submitted.tournament_entry}`);
                                            var sets = await db_queries.getSet([last_played.p1_id, last_played.p2_id], submitted.tournament_entry);
                                            for(const i in sets){
                                                if(addSet(game_history[my_room]["sets"], sets[i])){
                                                    set_data = sets[i];
                                                    break;
                                                }
                                            }

                                    } else {
                                        console.log("Tournament entry invalid.");
                                        socket.emit("error_message", {send_string: "Tournament entry invalid."});
                                    }

                                } else {
                                    console.log("Mode invalid.");
                                    socket.emit("error_message", {send_string: "Error code mrmi."});
                                }

                                if(set_data && Object.keys(set_data).length > 0){
                                    var link_check = true;
                                    if(matching_player !== ""){link_check = (!game_history[my_room]["links"].hasOwnProperty(matching_player) || game_history[my_room]["links"][matching_player] < 3)}

                                    if(matching_player === "" || link_check){
                                        var assembled_set = await assembleSetData(set_data);
                                        var send_string = buildString(assembled_set.player1, assembled_set.player2, assembled_set.tournament, set_data);
                                        var sent_player = game_history[my_room]["players"][turn_check]["username"]
                                        console.log(send_string)
                                        game_history[my_room]["sets"].push(set_data);
                                        console.log("Matching player:");
                                        console.log(matching_player);
                                        let linkplayer =  local_data.players.find((o:any) => o.player_id === matching_player);
                                        if(matching_player !== ""){
                                            if(game_history[my_room]["links"].hasOwnProperty(matching_player)){
                                                game_history[my_room]["links"][matching_player] = game_history[my_room]["links"][matching_player] + 1;
                                            } else {
                                                game_history[my_room]["links"][matching_player] = 1;
                                            }
                                        }
                                        console.log("Links:");
                                        console.log(game_history[my_room]["links"][matching_player]);
                                        var old_turn = turn_check;
                                        if (turn_check === 0){
                                            turn_check = 1
                                        } else{
                                            turn_check = 0
                                        }
                                        game_history[my_room]["turn"] = turn_check
                                        game_history[my_room]["skipcheck"] = false;
                                        var turn = turn_check
                                        clearTimeout(game_history[my_room]["timer"]);
                                        game_history[my_room]["timecounter"] = "40";
                                        game_history[my_room]["timer"] = setTimeout(() => {
                                            io.to(my_room).emit("timeout_end", {winner: game_history[my_room]["players"][old_turn]['username'], loser: game_history[my_room]["players"][turn_check]['username']});
                                            game_history[my_room]["timedout"] = true;
                                            handleGameEnd(my_room, game_history[my_room]["players"][old_turn]["id"], game_history[my_room]["players"][turn_check]["id"]);
                                        }, 45000);
                                        io.to(my_room).emit("data_returned", {  send_string,
                                                                        turn: turn, 
                                                                        player1: assembled_set.player1.tag, 
                                                                        player2: assembled_set.player2.tag, 
                                                                        tournament: assembled_set.tournament.cleaned_name,
                                                                        username: sent_player,
                                                                        mode: submitted.mode,
                                                                        link: linkplayer.tag,
                                                                        link_number: game_history[my_room]["links"][matching_player]
                                                                    });
                                    } else {
                                        console.log("Link has been used 3 times.");
                                        socket.emit("error_message", {send_string: "This link has been used 3 times."});
                                    }
                                
                                } else {
                                    console.log("Set not found.");
                                    socket.emit("error_message", {send_string: "Set not found."});
                                }

                            } else {
                                console.log("Keys missing.");
                                console.log(submitted);
                                socket.emit("error_message", {send_string: "Error code mrkm."});
                            }

                        } else {
                            console.log("Not your turn.");
                            socket.emit("error_message", {send_string: "Not your turn."});
                        }
                    } else {
                        console.log("You are not in a game.");
                        socket.emit("error_message", {send_string: "You are not in a game."});
                    }
                }

            } catch (error) {
                console.log(error);
                socket.emit("reset");
                socket.emit("error_message", {send_string: "Server Error."});
            }
        });

        socket.on("try-escape", async (submitted:{uuid: string}) => {
            try{
                if(game_history.hasOwnProperty(my_room)){
                    var turn_check = game_history[my_room]["turn"]
                    if(reconnecter.hasOwnProperty(submitted.uuid) && game_history[my_room]["players"].length > 1){
                        if(game_history[my_room]["players"][turn_check]["id"] === submitted.uuid){
                            if(game_history[my_room]["players"][turn_check]["escape"] > 0){
                                var starting_sets = await db_queries.getStartingSet();
                                var random_set = starting_sets[Math.floor(Math.random()*starting_sets.length)];
                                if(game_history[my_room]["links"].hasOwnProperty(random_set.p1_id)){game_history[my_room]["links"][random_set.p1_id] = 0}
                                if(game_history[my_room]["links"].hasOwnProperty(random_set.p2_id)){game_history[my_room]["links"][random_set.p2_id] = 0}
                                var assembled_set = await assembleSetData(random_set);
                                var send_string = buildString(assembled_set.player1, assembled_set.player2, assembled_set.tournament, random_set);
                                var sent_player = game_history[my_room]["players"][turn_check]["username"]
                                game_history[my_room]["players"][turn_check]["escape"] = game_history[my_room]["players"][turn_check]["escape"]-1;
                                console.log(send_string)
                                game_history[my_room]["sets"].push(random_set);
                                var old_turn = turn_check;
                                if (turn_check === 0){
                                    turn_check = 1
                                } else{
                                    turn_check = 0
                                }
                                game_history[my_room]["turn"] = turn_check
                                game_history[my_room]["skipcheck"] = false;

                                var turn = turn_check
                                clearTimeout(game_history[my_room]["timer"]);
                                game_history[my_room]["timecounter"] = "40";
                                game_history[my_room]["timer"] = setTimeout(() => {
                                    io.to(my_room).emit("timeout_end", {winner: game_history[my_room]["players"][old_turn]['username'], loser: game_history[my_room]["players"][turn_check]['username']});
                                    game_history[my_room]["timedout"] = true;
                                    handleGameEnd(my_room, game_history[my_room]["players"][old_turn]["id"], game_history[my_room]["players"][turn_check]["id"]);
                                }, 45000);
                                io.to(my_room).emit("escape_used", {  send_string,
                                                                turn: turn, 
                                                                player1: assembled_set.player1.tag, 
                                                                player2: assembled_set.player2.tag, 
                                                                tournament: assembled_set.tournament.cleaned_name,
                                                                username: sent_player,
                                                                escape: game_history[my_room]["players"][old_turn]["escape"]
                                                            });
                            } else {
                                console.log("No more escapes.");
                                socket.emit("error_message", {send_string: "You have used all your escapes."});
                            }
                        } else {
                            console.log("Not your turn.");
                            socket.emit("error_message", {send_string: "Not your turn."});
                        }
                    } else {
                        console.log("You are not in a game.");
                        socket.emit("error_message", {send_string: "You are not in a game."});
                    }
                }

            } catch (error) {
                console.log(error);
                socket.emit("reset");
                socket.emit("error_message", {send_string: "Server Error."});
            }
        });

        socket.on("try-skip", (submitted:{uuid:string}) => {
            try{
                if(game_history.hasOwnProperty(my_room)){
                    var turn_check = game_history[my_room]["turn"]
                    if(reconnecter.hasOwnProperty(submitted.uuid) && game_history[my_room]["players"].length > 1){
                        if(game_history[my_room]["players"][turn_check]["id"] === submitted.uuid){
                            if(game_history[my_room]["players"][turn_check]["skip"] > 0){
                                if(!game_history[my_room]["skipcheck"]){
                                    game_history[my_room]["skipcheck"] = true;
                                    var sent_player = game_history[my_room]["players"][turn_check]["username"]
                                    game_history[my_room]["players"][turn_check]["skip"] = game_history[my_room]["players"][turn_check]["skip"]-1;
                                    var old_turn = turn_check;
                                    if (turn_check === 0){
                                        turn_check = 1
                                    } else{
                                        turn_check = 0
                                    }
                                    game_history[my_room]["turn"] = turn_check
                                    
                                    clearTimeout(game_history[my_room]["timer"]);
                                    game_history[my_room]["timecounter"] = "40";
                                    game_history[my_room]["timer"] = setTimeout(() => {
                                        io.to(my_room).emit("timeout_end", {winner: game_history[my_room]["players"][old_turn]['username'], loser: game_history[my_room]["players"][turn_check]['username']});
                                        game_history[my_room]["timedout"] = true;
                                        handleGameEnd(my_room, game_history[my_room]["players"][old_turn]["id"], game_history[my_room]["players"][turn_check]["id"]);
                                    }, 45000);
                                    io.to(my_room).emit("skip_used", {
                                        turn: turn_check, 
                                        username: sent_player,
                                        skip: game_history[my_room]["players"][old_turn]["skip"]
                                    });
                                } else {
                                    console.log("Can't use a skip in response to a skip.");
                                    socket.emit("error_message", {send_string: "You can't use a skip in response to a skip."});
                                }
                            } else {
                                console.log("No more skips.");
                                socket.emit("error_message", {send_string: "You have used all your skips."});
                            }
                        } else {
                            console.log("Not your turn.");
                            socket.emit("error_message", {send_string: "Not your turn."});
                        }
                    } else {
                        console.log("You are not in a game.");
                        socket.emit("error_message", {send_string: "You are not in a game."});
                    }
                }

            } catch (error) {
                console.log(error);
                socket.emit("reset");
                socket.emit("error_message", {send_string: "Server Error."});
            }

        });

        socket.on("try-top8", async (submitted:{uuid:string}) => {
            try{
                if(game_history.hasOwnProperty(my_room)){
                    var turn_check = game_history[my_room]["turn"]
                    if(reconnecter.hasOwnProperty(submitted.uuid) && game_history[my_room]["players"].length > 1){
                        if(game_history[my_room]["players"][turn_check]["id"] === submitted.uuid){
                            if(game_history[my_room]["players"][turn_check]["top8"] > 0){
                                const last_played = game_history[my_room]["sets"][ game_history[my_room]["sets"].length - 1];
                                const tournament = await db_queries.getTournament(last_played.tournament_key);
                                const placings = JSON.parse(tournament.placings);
                                const sorted_placings = placings.sort(function(a:any,b:any) {return a[1] - b[1];});
                                const top8ids = sorted_placings.slice(0, 8);
                                game_history[my_room]["players"][turn_check]["top8"] = game_history[my_room]["players"][turn_check]["top8"]-1;
                                const top8tags = []
                                for(const i in top8ids){
                                    var tag = await db_queries.getPlayer(top8ids[i][0].toString());
                                    if(tag === undefined){
                                        top8tags.push("Unknown");
                                    }
                                    else if(tag.hasOwnProperty("tag")){
                                        top8tags.push(tag.tag);
                                    }
                                    else{
                                        top8tags.push(tag.player_id.toString());
                                    }
                                }

                                io.to(my_room).emit("top8_used", {
                                    tags: top8tags,
                                    top8: game_history[my_room]["players"][turn_check]["top8"]
                                });
                            } else {
                                console.log("No more top 8s.");
                                socket.emit("error_message", {send_string: "You have used all your top 8s."});
                            }
                        } else {
                            console.log("Not your turn.");
                            socket.emit("error_message", {send_string: "Not your turn."});
                        }
                    } else {
                        console.log("You are not in a game.");
                        socket.emit("error_message", {send_string: "You are not in a game."});
                    }
                }

            } catch (error) {
                console.log(error);
                socket.emit("reset");
                socket.emit("error_message", {send_string: "Server Error."});
            }
        })
        
        socket.on("disconnect", () => {
            if(game_history.hasOwnProperty(my_room)){
                if(!game_history[my_room]['timedout']){
                    //io.to(my_room).emit("user_disconnected");
                    if(game_history.hasOwnProperty(my_room)){
                        if(game_history[my_room]["players"].length === 2){
                            var winner = ""
                            var loser = ""
                            if(game_history[my_room]["players"][0]["socketid"] === socket.id){
                                io.emit("error_message", {send_string: `Player ${game_history[my_room]["players"][0]["username"]} disconnected.`});
                            } else {
                                io.emit("error_message", {send_string: `Player ${game_history[my_room]["players"][1]["username"]} disconnected.`});
                            }
                        } else {
                            delete reconnecter[game_history[my_room]["players"][0]["id"]];
                            delete game_history[my_room];
                            queue.shift()
                        }
                    }
                }
            }
            console.log(`User disconnected: ${socket.id}`);
        });
        
    });

    
    httpServer.listen(port, () => {
        console.log(`Server running on http://${hostname}:${port}`);
    })
});

async function assembleSetData(set:any){
    console.log("Player 1 query.");
    var player1 = await db_queries.getPlayer(set.p1_id);
    console.log("Player 2 query.");
    var player2 = await db_queries.getPlayer(set.p2_id);
    console.log("Tournament query.");
    var tournament = await db_queries.getTournament(set.tournament_key);
    console.log("Queries complete.");
    return { player1, player2, tournament}
}

function buildString(player1:any, player2:any, tournament:any, set:any) {
    return `${player1.tag} ${set.p1_score} - ${set.p2_score} ${player2.tag} @ ${tournament.cleaned_name}`
}

function addSet(sets:any, set:any) {

    const existingIds = sets.map((addedSet:any) => addedSet.key);
    if (!existingIds.includes(set.key)) {
        return true;
    }

    return false;
}

function handleGameEnd(room_id:string, winner:string, loser:string){
    clearTimeout(game_history[room_id]["timer"]);
    clearInterval(game_history[room_id]["timetracker"]);
    game_history[room_id]["timer"] = null;
    game_history[room_id]["timetracker"] = null;
    const game_played = JSON.stringify(game_history[room_id]);
    for(const i in game_history[room_id]["players"]){
        if(reconnecter.hasOwnProperty(game_history[room_id]["players"][i]["id"])){
            delete reconnecter[game_history[room_id]["players"][i]["id"]];
        }
    }   
    db_queries.insertWinLoss(winner, loser, game_played);
    delete game_history[room_id];

}

function visualCountdown(my_room:string){
    var parsed_timer = parseInt(game_history[my_room]["timecounter"]);
    if(!Number.isNaN(parsed_timer)){
        if(parsed_timer > 0){
            parsed_timer = parsed_timer-1;
            game_history[my_room]["timecounter"] = parsed_timer.toString();
        }
    }
}
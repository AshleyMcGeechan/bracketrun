'use client'

import React from "react";
import "./globals.css";
import "./autocompletetext.css"

import { createCookie } from './cookieMaker';
import AutoCompleteText from './autocompletetext';
import { getLeaderboard } from "./get_leaderboard";
import { socket } from "./lib/socketClient";
import { GiPodium } from "react-icons/gi";
import { IoIosSkipForward } from "react-icons/io";
import { ImExit } from "react-icons/im";
import { IconContext } from "react-icons";
import { FaGithub } from "react-icons/fa6";
import { FaTwitter } from "react-icons/fa6";
import { FaPatreon } from "react-icons/fa6";

var uuid : string | undefined = undefined;
var loaded_once : boolean = false;



export default class Game extends React.Component<any, any>{
    constructor(props : any){
        super(props);
        var entryFunc = this.entryFunc.bind(this);
        var entryModeFunc = this.entryModeFunc.bind(this);

        const timer_func = setInterval(() => {this.visualCountdown()}, 1000);
        this.state = {
            room: "",
            joined: false,
            loading: false,
            findButtonText: "Find Game",
            allPlayers: [],
            allTournaments: [],
            messages: [],
            uuid: undefined,
            username: "",
            player_entry_1: "",
            player_display_1: "",
            player_old_1: "",
            player_entry_2: "",
            player_display_2: "",
            player_old_2: "",
            tournament_entry: "",
            tournament_display: "‎",
            tournament_old: "‎",
            my_turn: 0,
            turn: false,
            mode: 0,
            timer: "X",
            timerCounter: timer_func,
            timerChecker: null,
            escapes: 1,
            skips: 2,
            top8s: 3,
            leaderboard: [],
            howToPlay: false,
            privacy_policy: false,
        };
        
    }


    
    async componentDidMount(): Promise<void> {

        
        if(this.state.leaderboard.length === 0){
            const local_data = await getLeaderboard();
            this.setState({leaderboard:local_data.sorted_users});
            if(uuid === undefined){
                const cookie = await createCookie();
                //const local_data = await getLocalData();
                uuid = cookie?.value;
                this.setState({uuid: cookie?.value});
                socket.emit("check-reconnect", { uuid });
            }
        }

        socket.on("reconnect_available", () => {
            this.setState({findButtonText: "Reconnect"});
        })
        

        socket.on("details_accepted", (data:any) => {
            this.setState({joined: true, username: data.username, loading:false});
        }),

        socket.on("waiting_for_player", () => {
            const old_messages = [];
            old_messages.push({message: "Waiting for opponent.", sender: "Server"});
            this.setState({messages: old_messages});
        })

        socket.on("waiting_for_set", () => {
            const old_messages = [];
            old_messages.push({message: "Game will start shortly.", sender: "Server"});
            this.setState({messages: old_messages});
        });

        socket.on("player_reconnected", (data:any) => {
            const old_messages = [...this.state.messages];
            old_messages.push({message: `Player ${data.player} reconnected.`, sender: "Server"});
            this.setState({messages: old_messages});
        });

        socket.on("set_timer", (data:any) => {
            console.log(data.timer);
            console.log(this.state.timer);
            this.setState({timer: data.timer});
        })

        socket.on("set_turn", (data:number) => {
            this.setState({my_turn: data});
        }),

        socket.on("starting_set", (data:any) =>{
            const { my_turn } = this.state;
            const old_messages = [];
            old_messages.push({message: data.send_string, sender: "Server"});
            this.setState({ messages: old_messages, 
                            turn: data.turn === my_turn, 
                            player_display_1: data.player1,
                            player_old_1: data.player1,
                            player_display_2: data.player2, 
                            player_old_2: data.player2,
                            tournament_display: data.tournament,
                            tournament_old: data.tournament,
                            timer: "40",
                        });
        });

        socket.on("data_returned", (data:any) =>{
            const { my_turn, allPlayers, allTournaments } = this.state;
            var sender = data.turn === my_turn ? data.username : "You";
            const old_messages = [...this.state.messages];
            var linked = ""
            old_messages.push({message: data.send_string, sender: data.username});
            if(data.link_number !== undefined && data.link !== undefined){
                old_messages.push({message: `${data.link} used ${data.link_number.toString()}/3 times.`, sender: "System"})
            }
            this.setState({ messages: old_messages, 
                            turn: data.turn === my_turn,
                            player_entry_1: "", 
                            player_entry_2: "", 
                            tournament_entry: "",
                            player_display_1: data.player1,
                            player_old_1: data.player1,
                            player_display_2: data.player2, 
                            player_old_2: data.player2,
                            timer: "40",
                            tournament_display: data.tournament,
                            tournament_old: data.tournament,
                        });
        });

        socket.on("escape_used", (data:any) => {
            const { my_turn, turn } = this.state;
            var sender = data.turn === my_turn ? data.username : "You";
            const old_messages = [...this.state.messages];
            old_messages.push({message: `Escape used! ${data.escape.toString()} remaining`, sender: "System"});
            old_messages.push({message: data.send_string, sender: data.username});
            if(turn){
                this.setState({escapes:data.escape});
            }
            this.setState({ messages: old_messages, 
                turn: data.turn === my_turn,
                player_entry_1: "", 
                player_entry_2: "", 
                tournament_entry: "",
                player_display_1: data.player1,
                player_old_1: data.player1,
                player_display_2: data.player2, 
                player_old_2: data.player2,
                timer: "40",
                tournament_display: data.tournament,
                tournament_old: data.tournament,
            });
        });

        socket.on("skip_used", (data:any) => {
            const { my_turn, turn, player_old_1, player_old_2, tournament_old } = this.state;
            const old_messages = [...this.state.messages];
            old_messages.push({message: `Skip used! ${data.skip.toString()} remaining`, sender: "System"});
            if(turn){
                this.setState({skips:data.skip});
            }
            this.setState({ messages: old_messages, 
                turn: data.turn === my_turn,
                player_entry_1: "", 
                player_entry_2: "", 
                tournament_entry: "",
                player_display_1: player_old_1,
                player_display_2: player_old_2, 
                timer: "40",
                tournament_display: tournament_old,
            });
        });

        socket.on("top8_used", (data:any) => {
            const { turn } = this.state;
            const old_messages = [...this.state.messages];
            old_messages.push({message: `Top 8 used! ${data.top8.toString()} remaining`, sender: "System"});
            const places = ["1st", "2nd", "3rd", "4th", "5th", "5th", "7th", "7th", "9th", "9th", "9th", "9th", "13th", "13th", "13th", "13th"];
            if(turn){
                this.setState({top8s:data.top8});
                for(const i in data.tags){
                    old_messages.push({message: `${places[parseInt(i)]} place: ${data.tags[parseInt(i)]}`, sender: "Input"});
                }
                this.setState({messages: old_messages})
            }
        });

        socket.on("error_message", (data:any) =>{
            const { player_old_1, player_old_2, tournament_old } = this.state;
            const old_messages = [...this.state.messages];
            old_messages.push({message: data.send_string, sender: "Error"});
            this.setState({ messages: old_messages, 
                            player_entry_1: "",
                            player_entry_2: "",
                            tournament_entry: "",
                            player_display_1: player_old_1, 
                            player_display_2: player_old_2, 
                            tournament_display: tournament_old,
                            loading:false
                        })

        });

        socket.on("timeout_end", (data:any) => {
            const old_messages = [...this.state.messages];
            old_messages.push({message: `${data.loser} has ran out of time.`, sender: "System"});
            old_messages.push({message: `${data.winner} wins!`, sender: "System"});
            this.setState({ messages: old_messages,
                            timer: "X",
            })
        })

        socket.on("user_disconnected", () => {
            const old_messages = [...this.state.messages];
            old_messages.push({message: "Opponent has disconnected.", sender: "System"});
            old_messages.push({message: `${this.state.username} wins!`, sender: "System"});
            this.setState({ messages: old_messages,
                            timer: "X",
            })
        })

        socket.on("reset", () => {
            this.setState({
                    room: "",
                    joined: false,
                    findButtonText: "Find Game",
                    loading: false,
                    messages: [],
                    player_entry_1: "",
                    player_display_1: "",
                    player_old_1: "",
                    player_entry_2: "",
                    player_display_2: "",
                    player_old_2: "",
                    tournament_entry: "",
                    tournament_display: "‎",
                    tournament_old: "‎",
                    my_turn: 0,
                    turn: false,
                    mode: 0,
                    timer: "X",
                    timerChecker: null,
                    escapes: 1,
                    skips: 2,
                    top8s: 3,
                    howToPlay: false,
                    privacy_policy: false,
            });
        });
        
    }

    componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<any>, snapshot?: any): void {
        const { turn } = this.state;
        if(turn){
            let element = document.getElementById("text_input");
            setTimeout(() => element?.focus(), 0);
        }

    }

    componentWillUnmount(): void {
        
        socket.off("details_accepted");
        socket.off("waiting_for_player");
        socket.off("waiting_for_set");
        socket.off("set_turn");
        socket.off("starting_set");
        socket.off("data_returned");
        socket.off("error_message");
        socket.off("timeout_end");
        socket.off("reset");
        socket.off("user_disconnected");
        
    };

    handleSendMessage = (message: string) => {
        console.log(message);
    };


    initFunction(){
        if (typeof document !== 'undefined' && !loaded_once) {
            loaded_once = true;
            const findGameButton= document.getElementById("findGameButton");
            findGameButton?.addEventListener("click", (e: Event) => {this.findGameButtonHandler(e);e.stopPropagation();e.preventDefault()});
            
        }
        return null;
    }

    findGameButtonHandler = async (ev: Event) => {
        const userfield = (document.getElementById("username_input") as HTMLInputElement);
        const username = userfield.value;
        this.setState({loading:true, howToPlay: false, privacy_policy: false});
        if(uuid === undefined){
            const cookie = await createCookie();
            //const local_data = await getLocalData();
            uuid = cookie?.value;
            this.setState({uuid: cookie?.value});
        }

        if(uuid !== undefined){
            socket.emit("join-room", { username, uuid });


        } else {
            console.log("Authentication cookie could not be created.");
        }
    }

    howToPlayButtonHandler = async (ev: Event) => {
        const { howToPlay } = this.state;
        this.setState({howToPlay: !howToPlay, privacy_policy: false});
    }

    privacyPolicy = async (ev: Event) => {
        const { privacy_policy } = this.state;
        this.setState({howToPlay: false, privacy_policy: !privacy_policy});
    }

    howToPlayRender(){
        const { howToPlay } = this.state;
        if(howToPlay){
            return(
            <div className="absolute h-[600px] w-[800px] z-20 p-4 mb-4 ml-auto mr-auto overflow-y-scroll bg-neutral-50 border2 rounded-xl items-center text-center justify-center text-wrap
">
                <div className="absolute top-5 inset-x-0 text-[48px] underline">
                    How To Play:
                </div>
                <button type="button" onClick={(e:any) => this.howToPlayButtonHandler(e)} className="h-[50px] w-[50px] absolute top-5 right-5 z-30 bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                        <span className="sr-only">Close menu</span>
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                </button>
                <div className="absolute top-24 inset-x-5 text-[24px] text-balance">
                    Bracket Run is a Super Smash Bros Melee tournament trivia game inspired by Cine2Nerdle.<br/><br/>
                    Two players take turns picking sets from Melee's tournament history that connect to each other by changing only one element.<br/><br/>
                    For example:<br/>
                    If the last played set was Mang0 vs Armada at Genesis 3, you could guess Mango vs Axe or Armada vs Ice, both sets that also happened at Genesis 3.<br/>
                    Alternatively you could guess a different tournament where Mang0 vs Armada occurred, such as Smash Summit or Royal Flush.<br/>
                    You can switch between guessing players or guessing tournaments using the button to the right of the search box.<br/><br/>
                    Each player has 40 seconds to make their selection.<br/><br/>
                    The game starts with a random starter set between two competitors who were ranked at least top 10 on one of the yearly rankings<br/><br/>
                    The same set cannot be played more than once. When the same matchup happens more than once in a tournament (e.g Winner's Finals and Grand Finals) these can be played as two different sets but one cannot be played in response to the other.<br/><br/>
                    When a competitor is used to link two sets their number of uses increases by one. After 3 uses a competitor can no longer be used in a guess. Guessing tournaments does not follow this restriction and does not increase a competitor's uses.<br/><br/>
                    The game ends when one player fails to make a valid guess before the timer runs out.<br/><br/>
                    You also have lifelines which you can activate using the buttons on the right side of the game screen if you find yourself stuck.<br/>
                    The Escape lifeline plays a new random starter set, resets the uses of the competitors in that set, and passes the turn to the opponent.<br/>
                    The Skip lifeline passes the turn to the opponent.A Skip cannot be played in response to another skip.<br/>
                    The Top 8 lifeline displays the top 8 placings of the current tournament in play.<br/>
                </div>
            </div>
            )
        } else {
            return(<div></div>)
        }
    }

    privacyPolicyRender(){
        const { privacy_policy } = this.state;
        if(privacy_policy){
            return(
            <div className="absolute h-[600px] w-[800px] z-20 p-4 mb-4 ml-auto mr-auto overflow-y-scroll bg-neutral-50 border2 rounded-xl items-center text-center justify-center text-wrap
">

                <button type="button" onClick={(e:any) => this.privacyPolicy(e)} className="h-[50px] w-[50px] absolute top-5 right-5 z-30 bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                        <span className="sr-only">Close menu</span>
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                </button>
                <div className="absolute top-5 inset-x-5 text-[24px] text-balance">
                <strong>Privacy Policy</strong> <p>
                            Ashley McGeechan operates the website "Bracket Run" at http://www.bracketrun.com.
                            I take your privacy seriously. To better protect your privacy,
                            I provide this privacy policy notice explaining the way your personal information
                            is collected and used.
                        </p> <p><strong>Collection of Routine Information</strong></p> <p>
                            This website track basic information about its visitors.
                            This information includes, but is not limited to, IP addresses, browser details,
                            timestamps and referring pages. None of this information can personally identify specific
                            visitors to this website. The information is tracked for routine
                            administration and maintenance purposes.
                        </p> <p><strong>Cookies</strong></p> <p>
                            Where necessary, this website uses cookies to store information about a visitor’s
                            preferences and history to better serve the visitor and/or present the
                            visitor with customized content.
                        </p> <p><strong>Advertisement and Other Third Parties</strong></p> <p>
                            Advertising partners and other third parties may use cookies, scripts and/or web beacons to track
                            visitor activities on this website to display advertisements
                            and other useful information. Such tracking is done directly by the third parties through their
                            servers and is subject to their privacy policies. This website has no access or
                            control over these cookies, scripts and/or web beacons that may be used by third parties.
                        </p> <div><p>
                            I have included links on this website for your use and reference.
                            I am not responsible for the privacy policies on these websites. You
                            should be aware
                            that the privacy policies of these websites may differ from my own.
                            </p> <p>
                            Link to the privacy policy of third-party service providers used
                            by the website
                            </p> 
                            <ul>
                                <li><a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="https://porkbun.com/legal/agreement/privacy_policy" target="_blank" rel="noopener noreferrer">Porkbun</a></li>
                                <li><a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="https://railway.com/legal/privacy" target="_blank" rel="noopener noreferrer">Railway</a></li>
                                <li><a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="https://developers.google.com/fonts/faq/privacy" target="_blank" rel="noopener noreferrer">Google Fonts Web API</a></li>
                            </ul></div> 
                            <p><strong>Security</strong></p> <p>
                            The security of your personal information is important to me, but remember that no
                            method of transmission over the Internet, or method of electronic storage, is 100% secure.
                            While I strive to use commercially acceptable means to protect your personal information,
                            I cannot guarantee its absolute security.
                        </p> <p><strong>Changes To This Privacy Policy</strong></p> <p>
                            This Privacy Policy is effective as of 2025-03-06 and will remain in effect except concerning
                            any
                            changes in its provisions in the future, which will be in effect immediately after being posted on this
                            page.
                            I reserve the right to update or change my Privacy Policy at any time and
                            you
                            should check this Privacy Policy periodically. If I make any material changes to this Privacy
                            Policy,
                            I will notify you either through the email address you have provided me or by
                            placing a prominent notice on my website.
                        </p> <p><strong>Contact Information</strong></p> <p>
                            For any questions or concerns regarding the privacy policy,
                            please send me an email at <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="mailto:apmcgeechan@gmail.com">apmcgeechan@gmail.com</a>.
                        </p> <p>
                            
                        </p><br/> <p>This privacy policy page was created by <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="https://github.com/ArthurGareginyan/privacy-policy-template/" target="_blank" rel="noopener noreferrer">Arthur Gareginyan </a>and modified/generated by <a className="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="https://free-privacy-policy-generator.digitalmalayali.in/" target="_blank" rel="noopener noreferrer">Free &amp; Open Source Privacy Policy Generator</a>.</p>
                
                            </div>
                        </div>
            )
        } else {
            return(<div></div>)
        }
    }

    sendEscape = async() =>{
        const {uuid, escapes} = this.state;
        socket.emit("try-escape", {uuid});  
    }

    sendSkip = async() =>{
        const {uuid, skips} = this.state;
        socket.emit("try-skip", {uuid});  
    }

    sendTop8 = async() =>{
        const {uuid, top8s} = this.state;
        socket.emit("try-top8", {uuid});
    }

    leaveGame = async() =>{
        socket.disconnect();
        socket.connect();
        this.setState({
            room: "",
            joined: false,
            findButtonText: "Find Game",
            loading: false,
            messages: [],
            player_entry_1: "",
            player_display_1: "",
            player_old_1: "",
            player_entry_2: "",
            player_display_2: "",
            player_old_2: "",
            tournament_entry: "",
            tournament_display: "‎",
            tournament_old: "‎",
            my_turn: 0,
            turn: false,
            mode: 0,
            timer: "X",
            timerChecker: null,
            escapes: 1,
            skips: 2,
            top8s: 3,
            howToPlay: false,
            privacy_policy: false,
        });
    }

    entryFunc(entered:any){
        const { uuid, allPlayers, allTournaments, player_entry_1, player_display_1, player_display_2, tournament_display, mode} = this.state;
        if(mode === 0){
            if (player_entry_1 === ""){
                this.setState({player_display_1: entered.tag, player_display_2: "", player_entry_1 : entered.player_id});
            } else {
                this.setState({player_display_2: entered.tag, player_entry_2 : entered.player_id});
                socket.emit("id-submitted", {uuid, player_entry_1, player_entry_2 : entered.player_id, tournament_entry: tournament_display, mode: mode});
                const old_messages = [...this.state.messages];
                old_messages.push({message: `${player_display_1} vs ${entered.tag} @ ${tournament_display}`, sender: "Input"});
                this.setState({messages: old_messages});
            }
        } else {
            this.setState({tournament_entry: entered.key, tournament_display: entered.cleaned_name});
            socket.emit("id-submitted", {uuid, player_entry_1 : player_display_1, player_entry_2 : player_display_2 , tournament_entry: entered.key, mode: mode});
            const old_messages = [...this.state.messages];
            old_messages.push({message: `${player_display_1} vs ${player_display_2} @ ${entered.cleaned_name}`, sender: "Input"});
            this.setState({messages: old_messages});
        }
    }

    entryModeFunc(mode:number){
        const { player_old_1, player_old_2, tournament_old } = this.state;
        this.setState({ mode: mode,
                        player_entry_1: "",
                        player_entry_2: "",
                        tournament_entry: "",
                        player_display_1: player_old_1,
                        player_display_2: player_old_2,
                        tournament_display: tournament_old,
        });
    }

    visualCountdown(){
        const { timer } = this.state;
        var parsed_timer = parseInt(timer);
        if(!Number.isNaN(parsed_timer)){
            if(parsed_timer > 0){
                parsed_timer = parsed_timer-1;
                this.setState({timer: parsed_timer.toString()});
            }
        }
    }

    renderAlert(){
        if(this.state.messages.length > 0){
        return (
            <div role="alert" className="rounded-sm border-s-4 border-red-500 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-red-800">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                    <path
                        fillRule="evenodd"
                        d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                        clipRule="evenodd"
                    />
                    </svg>

                    <strong className="block font-medium"> {this.state.messages.pop().message} </strong>
                </div>
            </div>
        )
        } else {
            return(<></>)
        }
    }

        onTextChanged = (e: any) => {
            const value = e.target.value;
            this.setState(() => ({username: value }));
        }

    render () {
        var entryFunc = this.entryFunc;
        var entryModeFunc = this.entryModeFunc;
        const { username, findButtonText } = this.state;
        return (
            <div>
                {!this.state.joined ? (
                <div className="wrapper !w-[800px] !px-[100px]">
                    {this.howToPlayRender()}
                    {this.privacyPolicyRender()}
                    <div className="textEntry">
                        {!this.state.loading && this.state.leaderboard.length != 0 ? (
                        <div className="AutoCompleteText !border-none">
                            
                            <input id="username_input"className="rounded-xl bg-neutral-50" tabIndex={1} placeholder="Enter a username" autoComplete="off" type="text" value={username} onChange={this.onTextChanged} />
                        </div>
                        ) : (<></>)}
                            {!this.state.loading && this.state.leaderboard.length != 0 ? (
                            <div>
                                <button id="findGameButton" onClick={(e:any) => this.findGameButtonHandler(e)}className="group relative m-[20px] inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#7c5fbe] hover:bg-[#5d40ac] px-6 font-medium text-[#000000]"><span>{findButtonText}</span><div className="ml-1 transition group-hover:translate-x-1"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg></div></button>
                                <button id="howToPlayButton" onClick={(e:any) => this.howToPlayButtonHandler(e)}className="group relative m-[20px] inline-flex h-12 items-center justify-center overflow-hidden rounded-xl bg-[#7c5fbe] hover:bg-[#5d40ac] px-6 font-medium text-[#000000]"><span>How To Play</span><div className="ml-1 transition group-hover:translate-x-1"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg></div></button>

                            </div>
                            ) : (                                    <div className="text-center">
                                <div role="status">
                                <svg aria-hidden="true" className="inline m-[150px] animate-spin w-8 h-8 text-gray-200 dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                                </svg>
                                <span className="sr-only">Loading...</span>
                                </div>
                                </div>)}
                        {!this.state.loading && this.state.leaderboard.length != 0 ? (
                            <div className="h-[300xp] w-[400px] overflow-x-hidden overflow-y-auto p-4 mb-4 bg-neutral-50 border2 rounded-lg ml-auto mr-auto items-center text-center justify-center">
                                <div className="w-[300px] grid grid-cols-3 ml-auto mr-auto items-center text-center justify-center">
                                    <div className="li-country w-[100px]">Username</div>
                                    <div className="li-country w-[100px]">Wins</div>
                                    <div className="li-country w-[100px]">Losses</div>
                                </div>
                                <div>
                                    {this.state.leaderboard.map((msg : any, i : number) => 
                                        <div key={i} className="w-[300px] grid grid-cols-3 ml-auto mr-auto items-center text-center justify-center">
                                            <div className='li-tag w-[100px] overflow-x-hidden'>
                                                {msg.username}
                                            </div>
                                            <div className='li-country w-[100px]'>
                                                {msg.wins}
                                            </div>
                                            <div className='li-country w-[100px]'>
                                                {msg.losses}
                                            </div>
                                        </div>)}
                                </div>
                            </div>
                        
                        ) : (<></>)}
                        {this.renderAlert()}
                    </div>
                    <div className="mx-auto mt-[600px] max-w-5xl px-4 py-2 sm:px-4 lg:px-4">
                        <ul className="mt-14 flex flex-wrap justify-center gap-4 md:gap-4 lg:gap-4">
                            <li onClick={(e:any) => this.privacyPolicy(e)}>
                            <a className="text-gray-300 transition hover:text-gray-300/75"> Privacy Policy </a>
                            </li>
                        </ul>
                        <IconContext.Provider value={{size: '24'}}>
                        <ul className="flex justify-center gap-4 md:gap-4">

                            <li>
                            <a
                                href="https://x.com/Swishless"
                                rel="noreferrer"
                                target="_blank"
                                className="text-gray-300 transition hover:text-gray-300/75"
                            >
                                <span className="sr-only">Twitter</span>
                                <FaTwitter/>
                            </a>
                            </li>

                            <li>
                            <a
                                href="https://github.com/AshleyMcGeechan"
                                rel="noreferrer"
                                target="_blank"
                                className="text-gray-300 transition hover:text-gray-300/75"
                            >
                                <span className="sr-only">GitHub</span>
                                <FaGithub/>
                            </a>
                            </li>

                            <li>
                            <a
                                href="https://patreon.com/Swishless"
                                rel="noreferrer"
                                target="_blank"
                                className="text-gray-300 transition hover:text-gray-300/75"
                            >
                                <span className="sr-only">Patreon</span>
                                <FaPatreon/>
                            </a>
                            </li>

                        </ul>
                        </IconContext.Provider>
                    </div>
                </div>) : (
                <div className='wrapper'>
                    <div className="bg-neutral-50 border border-gray-detailBorder py-1.25 rounded-xl px-0.75 items-center text-center overflow-hidden w-full">
                        <p>
                            <span className="block font-semibold text-[1.75rem] leading-9 text-blue">
                                {this.state.timer}
                            </span>
                        </p>
                    </div>
                    <div className='textEntry'>
                        <AutoCompleteText items={[this.state.allPlayers, this.state.allTournaments]} entryFunc={entryFunc.bind(this)} entryModeFunc={entryModeFunc.bind(this)} turn={this.state.turn}/>
                    </div>
                    <div className="grid">
                        <div className="playerPicker">
                            <div className="grid grid-cols-7">
                                <div className="bg-neutral-50 rounded-l-xl border border-gray-detailBorder py-1.25 px-0.75 items-center text-center overflow-hidden w-full col-span-3">
                                    <p>
                                        <span className="block font-semibold text-[1.75rem] leading-9 text-blue">
                                            {this.state.player_display_1}
                                        </span>
                                    </p>
                                </div>
                                <div className="bg-neutral-50 border border-gray-detailBorder py-1.25 px-0.75 items-center text-center overflow-hidden w-full">
                                    <p>
                                        <span className="block font-semibold text-[1.75rem] leading-9 text-blue">
                                            vs
                                        </span>
                                    </p>
                                </div>
                                <div className="bg-neutral-50 rounded-r-xl border border-gray-detailBorder py-1.25 px-0.75 items-center text-center overflow-hidden w-full col-span-3">
                                    <p>
                                        <span className="block font-semibold text-[1.75rem] leading-9 text-blue">
                                            {this.state.player_display_2}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="tournamentPicker">
                            <div className="grid">
                                <div className="bg-neutral-50 rounded-xl border border-gray-detailBorder py-1.25 px-0.75 items-center text-center overflow-hidden w-full">
                                    <p>
                                        <span className="block font-semibold text-[1.75rem] leading-9 text-blue">
                                            {this.state.tournament_display}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="gameBoard text-wrap overflow-x">
                            <div className="h-[500px] rounded-xl overflow-x-hidden overflow-y-auto p-4 mb-4 bg-neutral-50 border2 text-wrap overflow-x" >
                                {this.state.messages ? (
                                <ul>
                                    {this.state.messages.map((msg : any, i : number) => 
                                        <li key={i}>
                                            {msg.sender !== "Input" ? (
                                                <div>
                                                    <div className='li-country text-wrap overflow-x'>
                                                        {msg.sender}:
                                                    </div>
                                                    <div className='li-tag text-wrap overflow-x'>
                                                        {msg.message}
                                                    </div>
                                                </div>
                                                ) : (
                                                <div className="grid justify-center text-wrap overflow-x">
                                                    <div className='li-country text-wrap overflow-x'>
                                                        {msg.message}
                                                    </div>
                                                </div>)}
                                        </li>)}
                                </ul>)
                                : (
                                    <div className="text-center">
                                    <div role="status">
                                    <svg aria-hidden="true" className="inline animate-spin w-8 h-8 text-gray-200 dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                                    </svg>
                                    <span className="sr-only">Loading...</span>
                                    </div>
                                    </div>
                                )}     
                            </div>                
                        </div>
                        <div className="lifelineButtons">
                            <div className="grid">
                            <IconContext.Provider value={{size: '100', color: "#000000"}}>

                                {this.state.escapes > 0 ? (
                                <button type="button" id="escapeButton" onClick={this.sendEscape} className=" flex rounded-xl text-[#000000] w-[142px] h-[142px] mb-[8px] bg-[#7c5fbe] hover:bg-[#5d40ac] focus:ring-4 focus:outline-none focus:ring-bleu-400 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span><ImExit/></span>
                                    <span>Escape: {this.state.escapes}</span>  
                                    </div>
                                </button> 
                                ) : (
                                <button disabled type="button" id="escapeButton" className=" flex rounded-xl text-[#000000] w-[142px] h-[142px] mb-[8px] bg-gray-200 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span><ImExit/></span>
                                    <span>Escape: {this.state.escapes}</span>  
                                    </div>
                                </button> )}

                                {this.state.skips > 0 ? (
                                <button type="button" id="skipButton" onClick={this.sendSkip} className="flex rounded-xl text-[#000000] w-[142px] h-[142px] mb-[8px] bg-[#7c5fbe] hover:bg-[#5d40ac] focus:ring-4 focus:outline-none focus:ring-bleu-400 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span><IoIosSkipForward/></span>
                                    <span>Skip: {this.state.skips}</span>
                                    </div>
                                </button>
                                ) : (
                                <button disabled type="button" id="skipButton" className="flex rounded-xl text-[#000000] w-[142px] h-[142px] mb-[8px] bg-gray-200 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span><IoIosSkipForward/></span>
                                    <span>Skip: {this.state.skips}</span>
                                    </div>
                                </button>
                                )}

                                {this.state.top8s > 0 ? (
                                <button type="button" id="top8Button" onClick={this.sendTop8} className="flex rounded-xl text-[#000000] w-[142px] h-[142px] mb-[8px] bg-[#7c5fbe] hover:bg-[#5d40ac] focus:ring-4 focus:outline-none focus:ring-bleu-400 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span><GiPodium/></span>
                                    <span>Top 8: {this.state.top8s}</span>
                                    </div>
                                </button>  
                                ) : (
                                <button disabled type="button" id="top8Button" className="flex rounded-xl text-[#000000] w-[142px] h-[142px] mb-[8px] bg-gray-200 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span><GiPodium/></span>
                                    <span>Top 8: {this.state.top8s}</span>
                                    </div>
                                </button>  
                                )}

                                <button type="button" id="leaveButton" onClick={this.leaveGame} className="flex rounded-xl text-[#000000] w-[142px] h-[50px] mb-[8px] bg-[#7c5fbe] hover:bg-[#5d40ac] focus:ring-4 focus:outline-none focus:ring-bleu-400 p-2.5 text-center items-center justify-center">
                                    <div className="grid h-full w-full items-center text-center justify-center">
                                    <span>Leave Game</span>
                                    </div>
                                </button> 
                            </IconContext.Provider>
                            </div>
                        </div> 
                    </div>
                </div>
                
                )}
                <div>{this.initFunction()}</div>
            </div>
        )
    };
}




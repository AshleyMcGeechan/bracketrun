'use client'

import React, { useRef } from 'react';
import Image from 'next/image';
import './autocompletetext.css';
import { socket } from "./lib/socketClient";
import { TbTournament } from "react-icons/tb";
import { IoMdPerson } from "react-icons/io";
import { IconContext } from "react-icons";


type AutoCompleteProps = {
    items: [[], []];
    entryFunc : any;
    entryModeFunc: any;
    turn: boolean;
}

const playerIcon = <IoMdPerson/>
const tournamentIcon = <TbTournament/>
var textTimeout: NodeJS.Timeout | null = null

export default class AutoCompleteText extends React.Component<AutoCompleteProps, any>{
    constructor(props : any){
        super(props);
        this.handleKeyDown = this.handleKeyDown.bind(this)
        this.state = {
            suggestions : [],
            text: '',
            cursor: 0,
            mode: 0,
            modeIcon: <IoMdPerson/>,
        };
    }

    async componentDidMount(): Promise<void> {
        socket.on("search_result", (data:any) => {
            this.setState({suggestions: data.suggestions})
        });
    }

    handleKeyDown(e : any) {
        const { cursor, suggestions } = this.state;
        if (e.key === "ArrowUp" && cursor > 0) {
          this.setState( (prevState : any) => ({
            cursor: prevState.cursor - 1
          }));
          e.preventDefault();
        } else if (e.key === "ArrowDown" && cursor < suggestions.length - 1) {
          this.setState( (prevState : any) => ({
            cursor: prevState.cursor + 1
          }));
          e.preventDefault();
        } else if (e.key === "Enter" && suggestions.length > 0) {
            this.suggestionSelected(suggestions[cursor]);
        }
      }

    onTextChanged = (e: any) => {
        const { items } = this.props;
        const { mode } = this.state;
        const value = e.target.value;

        if(!!textTimeout){
            clearTimeout(textTimeout);
        }
        textTimeout = setTimeout(() => {
            console.log("emitted");
            socket.emit("id-search", {mode: mode, searchstring: value});
        }, 100);

        this.setState(() => ({text: value }));
    }

    suggestionSelected(value : any) {
        const { mode } = this.state;
        this.setState(() => ({
            text: "",
            suggestions: [],
            cursor:0,
        }));
        var submitted = ""
        if(mode===0){
            submitted = value;
        } else {
            submitted = value
        }
        const { entryFunc } = this.props;
        entryFunc(submitted);
    }

    renderCharacter(player : any){
        if(player.characters){
            if(player.characters.length > 3){
                var character : string[];
                character = player.characters.split(",");
                character = character[0].split("/");
                character = character[1].split('"');
                return <Image src={`/heads/${character[0]}.png`} alt={character[0]} width={24} height={24} />
            }
        }
        return ""
    }

    changeMode = () => {
        const { text, mode, modeIcon } = this.state;
        const { entryModeFunc } = this.props;
        if(mode === 0){
            entryModeFunc(1);
            this.setState(() => ({mode: 1, modeIcon: tournamentIcon}), () => this.onTextChanged({target: {value: text}}));
        } else {
            entryModeFunc(0);
            this.setState(() => ({mode: 0, modeIcon: playerIcon}), () => this.onTextChanged({target: {value: text}}));
        }

        
    }

    renderSuggestion (){
        const { suggestions, cursor } : any = this.state;
        if (suggestions.length === 0) {
            return null;
        }
        var mouseLeft = true;

        return (
            <ul>
                {suggestions.map((item : any, i : number) => 
                    <li className={cursor === i && mouseLeft ? 'active' : ''} onMouseLeave={() => mouseLeft=true} onMouseOver={() => {this.setState({cursor: i});mouseLeft=false}} onClick={() => this.suggestionSelected(item)} key={i}>
                    { this.state.mode === 0 ? (
                        <div className="li-item">

                            <div className='li-tag'>
                                {item.tag}
                            </div>
                            <div className='li-extras'>
                                {item.all_tags && item.all_tags.split(",").length > 1 ? (
                                <div className='li-all-tags'>
                                    {item.all_tags}
                                </div>
                                ) : (<></>)}
                                <div className='li-extras-rest'>
                                    <div className={item.all_tags && item.all_tags.split(",").length > 1 ?'' : 'pt-4'}>
                                        {item.country ? (
                                        <div className='li-country'>
                                            {item.country}
                                        </div>
                                        ) : (<></>)}
                                        {item.c_region ? (
                                        <div className='li-region'>
                                            {item.c_region}
                                        </div>
                                        ) : (<></>)}
                                        <div className='li-character'>
                                            {this.renderCharacter(item)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="li-item">
                            <div className='grid'>
                                <div className='li-tag'>
                                    {item.cleaned_name}
                                </div>
                                <div className='li-extras-rest'>
                                    <div className='li-country'>
                                        {item.city}
                                    </div>
                                    <div className='li-country'>
                                        {(new Date(item.start * 1000)).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    </li>)}
            </ul>
        );
    }

    render () {
        const { text, mode } : any = this.state;
        const { cursor } = this.state;
        const { turn } = this.props;

        return (
            <div className="AutoCompleteText !border-none">
                <div className='flex'>
                    <input id="text_input" className='bg-neutral-50 rounded-l-xl' tabIndex={1} placeholder={turn ? (mode ? "Enter a tournament" : "Enter a player") : "Not your turn"}autoComplete="off" value={text} disabled={!turn} onKeyDown={this.handleKeyDown} onChange={this.onTextChanged} type="text" />
                    <IconContext.Provider value={{color: "#000000"}}>
                    <button className="pl-4 pr-4 bg-[#7c5fbe] hover:bg-[#5d40ac] rounded-r-xl" onClick={this.changeMode}> {this.state.modeIcon} </button>
                    </IconContext.Provider>
                </div>
                {this.renderSuggestion()}
            </div>
        );
    }

} 
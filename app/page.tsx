import Game from './game';
import "./globals.css";
import localFont from 'next/font/local'
import type { Metadata } from 'next'
import { TbTournament } from "react-icons/tb";
import { IconContext } from "react-icons";
import { CustomIcon } from './custom-icon';

const humaroid = localFont({
  src: './humaroid.regular.otf',
  display: 'swap',
})


export const metadata: Metadata = {
  title: 'Bracket Run',
  applicationName: 'Bracket Run',
  description: "A Super Smash Bros Melee tournament trivia game inspired by Cine2Nerdle",
  keywords: ["Super", "Smash", "Bros", "Melee", "Cine2Nerdle", "Bracket", "Run"],
  creator: 'Ashley McGeechan',
  twitter: {
    card: 'summary_large_image',
    title: 'Bracket Run',
    description: 'A Super Smash Bros Melee tournament trivia game inspired by Cine2Nerdle',
    siteId: '861714516',
    creator: '@Swishless',
    creatorId: '861714516',
    images: ['https://bracketrun/twittercard.png'], // Must be an absolute URL
  },
}

export default async function Page() {
  return ( 
    <main className='flex flex-col min-h-svh'>
      <div className={`${humaroid.className} flex flex-none items-center text-center justify-center text-white text-[128px]`}>
        BRACKET<CustomIcon icon={TbTournament} size={128} style={{minWidth: "128px"}}/>RUN
      </div>
      <div className='App flex flex-none items-center text-center justify-center'>
        <Game/>
      </div>
    </main>
  );
}

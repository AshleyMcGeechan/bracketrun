# Bracket Run

This repo contains the frontend and backend implementation of [*Bracket Run*](http://bracketrun.com), a Super Smash Bros Melee tournament trivia game inspired by Cine2Nerdle.

The game is played by two players who take turns naming sets from [Melee's long competitive history](https://liquipedia.net/smash/Main_Page), with each set linking to the one before it by only changing one element, the elements being the two players involved and the tournament the set occurred at. For example if the last played set was Mang0 vs Armada at Genesis 3, you could guess Mango vs Axe or Armada vs Ice, both sets that also happened at Genesis 3. Alternatively you could guess a different tournament where Mang0 vs Armada occurred, such as Smash Summit or Royal Flush. Each player has 40 seconds to make guesses and a limited number of lifelines if they find themselves stuck. Each set cannot be used more than once and each player cannot be used as a link more than three times.

The game is designed to be played using the open source [Melee Player Database](https://github.com/smashdata/ThePlayerDatabase).

### Installation and Usage

Download the repo as well as PNPM.

Download and extract the [Melee Player Database](https://github.com/smashdata/ThePlayerDatabase) into the dbs folder.

Finally run the commands
```
pnpm install
```
and
```
pnpm start
```
in the root folder.

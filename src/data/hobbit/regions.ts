export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  flavor_text: string;
  points: number;
}

export interface RegionDef {
  id: string;
  name: string;
  isStartingZone: boolean;
  lore: string;
  claimThreshold: number;
  center: [number, number]; // [Y, X] in Leaflet CRS.Simple (2816 tall, 3072 wide)
  polygon: [number, number][];
  bannerColor: string;
  achievements: AchievementDef[];
}

export const REGIONS: RegionDef[] = [
  {
    id: 'shire',
    name: 'The Shire',
    isStartingZone: true,
    lore: 'A pleasant corner of the quiet world, sheltered by the Rangers. Home of halflings, second breakfasts, and quiet courage.',
    claimThreshold: 2,
    center: [1830, 960],
    polygon: [
      [1910, 890],
      [1920, 1030],
      [1830, 1050],
      [1750, 990],
      [1750, 910],
      [1840, 870],
    ],
    bannerColor: '#2f7d4f', // Green
    achievements: [
      {
        id: 'shire-1',
        title: 'Second Breakfast',
        description: 'Win a game where your life total reached 40 or higher.',
        flavor_text: 'What about elevenses? Luncheon? Afternoon tea? Dinner? Supper?',
        points: 10,
      },
      {
        id: 'shire-2',
        title: 'The Smallest Folk',
        description: 'Cast a Halfling/Kithkin, or deal combat damage with a creature of base power 1 or less.',
        flavor_text: 'Even the smallest person can change the course of the future.',
        points: 10,
      },
      {
        id: 'shire-3',
        title: 'Unexpected Journey',
        description: 'Search your library for a basic land or artifact 3 or more times in a single match.',
        flavor_text: 'I am going on an adventure!',
        points: 15,
      },
    ],
  },
  {
    id: 'bree',
    name: 'Bree-land & The Prancing Pony',
    isStartingZone: true,
    lore: 'An ancient settlement where Men and Hobbits live together in peace, centered around Barliman Butterbur’s famous hearth.',
    claimThreshold: 2,
    center: [1870, 1110],
    polygon: [
      [1940, 1050],
      [1940, 1180],
      [1810, 1180],
      [1810, 1050],
    ],
    bannerColor: '#c9a84c', // Gold
    achievements: [
      {
        id: 'bree-1',
        title: "Strider's Vigil",
        description: "Control a Human Ranger/Assassin, or protect another player's permanent from removal.",
        flavor_text: 'All that is gold does not glitter, not all those who wander are lost.',
        points: 10,
      },
      {
        id: 'bree-2',
        title: 'Pint at the Pony',
        description: 'Cast a Food token or Food-related card and sacrifice it in the same turn.',
        flavor_text: 'It comes in pints? I’m getting one!',
        points: 10,
      },
      {
        id: 'bree-3',
        title: 'Crossroads League',
        description: 'Play a 4-player Commander game where every player fields a different color combination.',
        flavor_text: 'Travellers from all four corners cross paths under the Sign of the Prancing Pony.',
        points: 15,
      },
    ],
  },
  {
    id: 'rivendell',
    name: 'Rivendell (Imladris)',
    isStartingZone: false,
    lore: 'The Last Homely House East of the Sea, hidden deep in the valley of the Bruinen under Elrond Half-elven’s sanctuary.',
    claimThreshold: 2,
    center: [1880, 1460],
    polygon: [
      [1950, 1400],
      [1960, 1540],
      [1820, 1540],
      [1810, 1400],
    ],
    bannerColor: '#2a6db0', // Blue
    achievements: [
      {
        id: 'rivendell-1',
        title: 'Council of Elrond',
        description: 'Cast a legendary spell that requires at least two colors of mana.',
        flavor_text: 'You have been summoned to seek counsel for the peril of Middle-Earth.',
        points: 10,
      },
      {
        id: 'rivendell-2',
        title: 'The Blade Reforged',
        description: 'Equip a Legendary Equipment to a Legendary Creature.',
        flavor_text: 'The crownless again shall be king.',
        points: 15,
      },
      {
        id: 'rivendell-3',
        title: 'Ancient Lorekeeper',
        description: 'Draw 5 or more cards in a single turn without discarding to hand size.',
        flavor_text: 'Such is oft the course of deeds that move the wheels of the world.',
        points: 15,
      },
    ],
  },
  {
    id: 'moria',
    name: 'Mines of Moria (Khazad-dûm)',
    isStartingZone: false,
    lore: 'The greatest mansion of the Dwarves beneath the Misty Mountains, where dwarven kings delved deep into wealth—and nameless dread.',
    claimThreshold: 2,
    center: [1600, 1510],
    polygon: [
      [1670, 1450],
      [1680, 1580],
      [1530, 1580],
      [1520, 1450],
    ],
    bannerColor: '#8a6e2f', // Dark Gold
    achievements: [
      {
        id: 'moria-1',
        title: 'Delve Too Greedily',
        description: 'Produce 10 or more mana in a single turn using lands and artifacts.',
        flavor_text: 'They delved too greedily and too deep, awakening what slept in darkness.',
        points: 10,
      },
      {
        id: 'moria-2',
        title: 'Flame of Udûn',
        description: 'Destroy 4 or more creatures simultaneously with a single board wipe.',
        flavor_text: 'A Balrog of Morgoth. Swords are of no more use here.',
        points: 15,
      },
      {
        id: 'moria-3',
        title: 'They Have a Cave Troll',
        description: 'Deal combat damage to an opponent with a creature with power 7 or greater.',
        flavor_text: 'Drums, drums in the deep. We cannot get out.',
        points: 15,
      },
    ],
  },
  {
    id: 'lothlorien',
    name: 'Lothlórien (The Golden Wood)',
    isStartingZone: false,
    lore: 'Heart of Elvendom on earth. Silver mallorn trees and the enchanted Mirror of Galadriel preserve the elder days.',
    claimThreshold: 2,
    center: [1510, 1630],
    polygon: [
      [1580, 1570],
      [1590, 1700],
      [1440, 1700],
      [1430, 1570],
    ],
    bannerColor: '#e6cf86', // Light Gold
    achievements: [
      {
        id: 'lothlorien-1',
        title: 'Mirror of Galadriel',
        description: 'Scry or surveil a total of 6 or more cards across a single game.',
        flavor_text: 'Things that were, things that are, and some things that have not yet come to pass.',
        points: 10,
      },
      {
        id: 'lothlorien-2',
        title: 'Lady of Light',
        description: 'Prevent all combat damage from an opponent’s incoming attack.',
        flavor_text: 'I will diminish, and go into the West, and remain Galadriel.',
        points: 15,
      },
      {
        id: 'lothlorien-3',
        title: 'Phial of Eärendil',
        description: 'Cast an enchantment or artifact that illuminates the board with card advantage.',
        flavor_text: 'May it be a light to you in dark places, when all other lights go out.',
        points: 10,
      },
    ],
  },
  {
    id: 'isengard',
    name: 'Isengard & Orthanc',
    isStartingZone: false,
    lore: 'The ring of Angrenost surrounding the black pinnacle of Orthanc, corrupted by Saruman’s forge fires and dark machinery.',
    claimThreshold: 2,
    center: [1260, 1400],
    polygon: [
      [1330, 1340],
      [1340, 1460],
      [1190, 1460],
      [1180, 1340],
    ],
    bannerColor: '#15110c', // Black
    achievements: [
      {
        id: 'isengard-1',
        title: 'Industrial Treason',
        description: 'Control 5 or more non-creature artifacts simultaneously.',
        flavor_text: 'The old world will burn in the fires of industry.',
        points: 10,
      },
      {
        id: 'isengard-2',
        title: 'Cast from the White Council',
        description: 'Counter a spell with mana value 5 or greater.',
        flavor_text: 'Against the power of Mordor there can be no victory.',
        points: 15,
      },
      {
        id: 'isengard-3',
        title: 'A New Power Rising',
        description: 'Amass an army token of power 5+, or control 8+ creatures with identical creature types.',
        flavor_text: 'Together, my lord Sauron, we shall rule this Middle-Earth.',
        points: 15,
      },
    ],
  },
  {
    id: 'fangorn',
    name: 'Fangorn Forest',
    isStartingZone: false,
    lore: 'Ancient shadow-draped woods where the shepherd Ents dwell, slow to anger but unstoppable when awakened.',
    claimThreshold: 2,
    center: [1360, 1560],
    polygon: [
      [1430, 1490],
      [1440, 1640],
      [1290, 1640],
      [1280, 1490],
    ],
    bannerColor: '#2f7d4f', // Green
    achievements: [
      {
        id: 'fangorn-1',
        title: 'March of the Ents',
        description: 'Attack with 3 or more creatures that each have toughness 5 or greater.',
        flavor_text: 'Side? I am on nobody’s side, because nobody is on my side.',
        points: 10,
      },
      {
        id: 'fangorn-2',
        title: 'Don’t Be Hasty',
        description: 'Take no cast actions during your pre-combat main phase for 3 consecutive turns.',
        flavor_text: 'It takes a long time to say anything in Old Entish.',
        points: 10,
      },
      {
        id: 'fangorn-3',
        title: 'The Waters of Treebeard',
        description: 'Put +1/+1 counters on 3 or more different creatures you control.',
        flavor_text: 'The Entwash made the hobbits feel tall and revitalized.',
        points: 15,
      },
    ],
  },
  {
    id: 'rohan',
    name: 'Kingdom of Rohan',
    isStartingZone: false,
    lore: 'The Riddermark—rolling green plains of the horse-lords, guarded by the great wall of Helm’s Deep.',
    claimThreshold: 2,
    center: [1200, 1530],
    polygon: [
      [1270, 1460],
      [1280, 1630],
      [1120, 1630],
      [1110, 1460],
    ],
    bannerColor: '#c72d07', // Red
    achievements: [
      {
        id: 'rohan-1',
        title: 'Ride for Ruin',
        description: 'Attack with 4 or more attacking creatures with Haste or Trample.',
        flavor_text: 'Arise, riders of Théoden! Spears shall be shaken, shields shall be splintered!',
        points: 10,
      },
      {
        id: 'rohan-2',
        title: 'Hold the Hornburg',
        description: 'Survive an opponent’s combat phase that could have dealt lethal damage to you.',
        flavor_text: 'The Horn of Helm Hammerhand shall sound in the deep, one last time!',
        points: 15,
      },
      {
        id: 'rohan-3',
        title: 'Forth Eorlingas!',
        description: 'Eliminate an opponent using Commander combat damage.',
        flavor_text: 'A red day, a sword day, ere the sun rises!',
        points: 15,
      },
    ],
  },
  {
    id: 'gondor',
    name: 'Realm of Gondor',
    isStartingZone: true,
    lore: 'The White City of Minas Tirith, seven stone tiers rising against the shadow of the East, crowned by the White Tree.',
    claimThreshold: 2,
    center: [960, 1950],
    polygon: [
      [1050, 1860],
      [1060, 2060],
      [870, 2060],
      [860, 1860],
    ],
    bannerColor: '#f3ecd8', // White / Parchment
    achievements: [
      {
        id: 'gondor-1',
        title: 'Shield of the West',
        description: 'Declare 3 or more blockers during a single combat step.',
        flavor_text: 'By the blood of our people are your lands kept safe!',
        points: 10,
      },
      {
        id: 'gondor-2',
        title: 'The Return of the King',
        description: 'Cast your Commander 3 or more times from the command zone in one game.',
        flavor_text: 'This day does not belong to one man, but to all.',
        points: 15,
      },
      {
        id: 'gondor-3',
        title: 'The White Tree Blooms',
        description: 'Gain 15 or more life across a single game.',
        flavor_text: 'A sapling of the line of Nimloth took root in the court of the fountain.',
        points: 15,
      },
    ],
  },
  {
    id: 'mordor',
    name: 'Land of Mordor',
    isStartingZone: false,
    lore: 'Surrounded by the razor ash-peaks of Ephel Dúath, the domain of the Dark Lord Sauron and the fires of Mount Doom.',
    claimThreshold: 2,
    center: [940, 2380],
    polygon: [
      [1080, 2220],
      [1090, 2580],
      [790, 2580],
      [780, 2220],
    ],
    bannerColor: '#15110c', // Black / Lava Red
    achievements: [
      {
        id: 'mordor-1',
        title: 'Cast into the Fire',
        description: 'Exile an opponent’s legendary permanent or artifact.',
        flavor_text: 'Destroy it! Cast it into the fire!',
        points: 15,
      },
      {
        id: 'mordor-2',
        title: 'One Ring to Rule Them',
        description: 'Cast a permanent spell with mana value 7 or greater.',
        flavor_text: 'Ash nazg durbatulûk, ash nazg gimbatul...',
        points: 15,
      },
      {
        id: 'mordor-3',
        title: 'The Eye Unlidded',
        description: 'Cause all 3 opponents in a pod to lose life in the same turn.',
        flavor_text: 'Great eye, lidless, wreathed in flame.',
        points: 15,
      },
    ],
  },
  {
    id: 'erebor',
    name: 'The Lonely Mountain & Dale',
    isStartingZone: false,
    lore: 'Reclaimed stronghold of King Dáin under the Mountain, flanked by the rebuilt river kingdom of Dale.',
    claimThreshold: 2,
    center: [2120, 2100],
    polygon: [
      [2200, 2030],
      [2210, 2180],
      [2040, 2180],
      [2030, 2030],
    ],
    bannerColor: '#c9a84c', // Gold
    achievements: [
      {
        id: 'erebor-1',
        title: 'Dragon’s Hoard',
        description: 'Control 5 or more Treasure tokens simultaneously.',
        flavor_text: 'Far over the misty mountains cold, to dungeons deep and caverns old...',
        points: 10,
      },
      {
        id: 'erebor-2',
        title: 'The Black Arrow',
        description: 'Destroy or exile an opponent’s creature with Flying using targeted removal.',
        flavor_text: 'Black arrow! I have saved you to the last. You have never failed me.',
        points: 15,
      },
      {
        id: 'erebor-3',
        title: 'Baruk Khazâd!',
        description: 'Attack with two or more Dwarf, Warrior, or Berserker creatures.',
        flavor_text: 'Axes of the Dwarves! The Dwarves are upon you!',
        points: 10,
      },
    ],
  },
  {
    id: 'mirkwood',
    name: 'Realm of Mirkwood',
    isStartingZone: false,
    lore: 'Vast enchanted forest of ancient trees, giant spiders, and King Thranduil’s cavern halls, formerly Greenwood the Great.',
    claimThreshold: 2,
    center: [1720, 1960],
    polygon: [
      [1890, 1830],
      [1900, 2090],
      [1550, 2090],
      [1540, 1830],
    ],
    bannerColor: '#2f7d4f', // Forest Green
    achievements: [
      {
        id: 'mirkwood-1',
        title: 'Spiders of the Shadow',
        description: 'Control a creature with Deathtouch or Reach.',
        flavor_text: 'The shadows whispered, and sticky webs hung thick from bough to bough.',
        points: 10,
      },
      {
        id: 'mirkwood-2',
        title: 'Elvenking’s Wine',
        description: 'Control a permanent with Ward, Hexproof, or Protection.',
        flavor_text: 'Feasting in the starlight beneath the great beeches of the northern wood.',
        points: 10,
      },
      {
        id: 'mirkwood-3',
        title: 'Stray Not from the Path',
        description: 'Play an entire Commander match without searching your library once.',
        flavor_text: 'Stay on the path! Do not leave it for any reason!',
        points: 15,
      },
    ],
  },
];

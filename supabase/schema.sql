-- ==============================================================================
-- MIDDLE-EARTH CAMPAIGN MAP — COMPLETE SUPABASE DATABASE SCHEMA & SEED
-- ==============================================================================
-- Run this script in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click Run
-- ==============================================================================

-- 1. PROFILES (Extends Supabase Auth with Discord metadata & permissions)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  discord_id text,
  username text not null,
  avatar_url text,
  role text default 'player' check (role in ('player', 'arbitrator', 'admin')),
  starting_region_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. REGIONS (12 Middle-Earth Strategic Territories)
create table if not exists public.regions (
  id text primary key,
  name text not null,
  lore text,
  claim_threshold integer default 2,
  claimed_by_user_id uuid references public.profiles(id) on delete set null,
  claimed_at timestamp with time zone,
  banner_username text,
  banner_color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ACHIEVEMENTS (Thematic MTG Trials for each region)
create table if not exists public.achievements (
  id text primary key,
  region_id text references public.regions(id) on delete cascade not null,
  title text not null,
  description text not null,
  flavor_text text,
  points integer default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CLAIMS (Player match submissions for arbitrator review)
create table if not exists public.claims (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  achievement_id text references public.achievements(id) on delete cascade not null,
  region_id text references public.regions(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  match_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. ACTIVITY FEED (Real-time timeline chronicle)
create table if not exists public.activity_feed (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  region_id text references public.regions(id) on delete set null,
  achievement_id text references public.achievements(id) on delete set null,
  event_type text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ─── AUTOMATIC PROFILE POPULATION VIA DISCORD AUTH ───────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_meta jsonb;
  discord_name text;
  discord_avatar text;
begin
  raw_meta := new.raw_user_meta_data;
  discord_name := coalesce(
    raw_meta->>'custom_claims'->>'global_name',
    raw_meta->>'full_name',
    raw_meta->>'name',
    split_part(new.email, '@', 1),
    'Commander'
  );
  discord_avatar := coalesce(raw_meta->>'avatar_url', null);

  insert into public.profiles (id, discord_id, username, avatar_url, role)
  values (
    new.id,
    coalesce(raw_meta->>'provider_id', raw_meta->>'sub'),
    discord_name,
    discord_avatar,
    'player'
  )
  on conflict (id) do update set
    username = excluded.username,
    avatar_url = excluded.avatar_url;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ROW LEVEL SECURITY (RLS) POLICIES ───────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.achievements enable row level security;
alter table public.claims enable row level security;
alter table public.activity_feed enable row level security;

-- Public read access
create policy "Public can read profiles" on public.profiles for select using (true);
create policy "Public can read regions" on public.regions for select using (true);
create policy "Public can read achievements" on public.achievements for select using (true);
create policy "Public can read claims" on public.claims for select using (true);
create policy "Public can read activity feed" on public.activity_feed for select using (true);

-- Authenticated user permissions
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own claims" on public.claims
  for insert with check (auth.uid() = user_id);

create policy "Arbitrators can update claims" on public.claims
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('arbitrator', 'admin')
    )
  );

create policy "Arbitrators can update regions" on public.regions
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('arbitrator', 'admin')
    )
  );

create policy "Users can insert activity" on public.activity_feed
  for insert with check (auth.uid() = user_id);

-- ─── SEED 12 REGIONS ────────────────────────────────────────────────────────
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('shire', 'The Shire', 'A pleasant corner of the quiet world, sheltered by the Rangers. Home of halflings, second breakfasts, and quiet courage.', 2, '#2f7d4f')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('bree', 'Bree-land & The Prancing Pony', 'An ancient settlement where Men and Hobbits live together in peace, centered around Barliman Butterbur’s famous hearth.', 2, '#c9a84c')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('rivendell', 'Rivendell (Imladris)', 'The Last Homely House East of the Sea, hidden deep in the valley of the Bruinen under Elrond Half-elven’s sanctuary.', 2, '#2a6db0')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('moria', 'Mines of Moria (Khazad-dûm)', 'The greatest mansion of the Dwarves beneath the Misty Mountains, where dwarven kings delved deep into wealth—and nameless dread.', 2, '#8a6e2f')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('lothlorien', 'Lothlórien (The Golden Wood)', 'Heart of Elvendom on earth. Silver mallorn trees and the enchanted Mirror of Galadriel preserve the elder days.', 2, '#e6cf86')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('isengard', 'Isengard & Orthanc', 'The ring of Angrenost surrounding the black pinnacle of Orthanc, corrupted by Saruman’s forge fires and dark machinery.', 2, '#15110c')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('fangorn', 'Fangorn Forest', 'Ancient shadow-draped woods where the shepherd Ents dwell, slow to anger but unstoppable when awakened.', 2, '#2f7d4f')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('rohan', 'Kingdom of Rohan', 'The Riddermark—rolling green plains of the horse-lords, guarded by the great wall of Helm’s Deep.', 2, '#c72d07')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('gondor', 'Realm of Gondor', 'The White City of Minas Tirith, seven stone tiers rising against the shadow of the East, crowned by the White Tree.', 2, '#f3ecd8')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('mordor', 'Land of Mordor', 'Surrounded by the razor ash-peaks of Ephel Dúath, the domain of the Dark Lord Sauron and the fires of Mount Doom.', 2, '#15110c')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('erebor', 'The Lonely Mountain & Dale', 'Reclaimed stronghold of King Dáin under the Mountain, flanked by the rebuilt river kingdom of Dale.', 2, '#c9a84c')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;
insert into public.regions (id, name, lore, claim_threshold, banner_color)
values ('mirkwood', 'Realm of Mirkwood', 'Vast enchanted forest of ancient trees, giant spiders, and King Thranduil’s cavern halls, formerly Greenwood the Great.', 2, '#2f7d4f')
on conflict (id) do update set
  name = excluded.name,
  lore = excluded.lore,
  claim_threshold = excluded.claim_threshold,
  banner_color = excluded.banner_color;

-- ─── SEED 36 ACHIEVEMENTS ───────────────────────────────────────────────────
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('shire-1', 'shire', 'Second Breakfast', 'Win a game where your life total reached 40 or higher.', 'What about elevenses? Luncheon? Afternoon tea? Dinner? Supper?', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('shire-2', 'shire', 'The Smallest Folk', 'Cast a Halfling/Kithkin, or deal combat damage with a creature of base power 1 or less.', 'Even the smallest person can change the course of the future.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('shire-3', 'shire', 'Unexpected Journey', 'Search your library for a basic land or artifact 3 or more times in a single match.', 'I am going on an adventure!', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('bree-1', 'bree', 'Strider''s Vigil', 'Control a Human Ranger/Assassin, or protect another player''s permanent from removal.', 'All that is gold does not glitter, not all those who wander are lost.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('bree-2', 'bree', 'Pint at the Pony', 'Cast a Food token or Food-related card and sacrifice it in the same turn.', 'It comes in pints? I’m getting one!', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('bree-3', 'bree', 'Crossroads League', 'Play a 4-player Commander game where every player fields a different color combination.', 'Travellers from all four corners cross paths under the Sign of the Prancing Pony.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('rivendell-1', 'rivendell', 'Council of Elrond', 'Cast a legendary spell that requires at least two colors of mana.', 'You have been summoned to seek counsel for the peril of Middle-Earth.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('rivendell-2', 'rivendell', 'The Blade Reforged', 'Equip a Legendary Equipment to a Legendary Creature.', 'The crownless again shall be king.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('rivendell-3', 'rivendell', 'Ancient Lorekeeper', 'Draw 5 or more cards in a single turn without discarding to hand size.', 'Such is oft the course of deeds that move the wheels of the world.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('moria-1', 'moria', 'Delve Too Greedily', 'Produce 10 or more mana in a single turn using lands and artifacts.', 'They delved too greedily and too deep, awakening what slept in darkness.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('moria-2', 'moria', 'Flame of Udûn', 'Destroy 4 or more creatures simultaneously with a single board wipe.', 'A Balrog of Morgoth. Swords are of no more use here.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('moria-3', 'moria', 'They Have a Cave Troll', 'Deal combat damage to an opponent with a creature with power 7 or greater.', 'Drums, drums in the deep. We cannot get out.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('lothlorien-1', 'lothlorien', 'Mirror of Galadriel', 'Scry or surveil a total of 6 or more cards across a single game.', 'Things that were, things that are, and some things that have not yet come to pass.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('lothlorien-2', 'lothlorien', 'Lady of Light', 'Prevent all combat damage from an opponent’s incoming attack.', 'I will diminish, and go into the West, and remain Galadriel.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('lothlorien-3', 'lothlorien', 'Phial of Eärendil', 'Cast an enchantment or artifact that illuminates the board with card advantage.', 'May it be a light to you in dark places, when all other lights go out.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('isengard-1', 'isengard', 'Industrial Treason', 'Control 5 or more non-creature artifacts simultaneously.', 'The old world will burn in the fires of industry.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('isengard-2', 'isengard', 'Cast from the White Council', 'Counter a spell with mana value 5 or greater.', 'Against the power of Mordor there can be no victory.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('isengard-3', 'isengard', 'A New Power Rising', 'Amass an army token of power 5+, or control 8+ creatures with identical creature types.', 'Together, my lord Sauron, we shall rule this Middle-Earth.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('fangorn-1', 'fangorn', 'March of the Ents', 'Attack with 3 or more creatures that each have toughness 5 or greater.', 'Side? I am on nobody’s side, because nobody is on my side.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('fangorn-2', 'fangorn', 'Don’t Be Hasty', 'Take no cast actions during your pre-combat main phase for 3 consecutive turns.', 'It takes a long time to say anything in Old Entish.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('fangorn-3', 'fangorn', 'The Waters of Treebeard', 'Put +1/+1 counters on 3 or more different creatures you control.', 'The Entwash made the hobbits feel tall and revitalized.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('rohan-1', 'rohan', 'Ride for Ruin', 'Attack with 4 or more attacking creatures with Haste or Trample.', 'Arise, riders of Théoden! Spears shall be shaken, shields shall be splintered!', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('rohan-2', 'rohan', 'Hold the Hornburg', 'Survive an opponent’s combat phase that could have dealt lethal damage to you.', 'The Horn of Helm Hammerhand shall sound in the deep, one last time!', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('rohan-3', 'rohan', 'Forth Eorlingas!', 'Eliminate an opponent using Commander combat damage.', 'A red day, a sword day, ere the sun rises!', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('gondor-1', 'gondor', 'Shield of the West', 'Declare 3 or more blockers during a single combat step.', 'By the blood of our people are your lands kept safe!', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('gondor-2', 'gondor', 'The Return of the King', 'Cast your Commander 3 or more times from the command zone in one game.', 'This day does not belong to one man, but to all.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('gondor-3', 'gondor', 'The White Tree Blooms', 'Gain 15 or more life across a single game.', 'A sapling of the line of Nimloth took root in the court of the fountain.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('mordor-1', 'mordor', 'Cast into the Fire', 'Exile an opponent’s legendary permanent or artifact.', 'Destroy it! Cast it into the fire!', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('mordor-2', 'mordor', 'One Ring to Rule Them', 'Cast a permanent spell with mana value 7 or greater.', 'Ash nazg durbatulûk, ash nazg gimbatul...', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('mordor-3', 'mordor', 'The Eye Unlidded', 'Cause all 3 opponents in a pod to lose life in the same turn.', 'Great eye, lidless, wreathed in flame.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('erebor-1', 'erebor', 'Dragon’s Hoard', 'Control 5 or more Treasure tokens simultaneously.', 'Far over the misty mountains cold, to dungeons deep and caverns old...', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('erebor-2', 'erebor', 'The Black Arrow', 'Destroy or exile an opponent’s creature with Flying using targeted removal.', 'Black arrow! I have saved you to the last. You have never failed me.', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('erebor-3', 'erebor', 'Baruk Khazâd!', 'Attack with two or more Dwarf, Warrior, or Berserker creatures.', 'Axes of the Dwarves! The Dwarves are upon you!', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('mirkwood-1', 'mirkwood', 'Spiders of the Shadow', 'Control a creature with Deathtouch or Reach.', 'The shadows whispered, and sticky webs hung thick from bough to bough.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('mirkwood-2', 'mirkwood', 'Elvenking’s Wine', 'Control a permanent with Ward, Hexproof, or Protection.', 'Feasting in the starlight beneath the great beeches of the northern wood.', 10)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;
insert into public.achievements (id, region_id, title, description, flavor_text, points)
values ('mirkwood-3', 'mirkwood', 'Stray Not from the Path', 'Play an entire Commander match without searching your library once.', 'Stay on the path! Do not leave it for any reason!', 15)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  flavor_text = excluded.flavor_text,
  points = excluded.points;

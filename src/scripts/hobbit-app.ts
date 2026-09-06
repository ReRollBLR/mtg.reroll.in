import L from 'leaflet';
import './leaflet-smooth-wheel-zoom';
import confetti from 'canvas-confetti';
import {
  supabase,
  isConfigured,
  signInWithDiscord,
  getCurrentProfile,
  submitClaim,
  approveClaim,
  rejectClaim,
  type Profile,
  type Claim,
  type ActivityItem,
} from '../lib/supabase';
import { REGIONS, type RegionDef } from '../data/hobbit/regions';

// Local / Mock State fallback if Supabase is still connecting
interface CampaignState {
  profile: Profile | null;
  regionOwners: Record<string, { userId: string; username: string; avatarUrl?: string; claimedAt: string }>;
  userClaims: Claim[];
  pendingClaims: Claim[];
  activity: ActivityItem[];
}

const state: CampaignState = {
  profile: null,
  regionOwners: {
    shire: {
      userId: 'mock-1',
      username: 'PeregrinTook',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      claimedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  },
  userClaims: [],
  pendingClaims: [
    {
      id: 'mock-claim-1',
      user_id: 'mock-2',
      username: 'Gimli_Son_Of_Gloin',
      avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      achievement_id: 'moria-1',
      achievement_title: 'Delve Too Greedily',
      region_id: 'moria',
      region_name: 'Mines of Moria (Khazad-dûm)',
      status: 'pending',
      match_notes: 'Table 4: Produced 14 mana with Sol Ring and Cabal Coffers on Turn 6 vs Rohan.',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  activity: [
    {
      id: 'act-1',
      user_id: 'mock-1',
      username: 'PeregrinTook',
      region_id: 'shire',
      region_name: 'The Shire',
      event_type: 'region_conquered',
      message: 'conquered The Shire after fulfilling 2 tabletop trials!',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
};

let map: L.Map | null = null;
const polygonLayers: Record<string, L.Polygon> = {};
let selectedRegionId: string = 'shire';

// DOM Elements
const authBtn = document.getElementById('auth-action-btn') as HTMLButtonElement;
const userProfileContainer = document.getElementById('user-profile-display');
const userAvatar = document.getElementById('user-avatar-img') as HTMLImageElement;
const userName = document.getElementById('user-username');
const userRoleBadge = document.getElementById('user-role-badge');
const arbitratorToggleBtn = document.getElementById('open-arbitrator-btn');
const arbitratorPendingBadge = document.getElementById('arbitrator-pending-count-badge');
const headerPendingBadge = document.getElementById('header-arbitrator-badge');
const drawerBackdrop = document.getElementById('hobbit-drawer-backdrop');

// Region Drawer Elements
const regionDrawer = document.getElementById('region-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const drawerMtgCard = document.getElementById('drawer-mtg-card');
const drawerRegionName = document.getElementById('drawer-region-name');
const drawerStartingBadge = document.getElementById('drawer-starting-badge');
const drawerManaPipIcon = document.getElementById('drawer-mana-pip-icon');
const drawerTerritoryArt = document.getElementById('drawer-territory-art') as HTMLImageElement;
const drawerConquestStatus = document.getElementById('drawer-conquest-status');
const drawerControllerName = document.getElementById('drawer-controller-name');
const drawerControllerAvatar = document.getElementById('drawer-controller-avatar');
const drawerRegionLore = document.getElementById('drawer-region-lore');
const drawerClaimProgressBar = document.getElementById('drawer-claim-progress-bar');
const drawerClaimProgressText = document.getElementById('drawer-claim-progress-text');
const drawerAchievementsList = document.getElementById('drawer-achievements-list');
const drawerClaimFormSection = document.getElementById('drawer-claim-form-section');
const drawerLoginPrompt = document.getElementById('drawer-login-prompt');
const claimRegionIdInput = document.getElementById('claim-region-id') as HTMLInputElement;
const claimAchievementSelect = document.getElementById('claim-achievement-select') as HTMLSelectElement;
const submitClaimForm = document.getElementById('submit-claim-form') as HTMLFormElement;

// Region Mana Identity & Card Frame Config
const REGION_FRAME_CONFIG: Record<string, { grad: string; pip: string; sym: string }> = {
  shire: {
    grad: 'linear-gradient(150deg, #3d9a64, #2f7d4f 48%, #1b4b2e 82%, #0d2818)',
    pip: 'g',
    sym: 'Forest',
  },
  bree: {
    grad: 'linear-gradient(150deg, #e6cf86, #c9a84c 48%, #8a6e2f 82%, #423211)',
    pip: 'c',
    sym: 'Crossroads',
  },
  rivendell: {
    grad: 'linear-gradient(150deg, #4da4e0, #2a6db0 48%, #174270 82%, #0b1f36)',
    pip: 'u',
    sym: 'Sanctuary',
  },
  moria: {
    grad: 'linear-gradient(150deg, #8a7350, #5c4830 48%, #362a1c 82%, #1a130c)',
    pip: 'b',
    sym: 'Cavern',
  },
  lothlorien: {
    grad: 'linear-gradient(150deg, #ebd68a, #baa14e 48%, #3d7a4c 82%, #14331e)',
    pip: 'g',
    sym: 'Mallorn',
  },
  isengard: {
    grad: 'linear-gradient(150deg, #665c54, #3a322d 48%, #211c18 82%, #0f0c0a)',
    pip: 'b',
    sym: 'Orthanc',
  },
  fangorn: {
    grad: 'linear-gradient(150deg, #2d7a4c, #1e5c36 48%, #123821 82%, #081a0f)',
    pip: 'g',
    sym: 'Entwood',
  },
  rohan: {
    grad: 'linear-gradient(150deg, #e7593a, #c72d07 48%, #7a1804 82%, #4d0f02)',
    pip: 'r',
    sym: 'Riddermark',
  },
  gondor: {
    grad: 'linear-gradient(150deg, #f7f3df, #dcd4b8 48%, #a89a74 82%, #5e543b)',
    pip: 'w',
    sym: 'White City',
  },
  mordor: {
    grad: 'linear-gradient(150deg, #991f1f, #571212 48%, #290808 82%, #120303)',
    pip: 'r',
    sym: 'Barad-dûr',
  },
  erebor: {
    grad: 'linear-gradient(150deg, #d4a73b, #a67c1e 48%, #694d0f 82%, #382806)',
    pip: 'c',
    sym: 'Mountain',
  },
  mirkwood: {
    grad: 'linear-gradient(150deg, #2a5944, #1b3d2e 48%, #10261c 82%, #08140e)',
    pip: 'g',
    sym: 'Shadows',
  },
};

function getManaPipSvg(type: string): string {
  switch (type) {
    case 'w':
      return `
        <span class="mana-pip w-7 h-7 inline-flex items-center justify-center rounded-full" style="--disc:#f7f3df;">
          <svg viewBox="0 0 24 24" class="w-4 h-4 stroke-[#15110c] stroke-2" fill="none" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.2" fill="#15110c" stroke="none"></circle>
            <line x1="12" y1="2.5" x2="12" y2="5.2"></line>
            <line x1="12" y1="18.8" x2="12" y2="21.5"></line>
            <line x1="2.5" y1="12" x2="5.2" y2="12"></line>
            <line x1="18.8" y1="12" x2="21.5" y2="12"></line>
            <line x1="5.2" y1="5.2" x2="7.1" y2="7.1"></line>
            <line x1="16.9" y1="16.9" x2="18.8" y2="18.8"></line>
            <line x1="18.8" y1="5.2" x2="16.9" y2="7.1"></line>
            <line x1="7.1" y1="16.9" x2="5.2" y2="18.8"></line>
          </svg>
        </span>
      `;
    case 'u':
      return `
        <span class="mana-pip w-7 h-7 inline-flex items-center justify-center rounded-full" style="--disc:#a9dcf5;">
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-[#15110c]">
            <path d="M12 3.5c-3.4 4.2-6 7.4-6 10.6a6 6 0 0 0 12 0c0-3.2-2.6-6.4-6-10.6z"></path>
          </svg>
        </span>
      `;
    case 'b':
      return `
        <span class="mana-pip w-7 h-7 inline-flex items-center justify-center rounded-full" style="--disc:#cabfbb;">
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-[#15110c]">
            <path d="M12 4c-4.2 0-7.2 3-7.2 6.8 0 2.2 1.1 3.9 2.6 5v2.1c0 .7.5 1.1 1.1 1.1h.9v-1.8h1.3v1.8h1.3v-1.8h1.3v1.8h.9c.6 0 1.1-.4 1.1-1.1v-2.1c1.5-1.1 2.6-2.8 2.6-5C19.2 7 16.2 4 12 4z"></path>
            <circle cx="9.2" cy="11.2" r="1.7" fill="#cabfbb"></circle>
            <circle cx="14.8" cy="11.2" r="1.7" fill="#cabfbb"></circle>
          </svg>
        </span>
      `;
    case 'r':
      return `
        <span class="mana-pip w-7 h-7 inline-flex items-center justify-center rounded-full" style="--disc:#f6a98e;">
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-[#15110c]">
            <path d="M13.5 3c.6 2.6-.8 4.1-2.3 5.6C9.4 10.3 7.5 12 7.5 15a4.5 4.5 0 0 0 9 0c0-1.7-.7-2.9-1.4-4 .1 1-.4 1.9-1.1 2.3.5-2-.6-4.3-1.8-5.6.6 1.6-.2 2.7-.9 3.4.5-2.4-.2-5.6 2.2-8.1z"></path>
          </svg>
        </span>
      `;
    case 'g':
      return `
        <span class="mana-pip w-7 h-7 inline-flex items-center justify-center rounded-full" style="--disc:#9ad2ad;">
          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-[#15110c]">
            <rect x="11" y="13" width="2" height="7" rx="0.6"></rect>
            <path d="M12 3.5c-3 0-5.2 2.3-5.2 5 0 1.2.5 2.3 1.3 3.1-.6.6-1 1.5-1 2.4 0 .6.2 1.1.5 1.6.8-1.1 2-1.8 3.2-2.3v-2.6l-1.8-1.4 1.8.3V8.4l-1.5-1.6 1.5.6V5.2c.4-.4.9-.6 1.2-.6s.8.2 1.2.6v2.2l1.5-.6L13 8.4v1.2l1.8-.3-1.8 1.4v2.6c1.2.5 2.4 1.2 3.2 2.3.3-.5.5-1 .5-1.6 0-.9-.4-1.8-1-2.4.8-.8 1.3-1.9 1.3-3.1 0-2.7-2.2-5-5.2-5z"></path>
          </svg>
        </span>
      `;
    default:
      return `
        <span class="mana-pip w-7 h-7 inline-flex items-center justify-center rounded-full" style="--disc:#e6cf86;">
          <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 fill-[#15110c]">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        </span>
      `;
  }
}

// Arbitrator Panel Elements
const arbitratorPanel = document.getElementById('arbitrator-panel');
const closeArbitratorBtn = document.getElementById('close-arbitrator-btn');
const arbitratorClaimsList = document.getElementById('arbitrator-claims-list');
const arbitratorEmptyState = document.getElementById('arbitrator-empty-state');

// Leaderboard Modal Elements
const leaderboardModal = document.getElementById('leaderboard-modal');
const openLeaderboardBtn = document.getElementById('open-leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const tabCommandersBtn = document.getElementById('tab-commanders-btn');
const tabChronicleBtn = document.getElementById('tab-chronicle-btn');
const tabRulesBtn = document.getElementById('tab-rules-btn');
const tabCommandersContent = document.getElementById('tab-commanders-content');
const tabChronicleContent = document.getElementById('tab-chronicle-content');
const tabRulesContent = document.getElementById('tab-rules-content');
const leaderboardPlayersList = document.getElementById('leaderboard-players-list');
const chronicleFeedList = document.getElementById('chronicle-feed-list');

// Starter Realm Modal
const starterRealmModal = document.getElementById('starter-realm-modal');

// ─── INITIALIZATION ──────────────────────────────────────────────────────────

export async function initHobbitApp() {
  initLeafletMap();
  setupEventListeners();
  await setupAuth();
  await loadCampaignData();
  renderMapPolygons();
  updateArbitratorBadge();
}

// ─── MAP ENGINE (Leaflet + L.CRS.Simple) ──────────────────────────────────────

function initLeafletMap() {
  const container = document.getElementById('middle-earth-map');
  if (!container) return;

  const mapWidth = 3072;
  const mapHeight = 2816;
  const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]];

  const isMobile = window.innerWidth < 768;
  const initialZoom = isMobile ? -0.85 : -0.25;
  const initialCenter: L.LatLngExpression = isMobile ? [1400, 1500] : [1500, 1500];

  map = L.map('middle-earth-map', {
    crs: L.CRS.Simple,
    minZoom: isMobile ? -2.2 : -1.5,
    maxZoom: 1.5,
    zoomSnap: 0,
    zoomDelta: 0.25,
    scrollWheelZoom: false,
    smoothWheelZoom: true,
    smoothSensitivity: 1,
    attributionControl: false,
    maxBounds: [[-250, -250], [mapHeight + 250, mapWidth + 250]],
    maxBoundsViscosity: 0.75,
  });

  // Add the stitched high-res image overlay
  L.imageOverlay('/images/map/middle-earth.webp', bounds).addTo(map);

  // Focus view on Middle-Earth center (responsive framing)
  map.setView(initialCenter, initialZoom);

  // Add polygon boundaries for each region
  REGIONS.forEach((region) => {
    const isClaimed = Boolean(state.regionOwners[region.id]);
    const owner = state.regionOwners[region.id];

    const poly = L.polygon(region.polygon, {
      color: isClaimed ? '#c9a84c' : '#c9a84c',
      weight: isClaimed ? 2.5 : 1.2,
      opacity: isClaimed ? 0.95 : 0.4,
      fillColor: isClaimed ? region.bannerColor : '#c9a84c',
      fillOpacity: isClaimed ? 0.35 : 0.08,
      className: 'region-polygon-layer cursor-pointer',
    }).addTo(map);

    // Custom hover tooltip
    poly.bindTooltip(
      `
      <div class="font-serif text-left px-1.5 py-1">
        <div class="font-bold text-xs uppercase tracking-wider text-[#c9a84c] font-['Cinzel',serif]">${region.name}</div>
        <div class="text-[11px] text-[#d4c6b0] font-['Cinzel',serif] mt-0.5">
          ${isClaimed ? `Controlled by ${owner.username}` : 'Unclaimed Domain'}
        </div>
      </div>
      `,
      {
        direction: 'top',
        className: 'mtg-map-tooltip',
        opacity: 0.98,
      }
    );

    // Click handler
    poly.on('click', () => {
      openRegionDrawer(region.id);
    });

    // Hover effect
    poly.on('mouseover', () => {
      poly.setStyle({
        weight: 3,
        opacity: 1,
        fillOpacity: isClaimed ? 0.5 : 0.22,
      });
    });

    poly.on('mouseout', () => {
      poly.setStyle({
        weight: isClaimed ? 2.5 : 1.2,
        opacity: isClaimed ? 0.95 : 0.4,
        fillOpacity: isClaimed ? 0.35 : 0.08,
      });
    });

    polygonLayers[region.id] = poly;

    // Pin marker
    const markerHtml = `
      <div class="group cursor-pointer transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
        <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14100b]/95 border border-[#c9a84c]/60 shadow-xl backdrop-blur-md group-hover:scale-105 group-hover:border-[#c9a84c] transition-all">
          <span class="text-xs text-[#c9a84c]">✦</span>
          <span class="text-[11px] uppercase font-bold tracking-widest text-[#f3ecd8] font-['Cinzel',serif] whitespace-nowrap">
            ${region.name}
          </span>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: markerHtml,
      className: 'bg-transparent border-0',
      iconSize: [140, 30],
      iconAnchor: [70, 15],
    });

    const marker = L.marker(region.center, { icon }).addTo(map);
    marker.on('click', () => openRegionDrawer(region.id));
  });
}

function renderMapPolygons() {
  REGIONS.forEach((region) => {
    const poly = polygonLayers[region.id];
    if (!poly) return;

    const isClaimed = Boolean(state.regionOwners[region.id]);
    poly.setStyle({
      color: isClaimed ? '#c9a84c' : '#c9a84c',
      weight: isClaimed ? 2.5 : 1.2,
      opacity: isClaimed ? 0.95 : 0.4,
      fillColor: isClaimed ? region.bannerColor : '#c9a84c',
      fillOpacity: isClaimed ? 0.35 : 0.08,
    });
  });
}

// ─── AUTHENTICATION ──────────────────────────────────────────────────────────

async function setupAuth() {
  if (isConfigured) {
    try {
      const profile = await getCurrentProfile();
      if (profile) {
        state.profile = profile;
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          state.profile = await getCurrentProfile();
        } else {
          state.profile = null;
        }
        updateAuthUI();
        checkStarterRealmPrompt();
      });
    } catch (err) {
      console.warn('Supabase auth check failed:', err);
    }
  }

  updateAuthUI();
}

function updateAuthUI() {
  const p = state.profile;
  if (p) {
    if (userProfileContainer) userProfileContainer.classList.remove('hidden');
    if (authBtn) authBtn.classList.add('hidden');

    if (userAvatar) {
      userAvatar.src = p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
    }
    if (userName) userName.textContent = p.username;
    if (userRoleBadge) {
      userRoleBadge.textContent = p.role.toUpperCase();
      userRoleBadge.className = `text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-['Cinzel',serif] font-bold ${
        p.role === 'arbitrator' || p.role === 'admin'
          ? 'bg-[#c72d07]/30 border border-[#c72d07] text-[#ff7e70]'
          : 'bg-[#c9a84c]/20 border border-[#c9a84c]/50 text-[#c9a84c]'
      }`;
    }

    if (p.role === 'arbitrator' || p.role === 'admin') {
      if (arbitratorToggleBtn) arbitratorToggleBtn.classList.remove('hidden');
    }

    if (drawerClaimFormSection) drawerClaimFormSection.classList.remove('hidden');
    if (drawerLoginPrompt) drawerLoginPrompt.classList.add('hidden');
  } else {
    if (userProfileContainer) userProfileContainer.classList.add('hidden');
    if (authBtn) authBtn.classList.remove('hidden');
    if (arbitratorToggleBtn) arbitratorToggleBtn.classList.add('hidden');
    if (drawerClaimFormSection) drawerClaimFormSection.classList.add('hidden');
    if (drawerLoginPrompt) drawerLoginPrompt.classList.remove('hidden');
  }
}

function checkStarterRealmPrompt() {
  if (state.profile && !state.profile.starting_region_id) {
    if (starterRealmModal) {
      starterRealmModal.classList.remove('hidden');
      starterRealmModal.classList.add('flex');
    }
  }
}

// ─── REGION DRAWER ───────────────────────────────────────────────────────────

export function openRegionDrawer(regionId: string) {
  selectedRegionId = regionId;
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) return;

  // Apply MTG Card Frame Gradient & Mana Identity
  const frameCfg = REGION_FRAME_CONFIG[region.id] || {
    grad: 'linear-gradient(150deg, #e6cf86, #c9a84c 48%, #8a6e2f 82%, #423211)',
    pip: 'c',
    sym: 'Crossroads',
  };

  if (drawerMtgCard) {
    drawerMtgCard.style.setProperty('--card-grad', frameCfg.grad);
  }

  if (drawerRegionName) drawerRegionName.textContent = region.name;
  
  if (drawerStartingBadge) {
    if (region.isStartingZone) drawerStartingBadge.classList.remove('hidden');
    else drawerStartingBadge.classList.add('hidden');
  }

  if (drawerManaPipIcon) {
    drawerManaPipIcon.innerHTML = getManaPipSvg(frameCfg.pip);
  }

  if (drawerTerritoryArt) {
    drawerTerritoryArt.src = `/images/territories/${region.id}.webp`;
    drawerTerritoryArt.alt = `${region.name} Cartography`;
  }

  const owner = state.regionOwners[region.id];
  if (owner) {
    if (drawerConquestStatus) drawerConquestStatus.textContent = 'Controlled';
    if (drawerControllerName) drawerControllerName.textContent = owner.username;
    if (drawerControllerAvatar) {
      drawerControllerAvatar.innerHTML = owner.avatarUrl
        ? `<img src="${owner.avatarUrl}" class="w-full h-full object-cover" />`
        : '<svg class="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }
  } else {
    if (drawerConquestStatus) drawerConquestStatus.textContent = 'Unclaimed Frontier';
    if (drawerControllerName) drawerControllerName.textContent = 'Unclaimed Domain';
    if (drawerControllerAvatar) {
      drawerControllerAvatar.innerHTML = '<svg class="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }
  }

  if (drawerRegionLore) drawerRegionLore.textContent = `"${region.lore}"`;

  // Calculate user's approved trials in this region
  const userApproved = state.userClaims.filter(
    (c) => c.region_id === region.id && c.status === 'approved' && (!state.profile || c.user_id === state.profile.id)
  ).length;

  const percent = Math.min(100, Math.round((userApproved / region.claimThreshold) * 100));
  if (drawerClaimProgressBar) drawerClaimProgressBar.style.width = `${percent}%`;
  if (drawerClaimProgressText) drawerClaimProgressText.textContent = `${userApproved} of ${region.claimThreshold} trials fulfilled`;

  // Render Achievements as Authentic Saga Chapters (I, II, III) — NO NESTED CARDS
  const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V'];

  if (drawerAchievementsList) {
    drawerAchievementsList.innerHTML = region.achievements
      .map((ach, idx) => {
        const userClaim = state.userClaims.find(
          (c) => c.achievement_id === ach.id && (!state.profile || c.user_id === state.profile.id)
        );
        const status = userClaim ? userClaim.status : 'unstarted';
        const roman = ROMAN_NUMERALS[idx] || `${idx + 1}`;

        return `
          <div class="relative flex items-start gap-3.5 py-2.5 border-b border-[#c9a84c]/15 last:border-b-0">
            <!-- Chapter Shield Indicator -->
            <div class="shrink-0 flex flex-col items-center pt-0.5">
              <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs font-serif-title shadow-md border ${
                status === 'approved'
                  ? 'bg-[#2f7d4f] border-[#8ade9c] text-white shadow-[#2f7d4f]/30'
                  : status === 'pending'
                  ? 'bg-[#8a6e2f] border-[#e6cf86] text-amber-100 shadow-[#8a6e2f]/30'
                  : 'bg-[#18120b] border-[#c9a84c]/40 text-[#c9a84c]'
              }">
                ${
                  status === 'approved'
                    ? '<svg class="w-4 h-4 stroke-current stroke-[2.5]" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                    : status === 'pending'
                    ? '<svg class="w-4 h-4 stroke-current stroke-[2]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke-dasharray="24" stroke-linecap="round"></circle></svg>'
                    : roman
                }
              </div>
              <span class="text-[9px] uppercase tracking-wider font-bold mt-1 ${
                status === 'approved' ? 'text-[#8ade9c]' : status === 'pending' ? 'text-[#e6cf86]' : 'text-[#9c8f78]'
              }">
                ${status === 'approved' ? 'Fulfilled' : status === 'pending' ? 'Pending' : `★ ${ach.points}`}
              </span>
            </div>

            <!-- Chapter Ability Text -->
            <div class="flex-1 min-w-0 space-y-1">
              <div class="flex items-baseline justify-between gap-2">
                <h4 class="font-serif-title font-bold text-sm text-[#f3ecd8] tracking-wide">
                  ${ach.title}
                </h4>
              </div>
              <p class="font-serif-body text-[0.92rem] leading-snug text-text-parchment">
                ${ach.description}
              </p>
              <p class="font-serif-body italic text-xs text-[#c9a84c]/80 pt-0.5">
                "${ach.flavor_text}"
              </p>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // Populate Claim Form Select
  if (claimRegionIdInput) claimRegionIdInput.value = region.id;
  if (claimAchievementSelect) {
    claimAchievementSelect.innerHTML =
      '<option value="">Select completed trial...</option>' +
      region.achievements
        .map((ach) => `<option value="${ach.id}">${ach.title} (★ ${ach.points})</option>`)
        .join('');
  }

  // Show Drawer and Backdrop
  if (regionDrawer) {
    regionDrawer.classList.remove('translate-x-full');
  }
  if (drawerBackdrop) {
    drawerBackdrop.classList.remove('hidden');
  }
}

export function closeRegionDrawer() {
  if (regionDrawer) {
    regionDrawer.classList.add('translate-x-full');
  }
  if (drawerBackdrop && (!arbitratorPanel || arbitratorPanel.classList.contains('-translate-x-full'))) {
    drawerBackdrop.classList.add('hidden');
  }
}

// ─── ARBITRATOR COUNCIL QUEUE ────────────────────────────────────────────────

function openArbitratorPanel() {
  renderArbitratorClaims();
  if (arbitratorPanel) {
    arbitratorPanel.classList.remove('-translate-x-full');
  }
  if (drawerBackdrop) {
    drawerBackdrop.classList.remove('hidden');
  }
}

function closeArbitratorPanel() {
  if (arbitratorPanel) {
    arbitratorPanel.classList.add('-translate-x-full');
  }
  if (drawerBackdrop && (!regionDrawer || regionDrawer.classList.contains('translate-x-full'))) {
    drawerBackdrop.classList.add('hidden');
  }
}

function renderArbitratorClaims() {
  if (!arbitratorClaimsList) return;

  const pending = state.pendingClaims;
  if (pending.length === 0) {
    if (arbitratorEmptyState) arbitratorEmptyState.classList.remove('hidden');
    arbitratorClaimsList.innerHTML = '';
    return;
  }

  if (arbitratorEmptyState) arbitratorEmptyState.classList.add('hidden');
  arbitratorClaimsList.innerHTML = pending
    .map(
      (claim) => `
      <div class="p-5 rounded-xl bg-[#18110a] border border-mtg-gold/40 space-y-3.5 shadow-xl" data-claim-id="${claim.id}">
        <!-- Slip Header -->
        <div class="flex items-start justify-between gap-3 border-b border-[#c9a84c]/20 pb-3">
          <div class="flex items-center gap-3">
            <img src="${claim.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="w-9 h-9 rounded-full border border-mtg-gold object-cover shadow-sm" />
            <div>
              <div class="font-serif-title font-bold text-xs text-[#f3ecd8]">${claim.username}</div>
              <div class="text-[11px] text-[#c9a84c] uppercase tracking-wider font-serif-title">${claim.region_name || 'Middle-Earth'}</div>
            </div>
          </div>
          <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#c72d07]/20 border border-[#c72d07]/50 text-[#ff7e70] font-serif-title font-bold">
            Awaiting Council
          </span>
        </div>

        <!-- Claim Content -->
        <div class="space-y-1.5">
          <div class="text-xs font-bold text-[#f3ecd8] font-serif-title flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-mtg-gold stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
              <line x1="13" y1="19" x2="19" y2="13"></line>
              <line x1="16" y1="16" x2="20" y2="20"></line>
              <line x1="19" y1="21" x2="21" y2="19"></line>
              <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline>
              <line x1="5" y1="14" x2="9" y2="18"></line>
              <line x1="7" y1="17" x2="4" y2="20"></line>
              <line x1="3" y1="19" x2="5" y2="21"></line>
            </svg>
            <span>${claim.achievement_title || 'Trial Claim'}</span>
          </div>
          <div class="text-xs text-[#d4c6b0] font-serif-body italic bg-[#100b08] p-3 rounded border border-[#c9a84c]/20 leading-relaxed">
            "${claim.match_notes || 'No match notes provided'}"
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2.5 pt-1">
          <button
            type="button"
            data-action="approve"
            data-claim-id="${claim.id}"
            class="btn-tap flex-1 min-h-[44px] py-2.5 px-3 rounded-md text-center font-serif-title font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Approve & Stamp
          </button>
          <button
            type="button"
            data-action="reject"
            data-claim-id="${claim.id}"
            class="min-h-[44px] py-2.5 px-4 rounded-md bg-[#120c08] hover:bg-[#c72d07]/20 border border-[#c72d07]/40 text-[#ff7e70] font-serif-title font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Decline
          </button>
        </div>
      </div>
    `
    )
    .join('');

  // Attach button actions
  arbitratorClaimsList.querySelectorAll('button[data-action]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const target = e.currentTarget as HTMLButtonElement;
      const action = target.dataset.action;
      const claimId = target.dataset.claimId;
      const claim = state.pendingClaims.find((c) => c.id === claimId);
      if (!claim) return;

      target.disabled = true;
      target.textContent = 'Updating...';

      if (action === 'approve') {
        await handleApproveClaim(claim);
      } else {
        await handleRejectClaim(claimId!);
      }
    });
  });
}

async function handleApproveClaim(claim: Claim) {
  if (isConfigured) {
    try {
      await approveClaim(claim);
    } catch (err) {
      console.error('Approve failed:', err);
    }
  }

  // Update local state
  state.pendingClaims = state.pendingClaims.filter((c) => c.id !== claim.id);
  claim.status = 'approved';
  state.userClaims.push(claim);

  // Check if region threshold is reached
  const region = REGIONS.find((r) => r.id === claim.region_id);
  if (region) {
    const userApprovedCount = state.userClaims.filter(
      (c) => c.region_id === region.id && c.user_id === claim.user_id && c.status === 'approved'
    ).length;

    if (userApprovedCount >= region.claimThreshold) {
      state.regionOwners[region.id] = {
        userId: claim.user_id,
        username: claim.username || 'Commander',
        avatarUrl: claim.avatar_url,
        claimedAt: new Date().toISOString(),
      };

      state.activity.unshift({
        id: `act-${Date.now()}`,
        user_id: claim.user_id,
        username: claim.username || 'Commander',
        avatar_url: claim.avatar_url,
        region_id: region.id,
        region_name: region.name,
        event_type: 'region_conquered',
        message: `conquered ${region.name} after fulfilling the trials!`,
        created_at: new Date().toISOString(),
      });

      // Celebration Confetti!
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#c9a84c', '#f3ecd8', '#e6cf86', '#2f7d4f'],
      });
    } else {
      state.activity.unshift({
        id: `act-${Date.now()}`,
        user_id: claim.user_id,
        username: claim.username || 'Commander',
        avatar_url: claim.avatar_url,
        region_id: region.id,
        region_name: region.name,
        achievement_title: claim.achievement_title,
        event_type: 'claim_approved',
        message: `fulfilled trial "${claim.achievement_title}" in ${region.name}!`,
        created_at: new Date().toISOString(),
      });
    }
  }

  renderArbitratorClaims();
  renderMapPolygons();
  updateArbitratorBadge();
  if (selectedRegionId === claim.region_id) {
    openRegionDrawer(selectedRegionId);
  }
}

async function handleRejectClaim(claimId: string) {
  if (isConfigured) {
    try {
      await rejectClaim(claimId);
    } catch (err) {
      console.error('Reject failed:', err);
    }
  }

  state.pendingClaims = state.pendingClaims.filter((c) => c.id !== claimId);
  renderArbitratorClaims();
  updateArbitratorBadge();
}

function updateArbitratorBadge() {
  const count = state.pendingClaims.length;
  const text = `${count} Pending`;

  if (arbitratorPendingBadge) arbitratorPendingBadge.textContent = text;
  if (headerPendingBadge) {
    headerPendingBadge.textContent = String(count);
    if (count > 0) headerPendingBadge.classList.remove('hidden');
    else headerPendingBadge.classList.add('hidden');
  }
}

// ─── LEADERBOARD & CHRONICLE ─────────────────────────────────────────────────

function openLeaderboard() {
  renderLeaderboard();
  if (leaderboardModal) {
    leaderboardModal.classList.remove('hidden');
    leaderboardModal.classList.add('flex');
  }
}

function closeLeaderboard() {
  if (leaderboardModal) {
    leaderboardModal.classList.add('hidden');
    leaderboardModal.classList.remove('flex');
  }
}

function renderLeaderboard() {
  // 1. Render Top Commanders
  if (leaderboardPlayersList) {
    const scores: Record<string, { username: string; avatarUrl?: string; territories: number; trials: number }> = {
      'mock-1': {
        username: 'PeregrinTook',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
        territories: 1,
        trials: 2,
      },
      'mock-2': {
        username: 'Gimli_Son_Of_Gloin',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100',
        territories: 0,
        trials: 1,
      },
    };

    if (state.profile) {
      scores[state.profile.id] = {
        username: state.profile.username,
        avatarUrl: state.profile.avatar_url || undefined,
        territories: Object.values(state.regionOwners).filter((o) => o.userId === state.profile?.id).length,
        trials: state.userClaims.filter((c) => c.status === 'approved').length,
      };
    }

    const sorted = Object.values(scores).sort((a, b) => b.territories - a.territories || b.trials - a.trials);

    leaderboardPlayersList.innerHTML = sorted
      .map(
        (player, idx) => `
        <div class="flex items-center justify-between p-3.5 rounded-lg bg-[#18110a] border border-mtg-gold/25 hover:border-mtg-gold/50 transition-colors shadow-sm">
          <div class="flex items-center gap-3">
            <span class="font-bold text-sm font-serif-title ${idx === 0 ? 'text-mtg-gold' : 'text-text-parchment-muted'} w-6">
              #${idx + 1}
            </span>
            <img src="${player.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" class="w-8 h-8 rounded-full border border-mtg-gold/50 object-cover" />
            <div class="font-bold text-xs text-[#f3ecd8] font-serif-title">${player.username}</div>
          </div>
          <div class="flex items-center gap-10 text-xs font-serif-title">
            <div class="flex items-center gap-1.5 font-bold text-mtg-gold w-14 justify-end">
              <svg class="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>${player.territories}</span>
            </div>
            <div class="flex items-center gap-1.5 text-text-parchment-muted w-14 justify-end">
              <svg class="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline>
                <line x1="13" y1="19" x2="19" y2="13"></line>
                <line x1="16" y1="16" x2="20" y2="20"></line>
                <line x1="19" y1="21" x2="21" y2="19"></line>
                <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"></polyline>
                <line x1="5" y1="14" x2="9" y2="18"></line>
                <line x1="7" y1="17" x2="4" y2="20"></line>
                <line x1="3" y1="19" x2="5" y2="21"></line>
              </svg>
              <span>${player.trials}</span>
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }

  // 2. Render Chronicle Feed
  if (chronicleFeedList) {
    chronicleFeedList.innerHTML = state.activity
      .map(
        (act) => `
        <div class="p-3.5 rounded-lg bg-[#18110a] border border-mtg-gold/20 flex items-start gap-3 shadow-sm">
          <svg class="w-3.5 h-3.5 text-mtg-gold stroke-current mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="12 8 8 12 12 16 16 12 12 8"></polygon>
          </svg>
          <div class="flex-1 text-xs">
            <span class="font-bold text-mtg-gold font-serif-title">${act.username}</span>
            <span class="text-text-parchment font-serif-body"> ${act.message}</span>
            <div class="text-[11px] text-mtg-gold/70 font-serif-title mt-1">
              ${new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      `
      )
      .join('');
  }
}

// ─── DATA LOADER ─────────────────────────────────────────────────────────────

async function loadCampaignData() {
  if (!isConfigured) return;

  try {
    // 1. Fetch Region Owners
    const { data: regions } = await supabase.from('regions').select('*');
    if (regions) {
      regions.forEach((r: any) => {
        if (r.claimed_by_user_id) {
          state.regionOwners[r.id] = {
            userId: r.claimed_by_user_id,
            username: r.banner_username || 'Commander',
            claimedAt: r.claimed_at,
          };
        }
      });
    }

    // 2. Fetch User Claims
    if (state.profile) {
      const { data: claims } = await supabase
        .from('claims')
        .select('*, achievements(title)')
        .eq('user_id', state.profile.id);

      if (claims) {
        state.userClaims = claims.map((c: any) => ({
          ...c,
          achievement_title: c.achievements?.title,
        }));
      }
    }

    // 3. If Arbitrator, fetch pending claims
    if (state.profile?.role === 'arbitrator' || state.profile?.role === 'admin') {
      const { data: pending } = await supabase
        .from('claims')
        .select('*, profiles(username, avatar_url), achievements(title), regions(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pending) {
        state.pendingClaims = pending.map((p: any) => ({
          ...p,
          username: p.profiles?.username || 'Commander',
          avatar_url: p.profiles?.avatar_url,
          achievement_title: p.achievements?.title,
          region_name: p.regions?.name,
        }));
      }
    }

    // 4. Fetch Activity
    const { data: activity } = await supabase
      .from('activity_feed')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (activity) {
      state.activity = activity.map((a: any) => ({
        ...a,
        username: a.profiles?.username || 'Commander',
        avatar_url: a.profiles?.avatar_url,
      }));
    }
  } catch (err) {
    console.warn('Could not load campaign data:', err);
  }
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────

function setupEventListeners() {
  // Auth button click
  authBtn?.addEventListener('click', async () => {
    if (isConfigured) {
      await signInWithDiscord();
    } else {
      // Mock login for instant testing
      state.profile = {
        id: 'commander-1',
        discord_id: '123456789',
        username: 'Gandalf_The_Grey',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        role: 'arbitrator',
        starting_region_id: 'shire',
        created_at: new Date().toISOString(),
      };
      updateAuthUI();
      renderLeaderboard();
      updateArbitratorBadge();
    }
  });

  // Drawer Discord Login button click
  const drawerDiscordBtn = document.getElementById('drawer-discord-login-btn');
  drawerDiscordBtn?.addEventListener('click', () => {
    authBtn?.click();
  });

  // Drawer close button & backdrop click
  closeDrawerBtn?.addEventListener('click', closeRegionDrawer);
  
  // Mobile sticky bottom close buttons
  const mobileCloseDrawerBottomBtn = document.getElementById('mobile-close-drawer-bottom-btn');
  mobileCloseDrawerBottomBtn?.addEventListener('click', closeRegionDrawer);

  const mobileCloseArbitratorBottomBtn = document.getElementById('mobile-close-arbitrator-bottom-btn');
  mobileCloseArbitratorBottomBtn?.addEventListener('click', closeArbitratorPanel);

  const closeStarterRealmBtn = document.getElementById('close-starter-realm-btn');
  closeStarterRealmBtn?.addEventListener('click', () => {
    if (starterRealmModal) {
      starterRealmModal.classList.add('hidden');
      drawerBackdrop?.classList.add('hidden');
    }
  });

  // Mobile swipe-down gesture to dismiss Region Drawer
  let touchStartY = 0;
  regionDrawer?.addEventListener('touchstart', (e: TouchEvent) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  regionDrawer?.addEventListener('touchend', (e: TouchEvent) => {
    const touchEndY = e.changedTouches[0].screenY;
    // Pull down > 90px while near top of drawer dismissed it
    if (touchEndY - touchStartY > 90 && regionDrawer.scrollTop <= 10) {
      closeRegionDrawer();
    }
  }, { passive: true });

  drawerBackdrop?.addEventListener('click', () => {
    closeRegionDrawer();
    closeArbitratorPanel();
  });

  // Arbitrator panel toggle
  arbitratorToggleBtn?.addEventListener('click', openArbitratorPanel);
  closeArbitratorBtn?.addEventListener('click', closeArbitratorPanel);

  // Leaderboard modal toggle
  openLeaderboardBtn?.addEventListener('click', openLeaderboard);
  closeLeaderboardBtn?.addEventListener('click', closeLeaderboard);

  // Leaderboard modal backdrop dismiss
  leaderboardModal?.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) {
      closeLeaderboard();
    }
  });

  // Global Escape key handler
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRegionDrawer();
      closeArbitratorPanel();
      closeLeaderboard();
      if (starterRealmModal && !starterRealmModal.classList.contains('hidden')) {
        starterRealmModal.classList.add('hidden');
      }
    }
  });

  // Recenter Compass / Continental Overview Button
  const recenterBtn = document.getElementById('btn-recenter-map');
  recenterBtn?.addEventListener('click', () => {
    if (!map) return;
    const isMobile = window.innerWidth < 768;
    map.flyTo(isMobile ? [1400, 1500] : [1500, 1500], isMobile ? -0.85 : -0.25, { duration: 0.8 });
  });

  // Quick Realm Jump Buttons
  document.querySelectorAll('.jump-realm-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const jumpId = (e.currentTarget as HTMLButtonElement).dataset.jump;
      if (!jumpId) return;
      const region = REGIONS.find((r) => r.id === jumpId);
      if (region && map) {
        const isMobile = window.innerWidth < 768;
        map.flyTo(region.center, isMobile ? -0.1 : 0.25, { duration: 0.8 });
        openRegionDrawer(jumpId);
      }
    });
  });

  // Leaderboard tabs
  tabCommandersBtn?.addEventListener('click', () => {
    tabCommandersContent?.classList.remove('hidden');
    tabChronicleContent?.classList.add('hidden');
    tabRulesContent?.classList.add('hidden');

    tabCommandersBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-[#c9a84c] text-[#c9a84c] transition-colors cursor-pointer';
    if (tabChronicleBtn) tabChronicleBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-transparent text-[#d4c6b0] hover:text-[#f3ecd8] transition-colors cursor-pointer';
    if (tabRulesBtn) tabRulesBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-transparent text-[#d4c6b0] hover:text-[#f3ecd8] transition-colors cursor-pointer';
  });

  tabChronicleBtn?.addEventListener('click', () => {
    tabChronicleContent?.classList.remove('hidden');
    tabCommandersContent?.classList.add('hidden');
    tabRulesContent?.classList.add('hidden');

    tabChronicleBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-[#c9a84c] text-[#c9a84c] transition-colors cursor-pointer';
    if (tabCommandersBtn) tabCommandersBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-transparent text-[#d4c6b0] hover:text-[#f3ecd8] transition-colors cursor-pointer';
    if (tabRulesBtn) tabRulesBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-transparent text-[#d4c6b0] hover:text-[#f3ecd8] transition-colors cursor-pointer';
  });

  tabRulesBtn?.addEventListener('click', () => {
    tabRulesContent?.classList.remove('hidden');
    tabCommandersContent?.classList.add('hidden');
    tabChronicleContent?.classList.add('hidden');

    tabRulesBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-[#c9a84c] text-[#c9a84c] transition-colors cursor-pointer';
    if (tabCommandersBtn) tabCommandersBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-transparent text-[#d4c6b0] hover:text-[#f3ecd8] transition-colors cursor-pointer';
    if (tabChronicleBtn) tabChronicleBtn.className = 'flex-1 min-h-[44px] py-3 text-center border-b-2 border-transparent text-[#d4c6b0] hover:text-[#f3ecd8] transition-colors cursor-pointer';
  });

  // Submit Claim Form
  submitClaimForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(submitClaimForm);
    const regionId = formData.get('regionId') as string;
    const achievementId = formData.get('achievementId') as string;
    const matchNotes = formData.get('matchNotes') as string;

    if (!achievementId) {
      alert('Please select an MTG trial to claim.');
      return;
    }

    const region = REGIONS.find((r) => r.id === regionId);
    const ach = region?.achievements.find((a) => a.id === achievementId);

    const newClaim: Claim = {
      id: `claim-${Date.now()}`,
      user_id: state.profile?.id || 'guest-1',
      username: state.profile?.username || 'Commander',
      avatar_url: state.profile?.avatar_url || undefined,
      achievement_id: achievementId,
      achievement_title: ach?.title,
      region_id: regionId,
      region_name: region?.name,
      status: 'pending',
      match_notes: matchNotes,
      created_at: new Date().toISOString(),
    };

    if (isConfigured && state.profile) {
      try {
        await submitClaim({
          userId: state.profile.id,
          achievementId,
          regionId,
          matchNotes,
        });
      } catch (err) {
        console.error('Submit claim error:', err);
      }
    }

    // Add to pending claims
    state.pendingClaims.unshift(newClaim);
    state.userClaims.push(newClaim);

    // Reset form
    submitClaimForm.reset();
    updateArbitratorBadge();
    openRegionDrawer(regionId);
  });

  // Starter Realm pick buttons
  document.querySelectorAll('.starter-pick-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const starterId = (e.currentTarget as HTMLButtonElement).dataset.starterId;
      if (!starterId) return;

      if (state.profile) {
        state.profile.starting_region_id = starterId;
        if (isConfigured) {
          await supabase.from('profiles').update({ starting_region_id: starterId }).eq('id', state.profile.id);
        }
      }

      if (starterRealmModal) {
        starterRealmModal.classList.add('hidden');
        starterRealmModal.classList.remove('flex');
      }

      openRegionDrawer(starterId);
    });
  });
}

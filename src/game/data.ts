// ============================================================
// HIM OVER THERE — static data model.
// Everything content-shaped lives here so new districts, genres
// and story acts can be added without touching game logic.
// ============================================================

export type Genre = 'Portrait' | 'Beauty' | 'Boudoir' | 'Branding';
export type LotKind = 'home' | 'studio' | 'shop' | 'cafe' | 'bar' | 'clothes' | 'client' | 'outdoor' | 'park';

// ---- camera setting option lists (shared by desktop CameraHUD and mobile controls) ----
export const APERTURES = [1.4, 1.8, 2.8, 4, 5.6, 8, 11, 16];
export const SHUTTERS = [1 / 8, 1 / 15, 1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000, 1 / 4000];
export const ISOS = [100, 200, 400, 800, 1600, 3200, 6400, 12800];
export const WBS = ['Auto', 'Daylight', 'Shade', 'Tungsten', 'Flash'];
export const fmtShutter = (s: number) => (s >= 1 ? `${s}"` : `1/${Math.round(1 / s)}`);

export interface Lot {
  id: string;
  name: string;
  kind: LotKind;
  /** building centre in world units (metres) */
  pos: [number, number];
  size: [number, number];
  /** door / entry marker */
  door: [number, number];
  color: number;
  height: number;
  enterable: boolean;
  blurb: string;
}

export const LOTS: Lot[] = [
  { id: 'apartment', name: 'Bronzewood Apartments', kind: 'home', pos: [-46, 26], size: [24, 18], door: [-46, 16], color: 0x8a4436, height: 16, enterable: true, blurb: 'Unit 3C. The radiator has opinions.' },
  { id: 'studio', name: 'Loft 4B Rentals', kind: 'studio', pos: [46, 28], size: [22, 18], door: [46, 18], color: 0x6d6560, height: 14, enterable: true, blurb: 'FOR RENT — $1,700/mo' },
  { id: 'camerastore', name: 'Aperture Alley', kind: 'shop', pos: [-46, -28], size: [20, 16], door: [-46, -19], color: 0x4a5a63, height: 9, enterable: true, blurb: 'Used glass, new prices.' },
  { id: 'coffee', name: 'Grind House Coffee', kind: 'cafe', pos: [16, -28], size: [18, 16], door: [16, -19], color: 0x9a6b3c, height: 8, enterable: true, blurb: 'Wi-Fi password is on the cup.' },
  { id: 'bar', name: 'The Low End', kind: 'bar', pos: [-92, -28], size: [20, 16], door: [-92, -19], color: 0x3a3340, height: 10, enterable: true, blurb: 'Dim, loud, useful.' },
  { id: 'freshfit', name: 'Fresh Fit', kind: 'clothes', pos: [-14, 26], size: [18, 16], door: [-14, 16], color: 0x5c4f7a, height: 9, enterable: true, blurb: 'Fictional brands only.' },
  { id: 'salon', name: 'Lakeshore Nails & Brows', kind: 'client', pos: [90, -28], size: [20, 16], door: [90, -19], color: 0xb0546b, height: 9, enterable: true, blurb: 'Ms. Alvarez runs a tight ship.' },
  { id: 'alley', name: 'Graffiti Alley', kind: 'outdoor', pos: [-96, 30], size: [10, 26], door: [-96, 18], color: 0x5a5652, height: 0, enterable: false, blurb: 'Free location. Free opinions from strangers.' },
  { id: 'tracks', name: 'Under The Tracks', kind: 'outdoor', pos: [92, 62], size: [16, 12], door: [92, 54], color: 0x4d4a48, height: 0, enterable: false, blurb: 'Hard light, hard sound, great frames.' },
  { id: 'park', name: 'Bronzewood Park', kind: 'park', pos: [0, 82], size: [46, 26], door: [0, 70], color: 0x3d6b45, height: 0, enterable: false, blurb: 'Benches, a fountain, one aggressive goose.' },
];

export const lotById = (id: string) => LOTS.find((l) => l.id === id);

/** Striped parking bays: [x, z, rotationY] */
export const PARKING: [number, number, number][] = [
  [-30, 13, 0], [-25, 13, 0], [-20, 13, 0],
  [30, 15, 0], [35, 15, 0],
  [-30, -14, 0], [8, -15, 0], [13, -15, 0],
  [-78, -14, 0], [-73, -14, 0],
  [76, -15, 0], [81, -15, 0],
  [-84, 20, Math.PI / 2], [-84, 26, Math.PI / 2],
  [80, 52, 0],
];

// ---------------- Packages / pricing ----------------
export interface Pkg { id: string; name: string; price: number; images: number; retouched: number; minutes: number; }
export const DEFAULT_PACKAGES: Pkg[] = [
  { id: 'basic', name: 'Basic', price: 150, images: 5, retouched: 3, minutes: 30 },
  { id: 'standard', name: 'Standard', price: 300, images: 12, retouched: 8, minutes: 60 },
  { id: 'premium', name: 'Premium', price: 500, images: 25, retouched: 15, minutes: 120 },
];

export interface ContractClauses {
  depositNonRefundable: boolean;
  cancellation: boolean;
  lateArrival: boolean;
  deliveryDays: number;
  rawFiles: boolean;
  commercialLicense: boolean;
  locationFee: boolean;
}
export const DEFAULT_CLAUSES: ContractClauses = {
  depositNonRefundable: true, cancellation: true, lateArrival: true,
  deliveryDays: 7, rawFiles: false, commercialLicense: false, locationFee: false,
};

// ---------------- Gear ----------------
export interface GearItem {
  id: string; name: string; kind: 'body' | 'lens' | 'light' | 'mod' | 'power' | 'card' | 'misc';
  price: number; blurb: string; focal?: number; maxAperture?: number; benefit?: string;
}
export const GEAR: GearItem[] = [
  { id: 'body-d1', name: 'Corvid D1 Body', kind: 'body', price: 0, blurb: 'Scratched. Shutter count you do not want to know.', benefit: 'Base image quality' },
  { id: 'lens-35', name: 'Corvid 35mm f/1.8', kind: 'lens', price: 0, focal: 35, maxAperture: 1.8, blurb: 'Wide-ish. Honest.', benefit: 'Environmental portraits' },
  { id: 'lens-2470', name: 'Corvid 24-70mm f/4 Kit', kind: 'lens', price: 0, focal: 50, maxAperture: 4, blurb: 'Does everything adequately.', benefit: 'Zoom flexibility' },
  { id: 'lens-85', name: 'Corvid 85mm f/1.8', kind: 'lens', price: 2399, focal: 85, maxAperture: 1.8, blurb: 'The one that ruins your budget.', benefit: 'Compression + creamy background' },
  { id: 'lens-50', name: 'Corvid 50mm f/1.4', kind: 'lens', price: 899, focal: 50, maxAperture: 1.4, blurb: 'Nifty, expensive cousin.', benefit: 'Low light + separation' },
  { id: 'strobe', name: 'Kestrel 400 Strobe', kind: 'light', price: 320, blurb: 'One light. Learn it.', benefit: 'Shape light anywhere' },
  { id: 'softbox', name: '36" Softbox', kind: 'mod', price: 90, blurb: 'Bigger, closer, softer.', benefit: 'Soft shadow edges' },
  { id: 'reflector', name: '5-in-1 Reflector', kind: 'mod', price: 35, blurb: 'Fills the shadow side for free.', benefit: 'Shadow fill' },
  { id: 'battery', name: 'Spare Battery', kind: 'power', price: 55, blurb: 'The difference between a shoot and a story.', benefit: 'Saves the battery mishap' },
  { id: 'card', name: '2nd Memory Card', kind: 'card', price: 45, blurb: '64 more frames of hope.', benefit: 'Saves the card-full mishap' },
  { id: 'trigger', name: 'Radio Trigger Pair', kind: 'misc', price: 70, blurb: 'Fires the light. Usually.', benefit: 'Reliable flash sync' },
  { id: 'stand', name: 'Light Stand + Sandbag', kind: 'misc', price: 60, blurb: 'The sandbag is the whole point.', benefit: 'Stops stand tip-overs' },
];
export const gearById = (id: string) => GEAR.find((g) => g.id === id);

// ---------------- Wardrobe ----------------
export interface Fit { id: string; name: string; price: number; shirt: number; pants: number; shoes: number; accent: number; desc: string; }
export const FITS: Fit[] = [
  { id: 'photog', name: 'Photographer Streetwear', price: 0, shirt: 0x14161a, pants: 0x2b2c22, shoes: 0x6b5847, accent: 0x6b4a2f, desc: 'Black tee, olive-black cargos, worn sneakers, camera harness.' },
  { id: 'city', name: 'City Fit', price: 180, shirt: 0x9c6b3f, pants: 0xd8cdbd, shoes: 0xe8e4dc, accent: 0x7a4a2a, desc: 'Patterned jacket, light distressed jeans.' },
  { id: 'gym', name: 'Gym Fit', price: 120, shirt: 0xe8809f, pants: 0x1b1b1e, shoes: 0xd8d2a8, accent: 0x2a2a2e, desc: 'Pink sleeveless hoodie, black shorts, leggings.' },
  { id: 'winter', name: 'Winter Parka', price: 260, shirt: 0x23262b, pants: 0x1e2024, shoes: 0x3a3632, accent: 0x14161a, desc: 'Dark parka, beanie over the locs.' },
];

// ---------------- Client archetypes ----------------
export interface Archetype {
  id: string; name: string; tag: string; genre: Genre;
  confidence: number; reliability: number; networking: number; budget: [number, number];
  skin: number; hair: number; outfit: number;
  greeting: string; lines: string[]; quirk: string;
}
export const ARCHETYPES: Archetype[] = [
  {
    id: 'tasha', name: 'Tasha', tag: 'NEW MODEL', genre: 'Portrait', confidence: 25, reliability: 0.75, networking: 0.6,
    budget: [100, 220], skin: 0x8d5a3c, hair: 0x1c1414, outfit: 0xc86a7a,
    greeting: 'Heyyy', quirk: 'Nervous. Needs real direction or she freezes.',
    lines: ['I don\u2019t really know how to pose lol', 'Is my hair okay?', 'Can I see the back of the camera?', 'that\u2019s a lot\u2026 can you do 100?', 'my cousin Keisha said you nice with it'],
  },
  {
    id: 'dre', name: 'Dre', tag: 'MUSICIAN', genre: 'Portrait', confidence: 55, reliability: 0.5, networking: 0.85,
    budget: [200, 450], skin: 0x6f4227, hair: 0x141212, outfit: 0x2f3d5c,
    greeting: 'yo who shot this? how much you charge?', quirk: 'Changes the concept halfway through. Every time.',
    lines: ['run me somethin different, like moody', 'actually can we do it at night instead', 'my manager needs these by friday', 'bro make me look expensive'],
  },
  {
    id: 'monique', name: 'Monique', tag: 'PROFESSIONAL', genre: 'Beauty', confidence: 88, reliability: 0.95, networking: 0.95,
    budget: [350, 700], skin: 0x5a3320, hair: 0x2a1a12, outfit: 0x7b2f4a,
    greeting: 'I need new content. What\u2019s your Saturday look like?', quirk: 'Knows her angles, arrives early, refers everybody.',
    lines: ['Send me the deposit link, I\u2019ll handle it now.', 'I brought three looks, we\u2019ll move fast.', 'Shoot me a little wider on this one.', 'You want commercial usage on the invoice, right?'],
  },
  {
    id: 'kevin', name: 'Kevin', tag: 'ENTITLED', genre: 'Portrait', confidence: 60, reliability: 0.35, networking: 0.25,
    budget: [60, 140], skin: 0x9a6a48, hair: 0x211a16, outfit: 0x3b6b4a,
    greeting: 'How much you charge? my cousin has that camera', quirk: 'Haggles, wants RAWs, will ask for "a few more".',
    lines: ['What\u2019s your lowest price?', 'Can I get all the RAW files?', 'This will be great exposure', 'Can you send them tonight?', 'I brought four other people'],
  },
  {
    id: 'alvarez', name: 'Ms. Alvarez', tag: 'BUSINESS OWNER', genre: 'Branding', confidence: 70, reliability: 0.9, networking: 0.7,
    budget: [400, 900], skin: 0xa2714c, hair: 0x24160f, outfit: 0x2c4a52,
    greeting: 'I\u2019m starting a brand. I need pictures for my website.', quirk: 'Wants a contract, commercial usage, pays on time.',
    lines: ['Send the contract and I\u2019ll sign today.', 'These are for the website and the window decal.', 'Commercial usage \u2014 quote me properly.', 'My cousin needs headshots too.'],
  },
];
export const archetypeById = (id: string) => ARCHETYPES.find((a) => a.id === id)!;

export const OPENERS = [
  'Heyyy', 'How much you charge?', 'I need birthday pictures.', 'I need a shoot this Saturday.',
  'I\u2019m starting a brand.', 'I\u2019m a dancer and need promo images.', 'I need new content.',
  'My manager needs new headshots.', 'Do you shoot boudoir?', 'Can you shoot tonight?',
  'I need pictures for my website.',
];

export const CONCEPTS = [
  'moody alley, leather jacket energy',
  'clean beauty, glowy skin, no distractions',
  'golden hour, warm, laughing at nothing',
  'birthday content, balloons, sparkle',
  'brand shots for the website + window decal',
  'promo images for the flyer, high contrast',
  'headshots, but not corporate headshots',
  'boudoir, tasteful, silhouettes only',
];

export const NEGOTIATION_LINES = [
  'Can you do it cheaper?', 'What\u2019s your lowest price?', 'This will be great exposure.',
  'Can I get all the RAW files?', 'Can you edit a few more?', 'Can you send them tonight?',
  'I brought four other people.', 'Can you make me about 30 pounds smaller?',
  'I only want three pictures.', 'My cousin has that camera.',
];

// ---------------- Moodboard ----------------
export interface MoodTile { id: string; label: string; concept: string; hue: string; }
export const MOOD_TILES: MoodTile[] = [
  { id: 'hard', label: 'Hard light', concept: 'contrast', hue: 'from-amber-500/70 to-black' },
  { id: 'soft', label: 'Soft window', concept: 'soft', hue: 'from-stone-300/70 to-stone-700' },
  { id: 'brick', label: 'Red brick', concept: 'street', hue: 'from-red-800/70 to-stone-900' },
  { id: 'neon', label: 'Neon night', concept: 'night', hue: 'from-fuchsia-600/70 to-indigo-900' },
  { id: 'clean', label: 'Clean backdrop', concept: 'studio', hue: 'from-zinc-200/70 to-zinc-600' },
  { id: 'grain', label: 'Film grain', concept: 'film', hue: 'from-amber-200/60 to-stone-800' },
  { id: 'silhouette', label: 'Silhouette', concept: 'contrast', hue: 'from-slate-900 to-slate-500/60' },
  { id: 'golden', label: 'Golden hour', concept: 'warm', hue: 'from-orange-400/70 to-amber-900' },
  { id: 'bw', label: 'Black & white', concept: 'bw', hue: 'from-neutral-100/70 to-neutral-800' },
];

// ---------------- Direction wheel ----------------
export interface DirectionOption { id: string; label: string; group: string; conf: number; pose: number; line: string; }
export const DIRECTIONS: DirectionOption[] = [
  { id: 'chin-down', label: 'Chin down a touch', group: 'Head', conf: 4, pose: 7, line: '"Chin down a touch \u2014 there. Hold that."' },
  { id: 'chin-up', label: 'Chin up, long neck', group: 'Head', conf: 3, pose: 6, line: '"Chin up, stretch that neck out for me."' },
  { id: 'eyes-cam', label: 'Eyes to me', group: 'Eyes', conf: 3, pose: 8, line: '"Eyes right here. Right at the glass."' },
  { id: 'eyes-away', label: 'Eyes off camera', group: 'Eyes', conf: 2, pose: 6, line: '"Look past me, like somebody just said your name."' },
  { id: 'smize', label: 'Smile with the eyes', group: 'Expression', conf: 6, pose: 9, line: '"Don\u2019t smile with your mouth. Smile with your eyes."' },
  { id: 'laugh', label: 'Make her laugh', group: 'Expression', conf: 9, pose: 9, line: '"Aight, worst job you ever had. Go."' },
  { id: 'serious', label: 'Serious, jaw set', group: 'Expression', conf: 1, pose: 7, line: '"Serious for me. Jaw set. Like rent is due."' },
  { id: 'hands-hips', label: 'Hands on hips', group: 'Hands', conf: 4, pose: 7, line: '"Hands on your hips, weight on the back foot."' },
  { id: 'hands-hair', label: 'Hand through hair', group: 'Hands', conf: 5, pose: 8, line: '"Run your hand through your hair, slow."' },
  { id: 'hands-pockets', label: 'Hands in pockets', group: 'Hands', conf: 3, pose: 5, line: '"Thumbs in the pockets, shoulders loose."' },
  { id: 'weight', label: 'Shift your weight', group: 'Body', conf: 4, pose: 8, line: '"Push your weight to the back leg. Angle the shoulders."' },
  { id: 'lean', label: 'Lean on the wall', group: 'Body', conf: 5, pose: 8, line: '"Lean on the brick. Like you been waiting on somebody."' },
  { id: 'walk', label: 'Walk toward me', group: 'Body', conf: 6, pose: 9, line: '"Walk toward me. Don\u2019t look down. I got you."' },
  { id: 'hype', label: 'Hype her up', group: 'Coach', conf: 14, pose: 4, line: '"Nah, that one right there? That\u2019s the picture. Do it again."' },
  { id: 'show', label: 'Show the back of the camera', group: 'Coach', conf: 12, pose: 3, line: '"Come look. That\u2019s you. That\u2019s all you."' },
  { id: 'nothing', label: 'Just\u2026 do something', group: 'Coach', conf: -16, pose: -6, line: '"Just\u2026 do something." \u2014 immediately regretted.' },
];

// ---------------- Mishaps ----------------
export interface Mishap {
  id: string; title: string; text: string; where: 'shoot' | 'travel';
  options: { label: string; money?: number; rep?: number; energy?: number; stress?: number; conf?: number; result: string; needs?: string }[];
}
export const MISHAPS: Mishap[] = [
  { id: 'battery', title: 'Battery died', text: 'Camera blinks once and quits. Mid-frame.', where: 'shoot', options: [
    { label: 'Swap the spare battery', needs: 'battery', rep: 2, result: 'Spare in, thirty seconds lost. "This is why I pack two."' },
    { label: 'Borrow a charger from the corner store', money: -8, energy: -8, result: 'Eight dollars and a lot of small talk later, you\u2019re back.' },
    { label: 'Shoot the rest on the phone', rep: -6, result: 'Phone files. She won\u2019t notice today. You will notice forever.' },
  ]},
  { id: 'cardfull', title: 'Memory card full', text: '"CARD FULL" — 64 frames, all of them yours.', where: 'shoot', options: [
    { label: 'Swap in the second card', needs: 'card', rep: 1, result: 'New card. Keep it moving.' },
    { label: 'Cull on the spot', energy: -10, result: 'You delete the closed-eye frames standing up. Your neck hurts.' },
  ]},
  { id: 'trigger', title: 'Trigger won\u2019t fire', text: 'The strobe just sits there. Blinking. Judging.', where: 'shoot', options: [
    { label: 'Optical slave off the pop-up', rep: 1, result: 'Old trick, still works. Recycle time is ugly though.' },
    { label: 'Kill the light, go natural', conf: -3, result: 'Window light it is. Flatter, but honest.' },
  ]},
  { id: 'standtip', title: 'The light stand is going over', text: 'Wind catches the softbox. The whole rig leans.', where: 'shoot', options: [
    { label: 'CATCH IT', rep: 4, energy: -6, result: 'You caught it. Barely. She said "oh my God" and then laughed.' },
    { label: 'Let it go', money: -120, rep: -3, result: 'Modifier cracked. $120. "Of course."' },
    { label: 'Sandbag it properly', needs: 'stand', rep: 2, result: 'Sandbag was already on it. Nothing happened. Boring. Perfect.' },
  ]},
  { id: 'security', title: 'Security walks up', text: '"You got a permit for that light?"', where: 'shoot', options: [
    { label: 'Talk your way out', rep: 3, stress: 4, result: '"We wrapping up right now, boss." He nods. You have four minutes.' },
    { label: 'Pay the "location fee"', money: -40, result: 'Forty dollars, no receipt, no more questions.' },
    { label: 'Pack up and move', energy: -12, result: 'Move to the next wall. It was a better wall anyway.' },
  ]},
  { id: 'late', title: 'Client is 25 minutes late', text: 'Light is moving. She is not here.', where: 'shoot', options: [
    { label: 'Charge the late fee (contract)', money: 35, rep: -1, result: 'Contract says 15-minute grace. Session shortens. She got the message.' },
    { label: 'Wait it out', energy: -8, stress: 5, result: 'You wait. The good light does not.' },
  ]},
  { id: 'extras', title: 'She brought four other people', text: '"They just wanna get a couple too."', where: 'shoot', options: [
    { label: 'Charge per person', money: 60, rep: -1, result: '$30 a head. Two of them suddenly had somewhere to be.' },
    { label: 'Allow it, keep the peace', rep: 3, energy: -10, result: 'Everybody eats. You are tired and slightly famous on the block.' },
    { label: 'Decline politely', rep: -2, conf: -4, result: '"Today is just her." Correct, and slightly awkward.' },
  ]},
  { id: 'wardrobe', title: 'The outfit does not fit', text: 'The zipper is a lie.', where: 'shoot', options: [
    { label: 'Crop it out, shoot tighter', rep: 3, result: 'Shoulders up. Nobody will ever know.' },
    { label: 'Reschedule the look', money: -25, result: 'You lose the look and a little time.' },
  ]},
  { id: 'weather', title: 'Rain out of nowhere', text: 'Chicago does this on purpose.', where: 'shoot', options: [
    { label: 'Move under the tracks', rep: 4, energy: -8, result: 'Dry, dramatic light, train rumble in every other frame. Upgrade.' },
    { label: 'Push through it', conf: -6, rep: -2, result: 'Wet hair, wet gear, one usable frame.' },
  ]},
  { id: 'nervous', title: 'She froze up', text: 'Shoulders at her ears. Hands nowhere.', where: 'shoot', options: [
    { label: 'Hype her up', conf: 16, result: '"That last one? Cover of something." She loosens all the way up.' },
    { label: 'Show her the back of the camera', conf: 12, result: 'She sees herself. Whole posture changes.' },
    { label: 'Keep shooting, she\u2019ll warm up', conf: -6, result: 'She does not warm up. You get twelve stiff frames.' },
  ]},
  { id: 'concept', title: 'Client changed the concept', text: '"Actually can we make it moody instead?"', where: 'shoot', options: [
    { label: 'Roll with it', rep: 3, energy: -6, result: 'Kill the fill, drop the power, done. Moody delivered.' },
    { label: 'Stand behind the moodboard', rep: -1, conf: -3, result: '"We planned this look for a reason." True. Also a mood.' },
  ]},
  { id: 'noparking', title: 'No parking anywhere', text: 'Every bay near the alley is full. Of course.', where: 'travel', options: [
    { label: 'Park a block over, run in with the bags', energy: -16, result: 'Two bags, one block, cold air. You made it. Barely.' },
    { label: 'Park in the loading zone', money: -60, result: 'Ticket. $60. "Of course."' },
  ]},
];

// ---------------- Lessons ----------------
export interface Lesson { id: string; trigger: string; text: string; }
export const LESSONS: Lesson[] = [
  { id: 'shutter', trigger: 'Motion blur', text: 'Shutter 1/30 was too slow to freeze her movement \u2014 stay above 1/125 for a moving subject.' },
  { id: 'iso', trigger: 'Noise', text: 'ISO 6400 added noise \u2014 open the aperture or add light instead of climbing ISO.' },
  { id: 'focus', trigger: 'Missed focus', text: 'f/1.8 with focus behind her \u2014 the eyes went soft. Focus on the near eye.' },
  { id: 'wide', trigger: 'Distortion', text: '24mm at arm\u2019s length stretches the face \u2014 step back and zoom in.' },
  { id: 'lightdist', trigger: 'Flat light', text: 'Light placed far away = flat and hard. Bring it in close; closer is softer.' },
  { id: 'expo', trigger: 'Exposure', text: 'Blown highlights do not come back. Protect the skin, lift the shadows later.' },
  { id: 'comp', trigger: 'Composition', text: 'Eyes near the upper third, leave headroom, never crop at a joint.' },
  { id: 'wb', trigger: 'White balance', text: 'Tungsten indoors, Daylight outdoors \u2014 or fix the Kelvin and stop guessing.' },
  { id: 'handshake', trigger: 'Camera shake', text: 'Handheld below 1/focal-length shakes. 85mm needs 1/125 minimum.' },
  { id: 'confidence', trigger: 'Direction', text: 'Confidence is a lighting tool. A relaxed subject out-performs a better lens.' },
];

// ---------------- Protagonist voice ----------------
export const ONE_LINERS = [
  'Of course.',
  'Yeah, I gathered that.',
  '\u2026this might actually work.',
  'Rent don\u2019t care about my portfolio.',
  'Cool. Cool cool cool.',
  'That\u2019s a whole personality right there.',
  'I\u2019m not arguing with the weather again.',
  'Somebody\u2019s cousin always has that camera.',
  'Light\u2019s doing the work. Let it.',
  'Aight. Back to it.',
];

// ---------------- Titles / progression ----------------
export const TITLES: { min: number; title: string }[] = [
  { min: 0, title: 'Unknown Photographer' },
  { min: 15, title: 'Hustling Freelancer' },
  { min: 35, title: 'Working Photographer' },
  { min: 60, title: 'Established Photographer' },
  { min: 85, title: 'Studio Owner' },
];
export const titleFor = (rep: number) => [...TITLES].reverse().find((t) => rep >= t.min)!.title;

export const GOAL = { rep: 40, money: 3400 };

// ---------------- Misc flavour ----------------
export const FOOD = [
  { id: 'ramen', name: 'Kitchenette ramen', price: 3, energy: 18, hunger: 40, stress: 0 },
  { id: 'harolds', name: 'Harold\u2019s Nephew\u2019s Chicken', price: 12, energy: 30, hunger: 70, stress: -4 },
  { id: 'coffee', name: 'Grind House drip', price: 4, energy: 22, hunger: 10, stress: -2 },
  { id: 'sandwich', name: 'Turkey sandwich', price: 8, energy: 16, hunger: 45, stress: -1 },
];

export const WEATHERS = ['clear', 'overcast', 'rain', 'snow'] as const;
export type Weather = (typeof WEATHERS)[number];

export const CITY_CHATTER = [
  'Train\u2019s running slow again.',
  'It was 60 degrees yesterday. Sixty.',
  'They towed somebody off Bronzewood last night.',
  'Nephew\u2019s Chicken got a line around the corner.',
  'You that camera guy? My auntie need pictures.',
];

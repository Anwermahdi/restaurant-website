// ============================================================
// Bahrain restaurant directory – generated from user list.
// Each entry supports: address / phone / hours / rating /
// instagram / talabat / google placeId / photo.
// Photos: REAL_IMG overrides generic cuisine photo where found
// (Talabat CDN / official sites). Rest fall back to Unsplash.
// Run `npm run enrich:places` with GOOGLE_PLACES_API_KEY to
// auto-fill rating / hours / address from Google Places.
// Prices in Bahraini Dinar (BD).
// ============================================================

import { CARD_IMAGES, MENU_IMAGES } from "./image-manifest.js";

// ---------- opening hours ----------
const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = { Sunday: "Sun", Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat" };

/** "Sun-Thu 11 AM - 12 AM, Fri-Sat 11 AM - 11 PM" (max three groups). */
export function formatHours(hours) {
  if (!hours || typeof hours !== "object") return typeof hours === "string" ? hours : "";
  const days = DAY_ORDER.filter((day) => hours[day]);
  if (!days.length) return "";
  if (Object.values(hours).some((value) => /24\s*hours/i.test(String(value)))) return "Open 24 hours";
  // One published day is not a week: better to show nothing than to mislead.
  if (days.length < 2) return "";
  const groups = [];
  for (const day of days) {
    const last = groups[groups.length - 1];
    if (last && last.value === hours[day]) last.days.push(day);
    else groups.push({ days: [day], value: hours[day] });
  }
  const label = (group) => {
    const first = group.days[0];
    const last = group.days[group.days.length - 1];
    return first === last ? DAY_SHORT[first] : `${DAY_SHORT[first]}-${DAY_SHORT[last]}`;
  };
  const text = groups.map((group) => `${label(group)} ${group.value}`).join(", ");
  if (groups.length === 1 && groups[0].days.length === 7) return `Daily ${groups[0].value}`;
  return text.length > 64 ? `${groups.slice(0, 2).map(label).join(" & ")}: ${groups[0].value}` : text;
}

function parseClock(text) {
  const match = String(text).match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = (match[3] || "").toUpperCase();
  if (meridiem === "PM" && hour < 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (!meridiem && hour <= 7) hour += 12; // Google writes 24h ranges without a meridiem
  return hour * 60 + minute;
}

/** Open right now in Bahrain (UTC+3), from the researched weekly hours. */
export function isOpenNow(hours, when = new Date()) {
  if (!hours || typeof hours !== "object") return null;
  const bahrain = new Date(when.getTime() + (when.getTimezoneOffset() + 180) * 60000);
  const today = DAY_ORDER[bahrain.getDay()];
  const now = bahrain.getHours() * 60 + bahrain.getMinutes();
  const todayHours = hours[today];
  if (!todayHours) return null;
  if (/closed/i.test(todayHours)) return false;
  const span = String(todayHours).split(/[\u2013\u2014-]/);
  if (span.length < 2) return null;
  const from = parseClock(span[0]);
  const to = parseClock(span[1]);
  if (from === null || to === null) return null;
  if (to <= from) return now >= from || now < to; // spans midnight
  return now >= from && now < to;
}


const IMG = {
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
  chicken: "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&q=80",
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&q=80",
  cafe: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
  bbq: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80",
  general: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80",
  dessert: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80",
};

// Real photos found via web search (official sites / Talabat CDN).
// Talabat CDN width bumped to 800 for card quality.
const REAL_IMG = {
  "nino": "https://nino-me.com/uploads/Logo/logo.jpg",
  "zulu": "https://cdn.restaurants-info.com/zulurestaurant/27026-albums-1.jpg",
  "fatto": "https://www.the50.com/discovery/filestore/jpg/Fatto_dish1.jpg",
  "ghancha": "https://ghancha.co/brand/ghancha/og.jpg",
  "angelo-cafe": "https://juffairsquare.com/wp-content/uploads/2025/01/Angelo.jpg",
  "akbars-kitchen": "https://talabat.dhmedia.io/image/talabat/restaurants/New_logo_3__Zainab__63874638740961656423953.jpg?width=400",
  "naughty-by-raaw": "https://naughtybyraaw.com/wp-content/uploads/2025/04/NBR.BirthMonths2-11-1.jpeg",
  "banu": "https://media.timeout.com/images/106206126/image.jpg",
  "alkofeia": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_637448552873364425.jpg?width=400",
  "slider-station": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_637659478520812340.jpg?width=400",
  "the-block": "https://tapcom-live.ams3.cdn.digitaloceanspaces.com/media/the-block-bahrain-1/covers/DSC_1370_Copy.JPG",
  "lumee": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_1639019434418350446.jpg?width=800",
  "rustic-cafe": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo__(1)_637296520065204922.jpg?width=800",
  "abrisham": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_22637962489836073152.jpg?width=800",
  "l-avenue-cafe": "https://talabat.dhmedia.io/image/talabat/restaurants/Lavenue_logo638295046829345626.png?width=800",
  "black-strip": "https://blackstripeburgers.com/wp-content/uploads/2025/09/cropped-WhatsApp-Image-2025-09-15-at-15.45.47_6bc2b6b5-192x192.jpg",
  "tonys": "https://talabat.dhmedia.io/image/talabat/restaurants/Tony_Romas_logo_637208387709534694.jpg?width=800",
  "buzz-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/logo638786829577654856.jpg?width=800",
  "backyard-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/logo638815620960024771.jpg?width=800",
  "honest-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_-_2021-04-14T17_637540761420577531.jpg?width=800",
  "freid": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo638438167971630797.jpg?width=800",
  "burger-fries-more": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo638458294176434756.png?width=800",
  "lahom": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo638365950290511223.jpg?width=800",
  "lab-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/burger_lab__logo638290791353203275.jpg?width=800",
  "cut-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/LOGO638813884503047826638947217952673246.jpg?width=800",
  "grannys-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/Grannys_Burger_Logo638839397447751939.jpg?width=800",
  "bacon": "https://talabat.dhmedia.io/image/talabat/restaurants/Bacon_smash_Logo_TB_FAV638584743054378494.png?width=800",
  "slider": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_637659478520812340.jpg?width=800",
  "viola-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/logo638904879180905839.jpg?width=800",
  "three-guys": "https://talabat.dhmedia.io/image/talabat/restaurants/three_guys_logo_(ful_636670078907309485.jpg?width=800",
  "three-lines": "https://talabat.dhmedia.io/image/talabat/restaurants/IMG_0651639027661441814385.PNG?width=800",
  "cheesy-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_New638586068121040171.jpeg?width=800",
  "adam-subs": "https://talabat.dhmedia.io/image/talabat/restaurants/LOGO_ENGLISH_2_png_636988858009068916.jpg?width=800",
  "lost-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_28637809528278648826.jpg?width=800",
  "burger-waqif": "https://talabat.dhmedia.io/image/talabat/restaurants/WhatsApp_Image_20250517_a638904959860221355.jpg?width=800",
  "burger-square": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo638523133235744072.jpg?width=800",
  "chubbys-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/Chubby_burger_logo639054651947401621.jpg?width=800",
  "cluckys": "https://talabat.dhmedia.io/image/talabat/restaurants/logo638823919483989645.jpg?width=800",
  "baby-chicken": "https://talabat.dhmedia.io/image/talabat/restaurants/BABY_CHICKEN_LOGO_636514558669399325.jpg?width=800",
  "wingman": "https://talabat.dhmedia.io/image/talabat/restaurants/wingman639252334230338230.jpg?width=800",
  "wing-station": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo638396226093642765.jpg?width=800",
  "flap-fried-chicken": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_637543562428041624.jpg?width=800",
  "popeyes": "https://talabat.dhmedia.io/image/talabat/restaurants/LOGO638779185342614395.jpg?width=800",
  "monkey-lala": "https://talabat.dhmedia.io/image/talabat/restaurants/Resized_Logo_1639221579967405154.jpg?width=800",
  "arabian-broasted": "https://talabat.dhmedia.io/image/talabat/restaurants/Arabian_Broasted__Logo_pa638529989932655642.jpg?width=800",
  "chicket": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_637135757096946347.jpg?width=800",
  "yebilna-pasta": "https://talabat.dhmedia.io/image/talabat/restaurants/a95f0438e96949b9935f9a26f637819081419361318.jpg?width=800",
  "le-pasta": "https://talabat.dhmedia.io/image/talabat/restaurants/La-Pasta_635913384140155693.jpg?width=800",
  "sando-x-urban": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_636711488250241166.jpg?width=400",
  "layla-aldiyra": "https://talabat.dhmedia.io/image/talabat/restaurants/Layaly_logo638739425443990163.jpg?width=400",
  "5-spoons": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_636668525709149378.jpg?width=400",
  "alsikka": "https://talabat.dhmedia.io/image/talabat/restaurants/AlSikka_Logo638553664857415298.jpg?width=400",
  "bella-pizzeria": "https://talabat.dhmedia.io/image/talabat/restaurants/Bella_Pizzeria_Itali_636549088295939971.jpg?width=400",
  "uplift": "https://talabat.dhmedia.io/image/talabat/restaurants/logo638603576523448384.png?width=400",
  "blaze-burger": "https://talabat.dhmedia.io/image/talabat/restaurants/WhatsApp_Image_20220511_a637879352763616832.jpeg?width=400",
  "sahburger": "https://talabat.dhmedia.io/image/talabat/restaurants/Sah_burger_new_logo638386640193871776.PNG?width=400",
  "challenger": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_challenger638759229042757393.jpg?width=400",
  "fry-and-fries": "https://talabat.dhmedia.io/image/talabat/restaurants/Untitled6_1_page0001638422228531066932.jpg?width=400",
  "phillys": "https://talabat.dhmedia.io/image/talabat/restaurants/WhatsApp_Image_20220510_a637877755979559074.jpeg?width=400",
  "night-bird": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_(51)_637824710818466267.jpg?width=400",
  "tostado": "https://talabat.dhmedia.io/image/talabat/restaurants/WhatsApp_Image_20231206_a638374861760033803.jpeg?width=400",
  "stack": "https://talabat.dhmedia.io/image/talabat/restaurants/logo638868096130337758.jpg?width=400",
  "milano": "https://talabat.dhmedia.io/image/talabat/restaurants/Pizza-Milano_635669538157491048.jpg?width=400",
  "gate-12": "https://talabat.dhmedia.io/image/talabat/restaurants/logo639014096378161951.jpg?width=400",
  "chico-chicken": "https://talabat.dhmedia.io/image/talabat/restaurants/LOGO_2638684144419423156.jpg?width=400",
  "risotto": "https://talabat.dhmedia.io/image/talabat/restaurants/WhatsApp_Image_2021-_637609896016893446.jpg?width=400",
  "fat-whale": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_637812033362850266.jpg?width=400",
  "doctor-food": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_637478577808870081.jpg?width=400",
  "sammonah-sandwich": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_copy_637591684082468054.jpg?width=400",
  "al-mihwar": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_637714416006119916.jpg?width=400",
  "hashtag": "https://talabat.dhmedia.io/image/talabat/restaurants/hashtag639250534140585265.jpeg?width=400",
};

export const FALLBACK_IMG = IMG;

// Real food/interior photos per restaurant (stable CDNs only — no stock).
// Filled by web research; missing entries show an honest placeholder
// until a real photo is uploaded to public/restaurants/<id>.jpg.
const FOOD_REAL = {
  "risotto": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9-RM9moYZ-j-2DCCarLiZobJ-_UfgbHLdvTZ-MVjqlpqgA22-8ClOUac-&s=10",
  "zulu": "https://media-cdn.tripadvisor.com/media/photo-o/25/2c/36/ae/zulu.jpg",
  "slider-station": "https://gastronomica-me.com/wp-content/uploads/2022/09/Slider-Station-Cover.webp",
  "lumee": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9-RM9moYZ-j-2DCCarLiZobJ-_UfgbHLdvTZ-MVjqlpqgA22-8ClOUac-&s=10",
  "barbecue-town": "https://zataat.bh/wp-content/uploads/2023/12/bbq-town-cover-1024x512.jpg",
  "rustic-cafe": "https://talabat.dhmedia.io/image/global-menu-service/TB_BH/vendor/602781/PRODUCT/532477534/0537038b-a32e-47bd-9bde-a9f810d59395.jpg",
  "abrisham": "https://talabat.dhmedia.io/image/talabat/MenuItems/mmw_638762392302477966",
  "l-avenue-cafe": "https://talabat.dhmedia.io/image/talabat/MenuItems/SPAGHETTI_BOLOGNESE638330477530224434.jpg",
  "title": "https://static.wixstatic.com/media/548a14_3e775e19f1bd4dd88d4576591a34a0eb~mv2.jpg",
  "black-strip": "https://blackstripeburgers.com/wp-content/uploads/2025/10/WhatsApp-Image-2025-10-13-at-14.49.30_f93b3b8a-1024x665.jpg",
  "tonys": "https://talabat.dhmedia.io/image/global-menu-service/TB_BH/vendor/789341/product/2650189508/d73e249e-6bf6-460f-bbc2-d7f318d09f25.jpg",
  "buzz-burger": "https://talabat.dhmedia.io/image/global-menu-service/TB_BH/vendor/758901/product/53e6c9a2-9a8c-45c0-b238-3e9964134908.jpg",
  "backyard-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/triple_Sliders_box639076415836299669.JPG",
  "honest-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/blob_637562908166624471",
  "freid": "https://talabat.dhmedia.io/image/talabat/MenuItems/mmw_638656443084358661",
  "burger-fries-more": "https://talabat.dhmedia.io/image/talabat/MenuItems/FULLWE1638458304299815862.JPG",
  "lahom": "https://talabat.dhmedia.io/image/global-menu-service/TB_BH/vendor/718562/product/1964287462/e7c6d211-b091-4fdd-9297-a2798a783203.jpg",
  "lab-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/Burger_Lab_Truffle_Burger638300322238660763.jpg",
  "fat-whale": "https://talabat.dhmedia.io/image/talabat/MenuItems/Clasico_Double_Burger637812034700672433.jpg",
  "grannys-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/Meal_Truffle_Beef_Burger638839410720023083.jpg",
  "doctor-food": "https://talabat.dhmedia.io/image/talabat/MenuItems/mmw_638229965133112878",
  "sammonah-sandwich": "https://talabat.dhmedia.io/image/talabat/MenuItems/mmw_638885663277214940",
  "al-mihwar": "https://talabat.dhmedia.io/image/talabat/MenuItems/20210907_Talabat_Bah_637714624882858447.jpg",
  "bacon": "https://talabat.dhmedia.io/image/global-menu-service/TB_BH/vendor/765551/product/d3701e60-4aee-45a8-8e86-bc27cb7f982a.jpg",
  "slider": "https://talabat.dhmedia.io/image/talabat/MenuItems/mmw_638923149329414565",
  "plan-b": "https://cdn.restaurants-info.com/planbrestaurant/41483-albums-1.jpg",
  "viola-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/Viola_Burger_Turkish_Burg638910193964369033.jpg",
  "hashtag": "https://talabat.dhmedia.io/image/talabat/MenuItems/flaming638904312151648867.jpg",
  "cheesy-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/mmw_639096169612723811",
  "blaze-burger": "https://www.dineoutbahrain.com/sites/default/files/images/restaurants/blaze-burgers.jpg",
  "burger-waqif": "https://talabat.dhmedia.io/image/talabat/MenuItems/Waqf_+_Fries_+_Soda_1639070882391368105.jpg",
  "chubbys-burger": "https://talabat.dhmedia.io/image/talabat/MenuItems/just_cheese_burger639054869081927710.jpg?width=800",
  "wing-station": "https://talabat.dhmedia.io/image/talabat/MenuItems/WhatsApp_Image_20240213_a638434244831659940.jpg",
};

function cuisineKeyOf(cuisine) {
  return { Burger: "burger", "Fried Chicken": "chicken", Broasted: "chicken", Pizza: "pizza", Pasta: "pasta", Grill: "bbq", Malghom: "bbq", Shawarma: "bbq", Italian: "pasta" }[cuisine] || "general";
}

// Core food categories shown on the site. Anything else is dropped.
const WANTED_CUISINES = ["Pasta", "Grill", "Malghom", "Shawarma", "Burger", "Pizza", "Fried Chicken", "Broasted", "Italian"];
// Verified additions (Nino, De Linos, Beefko, Zulu, Coco's, Empire Pizza, Nu Asia,
// Title, Melenzane, Jamie's Italian, LUMEE, Joe's Cafe, Tostado).
const EXTRA_CUISINES = ["Indian", "Asian", "Mediterranean", "Cafe", "Sandwiches", "Mexican"];
const ALLOWED_CUISINES = [...WANTED_CUISINES, ...EXTRA_CUISINES];
// Same cuisine as a new category, but details still unverified — keep them hidden
// until location / phone / hours are researched like the rest of the directory.
const PENDING_DETAILS = new Set([]);
const CUISINE_FIX = {
  Burgers: "Burger", Chicken: "Fried Chicken", BBQ: "Grill", Steakhouse: "Grill",
  Lebanese: "Grill", Persian: "Grill", Pasta: "Pasta", Pizza: "Pizza", Broasted: "Broasted",
  "Steak house": "Grill", Bahraini: "Grill", International: "Burger",
};
// A few brand marks were saved as .png, the rest as .jpg. Without this the
// browser spends a 404 on the missing .jpg before the .png loads.
const LOGO_FILE = { pizzaro: "pizzaro.png", "ic-pizza": "ic-pizza.png", klakiz: "klakiz.png", "jamies-italian": "jamies-italian.png", melenzane: "melenzane.png", "joes-cafe": "joes-cafe.png", "double-smash": "double-smash.png", otto: "otto.png" };
const logoFileFor = (id) => `/restaurants/logos/${LOGO_FILE[id] || `${id}.jpg`}`;

function svgPlaceholder(cuisine) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#431407'/><stop offset='1' stop-color='#9a3412'/></linearGradient></defs><rect width='800' height='500' fill='url(#g)'/><text x='400' y='240' font-family='sans-serif' font-size='44' font-weight='bold' fill='#fed7aa' text-anchor='middle'>${cuisine}</text><text x='400' y='290' font-family='sans-serif' font-size='22' fill='#fdba74' text-anchor='middle'>Photo coming soon</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Instagram handles found via web search (official accounts).
// Empty/missing = button falls back to Instagram keyword search.
const INSTAGRAM_HANDLES = {
  "aseeri-star": "aseeristarrestaurant",
  "chicken-land-cafeteria": "chicken_landbh",
  "white-house": "white_house_resturant",
  "wadi-altayibin-grills": "wadi_altayibin_grills",
  "tren-tren": "trentren.bh",
  "al-haseer": "al_haseer_restaurant",
  "omy-and-banatha": "umiobnatha",
  "ala-hawak": "ala_hawak_restaurant",
  "nino": "ninobahrain", "sando-x-urban": "sando.bahrain", "zulu": "zulu.bh",
  "fatto": "fattobahrain", "cocos": "cocoscafebahrain", "ghancha": "ghancha.bh",
  "layla-aldiyra": "layaly_aldiyra", "5-spoons": "5spoon", "angelo-cafe": "angelocafebh",
  "akbars-kitchen": "akbarskitchen", "naughty-by-raaw": "naughty.by.raaw", "alsikka": "alsekka.bh",
  "banu": "banu_restaurant", "bella-pizzeria": "bella_pizzeria_bh", "alkofeia": "alkofeia.bahrain",
  "uplift": "uplift_bh", "slider-station": "sliderstationbh", "the-block": "theblock_bh",
  "lumee": "lumeestreet", "barbecue-town": "bbq_.town", "rustic-cafe": "rusticcafe_restaurant",
  "abrisham": "abrishambahrain", "l-avenue-cafe": "l_avenue", "title": "title.bh",
  "black-strip": "blackstripeburgers", "tonys": "tonys.pastabh", "buzz-burger": "buzzed.bh",
  "backyard-burger": "backyardbrgr", "lab-burger": "burger.lab.bh",

  "fat-whale": "fatwhale.bh", "grannys-burger": "grannysburger.bh", "sammonah-sandwich": "smona.bh", "jan-burger": "janburgerbh",
  "bacon": "bacon__bh", "slider": "sliders_bah", "viola-burger": "violaburger.bh",
  "hashtag": "hashtagburger.bh", "three-lines": "3lines.bh",
  "janahi-burger": "janahi_burger", "blaze-burger": "blazeburgers", "adam-subs": "adamsubs",
  "sahburger": "sahburger_bh", "lost-burger": "lostburger.bh", "burger-waqif": "waqfbh", "neon-burger": "neonburgerbh",
  "burger-square": "b_square.bh", "chubbys-burger": "chubbys.bh", "challenger": "challenger.bh",
  "daveburger": "daveburger.bh", "baby-chicken": "babychicken_bh",
  "fry-and-fries": "fryandfries", "wingman": "wingman_bh", "wing-station": "wingstation_bh",
  "flap-fried-chicken": "flapfriedchickenbh",
  "phillys": "phillys.bh", "night-bird": "nightbird.bh", "tostado": "tostado.bh",
  "monkey-lala": "monkey.lala.bh", "stack": "stack.bhr", "milano": "pizzamilanos",
  "gate-12": "gate12.bh", "arabian-broasted": "arabianstarbroasted.wll", "chicket": "chicketarabia",
  "chico-chicken": "chickochicken.bh", "yebilna-pasta": "yabeelnapasta", "le-pasta": "lapasta.bhr",
  "mama-joz": "mamajozpizza", "little-caesars": "littlecaesarsbahrain",
  the72: "the72.bh", "ic-pizza": "icpizza.bh",
  "welayat-ali": "welayat.ali.bh", "al-furat-nights": "alfurat_nights",
  "al-farhan": "alfarhanturkishgrill", swaikhat: "swaikhat.bh",
  "tikka-numee": "tikka.numee", aljabriya: "aljabriya.restaurant",
  "honest-burger": "honest_bh", "freid": "fried.bh", "lahom": "lahom.bh",
  "jamies-italian": "jamiesitaliangcc",  "engineer-burger": "engineer_burge.r", "cut-burger": "cut_burger", "doctor-food": "drfood.bh",
  "al-mihwar": "bahrain_almihwar", "plan-b": "planbbh", "three-guys": "three.guys",
  "villa-rosa": "villarosa.bh", "cheesy-burger": "cheesy_burger_bh", "cluckys": "cluckys_bh",
  "popeyes": "popeyes",
};

// Official online menus supplied by the restaurants. Tracking parameters are removed.
const MENU_URLS = {
  "wadi-altayibin-grills": "https://www.wadialtayibinbh.com/",
  "al-haseer": "https://app.menutr.ee/Alhaseer",
  "fatto": "https://qr.finedinemenu.com/fatto-1/menu/63bfeeddab613800157bbfb5",
  "banu": "https://banu.invopos.shop/",
  "slider-station": "https://www.gmemenuapp.com/ssmenubah",
  "abrisham": "https://abrisham.invopos.app/Menu",
  "black-strip": "https://order.blackstripeburgers.com/select/branch",
  "tonys": "https://tonys.framer.website/menu",
  "backyard-burger": "https://www.backyardbrgr.net/",
  "freid": "https://www.menuwati.com/menu/fried",
  "lab-burger": "https://www.menuwati.com/menu/5904",
  "cut-burger": "https://cut_burger.invopos.shop/",
  "grannys-burger": "https://www.talabat.com/bahrain/restaurant/765516/grannys-burger-riffa-alshamali-north-riffa",
  "slider": "https://qr.mydigimenu.com/a3b97ef8-738c-430b-9a13-45243758b5bf/menu-page?menuID=25346",
  "plan-b": "https://planbbh.invopos.app/Menu",
  "three-guys": "https://threeguys.nectars.app/",
  "fry-and-fries": "https://fry-fries-cafe.yallaqrcodes.com/",
  "wingman": "https://www.orderwingmanbh.com/",
  "night-bird": "https://nightbird.invopos.shop/",
  "popeyes": "https://popeyes.com/",
  stack: "https://www.menuwati.com/menu/Stack",
  "gate-12": "https://gate12menu-xvwezpuf.manus.space/",
  "chico-chicken": "https://chickochicken.cc/",
  "nino": "https://qrco.de/bbgQZe",
  "beefko": "https://beefko.invopos.app/Menu",
  "de-linos": "https://okmenuqr.com/7913191/dinein",
  "zulu": "https://qr.finedinemenu.com/1111-1",
  "empire-pizza": "https://www.empire-pizza.com/menu",
  // Supplied ordable link is offline ("We'll be back soon") — official menu PDF instead.
  "nu-asia": "https://www.nuasia.net/NA_MENU_ENG%202026.pdf",
  // Supplied l.instagram.com wrapper unwrapped to the real destination.
  "ic-pizza": "https://ic-pizza.com/",
  "al-farhan": "https://www.alfarhangrills.com/",
  swaikhat: "https://swaikhat.invopos.app/",
  "tikka-numee": "https://tikkanume.invopos.shop/",
  aljabriya: "https://aljabriya-turkish-restaurant.yallaqrcodes.com/",
  uplift: "https://order-uplift.ordable.com/",
  "tren-tren": "https://menusa.app/11f12ffae2e0eaa4afbc2f4e91905abd",
  ghancha: "https://qr.finedinemenu.com/ghancha/menu/65a90d5cdd87160014364f0b",
  "layla-aldiyra": "https://drive.google.com/file/d/1SThX2G4h-hKkiQhzXZwXpYtK_jwl5DM_/view",
  "5-spoons": "https://app.menutr.ee/The5spoon",
  alsikka: "https://alsekkarestaurant.invopos.shop/",
  alkofeia: "https://app.qlub.io/qr/bh/Alkofeia_bh_dm/menu/_/_/9880e4c1ce",
};

// Locally stored menu pages supplied by each restaurant.
const MENU_PHOTOS = {
  "aseeri-star": ["/restaurants/media/aseeri-star-menu.jpg"],
  "tika-abu-jamal": ["/restaurants/media/tika-abu-jamal-menu.jpg"],
  "shawarmaz": [
    "/restaurants/media/shawarmaz/menu-01.jpg",
    "/restaurants/media/shawarmaz/menu-02.jpg",
    "/restaurants/media/shawarmaz/menu-03.jpg",
    "/restaurants/media/shawarmaz/menu-04.jpg"
  ],
  "lahab": [
    "/restaurants/media/lahab/menu-01.jpg",
    "/restaurants/media/lahab/menu-02.jpg",
    "/restaurants/media/lahab/menu-04.jpg"
  ],
  "honest-burger": [
    "/restaurants/media/honest-burger/menu-01.png",
    "/restaurants/media/honest-burger/menu-02.png"
  ],
  "lahom": ["/restaurants/media/lahom/menu-01.png"],
  "al-mihwar": Array.from(
    { length: 10 },
    (_, index) => `/restaurants/media/al-mihwar/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "burger-waqif": ["/restaurants/media/burger-waqif/menu-01.png"],
  "burger-square": Array.from(
    { length: 4 },
    (_, index) => `/restaurants/media/burger-square/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "challenger": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/challenger/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "daveburger": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/daveburger/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "cluckys": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/cluckys/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "baby-chicken": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/baby-chicken/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "wing-station": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/wing-station/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "flap-fried-chicken": ["/restaurants/media/flap-fried-chicken/menu-01.png"],
  milano: ["/restaurants/media/milano/menu-01.png"],
  "mama-joz": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/mama-joz/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "little-caesars": Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/little-caesars/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  the72: Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/the72/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  pizzaro: Array.from(
    { length: 2 },
    (_, index) => `/restaurants/media/pizzaro/menu-${String(index + 1).padStart(2, "0")}.png`
  ),
  "welayat-ali": ["/restaurants/media/welayat-ali/menu-01.png"],
  "al-furat-nights": ["/restaurants/media/al-furat-nights/menu-01.png"],
  "the-cap-burger": [
    "/restaurants/media/the-cap-burger/menu-01.jpg",
    "/restaurants/media/the-cap-burger/menu-02.jpg",
    "/restaurants/media/the-cap-burger/menu-03.jpg"
  ],
};

// Intrinsic dimensions prevent layout shifts while menu images load.
const MENU_PHOTO_DIMENSIONS = {
  "ala-hawak": [[720, 1280], [720, 1280], [720, 1280], [720, 1280], [720, 1280]],
  "sammonah-sandwich": [[720, 1280], [720, 1280], [720, 1280], [720, 1280], [720, 1280], [720, 1280]],
  "omy-and-banatha": [[1372, 963], [1374, 972]],
  "shawarmaz": [[720, 720], [720, 720], [720, 720], [720, 720]],
  "lahab": [[720, 720], [720, 720], [720, 720]],
  "viola-burger": [[720, 1280], [720, 1280]],
  "honest-burger": [[720, 1280], [720, 1280]],
  "lahom": [[720, 1280]],
  "al-mihwar": [
    [1738, 1189], [1710, 1186], [1715, 1175], [1707, 1135], [1710, 1162],
    [1728, 1149], [1712, 1178], [1684, 1131], [1703, 1175], [1727, 1153]
  ],
  "burger-waqif": [[720, 1280]],
  "burger-square": [[720, 1280], [720, 1280], [720, 1280], [720, 1280]],
  "challenger": [[720, 1280], [720, 1280]],
  "daveburger": [[720, 1280], [720, 1280]],
  "cluckys": [[720, 1280], [720, 1280]],
  "baby-chicken": [[720, 1280], [720, 1280]],
  "wing-station": [[720, 1280], [720, 1280]],
  "flap-fried-chicken": [[680, 510]],
  milano: [[720, 1280]],
  "mama-joz": [[371, 510], [371, 510]],
  "little-caesars": [[364, 510], [364, 510]],
  the72: [[372, 510], [372, 510]],
  pizzaro: [[287, 510], [287, 510]],
  "welayat-ali": [[354, 510]],
  "al-furat-nights": [[680, 481]],
  "double-smash": [[720, 1280]],
  "the-cap-burger": [[720, 1280], [720, 1280], [720, 1280]],
};

// Badge logos for places that have a hi-res cover in HIGH_RES.
const BADGES = {  "nino": "https://talabat.dhmedia.io/image/talabat/restaurants/NINO_LOGO_EN_638294989787638294989788469200.jpg?width=400",
  "ghancha": "https://talabat.dhmedia.io/image/talabat/restaurants/GhanchaLogoPirnt_1638387529641459630.jpg?width=400",
  "naughty-by-raaw": "https://talabat.dhmedia.io/image/talabat/restaurants/NBR_Logo638759187796085850.jpg?width=400",
  "banu": "https://talabat.dhmedia.io/image/talabat/restaurants/LOGO_(1)_636747050200953630.jpg?width=400",
  "the-block": "https://talabat.dhmedia.io/image/talabat/restaurants/Logo_636976051597766165.jpg?width=400",
  "fatto": "https://talabat.dhmedia.io/image/talabat/restaurants/logo_637120162860045614.jpg?width=400",
};

// Real areas + branches from Talabat/Maps listings.
// Unknown locations are omitted (site shows the Manama default).
const AREA_COORDS = {
  "Hamad Town": [26.106, 50.508], "East Riffa": [26.145, 50.552], "Riffa": [26.134, 50.555],
  "Dar Kulaib": [26.202, 50.511], "Seef": [26.236, 50.586], "Saar": [26.208, 50.467],
  "Manama": [26.223, 50.587], "Bilad Al Qadeem": [26.241, 50.586], "Zayed Town": [26.256, 50.587],
  "Isa Town": [26.173, 50.546], "Zinj": [26.232, 50.582], "Malkiya": [26.166, 50.509],
  "Jidhafs": [26.234, 50.583], "Budaiya": [26.215, 50.481], "A'ali": [26.177, 50.592],
  "Muqaba": [26.232, 50.602], "Juffair": [26.224, 50.576], "Tubli": [26.183, 50.537],
  "Jerdab": [26.214, 50.648], "Samaheej": [26.233, 50.617], "Janabiyah": [26.181, 50.481],
  "Riffa Views": [26.143, 50.561], "Jannusan": [26.251, 50.624], "Al Sayh": [26.153, 50.545],
  "Sitra": [26.157, 50.624], "Galaly": [26.23, 50.569], "Busaiteen": [26.226, 50.564],
  "Sanad": [26.027, 50.644], "Hidd": [26.218, 50.653], "Karzakkan": [26.085, 50.495],
  "Arad": [26.239, 50.667], "Hamala": [26.151, 50.568], "Jid Ali": [26.146, 50.599],
  "Adliya": [26.227, 50.574], "Al Hoora": [26.223, 50.576], "Muharraq": [26.258, 50.609],
  "Amwaj": [26.254, 50.613], "Shakura": [26.077, 50.654], "Zallaq": [26.045, 50.618],
  "Maqabah": [26.232, 50.602], "Diyar": [26.212, 50.478], "City Centre": [26.236, 50.59],
  "Umm Al Hassam": [26.236, 50.606], "Al Lawzi": [26.094, 50.595], "Daih": [26.222, 50.64],
  "Qudaibiya": [26.237, 50.569], "Sea Front": [26.239, 50.589], "Al Hidd": [26.218, 50.653],
};

export const AREA_COORDS_EXPORT = AREA_COORDS;
// Coordinates for places Google Maps doesn't surface but that we resolved by hand
// (tbm=map lookups, verified against area). Takes priority over the area centroid.
const ID_COORDS = {
  "wadi-altayibin-grills": [26.1162634, 50.5718038],
  "omy-and-banatha": [26.0702649, 50.5050083],
  "black-strip": [26.2398074, 50.5741792],
  "burger-fries-more": [26.159045, 50.5183259],
  "lab-burger": [26.1142802, 50.5765054],
  "bacon": [26.2709036, 50.5939494],
  "burger-waqif": [26.2208787, 50.5004833],
  "phillys": [26.212971, 50.6028899],
  "milano": [26.1303311, 50.57419],
  "klakiz": [26.2235305, 50.5875935],
  "uplift": [26.151, 50.568],
  "risotto": [26.0996229, 50.4851777],
  "yebilna-pasta": [26.0996229, 50.4851777],
  "le-pasta": [26.1273372, 50.543959],
};

const LOCATIONS = {
  "aseeri-star": { area: "Hamad Town", branches: ["Hamad Town"] },
  "chicken-land-cafeteria": { area: "Hamad Town", branches: ["Hamad Town"] },
  "white-house": { area: "Hamad Town", branches: ["Hamad Town", "Busaiteen"] },
  "wadi-altayibin-grills": { area: "East Riffa", branches: ["East Riffa"] },
  "tren-tren": { area: "Riffa", branches: ["Arad", "Hidd", "Riffa", "Hamala", "Jid Ali"] },
  "tika-abu-jamal": { area: "Riffa", branches: ["Riffa"] },
  "al-haseer": { area: "Dar Kulaib", branches: ["Dar Kulaib"] },
  "omy-and-banatha": { area: "Dar Kulaib", branches: ["Dar Kulaib"] },
  "ala-hawak": { area: "Dar Kulaib", branches: ["Dar Kulaib"] },
  "fatto": { area: "Seef", branches: ["Seef", "Adliya"] },
  "banu": { area: "Seef", branches: ["Seef", "Al Hoora"] },
  "abrisham": { area: "Saar", branches: ["Saar"] },
  "black-strip": { area: "Manama", branches: ["Manama", "Seef"] },
  "barbecue-town": { area: "Bilad Al Qadeem", branches: ["Bilad Al Qadeem"] },
  "bella-pizzeria": { area: "Riffa", branches: ["Riffa", "Busaiteen"] },
  "milano": { area: "Riffa", branches: ["Riffa"] },
  "gate-12": { area: "Zayed Town", branches: ["Zayed Town"] },
  "villa-rosa": { area: "Isa Town", branches: ["Isa Town"] },
  "three-lines": { area: "Zinj", branches: ["Zinj", "Busaiteen", "Riffa"] },
  "risotto": { area: "Malkiya", branches: ["Malkiya"] },
  "yebilna-pasta": { area: "Malkiya", branches: ["Malkiya", "A'ali"] },
  "le-pasta": { area: "Riffa", branches: ["Arad", "Jerdab", "Riffa", "Hamad Town"] },
  "tonys": { area: "Jidhafs", branches: ["Jidhafs"] },
  "buzz-burger": { area: "Riffa", branches: ["Riffa", "Muharraq"] },
  "backyard-burger": { area: "Riffa", branches: ["Riffa", "Hamad Town"] },
  "honest-burger": { area: "Budaiya", branches: ["Budaiya"] },
  "freid": { area: "A'ali", branches: ["A'ali"] },
  "burger-fries-more": { area: "A'ali", branches: ["A'ali"] },
  "lahom": { area: "Muqaba", branches: ["Muqaba"] },
  "lab-burger": { area: "Riffa", branches: ["Riffa"] },
  "cut-burger": { area: "Malkiya", branches: ["Malkiya"] },
  "fat-whale": { area: "Riffa", branches: ["Riffa"] },
  "grannys-burger": { area: "Riffa", branches: ["Riffa"] },
  "doctor-food": { area: "Riffa", branches: ["Riffa"] },
  "bacon": { area: "Juffair", branches: ["Juffair", "Arad", "Riffa"] },
  "slider": { area: "Tubli", branches: ["Tubli", "Amwaj", "Juffair"] },
  "plan-b": { area: "Riffa", branches: ["Riffa", "Seef"] },
  "viola-burger": { area: "Dar Kulaib", branches: ["Dar Kulaib", "Budaiya", "Al Sayh", "Malkiya"] },
  "three-guys": { area: "Jerdab", branches: ["Jerdab", "Shakura", "Zallaq"] },
  "hashtag": { area: "Zayed Town", branches: ["Zayed Town", "Al Sayh"] },
  "cheesy-burger": { area: "Samaheej", branches: ["Samaheej", "Maqabah", "Hidd"] },
  "janahi-burger": { area: "Riffa", branches: ["Riffa"] },
  "blaze-burger": { area: "Janabiyah", branches: ["Janabiyah", "Diyar", "Manama"] },
  "sahburger": { area: "Juffair", branches: ["Juffair", "Sanad"] },
  "lost-burger": { area: "Riffa Views", branches: ["Riffa Views"] },
  "burger-waqif": { area: "Jannusan", branches: ["Jannusan"] },
  "burger-square": { area: "Al Sayh", branches: ["Al Sayh"] },
  "chubbys-burger": { area: "Al Sayh", branches: ["Al Sayh", "Busaiteen"] },
  "challenger": { area: "Sitra", branches: ["Sitra"] },
  "stack": { area: "Riffa", branches: ["Riffa"] },
  "cluckys": { area: "Galaly", branches: ["Galaly"] },
  "baby-chicken": { area: "Riffa", branches: ["Riffa"] },
  "fry-and-fries": { area: "Busaiteen", branches: ["Busaiteen"] },
  "wingman": { area: "Budaiya", branches: ["Budaiya", "Juffair", "Muharraq", "Jannusan", "Riffa"] },
  "wing-station": { area: "Al Sayh", branches: ["Al Sayh"] },
  "flap-fried-chicken": { area: "Sanad", branches: ["Sanad"] },
  "night-bird": { area: "Janabiyah", branches: ["Janabiyah"] },
  "popeyes": { area: "Riffa", branches: ["Riffa", "City Centre", "Zallaq", "Hidd"] },
  "monkey-lala": { area: "Riffa", branches: ["Riffa", "Al Sayh"] },
  "arabian-broasted": { area: "Tubli", branches: ["Tubli", "Umm Al Hassam", "Al Lawzi", "Sitra", "Saar"] },
  "chicket": { area: "Hidd", branches: ["Hidd", "Daih", "Riffa", "Janabiyah"] },
  "the-cap-burger": { area: "Zallaq", branches: ["Zallaq"] },
};

// Only TRUE high-res covers — tiny logos stay as badge, never main photo.
const HIGH_RES = {
  "zulu": "https://cdn.restaurants-info.com/zulurestaurant/27026-albums-1.jpg",
  "fatto": "https://www.the50.com/discovery/filestore/jpg/Fatto_dish1.jpg",
  "ghancha": "https://ghancha.co/brand/ghancha/og.jpg",
  "naughty-by-raaw": "https://naughtybyraaw.com/wp-content/uploads/2025/04/NBR.BirthMonths2-11-1.jpeg",
  "banu": "https://media.timeout.com/images/106206126/image.jpg",
  "the-block": "https://tapcom-live.ams3.cdn.digitaloceanspaces.com/media/the-block-bahrain-1/covers/DSC_1370_Copy.JPG",
};

const burgerMenu = [
  { category: "Burgers", items: [
    { name: "Classic Beef Burger", description: "Smash patty, cheddar, house sauce", price: 2.9, veg: false, popular: true },
    { name: "Chicken Burger", description: "Crispy / grilled, garlic mayo", price: 2.5, veg: false },
    { name: "Cheese Blast Burger", description: "Double cheese, caramelized onion", price: 3.4, veg: false, popular: true },
    { name: "Veggie Burger", price: 2.2, veg: true },
  ]},
  { category: "Sides", items: [
    { name: "French Fries", price: 1.2, veg: true },
    { name: "Loaded Fries", price: 2.1, veg: true, popular: true },
    { name: "Milkshake", price: 1.8, veg: true },
  ]},
];

const theCapMenu = [
  { category: "Burgers", items: [
    { name: "Beef Angus (110g)", description: "Angus beef patty", price: 1.9, veg: false, popular: true },
    { name: "Beef Angus Meal (110g)", description: "Burger, fries & drink", price: 2.9, veg: false },
    { name: "Beef Bacon (110g)", price: 2.4, veg: false },
    { name: "Beef Bacon Meal (110g)", description: "Burger, fries & drink", price: 3.4, veg: false },
    { name: "Chicken Burger", description: "Regular or spicy", price: 1.7, veg: false },
    { name: "Chicken Burger Meal", description: "Burger, fries & drink", price: 2.5, veg: false },
    { name: "Add Burger Slices", price: 1.0, veg: false },
  ]},
  { category: "Sides", items: [
    { name: "Chili Cheese Fries", price: 1.9, veg: true, popular: true },
    { name: "Chicken Strips (5 pc)", price: 1.9, veg: false },
    { name: "Dynamite (10 pc)", price: 1.9, veg: false },
  ]},
  { category: "Sauces & Drinks", items: [
    { name: "Secret Sauce", price: 0.3, veg: true },
    { name: "Classic Sauce", price: 0.3, veg: true },
    { name: "Chimminy Sauce", price: 0.3, veg: true },
    { name: "Soft Drink", price: 0.4, veg: true },
    { name: "Water", price: 0.2, veg: true },
  ]},
];

const chickenMenu = [
  { category: "Fried Chicken", items: [
    { name: "Classic Broasted (4 pc)", description: "With fries, garlic sauce, bread", price: 2.8, veg: false, popular: true },
    { name: "Spicy Strips (5 pc)", price: 2.4, veg: false },
    { name: "Chicken Wings (8 pc)", description: "Buffalo / BBQ / honey mustard", price: 2.9, veg: false, popular: true },
    { name: "Chicken Tenders Meal", price: 2.6, veg: false },
  ]},
  { category: "Wraps & Sandwiches", items: [
    { name: "Chicken Wrap", price: 1.9, veg: false },
    { name: "Zinger Sandwich", price: 1.8, veg: false },
  ]},
];

const pizzaMenu = [
  { category: "Pizza", items: [
    { name: "Margherita", price: 3.2, veg: true, popular: true },
    { name: "Pepperoni", price: 4.1, veg: false, popular: true },
    { name: "BBQ Chicken", price: 4.3, veg: false },
    { name: "Veggie Supreme", price: 3.6, veg: true },
  ]},
  { category: "Sides", items: [
    { name: "Garlic Bread", price: 1.5, veg: true },
    { name: "Cheesy Fries", price: 1.9, veg: true },
  ]},
];

const pastaMenu = [
  { category: "Pasta", items: [
    { name: "Alfredo Pasta", description: "Cream, parmesan, mushroom / chicken", price: 3.4, veg: true, popular: true },
    { name: "Arrabbiata Pasta", description: "Spicy tomato, basil", price: 3.1, veg: true },
    { name: "Pesto Chicken Pasta", price: 3.8, veg: false },
    { name: "Risotto", price: 3.9, veg: true },
  ]},
];

const cafeMenu = [
  { category: "Breakfast & Brunch", items: [
    { name: "Full Breakfast", description: "Eggs, beans, toast, coffee", price: 3.5, veg: false, popular: true },
    { name: "Pancakes", price: 2.8, veg: true },
    { name: "Avocado Toast", price: 3.0, veg: true },
  ]},
  { category: "Coffee & Desserts", items: [
    { name: "Spanish Latte", price: 1.8, veg: true, popular: true },
    { name: "Pistachio Latte", price: 2.2, veg: true },
    { name: "San Sebastian Cheesecake", price: 2.5, veg: true },
  ]},
];

const bbqMenu = [
  { category: "Grill", items: [
    { name: "Mixed Grill Platter", description: "Kebab, tikka, shish tawook, rice", price: 5.5, veg: false, popular: true },
    { name: "Shish Tawook", price: 3.4, veg: false },
    { name: "Kebab Halabi", price: 3.6, veg: false },
  ]},
  { category: "Sides", items: [
    { name: "Hummus & Bread", price: 1.6, veg: true },
    { name: "Fattoush", price: 1.8, veg: true },
  ]},
];

const mixedMenu = [
  { category: "Popular Dishes", items: [
    { name: "Chef Special Platter", price: 4.5, veg: false, popular: true },
    { name: "Grilled Chicken Plate", price: 3.5, veg: false },
    { name: "Pasta of the Day", price: 3.2, veg: true },
  ]},
  { category: "Sandwiches", items: [
    { name: "Club Sandwich", price: 2.4, veg: false },
    { name: "Halloumi Sandwich", price: 2.6, veg: true },
  ]},
];

// helper: mk(id, name, cuisine, img, menu, desc, tags, instagram, extra)
// extra: { priceRange, rating, reviews, address, city, phone, hours,
//          placeId, talabatUrl, image, googleRating, dataSource, menuPhotos, menuUrl }
// >>> RESEARCHED (generated by scripts/apply-research.mjs)
// Google Maps values researched on 2026-10-04. This block wins over the
// hand-written record above, so re-running the research never loses data.
const RESEARCHED = {
  
  "aseeri-star": {
    googleName: "Aseer Star Restaurant And Grill",
    cuisine: "Malghom",
    phone: "+973 1741 2643",
    categories: ["Restaurant"],
    openNow: "Open · Closes 4 AM",
    openingHours: {"Monday":"6:40 AM-4 AM","Sunday":"6:40 AM-4 AM"},
    mapsPlaceId: "ChIJ8xNaoeyxST4REBnHrzcNxHI",
    lat: 26.1417225,
    lng: 50.4962191,
    dataSource: "google-maps",
  },

  "chicken-land-cafeteria": {
    googleName: "أرض الدجاج - Chicken Land Cafeteria \\u0026 Grills.w.l.l 17412353/",
    nameAr: "أرض الدجاج - Chicken Land Cafeteria \\u0026 Grills",
    cuisine: "Malghom",
    phone: "+973 7793 9190 / +973 1741 2353 / +973 3347 9190",
    rating: 3.8,
    reviews: 479,
    categories: ["Restaurant"],
    openNow: "Open · Closes 5 AM Mon",
    mapsPlaceId: "ChIJY81pjuyxST4R5_vbuKYtLuc",
    lat: 26.1414322,
    lng: 50.4961991,
    dataSource: "google-maps",
  },

  "white-house": {
    googleName: "White House Restaurant",
    nameAr: "مطعم البيت الابيض",
    cuisine: "Malghom",
    address: "Souq Waqif, Hamad Town",
    shortAddress: "Souq Waqif, Hamad Town",
    phone: "+973 1748 8877 / +973 3305 4142",
    categories: ["Restaurant"],
    openNow: "Open · Closes 5 AM Mon",
    mapsPlaceId: "ChIJ3RDK76ixST4RFA6AMZcQkHE",
    lat: 26.139581699999997,
    lng: 50.492686799999994,
    dataSource: "google-maps",
  },

  "tren-tren": {
    googleName: "Tren Tren Riffa Restaurant \\u0026 Grills",
    nameAr: "مطعم ومشويات ترن ترن الرفاع",
    cuisine: "Grill",
    phone: "+973 3223 2009 / +973 3730 9111 / +973 1770 1617",
    rating: 4.1,
    reviews: 2054,
    categories: ["Restaurant"],
    openNow: "Open · Closes 3 AM",
    mapsPlaceId: "ChIJI-pARfWsST4RjNfsFIRzQIU",
    lat: 26.115228899999998,
    lng: 50.5752017,
    dataSource: "google-maps",
  },

  "tika-abu-jamal": {
    googleName: "Bu Jamal Grills",
    nameAr: "تكة ابو جمال",
    cuisine: "Grill",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 1777 9644 / +973 3465 9775",
    categories: ["Restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"4:30 PM-2 AM","Monday":"4:30 PM-2 AM","Tuesday":"4:30 PM-2 AM","Wednesday":"4:30 PM-2 AM","Thursday":"4:30 PM-3 AM","Friday":"4:30 PM-3 AM","Saturday":"4:30 PM-2 AM"},
    mapsPlaceId: "ChIJj5mYJV-sST4RU1DV8TaQYgg",
    lat: 26.1163481,
    lng: 50.572125299999996,
    dataSource: "google-maps",
  },

  "al-haseer": {
    googleName: "Alhaseer Restaurant",
    nameAr: "الحصير",
    cuisine: "Grill",
    address: "Dar Kulaib",
    shortAddress: "Dar Kulaib",
    phone: "+973 1744 0224",
    rating: 4.1,
    reviews: 511,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 8:30 AM",
    openingHours: {"Monday":"8:30 AM-12 AM","Tuesday":"8:30 AM-12 AM","Wednesday":"8:30 AM-12 AM","Thursday":"8:30 AM-1 AM","Friday":"8:30 AM-12 AM","Saturday":"8:30 AM-12 AM","Sunday":"8:30 AM-12 AM"},
    mapsPlaceId: "ChIJ_RZjHaWyST4RRy8vcMT2CY0",
    lat: 26.066039999999997,
    lng: 50.505103999999996,
    dataSource: "google-maps",
  },

  "ala-hawak": {
    googleName: "Ala Hawak Restaurant",
    nameAr: "مطعم على هواك",
    cuisine: "Grill",
    address: "Dar Kulaib",
    shortAddress: "Dar Kulaib",
    phone: "+973 3346 5195 / +973 1747 5088",
    rating: 3.9,
    reviews: 77,
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"6 PM-1 AM","Monday":"6 PM-1 AM","Tuesday":"6 PM-1 AM","Wednesday":"6 PM-1 AM","Thursday":"6 PM-1 AM","Friday":"6 PM-1 AM","Saturday":"6 PM-1 AM"},
    mapsPlaceId: "ChIJlZc6Z_yzST4Ryg4rrFzXV5c",
    lat: 26.0660767,
    lng: 50.505292,
    dataSource: "google-maps",
  },

  "nino": {
    googleName: "Nino - نينو",
    nameAr: "نينو",
    cuisine: "Italian",
    phone: "+973 3362 0254 / +973 1756 6555",
    rating: 4.7,
    reviews: 3971,
    website: "https://linktr.ee",
    categories: ["Italian restaurant","Breakfast restaurant","Dessert shop","Fine dining restaurant","Italian grocery store","Lunch restaurant","Pasta shop","Pizza restaurant","Restaurant","Sushi restaurant"],
    openNow: "Closed · Opens 11 AM Mon",
    openingHours: {"Sunday":"11 AM-11:30 PM","Monday":"11 AM-11:30 PM","Tuesday":"11 AM-11:30 PM","Wednesday":"11 AM-11:30 PM","Thursday":"11 AM-12:30 AM","Friday":"11 AM-12:30 AM","Saturday":"11 AM-11:30 PM"},
    mapsPlaceId: "ChIJO7R-hWWlST4R9dKPcnBjfhg",
    lat: 26.2333192,
    lng: 50.541287499999996,
    dataSource: "google-maps",
  },

  "sando-x-urban": {
    googleName: "SANDO Restaurant (SANDO X URBAN)",
    cuisine: "Sandwiches",
    address: "Rd No 2431, Manama",
    shortAddress: "Manama",
    phone: "+973 3238 3239",
    rating: 3.8,
    reviews: 128,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 6:30 PM",
    openingHours: {"Sunday":"6:30-10:30 PM","Monday":"6:30-11 PM","Tuesday":"6:30-11 PM","Wednesday":"6:30-11 PM","Thursday":"6:30-11:30 PM","Friday":"6:30-11:30 PM","Saturday":"6:30-11:30 PM"},
    mapsPlaceId: "ChIJu6ZdMXypST4RqW8_by6-VuU",
    lat: 26.2106139,
    lng: 50.610749399999996,
    dataSource: "google-maps",
  },

  "zulu": {
    googleName: "Zulu restaurant",
    cuisine: "Italian",
    address: "Qudaibiya, Manama",
    shortAddress: "Qudaibiya, Manama",
    phone: "+973 3311 2663",
    rating: 4.2,
    reviews: 364,
    categories: ["Restaurant"],
    openingHours: {"Monday":"Open 24 hours"},
    mapsPlaceId: "ChIJi4fWs4yvST4Rr_8IVW-23Dc",
    lat: 26.2143283,
    lng: 50.592945099999994,
    dataSource: "google-maps",
  },

  "fatto": {
    googleName: "Fatto",
    nameAr: "مطعم فاتو ايطالي",
    cuisine: "Italian",
    address: "Road 2827 Restaurant 2214, Seef",
    shortAddress: "Seef",
    phone: "+973 6677 8822",
    rating: 4.5,
    reviews: 3365,
    categories: ["Italian restaurant"],
    openNow: "Closed · Opens 8 AM Mon",
    openingHours: {"Sunday":"8 AM-11:30 PM","Monday":"8 AM-11:30 PM","Tuesday":"8 AM-11:30 PM","Wednesday":"8 AM-11:30 PM","Thursday":"8 AM-12 AM","Friday":"8 AM-12 AM","Saturday":"8 AM-11:30 PM"},
    mapsPlaceId: "ChIJkatbkGWlST4RDgzRDODQgKI",
    lat: 26.232971799999998,
    lng: 50.541289899999995,
    dataSource: "google-maps",
  },

  "cocos": {
    googleName: "Coco's",
    nameAr: "كوكوز",
    cuisine: "Mediterranean",
    phone: "+973 1771 2288",
    rating: 4.1,
    reviews: 8215,
    categories: ["Restaurant"],
    openNow: "Open · Closes 3 AM",
    mapsPlaceId: "ChIJ5cQg7TOvST4RjKldp9mLgss",
    lat: 26.215013199999998,
    lng: 50.5925763,
    dataSource: "google-maps",
  },

  "ghancha": {
    googleName: "Ghancha غنجة",
    cuisine: "Cafe",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 3927 7200",
    rating: 4.2,
    reviews: 1049,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 7 AM",
    openingHours: {"Monday":"7 AM-10 PM","Tuesday":"7 AM-10 PM","Wednesday":"7 AM-10 PM","Thursday":"7 AM-11 PM","Friday":"7 AM-11 PM","Saturday":"7 AM-10 PM","Sunday":"7 AM-10 PM"},
    mapsPlaceId: "ChIJ_95eQ5SlST4RMrsC6UEgMAQ",
    lat: 26.233926399999998,
    lng: 50.5399743,
    dataSource: "google-maps",
  },

  "5-spoons": {
    googleName: "Five Spoons Restaurant",
    nameAr: "مطعم فايف سبون",
    cuisine: "Cafe",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1700 0567",
    rating: 4.2,
    reviews: 1488,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 11 AM",
    openingHours: {"Monday":"11 AM-11:45 PM","Tuesday":"11 AM-11:45 PM","Wednesday":"11 AM-11:45 PM","Thursday":"11 AM-11:45 PM","Friday":"11 AM-11:45 PM","Saturday":"11 AM-11:45 PM","Sunday":"11 AM-11:45 PM"},
    mapsPlaceId: "ChIJ78VAf_GuST4R8wVLfUslpdE",
    lat: 26.1765145,
    lng: 50.5622869,
    dataSource: "google-maps",
  },

  "angelo-cafe": {
    googleName: "Angelo cafe",
    cuisine: "Cafe",
    address: "Bulding 1582, Rd 4041",
    shortAddress: "Bulding 1582",
    phone: "+973 3820 0089",
    rating: 4.2,
    reviews: 177,
    categories: ["Health food restaurant"],
    openNow: "Closed · Opens 6 AM",
    openingHours: {"Monday":"6 AM-12 AM","Tuesday":"6 AM-12 AM","Wednesday":"6 AM-12 AM","Thursday":"6 AM-2 AM","Friday":"6 AM-2 AM","Saturday":"6 AM-12 AM","Sunday":"6 AM-12 AM"},
    mapsPlaceId: "ChIJedVUIc6pST4RBA8JQ5tuwqo",
    lat: 26.2154883,
    lng: 50.607362099999996,
    dataSource: "google-maps",
  },

  "banu": {
    googleName: "Banu Restaurant",
    nameAr: "مطعم بانو",
    cuisine: "Grill",
    address: "Bu Ghazal Manama",
    shortAddress: "Bu Ghazal Manama",
    phone: "+973 1771 5654",
    rating: 4.5,
    reviews: 3410,
    categories: ["Persian restaurant"],
    openNow: "Closed · Opens 12 PM Mon",
    openingHours: {"Sunday":"12-11 PM","Monday":"12-11 PM","Tuesday":"12-11 PM","Wednesday":"12-11 PM","Thursday":"12 PM-12 AM","Friday":"12 PM-12 AM","Saturday":"12-11 PM"},
    mapsPlaceId: "ChIJ6f4gRRSvST4RjXd_0jifiEA",
    lat: 26.210615699999998,
    lng: 50.5723342,
    dataSource: "google-maps",
  },

  "bella-pizzeria": {
    googleName: "Bella Pizzeria Italiano",
    nameAr: "بيلا بيزاريا",
    cuisine: "Pizza",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 1730 0800",
    rating: 3.9,
    reviews: 279,
    categories: ["Italian restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"12 PM-1 AM","Monday":"12 PM-1 AM","Tuesday":"12 PM-1 AM","Wednesday":"12 PM-1 AM","Thursday":"12 PM-1 AM","Friday":"12 PM-1 AM","Saturday":"12 PM-1 AM"},
    mapsPlaceId: "ChIJpcBKzTSsST4RVN0daWy_eLg",
    lat: 26.1324495,
    lng: 50.5548971,
    dataSource: "google-maps",
  },

  "alkofeia": {
    googleName: "Alkofeia Restaurant مطعم الكوفية",
    nameAr: "مطعم الكوفية",
    cuisine: "Mediterranean",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1700 5100",
    website: "https://alkofeia.com",
    categories: ["Middle Eastern restaurant","Restaurant"],
    openNow: "Closed · Opens 8 AM",
    mapsPlaceId: "ChIJ0V488WGlST4RRPJH3CQ-MyI",
    lat: 26.2418732,
    lng: 50.553025899999994,
    dataSource: "google-maps",
  },

  "slider-station": {
    googleName: "Slider Station",
    nameAr: "سلايدر ستيشن",
    cuisine: "Burger",
    address: "112 Rd No 3803, Manama",
    shortAddress: "112 Rd No 3803, Manama",
    phone: "+973 1663 3777",
    rating: 4.4,
    reviews: 4096,
    categories: ["Hamburger restaurant","American restaurant"],
    openNow: "Closed · Opens 12 PM",
    openingHours: {"Monday":"12 PM-12 AM","Tuesday":"12 PM-12 AM","Wednesday":"12 PM-12 AM","Thursday":"12 PM-1 AM","Friday":"12 PM-1 AM","Saturday":"12 PM-12:30 AM","Sunday":"12 PM-12 AM"},
    mapsPlaceId: "ChIJbZ7LvTOvST4Rg7gsHxxa6fw",
    lat: 26.214537399999998,
    lng: 50.592818699999995,
    dataSource: "google-maps",
  },

  "barbecue-town": {
    googleName: "Barbecue Town",
    nameAr: "مدينة الشواء",
    cuisine: "Grill",
    address: "Bilad Al Qadeem",
    shortAddress: "Bilad Al Qadeem",
    phone: "+973 3547 7026",
    rating: 4.3,
    reviews: 6336,
    categories: ["Barbecue restaurant","Grill","Barbecue area","Restaurant","Steak house"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"12 PM-2 AM","Monday":"12 PM-2 AM","Tuesday":"12 PM-2 AM","Wednesday":"12 PM-2 AM","Thursday":"12 PM-2 AM","Friday":"12 PM-2 AM","Saturday":"12 PM-2 AM"},
    mapsPlaceId: "ChIJvSYlNSivST4Rm5zNlfIwd64",
    lat: 26.2052041,
    lng: 50.5541823,
    dataSource: "google-maps",
  },

  "rustic-cafe": {
    googleName: "Rustic Restaurant and Cafe",
    cuisine: "Cafe",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1700 3366",
    rating: 4.4,
    reviews: 530,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 12 PM",
    mapsPlaceId: "ChIJIfYZNvWxST4RycHOgqouLP0",
    lat: 26.1862043,
    lng: 50.475296199999995,
    dataSource: "google-maps",
  },

  "abrisham": {
    googleName: "Abrisham Bahrain | ابريشم البحرين مطعم ايراني",
    nameAr: "مطعم أبريشم",
    cuisine: "Grill",
    address: "Saar",
    shortAddress: "Saar",
    phone: "+973 7799 7788",
    rating: 4.6,
    reviews: 3551,
    categories: ["Persian restaurant"],
    openingHours: {"Sunday":"12 PM-12 AM","Monday":"12 PM-12 AM","Tuesday":"12 PM-12 AM","Wednesday":"12 PM-12 AM","Thursday":"12 PM-12 AM","Friday":"12 PM-12 AM","Saturday":"12 PM-12 AM"},
    mapsPlaceId: "ChIJpeBU3i6xST4Rnij29bnHkk0",
    lat: 26.2038866,
    lng: 50.4994711,
    dataSource: "google-maps",
  },

  "l-avenue-cafe": {
    googleName: "L'avenue Cafe",
    cuisine: "Cafe",
    phone: "+973 1700 0111",
    rating: 4.3,
    reviews: 300,
    categories: ["Restaurant"],
    openNow: "Open · Closes 3 AM",
    openingHours: {"Sunday":"8 AM-3 AM","Monday":"8 AM-3 AM","Tuesday":"8 AM-3 AM","Wednesday":"8 AM-3 AM","Thursday":"8 AM-3 AM","Friday":"8 AM-3 AM","Saturday":"8 AM-3 AM"},
    mapsPlaceId: "ChIJb7HjBXywST4Reo17N1-xmEQ",
    lat: 26.197377099999997,
    lng: 50.4770195,
    dataSource: "google-maps",
  },

  "beefko": {
    googleName: "Beefko",
    cuisine: "Grill",
    phone: "+973 3200 0877",
    rating: 4.4,
    reviews: 1073,
    categories: ["Steak house","Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Monday":"1 PM-1 AM","Tuesday":"1 PM-1 AM","Wednesday":"1 PM-1 AM","Thursday":"1 PM-2 AM","Friday":"1 PM-2 AM","Saturday":"1 PM-1 AM","Sunday":"1 PM-1 AM"},
    mapsPlaceId: "ChIJPVI_0MWvST4R4V6I3HNmiUE",
    lat: 26.215133899999998,
    lng: 50.5917143,
    dataSource: "google-maps",
  },

  "de-linos": {
    googleName: "De Linos",
    nameAr: "ديلينوز",
    cuisine: "Italian",
    address: "Sea Front, Manama",
    shortAddress: "Sea Front, Manama",
    rating: 4.4,
    reviews: 1635,
    categories: ["Italian restaurant"],
    openNow: "Closed · Opens 9 AM Mon",
    openingHours: {"Sunday":"9 AM-11 PM","Monday":"9 AM-11 PM","Tuesday":"9 AM-11 PM","Wednesday":"9 AM-11 PM","Thursday":"9 AM-11 PM","Friday":"9 AM-11 PM","Saturday":"9 AM-11 PM"},
    mapsPlaceId: "ChIJeZe-TAClST4RXN3qO4zt5tw",
    lat: 26.2331526,
    lng: 50.5544582,
    dataSource: "google-maps",
  },

  "empire-pizza": {
    googleName: "Empire Pizza",
    nameAr: "بيتزا الإمبراطورية",
    cuisine: "Pizza",
    phone: "+973 7709 0105 / +973 7709 0106",
    rating: 4.6,
    reviews: 367,
    categories: ["Pizza takeaway"],
    openNow: "Closed · Opens 6 PM Wed",
    openingHours: {"Sunday":"Closed","Monday":"Closed","Tuesday":"Closed","Wednesday":"6-11 PM","Thursday":"6-11 PM","Friday":"6-11 PM","Saturday":"6-11 PM"},
    mapsPlaceId: "ChIJW450D4qvST4R8ClBwHCY1Hc",
    lat: 26.151873,
    lng: 50.5328568,
    dataSource: "google-maps",
  },

  "nu-asia": {
    googleName: "Nu Asia - Al Aali Complex",
    nameAr: "نيو اسيا",
    cuisine: "Asian",
    address: "District- AlAali complex, Road No 2827, Seef",
    shortAddress: "Seef",
    phone: "+973 1743 4344 / +973 1787 0222 / +973 1769 1919",
    rating: 4.4,
    reviews: 2583,
    categories: ["Asian restaurant","Indian restaurant","Japanese restaurant","Sushi restaurant"],
    openNow: "Closed · Opens 11:30 AM Mon",
    openingHours: {"Sunday":"11:30 AM-11:45 PM","Monday":"11:30 AM-11:45 PM","Tuesday":"11:30 AM-11:45 PM","Wednesday":"11:30 AM-11:45 PM","Thursday":"11:30 AM-12:15 AM","Friday":"11:30 AM-12:15 AM","Saturday":"11:30 AM-11:45 PM"},
    mapsPlaceId: "ChIJVx3-kGWlST4RxL1q_c3F-Yk",
    lat: 26.2325189,
    lng: 50.541305,
    dataSource: "google-maps",
  },

  "tonys": {
    googleName: "Tonys Restaurant مطعم تونيز",
    cuisine: "Burger",
    address: "Jidhafs",
    shortAddress: "Jidhafs",
    phone: "+973 7739 1199",
    rating: 4.9,
    reviews: 371,
    categories: ["Restaurant"],
    openingHours: {"Sunday":"5:30 PM-12 AM","Monday":"5:30 PM-12 AM","Tuesday":"5:30 PM-12 AM","Wednesday":"5:30 PM-12 AM","Thursday":"5:30 PM-1 AM","Friday":"5:30 PM-1 AM","Saturday":"5:30 PM-12 AM"},
    mapsPlaceId: "ChIJzYSEAwCvST4RT3PfAEP-vII",
    lat: 26.2203931,
    lng: 50.544374499999996,
    dataSource: "google-maps",
  },

  "buzz-burger": {
    googleName: "Buzz Burger",
    cuisine: "Burger",
    address: "Building 605, Road 1311 Riffa",
    shortAddress: "",
    phone: "+973 3459 9899",
    rating: 4.4,
    reviews: 18,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 5 PM Mon",
    openingHours: {"Sunday":"Closed","Monday":"5 PM-1 AM","Tuesday":"5 PM-1 AM","Wednesday":"5 PM-1 AM","Thursday":"5 PM-1 AM","Friday":"5 PM-1 AM","Saturday":"5 PM-1 AM"},
    mapsPlaceId: "ChIJXV2sm5CtST4Rnztf3SXp7oU",
    lat: 26.1325976,
    lng: 50.5563608,
    dataSource: "google-maps",
  },

  "backyard-burger": {
    googleName: "Backyard burger",
    cuisine: "Burger",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 1369 0011",
    website: "https://backyardbrgr.com",
    categories: ["American restaurant"],
    openNow: "Closed · Opens 12:10 PM Mon",
    openingHours: {"Sunday":"12:10-8:25 PM","Monday":"12:10-8 PM","Tuesday":"12:10-8 PM","Wednesday":"12:10-9:19 PM","Thursday":"12:10 PM-12 AM","Friday":"4:10 PM-12:45 AM","Saturday":"1:10-8 PM"},
    mapsPlaceId: "ChIJxd1NAgCtST4R_XWnZ8TN-kE",
    lat: 26.132222199999998,
    lng: 50.5783889,
    dataSource: "google-maps",
  },

  "burger77": {
    googleName: "BURGER 77",
    cuisine: "Burger",
    address: "Manama",
    shortAddress: "Manama",
    area: "Karzakkan",
    phone: "+973 3922 9661",
    categories: ["American restaurant"],
    mapsPlaceId: "ChIJmxDeOgCzST4RXPsNwecuh7g",
    lat: 26.110317,
    lng: 50.4819281,
    dataSource: "google-maps",
  },

  "honest-burger": {
    googleName: "Honest Burger",
    cuisine: "Burger",
    address: "Budaiya",
    shortAddress: "Budaiya",
    phone: "+973 1720 0033",
    categories: ["Restaurant"],
    openingHours: {"Sunday":"12 PM-12 AM","Monday":"12 PM-12 AM","Tuesday":"12 PM-12 AM","Wednesday":"12 PM-12 AM","Thursday":"12 PM-1 AM","Friday":"12 PM-1 AM","Saturday":"12 PM-12 AM"},
    mapsPlaceId: "ChIJF-DnA7a7ST4RdbNuaFVgvvk",
    lat: 26.2198913,
    lng: 50.4923542,
    dataSource: "google-maps",
  },

  "lahom": {
    googleName: "Lahom.bh",
    cuisine: "Burger",
    address: "Building 2108, Maqabah",
    shortAddress: "Maqabah",
    area: "Maqabah",
    phone: "+973 3350 8338",
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    mapsPlaceId: "ChIJb7JYFACxST4RFj1JtN5xnQ8",
    lat: 26.203597199999997,
    lng: 50.496645199999996,
    dataSource: "google-maps",
  },

  "engineer-burger": {
    googleName: "Engineer Burger",
    cuisine: "Burger",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1361 1008",
    rating: 4.8,
    reviews: 47,
    categories: ["Hamburger restaurant"],
    openingHours: {"Sunday":"7:30 PM-12 AM","Monday":"7:30 PM-12 AM","Tuesday":"7:30 PM-12 AM","Wednesday":"7:30 PM-12 AM","Thursday":"7:30 PM-12 AM","Friday":"7:30 PM-12 AM","Saturday":"7:30 PM-12 AM"},
    mapsPlaceId: "ChIJZV2l7smlST4Rh42r5F0a6Lg",
    lat: 26.21302,
    lng: 50.563747299999996,
    dataSource: "google-maps",
  },

  "cut-burger": {
    googleName: "Cut burger",
    cuisine: "Burger",
    address: "Road 3375 Malkiya",
    shortAddress: "",
    phone: "+973 3841 1880",
    website: "https://cut_burger.invopos.shop",
    categories: ["Hamburger restaurant"],
    mapsPlaceId: "ChIJoxwcnbqzST4RWzd99kYFuqw",
    lat: 26.0931544,
    lng: 50.4857817,
    dataSource: "google-maps",
  },

  "fat-whale": {
    googleName: "Fat Whale Foods \\u0026 Drinks",
    nameAr: "الحوت المتين للبرجر",
    cuisine: "Burger",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 3661 1506",
    rating: 4.1,
    reviews: 55,
    categories: ["Restaurant"],
    openNow: "Open · Closes 2 AM",
    mapsPlaceId: "ChIJwcBDaQStST4RNDMp6yafe-s",
    lat: 26.129166899999998,
    lng: 50.572756,
    dataSource: "google-maps",
  },

  "grannys-burger": {
    googleName: "Granny's Burger Riffa Branch",
    cuisine: "Burger",
    address: "Road 2, Block 904, Building 34, Riffa",
    shortAddress: "Riffa",
    phone: "+973 3303 0231",
    rating: 3.9,
    reviews: 36,
    categories: ["Hamburger restaurant"],
    openingHours: {"Sunday":"5 PM-12 AM","Monday":"5 PM-12 AM","Tuesday":"5 PM-12 AM","Wednesday":"5 PM-12 AM","Thursday":"5 PM-1 AM","Friday":"5 PM-1 AM","Saturday":"5 PM-12 AM"},
    mapsPlaceId: "ChIJezRN5I2tST4RaS-klKJTH8w",
    lat: 26.131781999999998,
    lng: 50.540796199999996,
    dataSource: "google-maps",
  },

  "doctor-food": {
    googleName: "Doctor Food",
    nameAr: "دكتور فود",
    cuisine: "Burger",
    address: "631 Road No 3821, Riffa",
    shortAddress: "631 Road No 3821, Riffa",
    phone: "+973 7799 8820",
    rating: 4.6,
    reviews: 104,
    categories: ["Hamburger restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"4 PM-1 AM","Monday":"4 PM-1 AM","Tuesday":"4 PM-1 AM","Wednesday":"4 PM-1 AM","Thursday":"4 PM-2 AM","Friday":"4 PM-2 AM","Saturday":"4 PM-1 AM"},
    mapsPlaceId: "ChIJhXtqKDCvST4RGaVJemkfBsc",
    lat: 26.135607099999998,
    lng: 50.5553464,
    dataSource: "google-maps",
  },

  "sammonah-sandwich": {
    googleName: "Sammonah Sandwiches - سندويشات صمونة",
    nameAr: "سندويشات صمونة",
    cuisine: "Sandwiches",
    address: "Rd No 3503, Isa Town",
    shortAddress: "Isa Town",
    area: "Alhajiyat",
    phone: "+973 7790 8886",
    rating: 4.8,
    reviews: 1038,
    categories: ["Sandwich shop"],
    openingHours: {"Saturday":"6 AM-1 AM","Sunday":"6 AM-1 AM","Monday":"6 AM-1 AM","Tuesday":"6 AM-1 AM","Wednesday":"6 AM-1 AM","Thursday":"6 AM-1 AM","Friday":"6 AM-1 AM"},
    mapsPlaceId: "ChIJJ4yQIcetST4Rmg5ctiQHQjg",
    lat: 26.133521899999998,
    lng: 50.5742299,
    dataSource: "google-maps",
  },

  "jan-burger": {
    googleName: "Jan Burger",
    nameAr: "جان برجر",
    cuisine: "Burger",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1771 2554",
    website: "https://linkkoo.web.app",
    categories: ["Hamburger restaurant"],
    mapsPlaceId: "ChIJ31DLUjGvST4Rjf8EUNtnLdI",
    lat: 26.215173699999998,
    lng: 50.5906556,
    dataSource: "google-maps",
  },

  "al-mihwar": {
    googleName: "Al Mihwar Restaurant",
    cuisine: "Burger",
    address: "Bilad Al Qadeem",
    shortAddress: "Bilad Al Qadeem",
    phone: "+973 1741 4384",
    rating: 4.5,
    reviews: 339,
    categories: ["Hamburger restaurant"],
    openNow: "Open · Closes 2:45 AM",
    openingHours: {"Sunday":"5 PM-2:45 AM","Monday":"5 PM-2:45 AM","Tuesday":"5 PM-2:45 AM","Wednesday":"5 PM-2:45 AM","Thursday":"5 PM-2:45 AM","Friday":"5 PM-2:45 AM","Saturday":"5 PM-2:45 AM"},
    mapsPlaceId: "ChIJPx9ueKCvST4RKBRzYPxJCYU",
    lat: 26.206467,
    lng: 50.5549751,
    dataSource: "google-maps",
  },

  "slider": {
    googleName: "Sliders Amwaj",
    nameAr: "شارع 59",
    cuisine: "Burger",
    address: "Tubli",
    shortAddress: "Tubli",
    phone: "+973 6676 7003",
    rating: 4.7,
    reviews: 1004,
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"4 PM-1 AM","Monday":"4 PM-1 AM","Tuesday":"4 PM-1 AM","Wednesday":"4 PM-1 AM","Thursday":"4 PM-2 AM","Friday":"4 PM-2 AM","Saturday":"4 PM-1 AM"},
    mapsPlaceId: "ChIJGWAEKiKnST4RdqwJaLOdkso",
    lat: 26.2787154,
    lng: 50.663987,
    dataSource: "google-maps",
  },

  "plan-b": {
    googleName: "Plan B Restaurant",
    cuisine: "Burger",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 3336 9113",
    rating: 4.5,
    reviews: 246,
    categories: ["Hamburger restaurant"],
    openNow: "Open · Closes 1 AM",
    mapsPlaceId: "ChIJpQRxOG6tST4RspHPk6s-y8I",
    lat: 26.1311826,
    lng: 50.5585623,
    dataSource: "google-maps",
  },

  "viola-burger": {
    googleName: "فيولا برقر | viola burger | فيولا برجر البديع جنويان قاردن بلازا",
    nameAr: "فيولا برجر",
    cuisine: "Burger",
    address: "Budaiya, Dar Kulaib, Muharraq and Malkiya",
    shortAddress: "Budaiya, Dar Kulaib",
    phone: "+973 1771 0020",
    rating: 4.2,
    reviews: 386,
    categories: ["Restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"7 AM-2 AM","Monday":"7 AM-2 AM","Tuesday":"7 AM-2 AM","Wednesday":"7 AM-2 AM","Thursday":"7 AM-2 AM","Friday":"7 AM-2 AM","Saturday":"7 AM-2 AM"},
    mapsPlaceId: "ChIJ9-JnENa7ST4R1EB2OhS6aLs",
    lat: 26.221312899999997,
    lng: 50.5027439,
    dataSource: "google-maps",
  },

  "three-guys": {
    googleName: "Three Guys Burger",
    nameAr: "مطعم ثري قايز",
    cuisine: "Burger",
    address: "B803, Road 77, Jurdab",
    shortAddress: "Jurdab",
    phone: "+973 1776 0256",
    rating: 4.2,
    reviews: 1062,
    categories: ["Hamburger restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"12 PM-2 AM","Monday":"12 PM-2 AM","Tuesday":"12 PM-2 AM","Wednesday":"12 PM-2 AM","Thursday":"12 PM-2 AM","Friday":"12 PM-2 AM","Saturday":"12 PM-2 AM"},
    mapsPlaceId: "ChIJDcvQWZeuST4RCvD5CO9ffTY",
    lat: 26.1643471,
    lng: 50.5708718,
    dataSource: "google-maps",
  },

  "hashtag": {
    googleName: "Hashtag Burger",
    nameAr: "هاش تاق برجر",
    cuisine: "Burger",
    address: "Muscat Ave, Isa Town",
    shortAddress: "Muscat Ave, Isa Town",
    area: "Isa Town",
    phone: "+973 1700 2060",
    rating: 4.2,
    reviews: 1109,
    categories: ["Hamburger restaurant","Restaurant","Tourist attraction"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"12 PM-1 AM","Monday":"12 PM-1 AM","Tuesday":"12 PM-1 AM","Wednesday":"12 PM-1 AM","Thursday":"12 PM-1 AM","Friday":"12 PM-1 AM","Saturday":"12 PM-1 AM"},
    mapsPlaceId: "ChIJQW_6HlyuST4Re07Rb6H16FU",
    lat: 26.169106799999998,
    lng: 50.540137099999995,
    dataSource: "google-maps",
  },

  "three-lines": {
    googleName: "3 Lines Restaurant Busaiteen",
    cuisine: "Pasta",
    address: "Zinj",
    shortAddress: "Zinj",
    phone: "+973 1777 7769",
    rating: 3.5,
    reviews: 206,
    categories: ["Restaurant","Fast food restaurant"],
    openingHours: {"Sunday":"Open 24 hours","Monday":"Open 24 hours","Tuesday":"Open 24 hours","Wednesday":"Open 24 hours","Thursday":"Open 24 hours","Friday":"Open 24 hours","Saturday":"Open 24 hours"},
    mapsPlaceId: "ChIJ-V0brXGmST4R7BZ_NdF4VNU",
    lat: 26.271567599999997,
    lng: 50.604741999999995,
    dataSource: "google-maps",
  },

  "villa-rosa": {
    googleName: "Villa Rosa Pizzeria \\u0026 Restaurant",
    nameAr: "مطعم وبيزا فلا روزا",
    cuisine: "Italian",
    address: "Isa Town",
    shortAddress: "Isa Town",
    phone: "+973 1730 0141",
    rating: 4.4,
    reviews: 339,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 8 AM",
    mapsPlaceId: "ChIJBz_Sk1uuST4RI0ihE_RazBU",
    lat: 26.172480999999998,
    lng: 50.548199,
    dataSource: "google-maps",
  },

  "cheesy-burger": {
    googleName: "Cheesy Burger, Maqabah",
    cuisine: "Burger",
    address: "Maqabah Bahrain",
    shortAddress: "Maqabah Bahrain",
    area: "Maqabah",
    openNow: "Open · Closes 4 AM",
    openingHours: {"Sunday":"12 PM-4 AM","Monday":"12 PM-4 AM","Tuesday":"12 PM-4 AM","Wednesday":"12 PM-4 AM","Thursday":"12 PM-4 AM","Friday":"12 PM-4 AM","Saturday":"12 PM-4 AM"},
    mapsPlaceId: "0x3e49bba9db098557:0x5d4fbb0bb41ba22f",
    lat: 26.2179739,
    lng: 50.4859139,
    dataSource: "google-maps",
  },

  "janahi-burger": {
    googleName: "Janahi Burger",
    nameAr: "جناحي برجر",
    cuisine: "Burger",
    address: "16th December Ave, Riffa",
    shortAddress: "16th December Ave, Riffa",
    phone: "+973 3660 0686",
    rating: 4.5,
    reviews: 103,
    categories: ["American restaurant"],
    openingHours: {"Sunday":"7:30 PM-12 AM","Monday":"7:30 PM-12 AM","Tuesday":"7:30 PM-12 AM","Wednesday":"7:30 PM-12 AM","Thursday":"7:30 PM-1 AM","Friday":"7:30 PM-1 AM","Saturday":"Closed"},
    mapsPlaceId: "ChIJAeBddkyvST4RucK2Th2Qf_A",
    lat: 26.156629499999998,
    lng: 50.5458384,
    dataSource: "google-maps",
  },

  "blaze-burger": {
    googleName: "Blaze Burgers",
    cuisine: "Burger",
    address: "Building 385, Road 7113 Shop 19 Aljanabiya",
    shortAddress: "",
    phone: "+973 3984 4773",
    rating: 4.2,
    reviews: 358,
    categories: ["Hamburger restaurant","American restaurant","Diner"],
    mapsPlaceId: "ChIJF3N1fwuxST4RXC9i7iVTJ_E",
    lat: 26.190403999999997,
    lng: 50.466467599999994,
    dataSource: "google-maps",
  },

  "adam-subs": {
    googleName: "Adam Subs آدم سابز",
    cuisine: "Sandwiches",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1726 0998",
    rating: 4.2,
    reviews: 341,
    categories: ["Fast food restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"10 AM-2 AM","Saturday":"10 AM-2 AM"},
    mapsPlaceId: "ChIJedsui5-vST4REjQVFrcRcIU",
    lat: 26.2081894,
    lng: 50.5534883,
    dataSource: "google-maps",
  },

  "sahburger": {
    googleName: "Sah burger sanad",
    cuisine: "Burger",
    address: "Juffair",
    shortAddress: "Juffair",
    phone: "+973 1722 7877",
    rating: 3.3,
    reviews: 3,
    categories: ["Restaurant"],
    mapsPlaceId: "ChIJ5eL2PhWtST4RAYUIE5GWJf8",
    lat: 26.1436928,
    lng: 50.5793296,
    dataSource: "google-maps",
  },

  "lost-burger": {
    googleName: "Lost Burger",
    cuisine: "Burger",
    address: "Road:1211 Block:912 Building:464",
    shortAddress: "",
    phone: "+973 3911 9913",
    rating: 3.8,
    reviews: 44,
    categories: ["Hamburger restaurant"],
    openingHours: {"Sunday":"7 PM-12 AM","Monday":"7 PM-12 AM","Tuesday":"7 PM-12 AM","Wednesday":"7 PM-12 AM","Thursday":"7 PM-1 AM","Friday":"7 PM-1 AM","Saturday":"7 PM-12 AM"},
    mapsPlaceId: "ChIJ_UiVqE2tST4R4enWHYM8vE8",
    lat: 26.1312785,
    lng: 50.542603899999996,
    dataSource: "google-maps",
  },

  "neon-burger": {
    googleName: "Neon Burger",
    nameAr: "نيون برجر",
    cuisine: "Burger",
    address: "Road 3306 Block 933 Building A172, Riffa",
    shortAddress: "Riffa",
    area: "Manama",
    phone: "+973 1761 1117",
    rating: 4.3,
    reviews: 698,
    categories: ["Hamburger restaurant"],
    openNow: "Open · Closes 4 AM",
    openingHours: {"Saturday":"12:30 PM-4 AM","Sunday":"12:30 PM-4 AM","Monday":"12:30 PM-4 AM","Tuesday":"12:30 PM-4 AM","Wednesday":"12:30 PM-4 AM","Thursday":"12:30 PM-4 AM","Friday":"12:30 PM-4 AM"},
    mapsPlaceId: "ChIJYVdBbYqtST4R7WywU4-F-u8",
    lat: 26.137599299999998,
    lng: 50.5699943,
    dataSource: "google-maps",
  },

  "burger-square": {
    googleName: "برجر سكوير || BURGER SQUARE",
    nameAr: "برجر سكوير || BURGER SQUARE",
    cuisine: "Burger",
    address: "Al Sayh",
    shortAddress: "Al Sayh",
    phone: "+973 3377 2700",
    rating: 4.5,
    reviews: 130,
    categories: ["Hamburger restaurant","Cheesesteak restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"6:30 PM-1 AM","Monday":"6:30 PM-1 AM","Tuesday":"6:30 PM-1 AM","Wednesday":"6:30 PM-1 AM","Thursday":"6:30 PM-1 AM","Friday":"6:30 PM-1 AM","Saturday":"6:30 PM-1 AM"},
    mapsPlaceId: "ChIJ3TCQTQClST4RlxYDFLCurjg",
    lat: 26.2791534,
    lng: 50.595833999999996,
    dataSource: "google-maps",
  },

  "chubbys-burger": {
    googleName: "Chubby’s Burger",
    cuisine: "Burger",
    address: "Al Sayh",
    shortAddress: "Al Sayh",
    phone: "+973 3612 3040",
    rating: 3.9,
    reviews: 115,
    categories: ["Hamburger restaurant"],
    openingHours: {"Sunday":"6:30 PM-12 AM","Monday":"6:30 PM-12 AM","Tuesday":"6:30 PM-12 AM","Wednesday":"6:30 PM-12 AM","Thursday":"7 PM-1 AM","Friday":"7 PM-1 AM","Saturday":"6:30 PM-12 AM"},
    mapsPlaceId: "ChIJmeld9P6lST4RUfJovVdGQfo",
    lat: 26.272837199999998,
    lng: 50.593973,
    dataSource: "google-maps",
  },

  "challenger": {
    googleName: "CHALLENGER RESTAURANT",
    nameAr: "تشالنجر",
    cuisine: "Burger",
    address: "Ain Abdan Rd, Sitra",
    shortAddress: "Ain Abdan Rd, Sitra",
    phone: "+973 6699 1010",
    rating: 4.5,
    reviews: 94,
    categories: ["Fast food restaurant"],
    openNow: "Open · Closes 3 AM",
    openingHours: {"Sunday":"2 PM-3 AM","Monday":"2 PM-3 AM","Tuesday":"2 PM-3 AM","Wednesday":"2 PM-3 AM","Thursday":"2 PM-3 AM","Friday":"5 PM-3 AM","Saturday":"2 PM-3 AM"},
    mapsPlaceId: "ChIJ1XBjKsqrST4RRWNgpmQf8z8",
    lat: 26.163290699999997,
    lng: 50.6146695,
    dataSource: "google-maps",
  },

  "daveburger": {
    googleName: "Dave burger",
    cuisine: "Burger",
    address: "Manama",
    shortAddress: "Manama",
    categories: ["Fast food restaurant"],
    openNow: "Closed · Opens 7 PM Mon",
    mapsPlaceId: "ChIJ8_T-z9CzST4Rs7Rx-PcKmTY",
    lat: 26.0926908,
    lng: 50.4882667,
    dataSource: "google-maps",
  },

  "cluckys": {
    googleName: "Cluckys",
    cuisine: "Fried Chicken",
    address: "Galaly",
    shortAddress: "Galaly",
    rating: 3.3,
    reviews: 34,
    categories: ["Chicken restaurant"],
    openNow: "Closed · Opens 12 PM",
    openingHours: {"Sunday":"12 PM-12 AM","Monday":"12 PM-12 AM","Tuesday":"12 PM-12 AM","Wednesday":"12 PM-12 AM","Thursday":"12 PM-12 AM","Friday":"12 PM-12 AM","Saturday":"12 PM-12 AM"},
    mapsPlaceId: "ChIJA-PZOgCnST4RN5Mw6da6hUs",
    lat: 26.2766627,
    lng: 50.657226099999995,
    dataSource: "google-maps",
  },

  "baby-chicken": {
    googleName: "Baby Chicken Restaurant",
    cuisine: "Fried Chicken",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 7729 2929",
    rating: 3.8,
    reviews: 44,
    categories: ["Restaurant"],
    openingHours: {"Sunday":"12 PM-12 AM","Monday":"12 PM-12 AM","Tuesday":"12 PM-12 AM","Wednesday":"12 PM-12 AM","Thursday":"12 PM-12 AM","Friday":"12 PM-12 AM","Saturday":"12 PM-12 AM"},
    mapsPlaceId: "ChIJa10VxtytST4R3oGbxcmjPUA",
    lat: 26.129524099999998,
    lng: 50.5546958,
    dataSource: "google-maps",
  },

  "fry-and-fries": {
    googleName: "Fry And Fries Cafe Busaiteen",
    cuisine: "Fried Chicken",
    address: "Alsaya, Busaiteen",
    shortAddress: "Alsaya, Busaiteen",
    phone: "+973 3714 0022",
    rating: 4.1,
    reviews: 223,
    categories: ["Food court","American restaurant"],
    openNow: "Open · Closes 1:30 AM",
    openingHours: {"Sunday":"4 PM-1:30 AM","Monday":"4 PM-1:30 AM","Tuesday":"4 PM-1:30 AM","Wednesday":"4 PM-1:30 AM","Thursday":"4 PM-1:30 AM","Friday":"4 PM-1:30 AM","Saturday":"4 PM-1:30 AM"},
    mapsPlaceId: "ChIJdfu5umK7ST4RRbYiml79CiY",
    lat: 26.2678369,
    lng: 50.5939319,
    dataSource: "google-maps",
  },

  "wingman": {
    googleName: "Wingman",
    cuisine: "Fried Chicken",
    address: "Budaiya",
    shortAddress: "Budaiya",
    phone: "+973 1749 4940 / +973 1749 4941 / +973 1749 4942 / +973 1749 4943",
    rating: 3.8,
    reviews: 276,
    categories: ["Restaurant"],
    mapsPlaceId: "ChIJ98PhBCa7ST4RRy2zxEjaR18",
    lat: 26.2213516,
    lng: 50.5027275,
    dataSource: "google-maps",
  },

  "wing-station": {
    googleName: "wingstation_bh",
    cuisine: "Fried Chicken",
    address: "Al Sayh",
    shortAddress: "Al Sayh",
    phone: "+973 1700 3023",
    rating: 4.1,
    reviews: 87,
    categories: ["Restaurant"],
    openNow: "Open · Closes 1:30 AM",
    mapsPlaceId: "ChIJyYOtmUOlST4Rrmb0Jewp23w",
    lat: 26.2794307,
    lng: 50.5960028,
    dataSource: "google-maps",
  },

  "flap-fried-chicken": {
    googleName: "Flap Fried Chicken",
    nameAr: "فلاب فرايد جكن",
    cuisine: "Fried Chicken",
    address: "Rd No 4616, Nuwaidrat, Riffa",
    shortAddress: "Nuwaidrat, Riffa",
    phone: "+973 1700 1212",
    rating: 4.1,
    reviews: 189,
    website: "https://flapbh.com",
    categories: ["American restaurant"],
    mapsPlaceId: "ChIJi-Vp_XWtST4REcP2qk3RCyw",
    lat: 26.1284375,
    lng: 50.5896875,
    dataSource: "google-maps",
  },

  "night-bird": {
    googleName: "Night Bird",
    cuisine: "Fried Chicken",
    address: "District 1 - Janabiyah Al Janabiyah",
    shortAddress: "",
    phone: "+973 1733 5555",
    rating: 3.9,
    reviews: 136,
    categories: ["Chicken restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"12 PM-2 AM","Monday":"12 PM-2 AM","Tuesday":"12 PM-2 AM","Wednesday":"12 PM-2 AM","Thursday":"12 PM-2 AM","Friday":"12 PM-2 AM","Saturday":"12 PM-2 AM"},
    mapsPlaceId: "ChIJRRdv292xST4R7c_pXpVSrn4",
    lat: 26.1719825,
    lng: 50.4810142,
    dataSource: "google-maps",
  },

  "popeyes": {
    googleName: "Popeyes",
    cuisine: "Fried Chicken",
    address: "Riffa",
    shortAddress: "Riffa",
    rating: 4.5,
    reviews: 186,
    categories: ["Fast food restaurant"],
    openNow: "Open · Closes 1 AM",
    mapsPlaceId: "ChIJJwdMSwCtST4RQR8AVvPCIXg",
    lat: 26.1356528,
    lng: 50.5278856,
    dataSource: "google-maps",
  },

  "monkey-lala": {
    googleName: "Monkey Lala Riffa",
    cuisine: "Fried Chicken",
    address: "Riffa",
    shortAddress: "Riffa",
    phone: "+973 6634 4912",
    rating: 4.2,
    reviews: 27,
    categories: ["Restaurant"],
    openNow: "Open · Closes 2:30 AM",
    openingHours: {"Sunday":"6 PM-2:30 AM","Monday":"6 PM-2:30 AM","Tuesday":"6 PM-2:30 AM","Wednesday":"6 PM-2:30 AM","Thursday":"6 PM-3:30 AM","Friday":"6 PM-3:30 AM","Saturday":"6 PM-2:30 AM"},
    mapsPlaceId: "ChIJtRCh7mOtST4RDH6r4R4tOHA",
    lat: 26.1356242,
    lng: 50.555302399999995,
    dataSource: "google-maps",
  },

  "stack": {
    googleName: "Stack Eatery",
    cuisine: "Burger",
    address: "Street 14, Riffa",
    shortAddress: "Street 14, Riffa",
    phone: "+973 3811 1415",
    rating: 4.5,
    reviews: 59,
    categories: ["Restaurant"],
    openingHours: {"Sunday":"1 PM-12 AM","Monday":"1 PM-12 AM","Tuesday":"1 PM-12 AM","Wednesday":"1 PM-12 AM","Thursday":"1 PM-1 AM","Friday":"1 PM-1 AM","Saturday":"1 PM-12 AM"},
    mapsPlaceId: "ChIJvyr4VkCtST4Rs9UDieSGqIU",
    lat: 26.1346422,
    lng: 50.550624299999996,
    dataSource: "google-maps",
  },

  "gate-12": {
    googleName: "Gate 12 Restaurant",
    cuisine: "Pizza",
    address: "Zayed Town",
    shortAddress: "Zayed Town",
    phone: "+973 1369 8887",
    rating: 4.6,
    reviews: 93,
    categories: ["Restaurant"],
    mapsPlaceId: "ChIJpcU9yfCvST4RM_OVazD5P6s",
    lat: 26.1691047,
    lng: 50.5399684,
    dataSource: "google-maps",
  },

  "mama-joz": {
    googleName: "Mama Joz Pizza || Riffa - Bahrain",
    cuisine: "Pizza",
    phone: "+973 1761 6163 / +973 1311 6166 / +973 1761 6164 / +973 1311 6165",
    rating: 4.6,
    reviews: 753,
    categories: ["Pizza restaurant","Fast food restaurant","Pizza delivery","Pizza takeaway"],
    openNow: "Open · Closes 12:30 AM",
    openingHours: {"Monday":"10:30 AM-12:30 AM","Tuesday":"10:30 AM-12:30 AM","Wednesday":"10:30 AM-12:30 AM","Thursday":"10:30 AM-12:30 AM","Friday":"10:30 AM-12:30 AM","Saturday":"10:30 AM-12:30 AM","Sunday":"10:30 AM-12:30 AM"},
    mapsPlaceId: "ChIJLyn_Bz-sST4R240Pk3c5890",
    lat: 26.1370586,
    lng: 50.5731441,
    dataSource: "google-maps",
  },

  "little-caesars": {
    googleName: "Little Caesars Pizza",
    nameAr: "بيتزا ليتل سيزرز",
    cuisine: "Pizza",
    address: "Zaid Bin Omera Hwy, Malkiya",
    shortAddress: "Zaid Bin Omera Hwy, Malkiya",
    phone: "+973 1330 0022 / +973 1733 0022",
    rating: 4.7,
    reviews: 112,
    website: "https://littlecaesarsbahrain.com",
    categories: ["Restaurant"],
    openNow: "Open · Closes 2:30 AM",
    mapsPlaceId: "ChIJFdu1YnOzST4RI9q8xdoKh8c",
    lat: 26.093075499999998,
    lng: 50.4882826,
    dataSource: "google-maps",
  },

  "pizzaro": {
    googleName: "PIZZARO",
    cuisine: "Pizza",
    address: "Zayed Town",
    shortAddress: "Zayed Town",
    phone: "+973 1616 7527",
    website: "https://talabat.com",
    categories: ["Italian restaurant"],
    openingHours: {"Sunday":"12-11:59 PM","Monday":"12-11:59 PM","Tuesday":"12-11:59 PM","Wednesday":"12-11:59 PM","Thursday":"12-11:59 PM","Friday":"12-11:59 PM","Saturday":"12-11:59 PM"},
    mapsPlaceId: "ChIJ3wZgFwCvST4RXvntpnuqVhg",
    lat: 26.1670165,
    lng: 50.5423058,
    dataSource: "google-maps",
  },

  "ic-pizza": {
    googleName: "IC Pizza",
    cuisine: "Pizza",
    phone: "+973 3360 7710",
    rating: 4.4,
    reviews: 217,
    categories: ["Pizza takeaway","Takeout restaurant"],
    openingHours: {"Sunday":"3 PM-12 AM","Monday":"3 PM-12 AM","Tuesday":"3 PM-12 AM","Wednesday":"3 PM-12 AM","Thursday":"4:30 PM-1:30 AM","Friday":"4:30 PM-1:30 AM","Saturday":"3 PM-12 AM"},
    mapsPlaceId: "ChIJTZnvpTCpST4RwQN8F_v0BNs",
    lat: 26.257806199999997,
    lng: 50.665850999999996,
    dataSource: "google-maps",
  },

  "the72": {
    googleName: "The72",
    cuisine: "Burger",
    phone: "+973 1768 1255 / +973 1766 1755",
    rating: 4.6,
    reviews: 43,
    categories: ["Restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"1 PM-2 AM","Monday":"1 PM-2 AM","Tuesday":"1 PM-2 AM","Wednesday":"1 PM-2 AM","Thursday":"1 PM-2 AM","Friday":"1 PM-2 AM","Saturday":"1 PM-2 AM"},
    mapsPlaceId: "ChIJZUh1FQCtST4RWxR6qLv7OQg",
    lat: 26.1479511,
    lng: 50.5843625,
    dataSource: "google-maps",
  },

  "welayat-ali": {
    googleName: "Welayat Ali Grills",
    nameAr: "مطعم و مشويات ولاية علي ( جد حفص )",
    cuisine: "Grill",
    address: "Avenue 14, Jidhafs",
    shortAddress: "Avenue 14, Jidhafs",
    phone: "+973 1740 6070",
    rating: 4.2,
    reviews: 2775,
    categories: ["Barbecue restaurant"],
    openNow: "Open · Closes 1:30 AM",
    openingHours: {"Sunday":"5:30 PM-1:30 AM","Monday":"5:30 PM-1:30 AM","Tuesday":"5:30 PM-1:30 AM","Wednesday":"5:30 PM-1:30 AM","Thursday":"5:30 PM-1:30 AM","Friday":"5:30 PM-1:30 AM","Saturday":"5:30 PM-1:30 AM"},
    mapsPlaceId: "ChIJX5mI2ZGvST4RTnG2Ie19fug",
    lat: 26.2121994,
    lng: 50.5427058,
    dataSource: "google-maps",
  },

  "al-furat-nights": {
    googleName: "ليالي الفرات - Al Furat Nights Restaurant \\u0026 Grills",
    nameAr: "ليالي الفرات - Al Furat Nights Restaurant \\u0026 Grills",
    cuisine: "Grill",
    phone: "+973 1747 4730 / +973 3437 8232",
    rating: 4.4,
    reviews: 479,
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Monday":"6 PM-1 AM","Tuesday":"6 PM-1 AM","Wednesday":"6 PM-1 AM","Thursday":"6 PM-1 AM","Friday":"6 PM-1 AM","Saturday":"6 PM-1 AM","Sunday":"6 PM-1 AM"},
    mapsPlaceId: "ChIJzWCOrsepST4RK6Vs0M6Hars",
    lat: 26.1704392,
    lng: 50.611770799999995,
    dataSource: "google-maps",
  },

  "al-farhan": {
    googleName: "Al Farhan Turkish Grills",
    nameAr: "مشويات ومعجنات الفرحان",
    cuisine: "Grill",
    address: "Malikiyah Ave, Malkiya",
    shortAddress: "Malikiyah Ave, Malkiya",
    phone: "+973 1763 2459 / +973 1763 2069 / +973 3366 9775",
    rating: 4.2,
    reviews: 553,
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"12 PM-1 AM","Monday":"12 PM-1 AM","Tuesday":"12 PM-1 AM","Wednesday":"12 PM-1 AM","Thursday":"12 PM-1 AM","Friday":"12 PM-1 AM","Saturday":"12 PM-1 AM"},
    mapsPlaceId: "ChIJ18xzX0KyST4RLTqdsWn3waQ",
    lat: 26.0983813,
    lng: 50.485589,
    dataSource: "google-maps",
  },

  "swaikhat": {
    googleName: "Swaikhat || صويخات",
    nameAr: "مطعم صويخات",
    cuisine: "Grill",
    address: "Building 3, Block 579, Road 7901, Janabiyah",
    shortAddress: "Janabiyah",
    phone: "+973 1700 9900",
    rating: 4.1,
    reviews: 333,
    categories: ["Restaurant"],
    openNow: "Open · Closes 2 AM",
    openingHours: {"Sunday":"6 PM-2 AM","Monday":"6 PM-2 AM","Tuesday":"6 PM-2 AM","Wednesday":"6 PM-2 AM","Thursday":"6 PM-2 AM","Friday":"6 PM-2 AM","Saturday":"6 PM-2 AM"},
    mapsPlaceId: "ChIJ-U3QiW6xST4Ru-Ke9M7B-_A",
    lat: 26.1717871,
    lng: 50.4808386,
    dataSource: "google-maps",
  },

  "tikka-numee": {
    googleName: "Tikka Numee",
    nameAr: "تكة نومي",
    cuisine: "Grill",
    address: "District 1 Mall Aljanabiyah Al janabiyah",
    shortAddress: "",
    phone: "+973 1710 1110",
    website: "https://linktr.ee",
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"6 PM-1 AM","Monday":"6 PM-1 AM","Tuesday":"6 PM-1 AM","Wednesday":"6 PM-1 AM","Thursday":"6 PM-1:30 AM","Friday":"6 PM-1:30 AM","Saturday":"6 PM-1 AM"},
    mapsPlaceId: "ChIJs4nB9cOxST4R32mlRzKnJao",
    lat: 26.1718855,
    lng: 50.4810764,
    dataSource: "google-maps",
  },

  "aljabriya": {
    googleName: "Al Jabriya Turkish Restaurant",
    nameAr: "مطعم الجابرية",
    cuisine: "Grill",
    phone: "+973 1733 0108 / +973 3344 1886 / +973 1760 0033",
    rating: 4.2,
    reviews: 1075,
    categories: ["Turkish restaurant"],
    openNow: "Closed · Opens 11 AM",
    openingHours: {"Monday":"11 AM-12 AM","Tuesday":"11 AM-12 AM","Wednesday":"11 AM-12:30 AM","Thursday":"11 AM-12:30 AM","Friday":"11 AM-12:30 AM","Saturday":"11 AM-12:30 AM","Sunday":"11 AM-12 AM"},
    mapsPlaceId: "ChIJI7mTMG6mST4R8RaEReqQNfw",
    lat: 26.2721318,
    lng: 50.6076469,
    dataSource: "google-maps",
  },

  "lumee": {
    googleName: "Lumee Street - The Avenues Mall Bahrain",
    nameAr: "لومي",
    cuisine: "Grill",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 1748 4555",
    rating: 4.2,
    reviews: 3776,
    categories: ["Restaurant"],
    openNow: "Closed · Opens 8:30 AM",
    openingHours: {"Monday":"8:30 AM-11:30 PM","Tuesday":"8:30 AM-11:30 PM","Wednesday":"8:30 AM-11:30 PM","Thursday":"8:30 AM-11:45 PM","Friday":"8:30 AM-11:45 PM","Saturday":"8:30 AM-11:45 PM","Sunday":"8:30 AM-11:30 PM"},
    mapsPlaceId: "ChIJbyMYQmylST4RLltiOII2Jrk",
    lat: 26.2461272,
    lng: 50.5851628,
    dataSource: "google-maps",
  },

  "title": {
    googleName: "Title - The Avenues Bahrain",
    cuisine: "Italian",
    address: "Avenues Mall Phase 2, Area Manama Sea front Block 346, Road 4660, Building 3977 Shop 1326, Manama",
    shortAddress: "Avenues Mall Phase 2, Manama",
    phone: "+973 3615 0555",
    website: "https://titlekw.com",
    categories: ["Restaurant"],
    openNow: "Closed · Opens 12 PM",
    openingHours: {"Monday":"12-11 PM","Tuesday":"12-11 PM","Wednesday":"12-11 PM","Thursday":"12-11 PM","Friday":"12-11 PM","Saturday":"12-11 PM","Sunday":"12-11 PM"},
    mapsPlaceId: "ChIJuzHG2J-lST4RZ5GbOzINIj0",
    lat: 26.243467499999998,
    lng: 50.582066499999996,
    dataSource: "google-maps",
  },

  "jamies-italian": {
    googleName: "Jamie’s Italian",
    cuisine: "Italian",
    address: "Manama",
    shortAddress: "Manama",
    categories: ["Italian restaurant"],
    mapsPlaceId: "ChIJFVDUEgClST4RJk3HIQjz7Oc",
    lat: 26.2431706,
    lng: 50.5815068,
    dataSource: "google-maps",
  },

  "melenzane": {
    googleName: "MELENZANÉ, The Avenues Mall Bahrain",
    nameAr: "ميلينزاني",
    cuisine: "Italian",
    address: "sea side, Block 346, Avenues, store N:2, Manama",
    shortAddress: "Avenues, Manama",
    phone: "+973 3804 1414",
    rating: 4.6,
    reviews: 1107,
    categories: ["Italian restaurant","Coffee shop","Dessert shop","Pasta shop","Pizza restaurant","Restaurant","Salad shop","Steak house"],
    openNow: "Closed · Opens 12 PM",
    openingHours: {"Monday":"12 PM-12 AM","Tuesday":"12 PM-12 AM","Wednesday":"12 PM-12 AM","Thursday":"12 PM-12:30 AM","Friday":"12 PM-12:30 AM","Saturday":"12 PM-12:30 AM","Sunday":"12 PM-12 AM"},
    mapsPlaceId: "ChIJR37mFculST4RsYnDY-SLZpg",
    lat: 26.247525099999997,
    lng: 50.5859203,
    dataSource: "google-maps",
  },

  "joes-cafe": {
    googleName: "JOE'S CAFE BAHRAIN",
    nameAr: "جوز كافيه",
    cuisine: "Cafe",
    address: "King Faisal Highway, Manama Entrance 7, Avenues Mall, Manama",
    shortAddress: "King Faisal Highway, Manama Entrance 7",
    phone: "+973 3591 8000",
    rating: 4.7,
    reviews: 1478,
    categories: ["Restaurant","Breakfast restaurant","Cafe"],
    openNow: "Closed · Opens 8 AM",
    openingHours: {"Monday":"8 AM-12 AM","Tuesday":"8 AM-12 AM","Wednesday":"8 AM-12 AM","Thursday":"8 AM-1 AM","Friday":"8 AM-1 AM","Saturday":"8 AM-12 AM","Sunday":"8 AM-12 AM"},
    mapsPlaceId: "ChIJZX--7OulST4Ro3sKlJhXDAk",
    lat: 26.2462095,
    lng: 50.5851803,
    dataSource: "google-maps",
  },

  "arabian-broasted": {
    googleName: "Arabian broasted",
    cuisine: "Broasted",
    address: "Tubli",
    shortAddress: "Tubli",
    phone: "+973 1734 4604",
    rating: 3.9,
    reviews: 410,
    categories: ["Restaurant"],
    openNow: "Open · Closes 1 AM",
    openingHours: {"Sunday":"12:30 PM-1 AM","Monday":"12:30 PM-1 AM","Tuesday":"12:30 PM-1 AM","Wednesday":"12:30 PM-1 AM","Thursday":"12:30 PM-1 AM","Friday":"12:30 PM-1 AM","Saturday":"12:30 PM-1 AM"},
    mapsPlaceId: "ChIJfTnyD12vST4RGieZh6pBwxI",
    lat: 26.2046875,
    lng: 50.5963906,
    dataSource: "google-maps",
  },

  "chicket": {
    googleName: "Chicket - Broasted Chicken",
    cuisine: "Broasted",
    address: "Hidd",
    shortAddress: "Hidd",
    phone: "+973 1339 8111",
    rating: 4.7,
    reviews: 693,
    categories: ["Chicken restaurant","Fast food restaurant","Restaurant"],
    openNow: "Open · Closes 3 AM",
    mapsPlaceId: "ChIJ0w4NZXypST4RXHie6iVoaZA",
    lat: 26.2267288,
    lng: 50.6559235,
    dataSource: "google-maps",
  },

  "chico-chicken": {
    googleName: "Chicko chicken",
    cuisine: "Broasted",
    address: "Manama",
    shortAddress: "Manama",
    phone: "+973 7799 5553",
    rating: 4.1,
    reviews: 268,
    categories: ["Restaurant","Chicken restaurant"],
    openNow: "Open · Closes 1:45 AM",
    openingHours: {"Sunday":"12 PM-1:45 AM","Monday":"12 PM-1:45 AM","Tuesday":"12 PM-1:45 AM","Wednesday":"12 PM-1:45 AM","Thursday":"12 PM-1:45 AM","Friday":"1 PM-1:45 AM","Saturday":"12 PM-1:45 AM"},
    mapsPlaceId: "ChIJhzW-egevST4RuqgoQmaQH-Q",
    lat: 26.1804795,
    lng: 50.522857099999996,
    dataSource: "google-maps",
  },
};
// <<< RESEARCHED

let n = 0;
function mk(id, name, cuisine, img, menu, desc = "", tags = [], instagram = "", extra = {}) {
  n += 1;
  cuisine = CUISINE_FIX[cuisine] || cuisine;
  const fallbackByCuisine = IMG;
  const cuisineKey = cuisineKeyOf(cuisine);
  // Main photo: never a tiny logo. Priority:
  // 1. extra.image (explicit) 2. /restaurants/<id> upload (jpg→webp→png chain
  //    resolved by handleImgError in App.jsx) 3. high-res cover 4. food photo.
  // Small brand logo (Talabat/official) becomes a badge via `logo`.
  const rawLogo = BADGES[id] || (REAL_IMG[id] && !HIGH_RES[id]
    ? REAL_IMG[id].replace("width=800", "width=400").replace("width=180", "width=400")
    : "");
  // Main photo priority:
  // 1. extra.image 2. upload /restaurants/<id>.* 3. researched real photo
  // 4. hi-res cover 5. honest placeholder. A cuisine image is the final fallback.
  const stockPhoto = FOOD_REAL[id] || HIGH_RES[id] || svgPlaceholder(cuisine);
  // Real image files: the WebP the browser asks for, the originals kept as
  // fallbacks, and the true pixel size so a card never jumps as the photo loads.
  const card = CARD_IMAGES[id];
  const menuImages = MENU_IMAGES[id];
  const ownPhotos = extra.menuPhotos || MENU_PHOTOS[id] || [];
  const useMenuImages = !extra.menuPhotos && menuImages && menuImages.length === ownPhotos.length;
  // Resolved once so branches can mirror the area: a single-branch place lists
  // its researched area as its branch instead of showing nothing.
  const resolvedArea = extra.area || LOCATIONS[id]?.area || "";
  const resolvedBranches = extra.branches || LOCATIONS[id]?.branches || (resolvedArea ? [resolvedArea] : []);
  return {
    id,
    name,
    cuisine,
    priceRange: extra.priceRange || "$$",
    // Only researched values are kept. A missing rating stays null so the site
    // never shows an invented star count; scripts/research-maps.mjs fills these
    // in from Google and scripts/apply-research.mjs writes them back here.
    rating: extra.rating ?? null,
    reviews: extra.reviews ?? null,
    image: extra.image || card?.webp || `/restaurants/${id}.jpg`,
    imageFallbacks: card?.fallbacks || [],
    imageWidth: card?.width || 800,
    imageHeight: card?.height || 500,
    logo: extra.logo || rawLogo,
    logoUpload: logoFileFor(id),
    fallbackImage: stockPhoto,
    fallbackFinal: fallbackByCuisine[cuisineKey],
    address: extra.address || LOCATIONS[id]?.area || "Manama",
    // A short form of the address for the card; the Maps link keeps the full one.
    shortAddress: extra.shortAddress || "",
    // Clean area name for the Location filter; falls back to the address.
    area: resolvedArea,
    city: extra.city || "Bahrain",
    branches: resolvedBranches,
    phone: extra.phone || "",
    hours: extra.hours || "",
    // Google gives a full week; the card shows a one-line summary of it.
    openingHours: extra.openingHours || null,
    description: desc || `${name} — ${cuisine} in Bahrain. Tap to see menu & location.`,
    tags: tags.length ? tags : [cuisine],
    menu,
    menuPhotos: useMenuImages ? menuImages.map((entry) => entry.webp) : ownPhotos,
    menuPhotoFallbacks: useMenuImages ? menuImages.map((entry) => entry.fallbacks) : [],
    menuPhotoDimensions: useMenuImages
      ? menuImages.map((entry) => [entry.width || 0, entry.height || 0])
      : MENU_PHOTO_DIMENSIONS[id] || [],
    menuUrl: extra.menuUrl || MENU_URLS[id] || "",
    // Talabat listing (order / full menu). Shown as an order button when set.
    talabatUrl: extra.talabatUrl || "",
    instagram: instagram || INSTAGRAM_HANDLES[id] || "",
    placeId: extra.placeId || "",
    mapsPlaceId: extra.mapsPlaceId || "",
    lat: extra.lat ?? ID_COORDS[id]?.[0] ?? AREA_COORDS[extra.area || LOCATIONS[id]?.area]?.[0] ?? null,
    lng: extra.lng ?? ID_COORDS[id]?.[1] ?? AREA_COORDS[extra.area || LOCATIONS[id]?.area]?.[1] ?? null,
    website: extra.website || "",
    categories: extra.categories || [],
    dataSource: extra.dataSource || "curated",
    ...(RESEARCHED[id] || {}),
  };
}

const RAW = [
  // ---- Hamad Town & Riffa ----
  mk(
    "aseeri-star",
    "Aseeri Star",
    "Malghom",
    IMG.bbq,
    bbqMenu,
    "Arabian breakfast, lunch and freshly cooked grills in Hamad Town.",
    ["Breakfast", "Grills", "Delivery"],
    "aseeristarrestaurant",
    {
      priceRange: "$",
      address: "4FVV+GH6, Hamad Town",
      phone: "+973 1741 2643",
      hours: "Open 24 hours"
    }
  ),
  mk(
    "chicken-land-cafeteria",
    "Chicken Land Cafeteria",
    "Malghom",
    IMG.chicken,
    chickenMenu,
    "Budget-friendly chicken, shawarma and grills in Hamad Town.",
    ["Chicken", "Shawarma", "Grills"],
    "chicken_landbh",
    {
      priceRange: "$",
      address: "Road 308, Hamad Town",
      phone: "+973 7793 9190 / +973 1741 2353 / +973 3347 9190",
      hours: "Daily · 5:00 PM - 5:00 AM",
      rating: 3.9,
      reviews: 270
    }
  ),
  mk(
    "white-house",
    "White House",
    "Malghom",
    IMG.bbq,
    bbqMenu,
    "Late-night Bahraini dining in Souq Waqif, Hamad Town, with a second branch in Busaiteen.",
    ["Bahraini", "Grills", "Family"],
    "white_house_resturant",
    {
      priceRange: "$$",
      address: "Souq Waqif, Hamad Town",
      phone: "+973 1748 8877 / +973 3305 4142",
      hours: "Daily · 4:00 PM - 5:00 AM"
    }
  ),
  mk(
    "wadi-altayibin-grills",
    "Wadi Al Tayibeen Grills",
    "Malghom",
    IMG.bbq,
    bbqMenu,
    "Bahraini and Iraqi-style grills near the East Riffa police station.",
    ["Bahraini", "Iraqi", "Grills"],
    "wadi_altayibin_grills",
    {
      priceRange: "$",
      address: "East Riffa, near the police station",
      phone: "+973 3418 8079",
      hours: "Call to confirm hours",
      talabatUrl: "https://www.talabat.com/bahrain/wadi-altaybeen-cafe-resturant-grill"
    }
  ),
  mk(
    "tren-tren",
    "Tren Tren",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "A Bahraini grill institution since 2002, known for tikka, kebabs and late-night sandwiches.",
    ["Bahraini", "Tikka", "Since 2002"],
    "trentren.bh",
    {
      priceRange: "$",
      address: "Shaikh Isa Avenue, Riffa",
      phone: "+973 3223 2009 / +973 3730 9111 / +973 1770 1617",
      hours: "Daily · 5:00 PM - 2:00 AM",
      rating: 4.1
    }
  ),
  mk(
    "tika-abu-jamal",
    "Tika Abu Jamal",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Also known as Al Jamal Food & Grills, serving tikka and grilled favourites in Riffa.",
    ["Tikka", "Grills", "Bahraini"],
    "",
    {
      priceRange: "$",
      address: "Riffa",
      phone: "+973 1777 9644 / +973 3465 9775",
      hours: "Call to confirm hours"
    }
  ),
  mk(
    "shawarmaz",
    "ShawarmaZ",
    "Shawarma",
    IMG.bbq,
    [],
    "Shawarma, falafel and Arabic plates in Sitra.",
    ["Shawarma", "Falafel", "Arabic"],
    "shawarmaz.bh",
    {
      priceRange: "$",
      image: "/restaurants/shawarmaz.webp",
      phone: "+973 3838 1016",
      area: "Sitra",
      rating: 3.8,
      talabatUrl: "https://www.talabat.com/bahrain/shawarmaz"
    }
  ),
  mk(
    "lahab",
    "LAHAB",
    "Shawarma",
    IMG.bbq,
    [],
    "Shawarma and sandwiches in Arad.",
    ["Shawarma", "Sandwiches", "Arabic"],
    "",
    {
      priceRange: "$",
      image: "/restaurants/lahab.jpg",
      area: "Arad",
      rating: 4.5,
      talabatUrl: "https://www.talabat.com/bahrain/lahab-restaurant"
    }
  ),

  // ---- Dar Kulaib ----
  mk(
    "al-haseer",
    "Al Haseer",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Turkish grill and pastry favourites in Dar Kulaib.",
    ["Turkish", "Grill", "Takeaway"],
    "al_haseer_restaurant",
    {
      priceRange: "$$",
      phone: "+973 1744 0224",
      hours: "Daily · 4:30 PM - 11:00 PM"
    }
  ),
  mk(
    "omy-and-banatha",
    "Omy & Banatha",
    "Grill",
    IMG.pizza,
    pizzaMenu,
    "Bahraini home cooking, Arabic favourites and pizza in Dar Kulaib.",
    ["Bahraini", "Arabic", "Pizza"],
    "umiobnatha",
    {
      priceRange: "$",
      phone: "+973 1744 1007 / +973 3999 8303",
      hours: "Daily · 11:00 AM - 12:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/722028/omy-and-banatha-restaurant-dar-kulaib",
      menuPhotos: [
        "/restaurants/media/omy-and-banatha/menu-01.png",
        "/restaurants/media/omy-and-banatha/menu-02.png"
      ]
    }
  ),
  mk(
    "ala-hawak",
    "Ala Hawak",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Charcoal grills, Turkish shawarma and meat platters on Dar Kulaib's main street.",
    ["Turkish", "Grill", "Shawarma"],
    "ala_hawak_restaurant",
    {
      priceRange: "$",
      address: "Dar Kulaib, Main Street",
      phone: "+973 3346 5195 / +973 1747 5088",
      hours: "Daily · 6:00 PM - 1:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/609311/ala-hawak-restaurant-dar-kulaib",
      menuPhotos: [
        "/restaurants/media/ala-hawak/menu-01.jpg",
        "/restaurants/media/ala-hawak/menu-02.jpg",
        "/restaurants/media/ala-hawak/menu-03.jpg",
        "/restaurants/media/ala-hawak/menu-04.jpg",
        "/restaurants/media/ala-hawak/menu-05.jpg"
      ]
    }
  ),

  // ---- General / Cafes ----
  mk(
    "nino",
    "Nino",
    "Italian",
    IMG.general,
    mixedMenu,
    "Contemporary Italian dining in Al Aali Complex — pasta, pizza and all-day breakfast favourites.",
    ["Italian", "Pasta", "Pizza", "Breakfast"],
    "ninobahrain",
    {
      image: "/restaurants/nino.png",
      rating: 4.7,
      reviews: 3946,
      address: "Al Aali Complex, Road 2827, Seef",
      branches: ["Seef"],
      phone: "+973 3362 0254 / +973 1756 6555",
      hours: "Sat - Wed · 11:00 AM - 12:00 AM · Thu - Fri · 11:00 AM - 12:30 AM",
      dataSource: "researched"
    }
  ),
  mk("sando-x-urban", "Sando X Urban", "Sandwiches", IMG.sandwich, mixedMenu, "Trendy sandwich & urban eats.", ["Sandwiches"]),
  mk(
    "zulu",
    "Zulu",
    "Italian",
    IMG.general,
    mixedMenu,
    "South-Asian kitchen in Qudaibiya — tandoori chicken, biryani, samosa and paella.",
    ["Indian", "Tandoori", "Biryani", "South Asian"],
    "zulu.bh",
    {
      image: "/restaurants/zulu.png",
      rating: 4.2,
      reviews: 364,
      address: "Qudaibiya, Manama",
      branches: ["Qudaibiya"],
      phone: "+973 3311 2663",
      hours: "Sun - Thu · 12:00 PM - 12:00 AM · Fri - Sat · 12:00 PM - 1:00 AM",
      dataSource: "researched"
    }
  ),
  mk("fatto", "Fatto", "Lebanese", IMG.general, bbqMenu, "Levantine salads, grills and fattoush.", ["Lebanese"]),
  mk(
    "cocos",
    "Coco's",
    "Mediterranean",
    IMG.cafe,
    cafeMenu,
    "Mediterranean fusion restaurant — all-day dining in Qudaibiya and Juffair Square.",
    ["Mediterranean", "Fusion"],
    "cocoscafebahrain",
    {
      image: "/restaurants/cocos.png",
      rating: 4.1,
      reviews: 8210,
      address: "Road 3803, Qudaibiya, Manama",
      branches: ["Qudaibiya", "Juffair"],
      phone: "+973 1771 2288",
      hours: "Daily · 11:00 AM - 12:00 AM",
      dataSource: "researched"
    }
  ),
  mk("ghancha", "Ghancha", "Cafe", IMG.cafe, cafeMenu),
  mk("layla-aldiyra", "Layla Al Diyra", "Bahraini", IMG.general, bbqMenu, "Local Bahraini flavors.", ["Local"], "", { area: "Manama", image: "/restaurants/logos/layla-aldiyra.jpg" }),
  mk("5-spoons", "5 Spoons", "Cafe", IMG.cafe, cafeMenu, "Cozy cafe – breakfast & specialty coffee.", ["Breakfast", "Coffee", "Brunch"]),
  mk("angelo-cafe", "Angelo Cafe", "Cafe", IMG.cafe, cafeMenu, "Cafe at Juffair Square — coffee and brunch.", ["Cafe", "Brunch"], "", { area: "Juffair", address: "Juffair Square" }),
  mk("akbars-kitchen", "Akbar's Kitchen", "Indian", IMG.general, mixedMenu, "Indian curries, grills and seafood in Tubli — order via the online menu.", ["Indian", "Curries", "Seafood"], "akbarskitchen", { area: "Tubli", branches: ["Tubli"], menuUrl: "https://akbarkitchen.invopos.app/", talabatUrl: "https://www.talabat.com/bahrain/restaurant/38599/akbars-kitchen-tubli", dataSource: "researched" }),
  mk(
    "naughty-by-raaw",
    "Naughty by Raaw",
    "Asian",
    IMG.general,
    mixedMenu,
    "Rebellious Asian dining at The Courtyard, Riffa — open weekdays 8 AM - 11 PM, weekends till midnight.",
    ["Asian", "Riffa", "Late Night"],
    "naughty.by.raaw",
    {
      area: "Riffa",
      address: "Shop 43, The Courtyard, Riffa",
      branches: ["Riffa"],
      phone: "+973 17272277",
      hours: "Weekdays · 8:00 AM - 11:00 PM · Weekends · 8:00 AM - 12:00 AM",
      menuUrl: "https://naughtybyraaw.redro.menu/",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/755824/naughty-by-raaw-riffa-alshamali-north-riffa",
      dataSource: "researched"
    }
  ),
  mk("alsikka", "Al Sikka", "Bahraini", IMG.general, bbqMenu, "Al Sikka — local food street vibes.", ["Local"], "", { area: "Manama", image: "/restaurants/alsikka.jpg" }),
  mk("banu", "Banu", "Persian", IMG.general, bbqMenu, "Persian kebabs & rice.", ["Kebab"]),
  mk("alkofeia", "Al Kofeia", "Mediterranean", IMG.cafe, bbqMenu, "Traditional Palestinian cuisine — mansaf, grills, mezze and Eastern breakfast, open daily 8 AM - 1 AM.", ["Palestinian", "Mansaf", "Grills", "Breakfast"], "alkofeia.bahrain", { talabatUrl: "https://www.talabat.com/bahrain/restaurant/625056/tayf-alkofeia-sea-front" }),
  mk("uplift", "Uplift", "Cafe", IMG.cafe, cafeMenu, "Healthy bowls & coffee.", ["Healthy", "Brunch"], "", { area: "Hamala", address: "Hamala" }),
  mk("slider-station", "Slider Station", "Burgers", IMG.burger, burgerMenu, "Mini sliders & loaded fries.", ["Sliders"]),
  mk("the-block", "The Block", "International", IMG.burger, burgerMenu, "", [], "", { area: "Manama" }),
  mk("barbecue-town", "Barbecue Town", "BBQ", IMG.bbq, bbqMenu),
  mk("rustic-cafe", "Rustic Cafe & Restaurant", "Cafe", IMG.cafe, cafeMenu, "", ["Cafe", "Brunch"]),
  mk("abrisham", "Abrisham", "Persian", IMG.general, bbqMenu),
  mk("l-avenue-cafe", "L'Avenue Cafe", "Cafe", IMG.cafe, cafeMenu),
  mk("black-strip", "Black Strip", "Steakhouse", IMG.bbq, bbqMenu, "Steaks & grills.", ["Steak"]),

  // ---- Verified additions (researched Sep 2026) ----
  mk(
    "beefko",
    "Beefko",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Specialised beef and steaks — steakhouse grills in Adliya.",
    ["Steakhouse", "Beef", "Grill"],
    "beefko",
    {
      image: "/restaurants/beefko.png",
      rating: 4.4,
      reviews: 1068,
      address: "Shop 0, Building 2295, Road 2435, Adliya (Block 338)",
      branches: ["Adliya"],
      phone: "+973 3200 0877",
      hours: "Sun - Thu · 1:00 PM - 1:00 AM · Fri - Sat · 1:00 PM - 2:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/604245/beefko-group-wll-adliya",
      dataSource: "researched"
    }
  ),
  mk(
    "de-linos",
    "De Linos",
    "Italian",
    IMG.pasta,
    mixedMenu,
    "Italian dining — pizza, pasta and Mediterranean plates at Sea Front and City Center.",
    ["Italian", "Pizza", "Pasta"],
    "delinos_bh",
    {
      image: "/restaurants/de-linos.png",
      rating: 4.4,
      reviews: 1626,
      address: "Sea Front, Manama",
      branches: ["Sea Front", "City Centre"],
      phone: "+973 1772 8290 / +973 1734 5288",
      hours: "Daily · 9:00 AM - 11:00 PM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/758657/de-linos-sea-front-city-center",
      dataSource: "researched"
    }
  ),
  mk(
    "empire-pizza",
    "Empire Pizza",
    "Pizza",
    IMG.pizza,
    pizzaMenu,
    "NY-style thin-crust pizza by the slice or whole pie — cold-fermented dough, A'ali and Saar.",
    ["Pizza", "NY Style", "Thin Crust"],
    "empirepizza.bh",
    {
      image: "/restaurants/empire.png",
      rating: 4.6,
      reviews: 367,
      address: "Building 1573, Road 3236, A'ali 732",
      branches: ["A'ali", "Saar"],
      phone: "+973 7709 0105 / +973 7709 0106",
      hours: "Tue - Sun · 6:00 PM - 11:00 PM",
      dataSource: "researched"
    }
  ),
  mk(
    "nu-asia",
    "Nu Asia",
    "Asian",
    IMG.general,
    mixedMenu,
    "Pan-Asian dining — Chinese, Indian, Japanese, Korean and Southeast Asian favourites.",
    ["Asian", "Pan-Asian", "Sushi", "Japanese"],
    "nuasia",
    {
      image: "/restaurants/new-asia.png",
      rating: 4.4,
      reviews: 2580,
      address: "Al Aali Complex, Road 2827, Seef",
      branches: ["Seef", "Zayed Town", "Budaiya"],
      phone: "+973 1743 4344 / +973 1787 0222 / +973 1769 1919",
      hours: "Daily · 11:30 AM - 12:30 AM",
      dataSource: "researched"
    }
  ),

  // ---- Burgers ----
  mk("tonys", "Tony's", "Burgers", IMG.burger, burgerMenu),
  mk("buzz-burger", "Buzz Burger", "Burgers", IMG.burger, burgerMenu),
  mk("backyard-burger", "Backyard Burger", "Burgers", IMG.burger, burgerMenu),
  mk("burger77", "Burger 77", "Burgers", IMG.burger, burgerMenu, "Burger 77 — Karzakkan branch.", ["Burgers"], "burger77.bh", { area: "Karzakkan", branches: ["Karzakkan"], lat: 26.110317, lng: 50.4819281 }),
  mk("honest-burger", "Honest Burger", "Burgers", IMG.burger, burgerMenu),
  mk("freid", "Freid", "Burgers", IMG.burger, burgerMenu),
  mk("burger-fries-more", "Burger Fries and More", "Burgers", IMG.burger, burgerMenu),
  mk("lahom", "Lahom", "Burgers", IMG.burger, burgerMenu),
  mk("engineer-burger", "Engineer Burger", "Burgers", IMG.burger, burgerMenu),
  mk("lab-burger", "Lab Burger", "Burgers", IMG.burger, burgerMenu),
  mk("cut-burger", "Cut Burger", "Burgers", IMG.burger, burgerMenu),
  mk("fat-whale", "Fat Whale", "Burgers", IMG.burger, burgerMenu),
  mk("grannys-burger", "Granny's Burger", "Burgers", IMG.burger, burgerMenu),
  mk("sammonah-sandwich", "Sammonah Sandwiches", "Sandwiches", IMG.sandwich, mixedMenu, "Bahraini sandwich spot known for samoun sandwiches, fresh pastries and box meals.", ["Sandwiches"], "smona.bh", { rating: 4.8, reviews: 485, phone: "+973 7790 8886", address: "Rd No 3503, Alhajiyat, Bahrain", area: "Alhajiyat", hours: "Daily · 6:00 AM – 1:00 AM", talabatUrl: "https://www.talabat.com/bahrain/restaurant/646114/sammonah-riffa-alshamali-north-riffa", menuPhotos: ["/restaurants/media/sammonah-sandwich/menu-01.jpg", "/restaurants/media/sammonah-sandwich/menu-02.jpg", "/restaurants/media/sammonah-sandwich/menu-03.jpg", "/restaurants/media/sammonah-sandwich/menu-04.jpg", "/restaurants/media/sammonah-sandwich/menu-05.jpg", "/restaurants/media/sammonah-sandwich/menu-06.jpg"] }),
  mk("jan-burger", "Jan Burger", "Burgers", IMG.burger, burgerMenu),
  mk("al-mihwar", "Al Mihwar", "Burgers", IMG.burger, burgerMenu),
  mk("slider", "Slider", "Burgers", IMG.burger, burgerMenu),
  mk("plan-b", "Plan B", "Burgers", IMG.burger, burgerMenu),
  mk(
    "viola-burger",
    "Viola Burger",
    "Burgers",
    IMG.burger,
    burgerMenu,
    "Beef, chicken and healthy burgers with fries, kids meals, drinks and add-ons.",
    ["Burgers", "Chicken", "Fries"],
    "",
    {
      priceRange: "$$",
      address: "Budaiya, Dar Kulaib, Muharraq and Malkiya",
      branches: ["Budaiya", "Dar Kulaib", "Muharraq", "Malkiya"],
      phone: "+973 1771 0020",
      hours: "Call to confirm hours",
      menuPhotos: [
        "/restaurants/media/viola-burger/menu-01.png",
        "/restaurants/media/viola-burger/menu-02.png"
      ]
    }
  ),
  mk("three-guys", "Three Guys", "Burgers", IMG.burger, burgerMenu),
  mk("hashtag", "Hashtag", "Burgers", IMG.burger, burgerMenu),
  mk("three-lines", "Three Lines", "Pasta", IMG.pasta, pastaMenu, "Pasta & Italian.", ["Pasta"]),
  mk("villa-rosa", "Villa Rosa", "Italian", IMG.pasta, pastaMenu, "Italian pasta & pizza.", ["Italian"]),
  mk("cheesy-burger", "Cheesy Burger", "Burgers", IMG.burger, burgerMenu),
  mk("janahi-burger", "Janahi Burger", "Burgers", IMG.burger, burgerMenu),
  mk("blaze-burger", "Blaze Burger", "Burgers", IMG.burger, burgerMenu),
  mk("adam-subs", "Adam Subs", "Sandwiches", IMG.sandwich, mixedMenu, "Subs & sandwiches.", ["Subs"]),
  mk("sahburger", "Sahburger", "Burgers", IMG.burger, burgerMenu),
  mk("lost-burger", "Lost Burger", "Burgers", IMG.burger, burgerMenu),
  mk("neon-burger", "Neon Burger", "Burgers", IMG.burger, burgerMenu, "Neon-lit burger joint.", ["Burgers"], "", { menuUrl: "https://neonburgerbh.com/", area: "Manama", branches: ["Manama"] }),
  mk(
    "burger-waqif",
    "Burger Waqif",
    "Burgers",
    IMG.burger,
    burgerMenu,
    "Beef and chicken burgers with fries and crispy sides.",
    ["Burgers", "Chicken", "Fries"],
    "",
    { phone: "+973 1330 0380" }
  ),
  mk("burger-square", "Burger Square", "Burgers", IMG.burger, burgerMenu),
  mk("double-smash", "Double Smash", "Burgers", IMG.burger, burgerMenu, "Smash burgers, crispy chicken, fries and signature sauces.", ["Burgers", "Chicken", "Fries"], "", { image: "/restaurants/double-smash.png", logo: "/restaurants/logos/double-smash.png", area: "Manama", address: "Manama", branches: ["Manama"], menuPhotos: ["/restaurants/media/double-smash-menu.jpg"] }),
  mk("chubbys-burger", "Chubby's Burger", "Burgers", IMG.burger, burgerMenu),
  mk("the-cap-burger", "The Cap Burger", "Burgers", IMG.burger, theCapMenu, "Angus beef and chicken burgers with loaded fries and signature sauces, made in Bahrain.", ["Burgers", "Chicken", "Fries"], "thecapburger", { image: "/restaurants/the-cap-burger-photo.jpg", phone: "+973 3360 0925", hours: "Daily · 6:00 PM – 12:30 AM", area: "Zallaq", branches: ["Zallaq"] }),
  mk(
    "challenger",
    "Challenger",
    "Burgers",
    IMG.burger,
    burgerMenu,
    "Beef, chicken and wings with sides, sauces and kids meals.",
    ["Burgers", "Chicken", "Wings"],
    "",
    { phone: "+973 6699 1010" }
  ),
  mk(
    "daveburger",
    "Dave Burger",
    "Burgers",
    IMG.burger,
    burgerMenu,
    "Classic, Swiss, Oklahoma and chicken burgers with fries and extras.",
    ["Burgers", "Chicken", "Fries"],
    "",
    { phone: "+973 3337 1768" }
  ),

  // ---- Chicken ----
  mk("cluckys", "Cluckys", "Chicken", IMG.chicken, chickenMenu),
  mk(
    "baby-chicken",
    "Baby Chicken",
    "Chicken",
    IMG.chicken,
    chickenMenu,
    "Chicken sandwiches, bites, rolls, fries and cold drinks.",
    ["Chicken", "Sandwiches", "Fries"],
    "",
    { phone: "+973 7729 2929" }
  ),
  mk("fry-and-fries", "Fry and Fries Cafe", "Chicken", IMG.chicken, chickenMenu),
  mk(
    "wingman",
    "Wingman",
    "Chicken",
    IMG.chicken,
    chickenMenu,
    "Chicken wings, bites, tenders, sandwiches and fries with multiple Bahrain branches.",
    ["Wings", "Chicken", "Sandwiches"],
    "",
    {
      phone: "+973 1749 4940 / +973 1749 4941 / +973 1749 4942 / +973 1749 4943",
      hours: "Daily · 12:00 PM - 12:00 AM"
    }
  ),
  mk("wing-station", "Wing Station", "Chicken", IMG.chicken, chickenMenu, "Wings specialist.", ["Wings"]),
  mk("flap-fried-chicken", "Flap Fried Chicken", "Chicken", IMG.chicken, chickenMenu),
  mk("phillys", "Phillys", "Sandwiches", IMG.sandwich, mixedMenu, "Philly cheesesteaks & subs.", ["Philly"], "", { area: "Juffair", branches: ["Juffair"] }),
  mk("night-bird", "Night Bird", "Chicken", IMG.chicken, chickenMenu, "Late-night chicken.", ["Late Night"]),
  mk("tostado", "Tostado", "Mexican", IMG.general, mixedMenu, "", [], "", { area: "Manama" }),
  mk("popeyes", "Popeyes", "Chicken", IMG.chicken, chickenMenu, "Famous Louisiana chicken.", ["Chain"]),
  mk("monkey-lala", "Monkey Lala", "Chicken", IMG.chicken, chickenMenu),
  mk("stack", "Stack", "Burgers", IMG.burger, burgerMenu),

  // ---- Pizza ----
  mk(
    "milano",
    "Milano",
    "Pizza",
    IMG.pizza,
    pizzaMenu,
    "Pizza, pasta, family platters, salads and burgers with home delivery.",
    ["Pizza", "Pasta", "Family"],
    "",
    { phone: "+973 1700 4747" }
  ),
  mk("gate-12", "Gate 12", "Pizza", IMG.pizza, pizzaMenu),

  // ---- Verified additions, batch 2 (researched Sep 2026) ----
  mk(
    "mama-joz",
    "Mama Joz Pizza",
    "Pizza",
    IMG.pizza,
    pizzaMenu,
    "Bahrain's local pizzeria since 2014 — fresh daily dough, with branches in Riffa, Juffair Mall, Muharraq and Ramli Mall, A'ali.",
    ["Pizza", "Delivery", "Family", "Fast Food"],
    "mamajozpizza",
    {
      image: "/restaurants/mama-joz.png",
      rating: 4.6,
      reviews: 753,
      address: "Hajiyat Ave, Riffa",
      branches: ["Riffa", "Juffair", "Muharraq", "A'ali"],
      phone: "+973 1761 6163 / +973 1311 6166 / +973 1761 6164 / +973 1311 6165",
      hours: "Daily · 10:30 AM - 1:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/638103/mama-joz-pizza-north-riffa",
      dataSource: "researched"
    }
  ),
  mk(
    "little-caesars",
    "Little Caesars",
    "Pizza",
    IMG.pizza,
    pizzaMenu,
    "Hot-and-fresh pizza by the slice, Pizza by the Meter and Crazy Puffs — branches in Malkiya, Riffa, Zayed Town, Zinj, Arad, Seef Mall and Hamad Town.",
    ["Pizza", "By The Slice", "Family", "Delivery"],
    "littlecaesarsbahrain",
    {
      image: "/restaurants/little-caesars.png",
      rating: 4.7,
      reviews: 112,
      address: "Zaid Bin Omera Hwy, Malkiya",
      branches: ["Malkiya", "Riffa", "Zayed Town", "Zinj", "Arad", "Seef", "Budaiya", "Hamad Town"],
      phone: "+973 1330 0022 / +973 1733 0022",
      hours: "Daily · 10:00 AM - 2:30 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/52517/little-caesar-malkiya",
      dataSource: "researched"
    }
  ),
  mk(
    "pizzaro",
    "Pizzaro",
    "Pizza",
    IMG.pizza,
    pizzaMenu,
    "Fresh pizza dough and homemade pasta — Zayed Town's Italian kitchen with a takeaway menu.",
    ["Pizza", "Pasta", "Italian", "Takeaway"],
    "",
    {
      image: "/restaurants/pizzaro.png",
      reviews: 3,
      address: "5G8R+RW4, Zayed Town",
      branches: ["Zayed Town", "Adliya"],
      phone: "+973 1616 7527",
      hours: "Daily · 12:00 PM - 12:00 AM",
      dataSource: "researched"
    }
  ),
  mk(
    "ic-pizza",
    "IC Pizza",
    "Pizza",
    IMG.pizza,
    pizzaMenu,
    "Detroit and Brooklyn style pizza in Al Hidd — 48-hour cold-fermented dough and San Marzano tomatoes.",
    ["Pizza", "Detroit Style", "Brooklyn Style", "Cold-Fermented"],
    "icpizza.bh",
    {
      image: "/restaurants/ic-pizza.png",
      rating: 4.4,
      reviews: 217,
      address: "Road 114, Block 101, Building 1284R, Al Hidd",
      branches: ["Al Hidd"],
      phone: "+973 3360 7710",
      hours: "Sat - Wed · 3:00 PM - 12:00 AM · Thu - Fri · 4:30 PM - 1:30 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/726719/ic-pizza-hidd",
      dataSource: "researched"
    }
  ),
  mk(
    "the72",
    "The72",
    "Burger",
    IMG.burger,
    burgerMenu,
    "Sanad's late-night burger and pizza spot — signature loaded burgers, wraps and chef's choice specials.",
    ["Burger", "Pizza", "Late Night", "Wraps"],
    "the72.bh",
    {
      image: "/restaurants/the72.png",
      reviews: 43,
      address: "Building 1357, Road 4541, Sanad",
      branches: ["Sanad"],
      phone: "+973 1768 1255 / +973 1766 1755",
      hours: "Thu - Mon · 1:00 PM - 2:00 AM · Tue - Wed · 5:00 PM - 2:00 AM",
      dataSource: "researched"
    }
  ),

  // ---- Verified additions, batch 3 (researched Sep 2026) ----
  mk(
    "welayat-ali",
    "Welayat Ali",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "مطعم ومشويات ولاية علي — shawarma, grills and mixed dinners in Jidhafs.",
    ["Shawarma", "Grill", "Jidhafs"],
    "welayat.ali.bh",
    {
      image: "/restaurants/welayat-ali.png",
      rating: 4.2,
      reviews: 2775,
      address: "Avenue 14, Jidhafs",
      branches: ["Jidhafs"],
      phone: "+973 1740 6070",
      hours: "Daily · 5:30 PM - 1:30 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/705058/wolayat-ali-jidhafs",
      dataSource: "researched"
    }
  ),
  mk(
    "al-furat-nights",
    "Al Furat Nights",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "ليالي الفرات — mixed grills, kebabs and shawarma in Al Qaryah, Sitra.",
    ["Grill", "Kebab", "Shawarma", "Sitra"],
    "alfurat_nights",
    {
      image: "/restaurants/al-furat-nights.png",
      rating: 4.4,
      reviews: 479,
      address: "Avenue 6, Al Qaryah, Sitra",
      branches: ["Sitra"],
      phone: "+973 1747 4730 / +973 3437 8232",
      hours: "Daily · 6:00 PM - 1:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/600783/al-furat-nights-al-qurayyah",
      dataSource: "researched"
    }
  ),
  mk(
    "al-farhan",
    "Al Farhan Grills",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Turkish grills and shawarma on Malikiyah Avenue, Malkiya.",
    ["Turkish", "Grill", "Shawarma", "Malkiya"],
    "alfarhanturkishgrill",
    {
      image: "/restaurants/al-farhan.png",
      rating: 4.2,
      reviews: 552,
      address: "Malikiyah Ave, Malkiya",
      branches: ["Malkiya"],
      phone: "+973 1763 2459 / +973 1763 2069 / +973 3366 9775",
      hours: "Daily · 12:00 PM - 1:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/758846/alfarhan-grills-and-shawarma-malkiya",
      dataSource: "researched"
    }
  ),
  mk(
    "swaikhat",
    "Swaikhat",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "صويخات — evening grills and Arabic favourites at District 1 Mall, Janabiyah.",
    ["Grill", "Arabic", "Janabiyah"],
    "swaikhat.bh",
    {
      image: "/restaurants/swaikhat.png",
      rating: 4.1,
      reviews: 333,
      address: "Building 3, Block 579, Road 7901, Janabiyah",
      branches: ["Janabiyah"],
      phone: "+973 1700 9900",
      hours: "Daily · 6:00 PM - 2:00 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/718998/swaikhat-al-janabiyah",
      dataSource: "researched"
    }
  ),
  mk(
    "the-bossman",
    "The Bossman",
    "Burger",
    IMG.burger,
    burgerMenu,
    "Modern Italian-American kitchen and burgers in Seef District.",
    ["Burger", "American", "Seef"],
    "thebossman.bh",
    {
      image: "/restaurants/the-bossman.webp",
      address: "Seef District, Manama",
      area: "Seef",
      branches: ["Seef"],
      phone: "+973 17900907",
      hours: "Weekdays · 4:00 PM - 11:30 PM · Weekends 12:30 PM - 1:00 AM",
      menuUrl: "https://qr.finedinemenu.com/the-bossman/menu/69d64c1a5d3e202fc4f33beb",
      lat: 26.236,
      lng: 50.586,
      dataSource: "researched"
    }
  ),
  mk(
    "tikka-village",
    "Tikka Village",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Authentic Bahraini grills, tikka and kababs at Villagio Mall.",
    ["Grill", "Tikka", "Bahraini", "Janabiyah"],
    "tikka.village",
    {
      image: "/restaurants/tikka-village.webp",
      address: "Villagio Mall, Janabiyah",
      area: "Janabiyah",
      branches: ["Janabiyah"],
      phone: "+973 17900999",
      hours: "Daily · 5:00 PM - 1:00 AM · Weekends till 2:00 AM",
      menuUrl: "/menus/tikka-village.pdf",
      lat: 26.1817,
      lng: 50.4812,
      dataSource: "researched"
    }
  ),
  mk(
    "tikka-numee",
    "Tikka Numee",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "تكة نومي — authentic Bahraini grills, tikka and mixed grills at District 1 Mall.",
    ["Grill", "Tikka", "Bahraini", "Janabiyah"],
    "tikka.numee",
    {
      image: "/restaurants/tikka-numee.png",
      reviews: 293,
      address: "District 1 Mall, Janabiyah",
      branches: ["Janabiyah"],
      phone: "+973 1710 1110",
      hours: "Sat - Wed · 6:00 PM - 1:00 AM · Thu - Fri · 6:00 PM - 1:30 AM",
      dataSource: "researched"
    }
  ),
  mk(
    "aljabriya",
    "Al Jabriya",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "مطعم الجابرية — Turkish restaurant serving kebabs, grills and mezze in Busaiteen and Jid Ali.",
    ["Turkish", "Grill", "Kebab", "Mezze"],
    "aljabriya.restaurant",
    {
      image: "/restaurants/aljabriya.png",
      rating: 4.2,
      reviews: 1075,
      address: "Road 2643, Busaiteen",
      branches: ["Busaiteen", "Jid Ali"],
      phone: "+973 1733 0108 / +973 3344 1886 / +973 1760 0033",
      hours: "Daily · 11:00 AM - 12:30 AM",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/42387/aljabriya-restaurant-busaiteen",
      dataSource: "researched"
    }
  ),

  // ---- Added Sep 2026: LUMEE, Title, Jamie's Italian, Melenzane, Joe's Cafe ----
  // Cuisines come from the evidence, not a guess: LUMEE's own menu lists tikka,
  // entrecote and street grills; Melenzane's site says "We Cook Italian" and
  // Google lists it as an Italian restaurant; Title's site says Italian.
  // lumee + title have no card photo yet, so they show the honest placeholder.
  mk(
    "lumee",
    "LUMEE",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Lumee Street at The Avenues - tikka, entrecote, street grills, shawarma and wraps.",
    ["Street Food", "Grill", "Tikka", "Shawarma"],
    "lumeestreet",
    {
      area: "Seef",
      address: "The Avenues, Seef",
      menuUrl: "https://order.lumeestreet.com/",
      dataSource: "curated"
    }
  ),
  mk(
    "title",
    "Title",
    "Italian",
    IMG.pasta,
    pastaMenu,
    "Title at The Avenues - Italian dishes, coffee and pastries.",
    ["Italian", "Cafe", "Coffee"],
    "title.bh",
    {
      area: "Seef",
      address: "The Avenues, Seef",
      dataSource: "curated"
    }
  ),
  mk(
    "jamies-italian",
    "Jamie's Italian",
    "Italian",
    IMG.pasta,
    pastaMenu,
    "Jamie's Italian - pasta, pizza and Italian favourites.",
    ["Italian", "Pasta", "Pizza"],
    "",
    {
      image: "/restaurants/jamies-italian.webp",
      area: "Seef",
      address: "The Avenues, Seef",
      menuUrl: "https://qr.emenu.bh/jamies-italian-bahrain-menu#/",
      dataSource: "curated"
    }
  ),
  mk(
    "melenzane",
    "Melenzane",
    "Italian",
    IMG.pasta,
    pastaMenu,
    "Melenzane at The Avenues - Italian cooking, pasta, pizza and dessert.",
    ["Italian", "Pasta", "Pizza", "Dessert"],
    "",
    {
      image: "/restaurants/melenzane.webp",
      area: "Seef",
      address: "The Avenues, Seef",
      menuUrl: "https://order.melenzanebh.com/en",
      dataSource: "curated"
    }
  ),

  mk(
    "joes-cafe",
    "Joe's Cafe",
    "Cafe",
    IMG.cafe,
    cafeMenu,
    "Joe's Cafe at The Avenues - coffee, breakfast and café plates.",
    ["Cafe", "Coffee", "Breakfast", "Brunch"],
    "joescafe",
    {
      image: "/restaurants/joes-cafe.webp",
      area: "Seef",
      address: "The Avenues, Seef",
      // The link we were given (fndn.mn/joes-cafe-2) no longer resolves, so
      // there is deliberately no menu URL here until a working one is sent.
      phone: "+973 3591 8000",
      dataSource: "curated"
    }
  ),

  // ---- Added Oct 2026: Otto (Hamala Hills), FYR (Al Aali Mall, Seef) ----
  mk(
    "otto",
    "Otto",
    "Italian",
    IMG.pasta,
    pizzaMenu,
    "Italian trattoria in Hamala Hills — Neapolitan pizzas, handmade pastas and Italian breakfast.",
    ["Italian", "Pizza", "Pasta", "Breakfast"],
    "ottobahrain",
    {
      area: "Hamala",
      address: "Hamala Hills",
      branches: ["Hamala"],
      menuUrl: "https://qr.finedinemenu.com/otto-bahrain/menu/6ab1075bc16561593439f079",
      dataSource: "curated"
    }
  ),
  mk(
    "fyr",
    "FYR",
    "Grill",
    IMG.bbq,
    bbqMenu,
    "Feed your fire at Al Aali Mall, Seef — flame-grilled burgers, tacos and more.",
    ["Grill", "Burgers", "Tacos"],
    "fyrbahrain",
    {
      area: "Seef",
      address: "Al Aali Mall, Seef",
      branches: ["Seef"],
      menuUrl: "https://fndn.mn/fyr/s",
      dataSource: "curated"
    }
  ),
  // ---- Added Oct 2026: Soul (Zayed Town), Canteena (Busaiteen) ----
  // Menu links were supplied as l.instagram.com wrappers; unwrapped here.
  mk(
    "soul",
    "Soul",
    "Burger",
    IMG.burger,
    burgerMenu,
    "Fresh handcrafted beef and chicken burgers at Alandalusia Complex, Zayed Town — daily 4 PM - 1 AM.",
    ["Burgers", "Chicken", "Fries"],
    "soulbahrain",
    {
      area: "Zayed Town",
      address: "Alandalusia Complex, Zayed Town",
      branches: ["Zayed Town"],
      hours: "Daily · 4:00 PM - 1:00 AM",
      menuUrl: "https://soulbh.com/",
      talabatUrl: "https://www.talabat.com/bahrain/restaurant/686923/soul-bahrain-zayed-town",
      dataSource: "curated"
    }
  ),
  mk(
    "canteena",
    "Canteena",
    "Fried Chicken",
    IMG.chicken,
    chickenMenu,
    "Late-night pickup spot in Busaiteen — crispy Fire Pops, truffle fries and refreshments.",
    ["Chicken", "Fries", "Late Night"],
    "canteena.bh",
    {
      area: "Busaiteen",
      address: "Busaiteen",
      branches: ["Busaiteen"],
      menuUrl: "https://qr.finedinemenu.com/xcaaJwf5C",
      dataSource: "curated"
    }
  ),

  // ---- Broasted ----
  mk("arabian-broasted", "Arabian Broasted", "Broasted", IMG.chicken, chickenMenu),
  mk("chicket", "Chicket", "Broasted", IMG.chicken, chickenMenu),
  mk("chico-chicken", "Chico Chicken", "Broasted", IMG.chicken, chickenMenu),
  mk("klakiz", "Klakiz", "Broasted", IMG.chicken, chickenMenu, "", [], "", { area: "Manama", branches: ["Manama"] }),

  // ---- Pasta ----
  mk("risotto", "Risotto", "Pasta", IMG.pasta, pastaMenu),
  mk("yebilna-pasta", "Yebilna Pasta", "Pasta", IMG.pasta, pastaMenu),
  mk("le-pasta", "Le Pasta", "Pasta", IMG.pasta, pastaMenu),
];

// Only the wanted categories survive.
export const restaurants = RAW.filter(
  (r) => ALLOWED_CUISINES.includes(r.cuisine) && !PENDING_DETAILS.has(r.id)
).map((r) => {
  // Strip non‑URL website placeholders that came from the source data.
  if (r.website) {
    try { new URL(r.website); } catch { r.website = ""; }
  }
  return r;
});

// ---- Offers via apps ----
// Each restaurant can offer discounts through these apps.
// Add a restaurant's id to the relevant array below.
export const OFFER_APPS = ["STC", "Unipal", "Entertainer", "Batlco"];

// Verified offers only: every id listed here appears on the app's public offer page.
export const OFFERS = {
  // https://www.bizbahrain.com (stc Bahrain × Time Out Market partnership)
  STC: ["fatto", "chicket", "little-caesars", "three-lines", "sahburger", "cheesy-burger", "sammonah-sandwich"],
  // https://www.theentertainerme.com + Bahrain This Month 2026 key merchants
  Entertainer: ["nino", "jamies-italian"],
  // No public merchant list available yet — keep empty until verified.
  Unipal: [
    // Verified against https://unipal.me/en-bh/student-discounts/categories/restaurants-offers
    "wingman", "little-caesars", "mama-joz", "ghancha",
    "cut-burger", "gate-12", "black-strip", "lost-burger", "neon-burger",
  ],
  Batlco: [],
};

/** Per-restaurant offer text/link, keyed by restaurant id then offer app. */
const UNIPAL = "https://unipal.me/en-bh/student-discounts";
export const OFFER_DETAILS = {
  "wingman": { Unipal: { text: "Meal for 4 is Here! 🍗🌮", url: `${UNIPAL}/wingman` } },
  "little-caesars": { Unipal: { text: "2BD Medium Pizza", url: `${UNIPAL}/little-caesars-pizza` }, STC: { text: "Buy 1 Get 1 Free", url: "https://stcpay.com.bh/offers/stc-pay-offers/" } },
  "mama-joz": { Unipal: { text: "50% Discount on Medium Pizza", url: `${UNIPAL}/mama-joz-pizza` } },
  "ghancha": { Unipal: { text: "20% off", url: `${UNIPAL}/ghanchatna-restaurant` } },
  "cut-burger": { Unipal: { text: "Enjoy free Loaded Fries", url: `${UNIPAL}/cut-burger` } },
  "gate-12": { Unipal: { text: "20% OFF", url: `${UNIPAL}/gate-12-restaurant` } },
  "black-strip": { Unipal: { text: "Signature burger combo meal offer !", url: `${UNIPAL}/black-stripe` } },
  "lost-burger": { Unipal: { text: "15% OFF", url: `${UNIPAL}/lost-burger` } },
  "neon-burger": { Unipal: { text: "15% Off!", url: `${UNIPAL}/neon-burger` } },
  "fatto": { STC: { text: "15% off — stc Bahrain app (Time Out Market)", url: "https://www.stc.com.bh/deals" } },
  "chicket": { STC: { text: "Buy 1 Get 1 Free", url: "https://stcpay.com.bh/offers/stc-pay-offers/" } },
  "three-lines": { STC: { text: "15% discount", url: "https://stcpay.com.bh/offers/stc-pay-offers/" } },
  "sahburger": { STC: { text: "25% discount", url: "https://stcpay.com.bh/offers/stc-pay-offers/" } },
  "cheesy-burger": { STC: { text: "20% discount", url: "https://stcpay.com.bh/offers/stc-pay-offers/" } },
  "sammonah-sandwich": { STC: { text: "Buy 1 Get 1 Free", url: "https://stcpay.com.bh/offers/stc-pay-offers/" } },
  "nino": { Entertainer: { text: "Buy 1 Get 1 Free", url: "https://www.theentertainerme.com/en/bahrain" } },
  "jamies-italian": { Entertainer: { text: "Buy 1 Get 1 Free", url: "https://www.theentertainerme.com/en/bahrain" } },
};

/** Where each offer app's deals live, used when a restaurant has no direct link. */
export const OFFER_APP_URLS = {
  Unipal: "https://unipal.me/en-bh/student-discounts/categories/restaurants-offers",
  STC: "https://stcpay.com.bh/offers/stc-pay-offers/",
  Entertainer: "https://www.theentertainerme.com/en/bahrain",
  Batlco: "https://www.batelco.com/jawaher/",
};

/** Brand icon per offer app (falls back to the name if the icon fails to load). */
export const OFFER_APP_ICONS = {
  Unipal: "/offer-unipal.ico",
  STC: "/offer-stc.ico",
  Entertainer: "/offer-entertainer.ico",
  Batlco: "/offer-batlco.ico",
};

/** Offer lines for one restaurant: [{ app, text, url }] for every app it appears in. */
export function getOfferDetails(restaurantId) {
  const detail = OFFER_DETAILS[restaurantId] || {};
  return getOfferApps(restaurantId)
    .map((app) => {
      const entry = detail[app];
      const text = typeof entry === "string" ? entry : entry?.text || null;
      const url = (entry && entry.url) || OFFER_APP_URLS[app] || null;
      return { app, text, url };
    })
    // Only show apps that have a real offer detail for this restaurant.
    .filter((offer) => offer.text);
}

/** Get the list of offer apps for a restaurant. */
export function getOfferApps(restaurantId) {
  return OFFER_APPS.filter((app) => OFFERS[app].includes(restaurantId));
}

export const cuisines = ["All", ...new Set(restaurants.map((r) => r.cuisine))];

/** What the card and modal print: a researched summary, or whatever we have. */
export function hoursLabel(restaurant) {
  if (restaurant.openingHours) return formatHours(restaurant.openingHours);
  return restaurant.hours || "";
}

/** Every researched restaurant gets the summary without a second pass. */
for (const restaurant of restaurants) {
  if (restaurant.openingHours && !restaurant.hours) restaurant.hours = formatHours(restaurant.openingHours);
  // A tag naming a different food type than the researched cuisine would
  // contradict the card, so drop it. Done here because RESEARCHED can change
  // the cuisine after mk() has already run.
  const kept = restaurant.tags.filter((tag) => !CUISINE_FIX[tag] || CUISINE_FIX[tag] === restaurant.cuisine);
  restaurant.tags = kept.length ? kept : [restaurant.cuisine];
}

export const areas = [
  "All",
  ...[...new Set(restaurants.flatMap((r) => (r.branches.length ? r.branches : [r.area || r.address])))].filter(Boolean).sort(),
];

export function mapsUrl(restaurant) {
  if (restaurant.mapsPlaceId) {
    const q = encodeURIComponent(restaurant.name);
    return `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${restaurant.mapsPlaceId}`;
  }
  const q = encodeURIComponent(`${restaurant.name}, ${restaurant.address}, ${restaurant.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function branchMapsUrl(restaurant, branch) {
  const q = encodeURIComponent(`${restaurant.name} ${branch} Bahrain`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// "Seef • Adliya" when multi-branch, otherwise the area. A researched address
// is trimmed to the parts people recognise; the Maps link keeps the full one.
export function locationLabel(restaurant) {
  if (restaurant.branches && restaurant.branches.length > 1) return restaurant.branches.join(" • ");
  return restaurant.shortAddress || restaurant.address;
}

export function instagramUrl(restaurant) {
  const raw = (restaurant.instagram || "").trim();
  if (!raw) {
    // Fallback: Instagram keyword search so EVERY restaurant still has a link
    return `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(restaurant.name + " Bahrain")}`;
  }
  if (raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "").replace(/\/$/, "");
  return `https://www.instagram.com/${handle}/`;
}

export function instagramLabel(restaurant) {
  const raw = (restaurant.instagram || "").trim();
  if (!raw) return "Instagram ↗";
  if (raw.startsWith("http")) return "Instagram ↗";
  return `@${raw.replace(/^@/, "")}`;
}

export function talabatSearchUrl(restaurant) {
  if (restaurant.talabatUrl) return restaurant.talabatUrl;
  return `https://www.talabat.com/bahrain/search?q=${encodeURIComponent(restaurant.name)}`;
}

export function googleDetailsUrl(restaurant) {
  if (restaurant.placeId) return `https://www.google.com/maps/search/?api=1&query_place_id=${restaurant.placeId}`;
  return mapsUrl(restaurant);
}

// Merges Google Places overrides (scripts/enrich-places.js output).
// overrides shape: { [id]: { rating, reviews, address, hours, phone, image, placeId } }
export function applyPlaceOverrides(list, overrides = {}) {
  if (!overrides || Object.keys(overrides).length === 0) return list;
  return list.map((r) => {
    const o = overrides[r.id];
    if (!o) return r;
    return {
      ...r,
      rating: o.rating ?? r.rating,
      reviews: o.reviews ?? r.reviews,
      address: o.address ?? r.address,
      hours: o.hours ?? r.hours,
      phone: o.phone ?? r.phone,
      image: o.image ?? r.image,
      placeId: o.placeId ?? r.placeId,
      dataSource: "google-places",
    };
  });
}

// ============================================================
// Design prototype - NOT the live site.
// Renders the reference interface with the real restaurant data.
// Open:  http://localhost:5173/prototype.html
// ============================================================

import { restaurants, hoursLabel } from "/src/data/restaurants.js";

const root = document.getElementById("root");

// ---- icons ---------------------------------------------------------------
const svg = (paths, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;

const icons = {
  spark: svg('<path d="M12 1.6v20.8M1.6 12h20.8M4.5 4.5l15 15M19.5 4.5l-15 15"/>'),
  sparkFill: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6v20.8M1.6 12h20.8M4.5 4.5l15 15M19.5 4.5l-15 15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/></svg>`,
  arrow: svg('<path d="M7 17 17 7M9 7h8v8"/>', 'stroke-width="1.9"'),
  arrowOut: svg('<path d="M8 16 16 8M9 8h7v7"/>', 'stroke-width="1.9"'),
  pin: svg('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="1.8"'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  grid: svg('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>'),
  list: svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>'),
  map: svg('<path d="m9 5-6 3v11l6-3 6 3 6-3V5l-6 3z"/><path d="M9 5v11M15 8v11"/>'),
};

const esc = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- state ---------------------------------------------------------------
const state = { photos: "illustrative", cards: "grid" };

// ---- illustrative food photos (the real site photos are storefronts) -----
const FOOD = [
  "https://media.timeout.com/images/106206126/image.jpg",
  "https://www.the50.com/discovery/filestore/jpg/Fatto_dish1.jpg",
  "https://media-cdn.tripadvisor.com/media/photo-o/25/2c/36/ae/zulu.jpg",
  "https://zataat.bh/wp-content/uploads/2023/12/bbq-town-cover-1024x512.jpg",
  "https://gastronomica-me.com/wp-content/uploads/2022/09/Slider-Station-Cover.webp",
  "https://tapcom-live.ams3.cdn.digitaloceanspaces.com/media/the-block-bahrain-1/covers/DSC_1370_Copy.JPG",
  "https://ghancha.co/brand/ghancha/og.jpg",
  "https://naughtybyraaw.com/wp-content/uploads/2025/04/NBR.BirthMonths2-11-1.jpeg",
];
const heroPhoto = FOOD[0];

const photoFor = (restaurant, index) =>
  state.photos === "illustrative" ? FOOD[index % FOOD.length] : restaurant.image;

// ---- the round gold seal -------------------------------------------------
function seal() {
  return `
  <div class="seal" aria-hidden="true">
    <svg viewBox="0 0 140 140">
      <defs>
        <path id="sealTop" d="M 26 70 A 44 44 0 0 1 114 70" />
        <path id="sealBottom" d="M 20 70 A 50 50 0 0 0 120 70" />
      </defs>
      <text class="sealText"><textPath href="#sealTop" startOffset="50%" text-anchor="middle">LOCAL FINDS</textPath></text>
      <text class="sealText"><textPath href="#sealBottom" startOffset="50%" text-anchor="middle">HAPPY APPETITES</textPath></text>
      <g class="sealMark" transform="translate(70 70) scale(1.55) translate(-12 -12)">
        <path d="M12 1.6v20.8M1.6 12h20.8M4.5 4.5l15 15M19.5 4.5l-15 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      </g>
    </svg>
  </div>`;
}

// ---- sections ------------------------------------------------------------
function nav() {
  return `
  <nav>
    <div class="navin">
      <a class="word" href="#">foodfind ${icons.spark}</a>
      <div class="navlinks">
        <a href="#">Explore restaurants</a>
        <a href="#">Our story</a>
      </div>
      <button class="place">${icons.plus}<span>Bahrain</span>${icons.arrowOut}</button>
    </div>
  </nav>`;
}

function hero() {
  return `
  <header class="hero">
    <div class="herocopy">
      <p class="eyebrow"><span class="dot"></span>Big flavors. Local finds.</p>
      <h1>Your next<br /><span>&ldquo;let&rsquo;s eat here.&rdquo;</span></h1>
      <p class="lede">From neighborhood favorites to your next great discovery. Find a little more flavor in Bahrain.</p>
      <a class="cta" href="#results">Find my next bite ${icons.arrow}</a>
      <p class="fineprint">${icons.spark} Good food is closer than you think.</p>
    </div>
    <div class="herophoto">
      <img src="${heroPhoto}" alt="" onerror="this.src='${FOOD[1]}'" />
      ${seal()}
      <div class="overlay">
        <p class="overline">On the menu</p>
        <p class="overlayTitle">A little bit of everything.</p>
      </div>
    </div>
  </header>`;
}

function band() {
  const cells = ["Follow your cravings", "Find your new favorite", "Explore Bahrain, one bite at a time"];
  return `
  <div class="band">
    ${cells
      .map(
        (cell) => `<div class="bandcell"><span>${cell}</span>${icons.sparkFill}</div>`,
      )
      .join("")}
  </div>`;
}

function chip(restaurant) {
  const tags = restaurant.tags.map((t) => t.toLowerCase());
  if (tags.includes("family")) return "Something to share";
  if (restaurant.rating && restaurant.rating >= 4.5) return "Local favorite";
  return "Casual bites";
}

function card(restaurant, index) {
  const number = String(index + 1).padStart(2, "0");
  return `
  <article class="card">
    <a class="ph" href="#">
      <img src="${photoFor(restaurant, index)}" alt="" loading="lazy"
           onerror="this.onerror=null;this.src='${FOOD[(index + 3) % FOOD.length]}'" />
      <span class="tag">${esc(chip(restaurant))}</span>
      <span class="go">${icons.arrowOut}</span>
    </a>
    <div class="cb">
      <div class="cbrow">
        <span>${number} / ${esc(restaurant.city || "Bahrain")}</span>
        <span>${esc(restaurant.cuisine)}</span>
      </div>
      <h3>${esc(restaurant.name)}</h3>
      <p class="addr">${icons.pin}${esc(restaurant.address)}, ${esc(restaurant.city || "Bahrain")}</p>
      <div class="rule"></div>
      <div class="cfoot">
        <a class="menu" href="#">View menu</a>
        <a class="explore" href="#">Explore location ${icons.arrowOut}</a>
      </div>
    </div>
  </article>`;
}

function listRow(restaurant, index) {
  const number = String(index + 1).padStart(2, "0");
  return `
  <article class="lrow">
    <a class="lph" href="#"><img src="${photoFor(restaurant, index)}" alt="" loading="lazy" /><span class="tag">${esc(chip(restaurant))}</span></a>
    <div class="lb">
      <div class="cbrow"><span>${number} / ${esc(restaurant.city || "Bahrain")}</span><span>${esc(restaurant.cuisine)}</span></div>
      <h3>${esc(restaurant.name)}</h3>
      <p class="addr">${icons.pin}${esc(restaurant.address)}, ${esc(restaurant.city || "Bahrain")}</p>
      <p class="addr">${icons.spark}${esc(hoursLabel(restaurant))}</p>
    </div>
    <a class="explore" href="#">Explore location ${icons.arrowOut}</a>
  </article>`;
}

function results() {
  const list = restaurants.slice(0, 9);
  return `
  <main id="results">
    <div class="reshead">
      <p>${list.length} restaurants to discover</p>
      <div class="resright">
        <p>Made for your next meal.</p>
        <div class="views" role="group" aria-label="View">
          <button data-cards="grid" class="${state.cards === "grid" ? "on" : ""}">${icons.grid} Grid</button>
          <button data-cards="list" class="${state.cards === "list" ? "on" : ""}">${icons.list} List</button>
        </div>
      </div>
    </div>
    ${
      state.cards === "list"
        ? `<div class="list">${list.map(listRow).join("")}</div>`
        : `<div class="grid">${list.map(card).join("")}</div>`
    }
    <p class="disclaimer">Food photography is illustrative and does not represent each restaurant&rsquo;s menu.</p>
  </main>`;
}

// ---- render --------------------------------------------------------------
function render() {
  document.body.dataset.photos = state.photos;
  root.innerHTML = `${nav()}${hero()}${band()}${results()}`;
  document.querySelectorAll(".views [data-cards]").forEach((button) => {
    button.addEventListener("click", () => {
      state.cards = button.dataset.cards;
      render();
    });
  });
}

// Prototype toolbar.
document.querySelectorAll(".proto [data-photos], .proto [data-cards]").forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.photos ? "photos" : "cards";
    state[key] = button.dataset[key];
    document.querySelectorAll(`.proto [data-${key}]`).forEach((sibling) => sibling.classList.toggle("on", sibling === button));
    render();
  });
});

render();

import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// Leaflet and its clustering plugin are only needed once a visitor actually
// switches to the map, so they stay out of the initial bundle.
const MapView = lazy(() => import("./MapView.jsx"));
import {
  restaurants, cuisines, areas, isOpenNow, hasValidHours, OFFER_APPS, getOfferApps,
  getOfferDetails, MEAL_TIMES, getMealTimes, locationsFor,
} from "./data/restaurants";
import { hasStory } from "./data/stories";
import { StoryViewer } from "./Stories";
import RestaurantGrid from "./components/RestaurantGrid.jsx";
import RestaurantSearch from "./components/RestaurantSearch.jsx";
import HeroMeals from "./components/HeroMeals.jsx";
import MyMeals from "./components/MyMeals.jsx";
import { MEAL_HIGHLIGHTS } from "./data/meal-highlights.js";
import { nearestKm } from "./data/distance.js";
import { sortRecommended } from "./data/recommended.js";
import RestaurantFilters from "./components/RestaurantFilters.jsx";
import RestaurantPage from "./components/RestaurantPage.jsx";
import BranchPicker from "./components/BranchPicker.jsx";
import { OfferDetails, PhotoGallery } from "./components/cards/CardDialogs.jsx";
import { cardData } from "./components/cards/cardData.js";
import { handleImgError, handleLogoError } from "./components/media.js";
import {
  ARROW_UP_ICON, CHEVRON_ICON, CHEVRON_LEFT_ICON, CHEVRON_RIGHT_ICON, CLOCHE_ICON,
  CLOSE_ICON, COMPASS_ICON, GRID_ICON, HeartIcon, LIST_ICON, MAP_ICON, MENU_ICON, MOON_ICON,
  RESTAURANT_ICON, SEARCH_ICON, SLIDERS_ICON, SPARKLES_ICON, SUN_ICON, TAG_ICON,
} from "./components/icons.jsx";
import "./App.css";
import "./components/cards/cards.css";
import "./styles/home.css";
import "./styles/filters.css";
import "./styles/map.css";
import "./styles/popups.css";
import "./styles/footer.css";

// Tag-based categories offered in the Cuisine choice next to the real cuisines.
const EXTRA_CATEGORIES = ["Bahraini", "Seafood", "Breakfast"];

// PREVIEW ONLY (dev): ?header=new shows the proposed header (light, with
// the Manama sunset on the right), so it can be judged before it goes live.
const NEW_HEADER = import.meta.env.DEV && new URLSearchParams(window.location.search).get("header") === "new";

// The page's own title and description, kept so they can be put back when a
// restaurant page is closed.
const DEFAULT_TITLE = document.title;
const DEFAULT_DESCRIPTION = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

// Scrolls glide, unless the visitor has asked their device to reduce motion.
function scrollMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

function menuPhotoDimensions(restaurant, index) {
  const declared = restaurant.menuPhotoDimensions?.[index];
  // A 0 means the generator could not read the header; keep the page portrait.
  if (!declared || !declared[0] || !declared[1]) return [720, 1280];
  return declared;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLocaleLowerCase("en")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchIndex(restaurant) {
  const branches = restaurant.branches.map(normalizeSearchText).filter(Boolean);
  const tags = restaurant.tags.map(normalizeSearchText).filter(Boolean);
  const categories = restaurant.menu.map((category) => normalizeSearchText(category.category)).filter(Boolean);
  const items = restaurant.menu.flatMap((category) => [
    ...category.items.map((item) => ({
      name: normalizeSearchText(item.name),
      description: normalizeSearchText(item.description),
    })),
  ]);
  const index = {
    name: normalizeSearchText(restaurant.name),
    cuisine: normalizeSearchText(restaurant.cuisine),
    city: normalizeSearchText(restaurant.city),
    address: normalizeSearchText(restaurant.address),
    phone: normalizeSearchText(restaurant.phone),
    description: normalizeSearchText(restaurant.description),
    instagram: normalizeSearchText(restaurant.instagram),
    branches,
    tags,
    categories,
    items,
  };
  index.all = normalizeSearchText([
    index.name,
    index.cuisine,
    index.city,
    index.address,
    index.phone,
    index.description,
    index.instagram,
    ...index.branches,
    ...index.tags,
    ...index.categories,
    ...index.items.flatMap((item) => [item.name, item.description]),
  ].join(" "));
  return index;
}

const SEARCH_INDEX = new Map(restaurants.map((restaurant) => [restaurant.id, buildSearchIndex(restaurant)]));

function searchScore(index, query, tokens) {
  // Very short tokens must match a whole word, otherwise "ic pizza" also matches
  // every restaurant with "chicken" or "spicy" in it.
  const hasToken = (text, token) =>
    token.length < 3 ? new RegExp(`\\b${token}\\b`).test(text) : text.includes(token);
  if (!tokens.every((token) => hasToken(index.all, token))) return -1;

  let score = 1;
  if (index.name === query) score += 140;
  else if (index.name.startsWith(query)) score += 100;
  else if (index.name.includes(query)) score += 75;

  if (index.phone && index.phone.includes(query)) score += 90;
  if (index.cuisine === query) score += 60;
  else if (index.cuisine.includes(query)) score += 40;
  if (index.branches.some((branch) => branch === query)) score += 80;
  else if (index.branches.some((branch) => branch.includes(query))) score += 50;
  if (index.address === query) score += 70;
  else if (index.address.includes(query)) score += 45;
  if (index.tags.some((tag) => tag === query)) score += 45;
  else if (index.tags.some((tag) => tag.includes(query))) score += 30;
  if (index.categories.includes(query)) score += 35;
  if (index.description.includes(query)) score += 20;
  if (index.items.some((item) => item.name === query)) score += 70;
  else if (index.items.some((item) => item.name.startsWith(query))) score += 50;
  else if (index.items.some((item) => item.name.includes(query))) score += 30;
  if (tokens.length > 1 && index.name.includes(tokens.join(" "))) score += 35;
  return score;
}

// Saved places live in the browser, so no account is needed.
const FAVOURITES_KEY = "foodfind:favourites";
function readFavourites() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(FAVOURITES_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
}

// Dark mode: an explicit choice overrides the OS setting until cleared.
const THEME_KEY = "foodfind:theme";
function readTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) || "system";
  } catch {
    return "system";
  }
}

export default function App() {
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("All");
  const [area, setArea] = useState("All");
  const [offerApp, setOfferApp] = useState("All");
  const [mealTime, setMealTime] = useState("All");
  const [offersOnly, setOffersOnly] = useState(false);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [minRating, setMinRating] = useState("Any");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState("recommended");
  // "Nearest to me": the visitor's position, asked for only when they pick
  // that sort. It stays in this tab and is never stored or sent anywhere.
  const [here, setHere] = useState(null);
  const [locating, setLocating] = useState("idle"); // idle | asking | denied | unavailable
  const distances = useMemo(
    () => (here ? new Map(restaurants.map((restaurant) => [restaurant.id, nearestKm(restaurant, here)])) : null),
    [here]
  );
  // Asks the browser once; the sort and the map's "Near me" button share it.
  const locate = useCallback(
    (then) => {
      if (here) {
        setLocating("idle");
        then?.(here);
        return;
      }
      if (!navigator.geolocation) {
        setLocating("unavailable");
        return;
      }
      setLocating("asking");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const point = { lat: position.coords.latitude, lng: position.coords.longitude };
          setHere(point);
          setLocating("idle");
          then?.(point);
        },
        (error) => setLocating(error.code === 1 ? "denied" : "unavailable"),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
      );
    },
    [here]
  );
  const chooseSort = (value) => {
    if (value === "nearest") {
      locate(() => setSort("nearest"));
      return;
    }
    setLocating("idle");
    setSort(value);
  };
  const [selectedId, setSelectedId] = useState(null);
  // The branch the visitor picked, and the place whose branch list is open.
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchPickerId, setBranchPickerId] = useState(null);
  const [branchPickerMode, setBranchPickerMode] = useState("browse");
  const [modalView, setModalView] = useState("details");
  const [activeMenuPhoto, setActiveMenuPhoto] = useState(0);
  const [storyId, setStoryId] = useState(null);
  // Which highlights are playing: the restaurants' own, or my meals.
  const [storySet, setStorySet] = useState("restaurants");
  const [favourites, setFavourites] = useState(readFavourites);
  const [savedOnly, setSavedOnly] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(readTheme);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const listScrollRef = useRef(0);
  const onDetailsPageRef = useRef(false);
  // True when the menu viewer was opened from a restaurant's own page, so
  // closing it returns there instead of to the list.
  const [menuOverPage, setMenuOverPage] = useState(false);

  const filtered = useMemo(() => {
    // "Recommended" puts the best-rated, most complete listings first (see
    // data/recommended.js); with words typed in, relevance stays in charge.
    // The other sorts are plain and stable, so a place never jumps around.
    const order = (list) => {
      if (sort === "recommended" && !hasTextQuery) return sortRecommended(list);
      if (sort === "rating") {
        return [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name));
      }
      if (sort === "name") {
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
      }
      if (sort === "nearest" && distances) {
        const km = (place) => distances.get(place.id)?.km ?? Infinity;
        return [...list].sort((a, b) => km(a) - km(b));
      }
      return list;
    };

    const normalizedQuery = normalizeSearchText(query);
    const tokens = normalizedQuery ? normalizedQuery.split(" ").filter(Boolean) : [];
    const normalizedArea = normalizeSearchText(area);
    const hasTextQuery = tokens.length > 0;

    // A type filter and an area filter: both are exact, so what the dropdown
    // promises is what you get.
    const candidates = restaurants.filter((restaurant) => {
      if (cuisine !== "All" && restaurant.cuisine !== cuisine && !(restaurant.tags || []).some((tag) => tag === cuisine)) return false;
      if (area !== "All") {
        // Branches win when they exist; otherwise the researched area, and the
        // full address as a last resort so nothing becomes unfilterable.
        const zones = restaurant.branches.length
          ? restaurant.branches
          : [restaurant.area || restaurant.address, restaurant.address].filter(Boolean);
        if (!zones.map(normalizeSearchText).includes(normalizedArea)) return false;
      }
      if (offerApp !== "All" && !getOfferApps(restaurant.id).includes(offerApp)) return false;
      // Meal time: breakfast, lunch or dinner, as read off the opening hours.
      if (mealTime !== "All" && !getMealTimes(restaurant).includes(mealTime)) return false;
      // Offers only: the place has a real, published offer behind it.
      if (offersOnly && getOfferDetails(restaurant.id).length === 0) return false;
      // Open now: only for places with a researched week of opening hours.
      if (openNowOnly && isOpenNow(restaurant.openingHours) !== true) return false;
      // Rating: only places that really have one can be counted.
      if (minRating !== "Any" && !(restaurant.rating >= Number(minRating))) return false;
      // Saved places only.
      if (savedOnly && !favourites.has(restaurant.id)) return false;
      return true;
    });

    if (!hasTextQuery) {
      return order(candidates);
    }

    const scored = candidates
      .map((restaurant) => {
        const index = SEARCH_INDEX.get(restaurant.id);
        return { restaurant, score: searchScore(index, normalizedQuery, tokens) };
      })
      .filter((result) => result.score >= 0)
      .sort((a, b) => b.score - a.score)
      .map(({ restaurant }) => restaurant);
    return order(scored);
  }, [query, cuisine, area, offerApp, mealTime, offersOnly, openNowOnly, minRating, savedOnly, favourites, sort, distances]);

  const toggleFavourite = useCallback((id) => {
    setFavourites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify([...next]));
      } catch {
        // A private window may refuse to store; the card still works for now.
      }
      return next;
    });
  }, []);

  const selected = restaurants.find((r) => r.id === selectedId) || null;

  // Sharing a place: the phone's own share sheet where there is one, and a
  // copied link everywhere else. Either way the card says it worked.
  const shareRestaurant = useCallback(async (restaurant) => {
    const url = `${window.location.origin}${window.location.pathname}#restaurant/${restaurant.id}`;
    const payload = { title: restaurant.name, text: `${restaurant.name} on FoodFind`, url };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Older browsers without clipboard access still get a copy.
      const field = document.createElement("textarea");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      try {
        document.execCommand("copy");
      } catch {
        // Nothing else to try: the share sheet was already offered.
      }
      document.body.removeChild(field);
    }
  }, []);

  // Deep-link: /#restaurant-<id> opens that restaurant's details popup.
  useEffect(() => {
    const m = window.location.hash.match(/^#restaurant\/([a-z0-9-]+)/i);
    if (m) {
      const r = restaurants.find((x) => x.id === m[1]);
      if (r) openRestaurant(r, { view: "details" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) {
      const hash = `#restaurant/${selectedId}`;
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
      }
    } else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [selectedId]);

  // Sync state when the user presses the browser back button.
  useEffect(() => {
    const onPopState = () => {
      const m = window.location.hash.match(/^#restaurant\/([a-z0-9-]+)/i);
      if (m) {
        const r = restaurants.find((x) => x.id === m[1]);
        if (r) { openRestaurant(r, { view: "details" }); return; }
      }
      setSelectedId(null);
      setModalView("details");
      setActiveMenuPhoto(0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [view, setView] = useState("grid");
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dark mode: "system" leaves the OS preference alone, anything else pins it.
  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // A private window may refuse to store; the choice just won't persist.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setTheme((current) => {
      const currentlyDark = current === "dark" || (current === "system" && prefersDark);
      return currentlyDark ? "light" : "dark";
    });
  }, []);
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  // Close nav panel on Escape.
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setNavOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  // Close nav panel whenever the view changes (e.g. switching to Map).
  useEffect(() => {
    setNavOpen(false);
  }, [view]);

  // Lock scroll when the menu viewer modal is open.
  useEffect(() => {
    if (selectedId === null || modalView !== "menu") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setModalView("details");
        setActiveMenuPhoto(0);
        if (menuOverPage) setMenuOverPage(false);
        else setSelectedId(null);
        return;
      }
      const pageCount = selected?.menuPhotos.length || 0;
      if (event.key === "ArrowRight" && pageCount > 1) {
        setActiveMenuPhoto((index) => (index + 1) % pageCount);
        return;
      }
      if (event.key === "ArrowLeft" && pageCount > 1) {
        setActiveMenuPhoto((index) => (index - 1 + pageCount) % pageCount);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;
      if (!modalRef.current.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedId, modalView, selected?.menuPhotos.length, menuOverPage]);

  // The branch list of one place, opened from its card. "directions" asks
  // which branch to navigate to; "browse" opens that branch's details.
  const openBranchPicker = useCallback((restaurant, source, mode = "browse") => {
    lastFocusedElementRef.current = source || document.activeElement;
    setBranchPickerMode(mode);
    setBranchPickerId(restaurant.id);
  }, []);

  // A card's offer details or full photo gallery, opened over the list.
  const [cardDialog, setCardDialog] = useState(null);
  const openOffers = useCallback((restaurant, trigger) => setCardDialog({ type: "offers", restaurant, trigger }), []);
  const openGallery = useCallback((restaurant, trigger) => setCardDialog({ type: "gallery", restaurant, trigger }), []);
  const closeCardDialog = useCallback(() => setCardDialog(null), []);

  const closeBranchPicker = useCallback(() => {
    setBranchPickerId(null);
    const target = lastFocusedElementRef.current;
    if (target && target.isConnected) target.focus();
  }, []);

  // Picking a branch opens the place's details on that branch.
  const pickBranch = useCallback((location) => {
    const restaurant = restaurants.find((r) => r.id === branchPickerId);
    setBranchPickerId(null);
    if (restaurant) openRestaurant(restaurant, { source: lastFocusedElementRef.current, branch: location });
  }, [branchPickerId]);

  // The branch list is its own popup: Escape closes it and the page behind
  // it stands still while it is open.
  useEffect(() => {
    if (!branchPickerId) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeBranchPicker();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [branchPickerId, closeBranchPicker]);

  function openRestaurant(restaurant, options = {}) {
    if (!onDetailsPageRef.current) listScrollRef.current = window.scrollY;
    lastFocusedElementRef.current =
      options.source ?? document.activeElement;
    const openMenu = options.view === "menu" && restaurant.menuPhotos.length > 0;
    setSelectedId(restaurant.id);
    setModalView(openMenu ? "menu" : "details");
    setActiveMenuPhoto(0);
    // A new place starts on its own first branch.
    if (options.branch !== undefined) setSelectedBranch(options.branch || null);
    else setSelectedBranch(null);
  }

  // The map opens a place the same way a card does (so the list remembers
  // where it was), through one stable handler so its pins are not rebuilt
  // on every render.
  const openRestaurantRef = useRef(openRestaurant);
  useEffect(() => {
    openRestaurantRef.current = openRestaurant;
  });
  const openFromMap = useCallback((id) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) openRestaurantRef.current(restaurant);
  }, []);

  function closeRestaurant() {
    setSelectedId(null);
    setModalView("details");
    setActiveMenuPhoto(0);
    setMenuOverPage(false);
  }

  function closeMenu() {
    if (!menuOverPage) {
      closeRestaurant();
      return;
    }
    setModalView("details");
    setActiveMenuPhoto(0);
    setMenuOverPage(false);
  }

  // The branch list of one place, opened from its card.
  const branchPickerRestaurant = restaurants.find((r) => r.id === branchPickerId) || null;
  const branchPickerLocations = branchPickerRestaurant ? locationsFor(branchPickerRestaurant) : null;

  // A restaurant page opens at its top; going back returns to the same spot
  // in the list instead of wherever the page happened to be scrolled.
  const onDetailsPage = Boolean(selectedId && selected && (modalView === "details" || menuOverPage));
  useLayoutEffect(() => {
    onDetailsPageRef.current = onDetailsPage;
    window.scrollTo({ top: onDetailsPage ? 0 : listScrollRef.current, behavior: "instant" });
  }, [onDetailsPage]);

  // The place whose details are on screen, and the branch picked for it.
  const locations = selected ? locationsFor(selected) : null;
  const branch = selectedBranch && locations ? selectedBranch : null;

  // Story highlights: opening one from a card circle or the details page.
  const [storyTrigger, setStoryTrigger] = useState(null);
  const openStory = useCallback((id, trigger, set = "restaurants") => {
    if (!id) return;
    setStorySet(set);
    setStoryTrigger(trigger || document.activeElement);
    lastFocusedElementRef.current = document.activeElement;
    setStoryId(id);
  }, []);

  const openDetailsFromStory = useCallback((id) => {
    setStoryId(null);
    if (!id) return;
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) openRestaurant(restaurant, { source: document.activeElement, view: "details" });
  }, []);

  // How many places can do each meal. Same rule as the filter, so the
  // number in the dropdown is exactly the number of results.
  const mealCounts = useMemo(() => {
    const counts = {};
    for (const meal of MEAL_TIMES) {
      counts[meal] = restaurants.filter((r) => getMealTimes(r).includes(meal)).length;
    }
    return counts;
  }, []);

  // A meal nobody serves is not worth offering, but the one you picked stays
  // so the dropdown never goes blank.
  const offeredMeals = MEAL_TIMES.filter((meal) => (mealCounts[meal] ?? 0) > 0 || meal === mealTime);

  // How many places really have an offer behind them.
  const offerCount = useMemo(
    () => restaurants.filter((r) => getOfferDetails(r.id).length > 0).length,
    []
  );

  // How many places are open right now. Only counted for places with a
  // researched week of hours, so the number is never a guess.
  const openNowCount = useMemo(
    () => restaurants.filter((r) => hasValidHours(r) && isOpenNow(r.openingHours) === true).length,
    []
  );

  // The rating steps that would actually return something.
  const ratingOptions = useMemo(() => {
    const options = [{ value: "Any", label: "Any rating" }];
    for (const step of [4.5, 4, 3.5]) {
      const count = restaurants.filter((r) => r.rating >= step).length;
      if (count > 0) options.push({ value: String(step), label: `${step}★ and up (${count})` });
    }
    return options;
  }, []);

  const hasFilters =
    cuisine !== "All" || area !== "All" || offerApp !== "All" || mealTime !== "All" ||
    offersOnly || openNowOnly || minRating !== "Any" || Boolean(query);

  // How many of the extra filters are on. The type of food, the area and the
  // offers are in the search bar, so they are not counted here.
  const activeFilterCount =
    (mealTime !== "All" ? 1 : 0) + (offersOnly ? 1 : 0) + (openNowOnly ? 1 : 0) + (minRating !== "Any" ? 1 : 0);

  const clearAll = () => {
    setQuery("");
    setCuisine("All");
    setArea("All");
    setOfferApp("All");
    setMealTime("All");
    setOffersOnly(false);
    setOpenNowOnly(false);
    setMinRating("Any");
  };

  const scrollToResults = () => {
    document.getElementById("restaurant-grid")?.scrollIntoView({ behavior: scrollMotion(), block: "start" });
  };

  // The header links: each one takes the visitor to the grid and puts it in
  // the right state.
  const goToExplore = () => {
    setView("grid");
    setCuisine("All");
    setOffersOnly(false);
    scrollToResults();
  };
  const goToCuisines = () => {
    document.querySelector(".search-shell")?.scrollIntoView({ behavior: scrollMotion(), block: "center" });
    window.setTimeout(() => document.querySelector('.finder select[name="cuisine"]')?.focus(), 320);
  };
  const goToOffers = () => {
    setView("grid");
    setOffersOnly(true);
    scrollToResults();
  };
  const goToMap = () => {
    setView("map");
    scrollToResults();
  };
  const activeNav = view === "map" ? "map" : offersOnly ? "offers" : "explore";

  // The Cuisine choice in the search box: every real cuisine, busiest first,
  // then a few tag-based categories. The cuisine filter matches tags too, so
  // the count next to each one is exactly what picking it returns.
  const categories = useMemo(() => {
    const countFor = (name) =>
      restaurants.filter((r) => r.cuisine === name || (r.tags || []).includes(name)).length;
    const real = cuisines
      .filter((name) => name !== "All")
      .map((name) => ({ name, count: countFor(name) }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
    const extra = EXTRA_CATEGORIES
      .filter((name) => !cuisines.includes(name))
      .map((name) => ({ name, count: countFor(name) }))
      .filter((item) => item.count > 0);
    return [{ name: "All", count: restaurants.length }, ...real, ...extra];
  }, []);
  const categoryCounts = useMemo(() => Object.fromEntries(categories.map((item) => [item.name, item.count])), [categories]);
  // The search field above the grid, so the hero can send you straight to it.
  const focusSearch = () => {
    scrollToResults();
    window.setTimeout(() => {
      document.querySelector('.finder-field--search input[type="search"]')?.focus();
    }, 320);
  };

  // A short note at the bottom of the screen.
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Surprise me: open one of the places that match what is on screen.
  const surpriseMe = useCallback(() => {
    const pool = filtered.length ? filtered : restaurants;
    if (!pool.length) {
      showToast("No restaurants match your filters");
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    openRestaurant(pick, { source: document.activeElement });
  }, [filtered, showToast]);

  // "/" jumps to the search box, as long as no field is already being typed in.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (selectedId) return;
      event.preventDefault();
      document.querySelector('.finder-field--search input[type="search"]')?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  // The menu viewer opens over whichever view it was opened from.
  const menuViewer = selected && modalView === "menu" && selected.menuPhotos.length > 0 ? (
        <div className="modal-backdrop menu-viewer-backdrop" onClick={closeMenu}>
          <div
            className="menu-viewer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-viewer-title"
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="menu-viewer-header">
              <div className="menu-viewer-identity">
                <span className="highlight-wrap menu-viewer-logo">
                  <span className="highlight-letter">{selected.name.charAt(0)}</span>
                  <img
                    className="highlight"
                    src={selected.logoUpload}
                    data-rid={selected.id}
                    data-official={selected.logo}
                    onError={handleLogoError}
                    alt=""
                    width="44"
                    height="44"
                  />
                </span>
                <div>
                  <h2 id="menu-viewer-title">{selected.name} Menu</h2>
                  <p>Page {activeMenuPhoto + 1} of {selected.menuPhotos.length}</p>
                </div>
              </div>
              <button
                type="button"
                className="close"
                aria-label={`Close ${selected.name} menu`}
                ref={closeButtonRef}
                onClick={closeMenu}
              >
                {CLOSE_ICON}
              </button>
            </header>
            <div className="menu-viewer-body">
              <div className="menu-page-preview" aria-live="polite">
                <a
                  href={selected.menuPhotos[activeMenuPhoto]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open menu page ${activeMenuPhoto + 1} full size`}
                >
                  <img
                    src={selected.menuPhotos[activeMenuPhoto]}
                    data-fallbacks={(selected.menuPhotoFallbacks?.[activeMenuPhoto] || []).join(",")}
                    onError={handleImgError}
                    alt={`${selected.name} menu page ${activeMenuPhoto + 1}`}
                    width={menuPhotoDimensions(selected, activeMenuPhoto)[0]}
                    height={menuPhotoDimensions(selected, activeMenuPhoto)[1]}
                    fetchPriority="high"
                  />
                </a>
                {selected.menuPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="menu-page-arrow menu-page-arrow--prev"
                      aria-label="Previous menu page"
                      onClick={() => setActiveMenuPhoto((index) => (index - 1 + selected.menuPhotos.length) % selected.menuPhotos.length)}
                    >
                      {CHEVRON_LEFT_ICON}
                    </button>
                    <button
                      type="button"
                      className="menu-page-arrow menu-page-arrow--next"
                      aria-label="Next menu page"
                      onClick={() => setActiveMenuPhoto((index) => (index + 1) % selected.menuPhotos.length)}
                    >
                      {CHEVRON_RIGHT_ICON}
                    </button>
                  </>
                )}
              </div>
              <div className="menu-thumbnails" role="group" aria-label={`${selected.name} menu pages`}>
                {selected.menuPhotos.map((photo, index) => (
                  <button
                    type="button"
                    className={
                      menuPhotoDimensions(selected, index)[0] > menuPhotoDimensions(selected, index)[1]
                        ? "landscape"
                        : "portrait"
                    }
                    key={photo}
                    aria-label={`Show menu page ${index + 1}`}
                    aria-pressed={activeMenuPhoto === index}
                    onClick={() => setActiveMenuPhoto(index)}
                  >
                    <img
                      src={photo}
                      alt=""
                      width={menuPhotoDimensions(selected, index)[0]}
                      height={menuPhotoDimensions(selected, index)[1]}
                      loading="lazy"
                    />
                    <span>{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
  ) : null;

  // Full restaurant page (replaces the listing)
  // A restaurant page gets its own tab title and description (real text
  // only: a templated description is never used); closing it restores both.
  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    if (!selected || !onDetailsPage) {
      document.title = DEFAULT_TITLE;
      meta?.setAttribute("content", DEFAULT_DESCRIPTION);
      return undefined;
    }
    const where = selected.area || "Bahrain";
    const about = [selected.cuisine, where].filter(Boolean).join(" in ");
    document.title = `${selected.name}${about ? ` – ${about}` : ""} | FoodFind`;
    const real = cardData(selected).description;
    meta?.setAttribute("content", real || `${selected.name}${about ? `, ${about}` : ""}. Find it on FoodFind.`);
    return () => {
      document.title = DEFAULT_TITLE;
      meta?.setAttribute("content", DEFAULT_DESCRIPTION);
    };
  }, [selected, onDetailsPage]);

  // With the new header, the top bar sits clear over the photo while you are
  // at the top of the page, and turns back into the solid bar once you scroll.
  const [navClear, setNavClear] = useState(true);
  useEffect(() => {
    if (!NEW_HEADER) return undefined;
    const check = () => setNavClear(window.scrollY < 12);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [onDetailsPage]);

  if (onDetailsPage) {
    return (
      <>
        <RestaurantPage
          key={selected.id}
          restaurant={selected}
          locations={locations}
          branch={branch}
          onClose={closeRestaurant}
          onShare={shareRestaurant}
          onToggleSave={toggleFavourite}
          onOpenMenuPage={(place, index) => {
            lastFocusedElementRef.current = document.activeElement;
            setActiveMenuPhoto(index);
            setMenuOverPage(true);
            setModalView("menu");
          }}
          onOpenLocations={openBranchPicker}
          onOpenRestaurant={(place, trigger) => openRestaurant(place, { source: trigger })}
          isSaved={favourites.has(selected.id)}
          paused={modalView === "menu"}
        />

        {menuViewer}

        {branchPickerRestaurant && branchPickerLocations && (
          <BranchPicker
            restaurant={branchPickerRestaurant}
            locations={branchPickerLocations}
            onSelect={pickBranch}
            onClose={closeBranchPicker}
            mode={branchPickerMode}
          />
        )}

        {toast && (
          <p className="toast" role="status" aria-live="polite">{toast}</p>
        )}
      </>
    );
  }

  const searchBox = (
    <RestaurantSearch
      query={query}
      onQueryChange={setQuery}
      onSubmit={scrollToResults}
      cuisines={categories.map((item) => item.name)}
      foodCounts={categoryCounts}
      cuisine={cuisine}
      onCuisineChange={setCuisine}
      areas={areas}
      area={area}
      onAreaChange={setArea}
      offerApps={OFFER_APPS}
      offerApp={offerApp}
      onOfferAppChange={setOfferApp}
      rich={NEW_HEADER}
    />
  );

  return (
    <div className="page">
      <a className="skip-link" href="#restaurant-grid">Skip to restaurants</a>

      <nav className={`nav ${NEW_HEADER ? "nav--new" : ""} ${NEW_HEADER && navClear ? "nav--clear" : ""}`.trim().replace(/ +/g, " ")}>
        <div className="navin">
          <a className="word" href="#top" aria-label="FoodFind, back to the top">
            foodfind<span className="word-dot" aria-hidden="true">.</span>
          </a>
          <div className="navlinks">
            <button
              type="button"
              className={`navlink ${activeNav === "explore" ? "on" : ""}`}
              aria-current={activeNav === "explore" ? "page" : undefined}
              onClick={goToExplore}
            >
              {NEW_HEADER ? <>{RESTAURANT_ICON}Explore restaurants</> : "Restaurants"}
            </button>
            {NEW_HEADER ? (
              <button type="button" className="navlink" onClick={goToCuisines}>
                {CLOCHE_ICON}Cuisines
              </button>
            ) : null}
            <button
              type="button"
              className={`navlink ${activeNav === "offers" ? "on" : ""}`}
              aria-current={activeNav === "offers" ? "page" : undefined}
              onClick={goToOffers}
            >
              {NEW_HEADER ? TAG_ICON : null}Offers
            </button>
            <button
              type="button"
              className={`navlink ${activeNav === "map" ? "on" : ""}`}
              aria-current={activeNav === "map" ? "page" : undefined}
              onClick={goToMap}
            >
              {NEW_HEADER ? MAP_ICON : null}Map
            </button>
          </div>
          <div className="navright">
            <button
              type="button"
              className="nav-icon"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
            >
              {isDark ? SUN_ICON : MOON_ICON}
            </button>

            <button
              type="button"
              className={`nav-icon ${savedOnly ? "on" : ""}`}
              aria-pressed={savedOnly}
              aria-label={savedOnly ? "Show every restaurant again" : "Show saved restaurants"}
              onClick={() => {
                setSavedOnly((on) => !on);
                scrollToResults();
              }}
            >
              <HeartIcon filled={savedOnly} />
              {favourites.size > 0 && <span className="nav-count">{favourites.size}</span>}
            </button>

            <button
              type="button"
              className="nav-menu"
              aria-expanded={navOpen}
              aria-label={navOpen ? "Close menu" : "Open menu"}
              onClick={() => setNavOpen((open) => !open)}
            >
              {MENU_ICON}
            </button>
          </div>
        </div>
        {navOpen && (
          <>
            <div
              className="nav-panel-backdrop"
              aria-hidden="true"
              onClick={() => setNavOpen(false)}
            />
            <div className="nav-panel" role="menu">
              <button type="button" role="menuitem" onClick={() => { setNavOpen(false); goToExplore(); }}>
                {COMPASS_ICON} Explore restaurants
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSavedOnly(true);
                  setNavOpen(false);
                  scrollToResults();
                }}
              >
                <HeartIcon filled={favourites.size > 0} />
                Saved places{favourites.size > 0 ? ` (${favourites.size})` : ""}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setNavOpen(false);
                  surpriseMe();
                }}
              >
                {SPARKLES_ICON} Surprise me
              </button>
            </div>
          </>
        )}
      </nav>

      {/* The front page: the meals banner with the search under it, then
          the cuisine chips and the restaurants. */}
      {NEW_HEADER ? (
        /* Light, with the Manama sunset on the right melting into the page;
           the headline on the left and the full search across the bottom. */
        <header className="lighthead" id="top">
          <div className="lighthead-photo" aria-hidden="true" />
          <div className="lighthead-inner">
            <p className="lighthead-eyebrow">Big flavours. Local finds.</p>
            <h1>Discover amazing food <span>in Bahrain</span></h1>
            <p className="lighthead-sub">Explore {restaurants.length} restaurants with real menus, hours and locations.</p>
            <div className="lighthead-search">{searchBox}</div>
          </div>
        </header>
      ) : (
        <header className="hero" id="top">
          <div className="hero-inner">
            {/* The banner: a welcome slide, then the best meals, one per slide. */}
            <HeroMeals total={restaurants.length} onOpen={(place, trigger) => openRestaurant(place, { source: trigger })} />
            <div className="search-shell">{searchBox}</div>
          </div>
        </header>
      )}


      <main className="results" id="restaurant-grid">
        {/* My own meal photos, only on the plain list (no search or filters). */}
        {!hasFilters && !savedOnly && view !== "map" ? (
          <MyMeals onOpenStory={(id, trigger) => openStory(id, trigger, "meals")} />
        ) : null}
        <div className="results-head">
          <div className="results-title">
            <h2>{savedOnly ? "Saved places" : cuisine === "All" ? "All restaurants" : cuisine}</h2>
            <p className="result-count" role="status" aria-live="polite" aria-atomic="true">
              <strong>{filtered.length}</strong> {filtered.length === 1 ? "place" : "places"}
              {area !== "All" ? ` in ${area}` : " across Bahrain"}
            </p>
            {/* What "Nearest to me" is doing, in plain words. */}
            {locating !== "idle" || sort === "nearest" ? (
              <p className={`sort-note ${locating === "denied" || locating === "unavailable" ? "is-problem" : ""}`} role="status">
                {locating === "asking"
                  ? "Finding where you are…"
                  : locating === "denied"
                    ? "Location is off for this site. Allow location in your browser settings, then try again."
                    : locating === "unavailable"
                      ? "We couldn't find where you are. Try again in a moment."
                      : "Closest first, measured in a straight line from you."}
              </p>
            ) : null}
            {hasFilters && (
              <button type="button" className="clear-link" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
          <div className="toolbar">
            <button
              type="button"
              className={`more-filters ${filtersOpen || activeFilterCount > 0 ? "is-open" : ""}`}
              aria-expanded={filtersOpen}
              aria-controls="filter-panel"
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {SLIDERS_ICON}
              <span>Filters</span>
              {activeFilterCount > 0 && <span className="more-filters-count">{activeFilterCount}</span>}
            </button>
            <label className="sort-wrap">
              <span className="sr-only">Sort restaurants</span>
              <select id="sort" value={sort} onChange={(e) => chooseSort(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="nearest">Nearest to me</option>
                <option value="rating">Top rated</option>
                <option value="name">Name A–Z</option>
              </select>
              {CHEVRON_ICON}
            </label>
            <div className="view-toggle" role="group" aria-label="View">
              <button type="button" className={`view-toggle-btn ${view === "grid" ? "on" : ""}`} aria-pressed={view === "grid"} aria-label="Grid view" title="Grid" onClick={() => setView("grid")}>
                {GRID_ICON}
              </button>
              <button type="button" className={`view-toggle-btn ${view === "list" ? "on" : ""}`} aria-pressed={view === "list"} aria-label="List view" title="List" onClick={() => setView("list")}>
                {LIST_ICON}
              </button>
              <button type="button" className={`view-toggle-btn ${view === "map" ? "on" : ""}`} aria-pressed={view === "map"} aria-label="Map view" title="Map" onClick={() => setView("map")}>
                {MAP_ICON}
              </button>
            </div>
          </div>
        </div>

        <RestaurantFilters
          meals={offeredMeals}
          mealTime={mealTime}
          onMealTimeChange={setMealTime}
          offersOnly={offersOnly}
          onOffersOnlyChange={setOffersOnly}
          offerCount={offerCount}
          openNow={openNowOnly}
          onOpenNowChange={setOpenNowOnly}
          openNowCount={openNowCount}
          ratingOptions={ratingOptions}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          hasFilters={hasFilters}
          onClear={clearAll}
          open={filtersOpen}
        />

        {filtered.length === 0 && (
          <div className="empty" role="status">
            <strong>No restaurants found</strong>
            <span>
              {query
                ? `Nothing matches “${query}” with the selected filters.`
                : "No restaurants match the selected filters."}
            </span>
            <button type="button" className="btn" onClick={clearAll}>Clear all</button>
          </div>
        )}

        {view === "map" ? (
          <Suspense fallback={<div className="map-view-loading">Loading map…</div>}>
            <MapView restaurants={filtered} onOpen={openFromMap} here={here} locating={locating === "asking"} onLocate={() => locate()} />
          </Suspense>
        ) : (
          <RestaurantGrid
            restaurants={filtered}
            view={view}
            favourites={favourites}
            onToggleSaved={toggleFavourite}
            onOpen={(restaurant, trigger) => openRestaurant(restaurant, { source: trigger })}
            hasStory={hasStory}
            distances={distances}
            onOpenStory={openStory}
            onOpenMenu={(restaurant, trigger) => openRestaurant(restaurant, { source: trigger, view: "menu" })}
            onChooseBranch={openBranchPicker}
            onOpenOffers={openOffers}
            onOpenGallery={openGallery}
          />
        )}
        {cardDialog?.type === "offers" && (
          <OfferDetails
            restaurant={cardDialog.restaurant}
            offers={cardData(cardDialog.restaurant).offers}
            onClose={closeCardDialog}
            returnTo={cardDialog.trigger}
          />
        )}
        {cardDialog?.type === "gallery" && (
          <PhotoGallery
            restaurant={cardDialog.restaurant}
            photos={cardData(cardDialog.restaurant).gallery}
            onClose={closeCardDialog}
            returnTo={cardDialog.trigger}
          />
        )}

      </main>

      <nav className="mobile-bottom" aria-label="Quick navigation">
        <button
          type="button"
          className={view !== "map" && !savedOnly ? "on" : ""}
          aria-current={view !== "map" && !savedOnly ? "page" : undefined}
          onClick={() => { setSavedOnly(false); goToExplore(); }}
        >
          {COMPASS_ICON} Explore
        </button>
        <button type="button" onClick={focusSearch}>
          {SEARCH_ICON} Search
        </button>
        <button
          type="button"
          className={view === "map" ? "on" : ""}
          aria-current={view === "map" ? "page" : undefined}
          onClick={goToMap}
        >
          {MAP_ICON} Map
        </button>
        <button
          type="button"
          className={savedOnly ? "on" : ""}
          aria-pressed={savedOnly}
          onClick={() => { setSavedOnly((on) => !on); scrollToResults(); }}
        >
          <HeartIcon filled={savedOnly} /> Saved
          {favourites.size > 0 && <span className="mobile-count">{favourites.size}</span>}
        </button>
      </nav>

      {toast && (
        <p className="toast" role="status" aria-live="polite">{toast}</p>
      )}

      {menuViewer}

      {branchPickerRestaurant && branchPickerLocations && (
        <BranchPicker
          restaurant={branchPickerRestaurant}
          locations={branchPickerLocations}
          onSelect={pickBranch}
          onClose={closeBranchPicker}
          mode={branchPickerMode}
        />
      )}

      {storyId && (
        <StoryViewer
          key={`${storySet}-${storyId}`}
          storyId={storyId}
          groups={storySet === "meals" ? MEAL_HIGHLIGHTS : undefined}
          trigger={storyTrigger}
          onClose={() => setStoryId(null)}
          onStoryChange={setStoryId}
          onOpenDetails={openDetailsFromStory}
        />
      )}

      <footer className="footer">
        <div className="footin">
          <div className="foot-brand">
            <a className="word" href="#top" aria-label="FoodFind, back to the top">
              foodfind<span className="word-dot" aria-hidden="true">.</span>
            </a>
            <p>Restaurants, menus and locations across Bahrain &mdash; {restaurants.length} places and counting.</p>
          </div>

          <nav className="foot-col" aria-label="Explore">
            <h3>Explore</h3>
            <button type="button" onClick={goToExplore}>All restaurants</button>
            <button type="button" onClick={goToCuisines}>Cuisines</button>
            <button type="button" onClick={goToOffers}>Offers</button>
            <button type="button" onClick={goToMap}>Map</button>
            <button type="button" onClick={surpriseMe}>Surprise me</button>
          </nav>

          <nav className="foot-col" aria-label="Meal times">
            <h3>Meal times</h3>
            {MEAL_TIMES.map((meal) => (
              <button
                key={meal}
                type="button"
                onClick={() => { setMealTime(meal); scrollToResults(); }}
              >
                {meal}
              </button>
            ))}
          </nav>

          <div className="foot-col">
            <h3>About</h3>
            <p className="foot-note">
              Built for people who want a real place to eat, not a sponsored list.
            </p>
          </div>
        </div>
        <div className="foot-bottom">
          <p>© {new Date().getFullYear()} FoodFind · Bahrain</p>
        </div>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          className="back-to-top"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: scrollMotion() })}
        >
          {ARROW_UP_ICON}
        </button>
      )}
    </div>
  );
}

// Every icon the app draws, in one place.
// Each one is a whole <svg> so it can be dropped anywhere in the markup.
// Sizes come from CSS, so the markup stays free of inline styles.

// The house mark: an eight-ray spark.
// Every icon is a whole <svg> so it can be dropped anywhere in the markup.
// Sizes come from CSS, so the markup stays free of inline styles.
export function Icon({ children, fill = "none", width = 1.75 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const SPARK = (
  <Icon width={1.75}>
    <path d="M12 1.6v20.8M1.6 12h20.8M4.5 4.5l15 15M19.5 4.5l-15 15" />
  </Icon>
);

export const SUN_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
  </Icon>
);
export const MOON_ICON = (
  <Icon>
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z" />
  </Icon>
);
export const PIN_ICON = (
  <Icon>
    <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </Icon>
);
export const SEARCH_ICON = (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);
export const ARROW_ICON = (
  <Icon>
    <path d="M7 17 17 7M9 7h8v8" />
  </Icon>
);
export const CLOCK_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.4V12l3 1.9" />
  </Icon>
);
export const GRID_ICON = (
  <Icon>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </Icon>
);
export const LIST_ICON = (
  <Icon>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
);
export const MAP_ICON = (
  <Icon>
    <path d="m9 5-6 3v11l6-3 6 3 6-3V5l-6 3z" />
    <path d="M9 5v11M15 8v11" />
  </Icon>
);
export const PLAY_ICON = (
  <Icon fill="currentColor">
    <path d="M8 5.5v13l11-6.5z" />
  </Icon>
);
// Fork and knife - marks the cuisine on a card.
export const RESTAURANT_ICON = (
  <Icon width={1.75}>
    <path d="M7 3v7.5a2.2 2.2 0 0 0 4.4 0V3" />
    <path d="M9.2 10.5V21" />
    <path d="M16.8 3c-1.4 1.2-2 2.6-2 4.4 0 1.5.7 2.3 2 2.6V21" />
    <path d="M16.8 3v6.4" />
  </Icon>
);

export const COMPASS_ICON = (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.2 8.8-1.8 4.6-4.6 1.8 1.8-4.6z" />
  </Icon>
);

// A food cover, for the cuisines link.
export const CLOCHE_ICON = (
  <Icon width={1.75}>
    <path d="M3 15.5h18" />
    <path d="M5 15.5a7 7 0 0 1 14 0" />
    <path d="M12 8.5V6.6" />
    <circle cx="12" cy="5.4" r="1.2" />
  </Icon>
);
// A price tag, for the offers link.
export const TAG_ICON = (
  <Icon width={1.75}>
    <path d="M3.6 11.2V5.2a1.6 1.6 0 0 1 1.6-1.6h6a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8l-5.4 5.4a2 2 0 0 1-2.8 0l-6.6-6.6a2 2 0 0 1-.6-1.4z" />
    <circle cx="7.8" cy="7.8" r="1.5" />
  </Icon>
);

// A four-point sparkle, for the surprise-me button.
export const SPARKLES_ICON = (
  <Icon width={1.75}>
    <path d="m12 2.4 2.4 7.2 7.2 2.4-7.2 2.4L12 21.6 9.6 14.4 2.4 12l7.2-2.4z" />
  </Icon>
);

// A telephone, for the call button.
export const PHONE_ICON = (
  <Icon width={1.75}>
    <path d="M6 2.5h4l1.8 4.5-2 1.4a12.5 12.5 0 0 0 5.3 5.3l1.4-2 4.5 1.8v4a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.7 2 2 0 0 1 6 4.5z" />
  </Icon>
);

// A chain link, for the copy-link button.
export const LINK_ICON = (
  <Icon width={1.75}>
    <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.4 6.4" />
    <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.6-1.6" />
  </Icon>
);

// A person, for the menu button in the header.
export const USER_ICON = (
  <Icon width={1.75}>
    <circle cx="12" cy="8" r="3.7" />
    <path d="M4.9 20.2a7.1 7.1 0 0 1 14.2 0" />
  </Icon>
);

export const CHEVRON_ICON = (
  <Icon width={2}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);
// The same chevron, turned to point forwards.
export const CHEVRON_RIGHT_ICON = (
  <Icon width={2}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);
export const CHEVRON_LEFT_ICON = (
  <Icon width={2}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

// Instagram's camera outline, for the profile link.
export const INSTAGRAM_ICON = (
  <Icon width={1.75}>
    <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5" />
    <circle cx="12" cy="12" r="3.9" />
    <circle cx="17.1" cy="6.9" r="1.05" fill="currentColor" stroke="none" />
  </Icon>
);

// Two stacked pages: copy to the clipboard.
export const COPY_ICON = (
  <Icon width={1.75}>
    <rect x="9" y="9" width="11" height="11" rx="2.4" />
    <path d="M6.4 15H5.6A1.6 1.6 0 0 1 4 13.4V5.6A1.6 1.6 0 0 1 5.6 4h7.8A1.6 1.6 0 0 1 15 5.6v.8" />
  </Icon>
);


// Bahrain's flag, for the "Bahraini" shortcut. Drawn rather than typed so
// it looks the same on every platform (Windows has no flag emoji).
export function BahrainFlagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <clipPath id="bh-flag-clip">
        <rect x="2" y="5" width="20" height="14" rx="2.4" />
      </clipPath>
      <g clipPath="url(#bh-flag-clip)">
        <rect x="2" y="5" width="20" height="14" fill="#fff" />
        <path
          d="M11.5 5H22v14H11.5l3-1.75-3-1.75 3-1.75-3-1.75 3-1.75-3-1.75 3-1.75z"
          fill="#DA291C"
        />
      </g>
      <rect x="2" y="5" width="20" height="14" rx="2.4" fill="none" stroke="rgba(23, 45, 41, 0.16)" />
    </svg>
  );
}

export const MENU_ICON = (
  <Icon width={1.75}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);

export const TICKET_ICON = (
  <Icon width={1.75}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5V14a2 2 0 0 0 0-4z" />
    <path d="M13 7v10" strokeDasharray="2 2" />
  </Icon>
);

// Three dots joined by two lines - the usual way to say "share".
export const SHARE_ICON = (
  <Icon width={1.75}>
    <circle cx="18" cy="5" r="2.7" />
    <circle cx="6" cy="12" r="2.7" />
    <circle cx="18" cy="19" r="2.7" />
    <path d="m8.4 10.8 7.2-4.2M8.4 13.2l7.2 4.2" />
  </Icon>
);

export const CHECK_ICON = (
  <Icon width={2}>
    <path d="m4.5 12.6 5 5 10-11" />
  </Icon>
);

export const PHOTO_ICON = (
  <Icon width={1.75}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="8.4" cy="9.6" r="1.6" />
    <path d="m3.6 17.4 4.8-4.8 4 4 3.6-3.2 5 4.6" />
  </Icon>
);

// A percent mark for the offers flag.
export const PERCENT_ICON = (
  <Icon width={2}>
    <path d="M18.5 5.5 5.5 18.5" />
    <circle cx="7.4" cy="7.4" r="2.7" />
    <circle cx="16.6" cy="16.6" r="2.7" />
  </Icon>
);

// The pair of leaves that used to overlap the hero photo.
export function LeafArt({ className }) {
  return (
    <svg className={className} viewBox="0 0 150 190" fill="none" aria-hidden="true" focusable="false">
      <path d="M98 4C46 20 8 62 8 112c0 23 15 42 38 50 14-45 36-94 52-158Z" fill="currentColor" />
      <path d="M142 46c-27 10-48 38-48 72 0 14 9 25 22 29 9-26 20-55 26-101Z" fill="currentColor" />
      <path d="M46 162C54 112 74 64 96 22" stroke="#fbfaf6" strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}

export function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

// A thin X for closing the details popup and the photo viewer.
export const CLOSE_ICON = (
  <Icon width={1.75}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icon>
);

export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}

// A rosette with a tick: shown only for details that came from Google.
export function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 1.6l2.6 2.1 3.2-.2 1.1 3 2.7 1.8-1 3.1 1 3.1-2.7 1.8-1.1 3-3.2-.2L12 22.4l-2.6-2.1-3.2.2-1.1-3L2.4 15.7l1-3.1-1-3.1L5.1 7.7l1.1-3 3.2.2z" />
      <path fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m8.4 12.1 2.4 2.4 4.8-5" />
    </svg>
  );
}

// A small icon for each tag, so a chip carries a picture and not just a word.
export const TAG_ICON_PATHS = {
  bowl: <><path d="M3.5 10.5h17a8.5 8.5 0 0 1-8.5 8 8.5 8.5 0 0 1-8.5-8z" /><path d="M8 7c0-1.4 1.4-1.7 1.4-3M12 7c0-1.4 1.4-1.7 1.4-3" /><path d="M3.5 21h17" /></>,
  skewer: <><path d="M4 20 15 9" /><path d="M14.5 3.5c2.6 0 4.5 1.9 4.5 4.5 0 1.4-.6 2.5-1.5 3.4L14 8.9c.9-.9 1.4-2 1.4-3.4 0-1.2-.4-2-.9-2z" /><path d="M9 6.5 17.5 15" /><path d="M11.5 4 20 12.5" /></>,
  cup: <><path d="M4.5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z" /><path d="M16.5 9.5h1.6a2.4 2.4 0 0 1 0 4.8h-1.6" /><path d="M8 4.5c0-1 .8-1.2.8-2.2M12 4.5c0-1 .8-1.2.8-2.2" /></>,
  slice: <><path d="M12 3.5 4.4 18.6a1 1 0 0 0 .9 1.5h13.4a1 1 0 0 0 .9-1.5z" /><circle cx="11" cy="12" r=".9" /><circle cx="14.6" cy="15.4" r=".9" /><circle cx="9.4" cy="9" r=".9" /></>,
  burger: <><path d="M4.8 9.4a7.2 6 0 0 1 14.4 0" /><path d="M4 9.4h16" /><path d="M4 13.6h16" /><path d="M4 17.4h16" /></>,
  fish: <><path d="M2.8 12c3-4 7-6 10.4-6 3.2 0 6 1.8 8 6-2 4.2-4.8 6-8 6-3.4 0-7.4-2-10.4-6z" /><circle cx="16.4" cy="10.4" r=".9" /><path d="M2.8 12 6 8.6M2.8 12 6 15.4" /></>,
  leaf: <><path d="M5 19.5C5 11 10 5.5 19 4.5c0 9-5 14-12 14" /><path d="M5 19.5c2.8-3.6 5.6-5.6 8.6-6.8" /></>,
  wrap: <><path d="M4 15.5a8 8 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M8.6 9.4 15 4" /><path d="M8 15.5h8" /></>,
  moon: <><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2z" /></>,
  bag: <><path d="M5.5 8h13l1 11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17 14.4a5.5 5.5 0 0 1 3.5 4.6" /></>,
};

// Which icon suits a tag, by keyword.
export const TAG_ICON_RULES = [
  [/grill|kebab|tikka|bbq|bbq|barbecue/i, "skewer"],
  [/breakfast|brunch|coffee|cafe|tea/i, "cup"],
  [/pizza/i, "slice"],
  [/burger/i, "burger"],
  [/sea\s?food|fish/i, "fish"],
  [/vegan|healthy|salad|fresh/i, "leaf"],
  [/sandwich|shawarma|subs?|wrap/i, "wrap"],
  [/late\s?night/i, "moon"],
  [/delivery|takeaway/i, "bag"],
  [/family|kids/i, "people"],
  [/mezze|mansaf|local|arabic|lebanese|palestinian|turkish|curry|indian|asian|pot|rice/i, "bowl"],
];

export function TagIcon({ tag }) {
  const rule = TAG_ICON_RULES.find(([pattern]) => pattern.test(tag));
  const name = rule ? rule[1] : "bowl";
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {TAG_ICON_PATHS[name]}
    </svg>
  );
}

// Pastel chip colours, picked per tag so the same tag always looks the same.
export const TAG_TINTS = ["green", "peach", "amber", "blue", "rose", "lilac"];
export function tagTint(tag) {
  let total = 0;
  for (const char of tag) total += char.charCodeAt(0);
  return TAG_TINTS[total % TAG_TINTS.length];
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />
    </svg>
  );
}

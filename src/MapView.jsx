import { useEffect, useMemo, useRef } from "react";
import branchCoords from "./data/branch-coords.json";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const CUISINE_COLOR = {
  Burger: "#b9431f",
  Grill: "#d97706",
  Pizza: "#d33682",
  Pasta: "#d33682",
  Italian: "#d33682",
  "Fried Chicken": "#ca8a04",
  Broasted: "#ca8a04",
  Sandwiches: "#b45309",
  Mexican: "#dc2626",
  Indian: "#059669",
  Mediterranean: "#059669",
  Asian: "#7c3aed",
  Cafe: "#0ea5e9",
  Malghom: "#c2410c",
  Shawarma: "#4d7c0f",
};

// Short code per food type, printed inside the map pin.
const CUISINE_SHORT = {
  Grill: "G",
  Malghom: "M",
  Shawarma: "S",
  Burger: "B",
  Pizza: "P",
  Pasta: "PA",
  Italian: "IT",
  "Fried Chicken": "FC",
  Broasted: "BR",
  Indian: "IN",
  Asian: "AS",
  Mediterranean: "MD",
  Cafe: "C",
  Sandwiches: "SW",
  Mexican: "MX",
};

function pinFill(restaurant) {
  return CUISINE_COLOR[restaurant.cuisine] || "#2a78b8";
}
function pinCode(restaurant) {
  return CUISINE_SHORT[restaurant.cuisine] || String(restaurant.name || "?").charAt(0).toUpperCase();
}

// Circular cuisine-code pin: food-type code in the cuisine color.
function letterIconFor(restaurant) {
  const fill = pinFill(restaurant);
  const code = pinCode(restaurant);
  const two = code.length > 1 ? " two" : "";
  return L.divIcon({
    className: "map-letter-pin-wrap",
    html: `<span class="map-letter-pin${two}" style="--pin:${fill}">${code}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function clusterIcon(cluster) {
  return L.divIcon({
    className: "map-cluster-wrap",
    html: `<span class="map-cluster">${cluster.getChildCount()}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

// Bahrain only: a fixed box around the main island and Muharraq, so the map
// never opens zoomed out to the wider Gulf coastline.
const BAHRAIN_BOUNDS = [
  [25.78, 50.33],
  [26.35, 50.75],
];

export default function MapView({ restaurants, onOpen }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const legendRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return undefined;
    const map = L.map(ref.current, {
      scrollWheelZoom: true,
      zoomControl: true,
    }).fitBounds(BAHRAIN_BOUNDS);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    // The container can still be mid-layout on first paint (e.g. web fonts
    // reflowing the page above it), so Leaflet's cached size is corrected
    // once more after that settles.
    window.requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cluster = L.markerClusterGroup({
      iconCreateFunction: clusterIcon,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    });
    const seen = new Set();
    restaurants.forEach((r) => {
      const points = [];
      (r.branches || []).forEach((b) => {
        const bc = branchCoords[`${r.id}|${b}`];
        if (bc) points.push({ lat: bc.lat, lng: bc.lng, label: b });
      });
      if (points.length === 0 && r.lat != null && r.lng != null) {
        points.push({ lat: r.lat, lng: r.lng, label: null });
      }
      points.forEach((p) => {
        const key = `${r.id}|${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        if (seen.has(key)) return;
        seen.add(key);
        const marker = L.marker([p.lat, p.lng], { icon: letterIconFor(r) }).bindPopup(
          `<span class="map-popup-name">${r.name}${p.label ? ` <span class="map-popup-branch">— ${p.label}</span>` : ""}</span>` +
            `<span class="map-popup-address">${r.shortAddress || r.address || ""}</span>` +
            `<a class="map-popup-link" href="#" data-open="${r.id}">See details →</a>`
        );
        cluster.addLayer(marker);
      });
    });
    cluster.addTo(map);
    map.on("popupopen", (e) => {
      const a = e.popup.getElement()?.querySelector("a[data-open]");
      if (a) {
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          onOpen?.(a.dataset.open);
        });
      }
    });
    return () => {
      cluster.remove();
      map.off("popupopen");
    };
  }, [restaurants, onOpen]);

  // The legend only lists codes that actually appear in the current result
  // set, so it never shows a key for a food type that has no pin.
  const legendEntries = useMemo(() => {
    const seen = new Map();
    restaurants.forEach((r) => {
      const code = pinCode(r);
      if (!seen.has(code)) seen.set(code, { code, fill: pinFill(r), cuisine: r.cuisine || code });
    });
    return [...seen.values()].sort((a, b) => a.cuisine.localeCompare(b.cuisine));
  }, [restaurants]);

  return (
    <div className="map-view-wrap">
      <div ref={ref} className="map-view" />
      {legendEntries.length > 0 && (
        <div className="map-legend" ref={legendRef} aria-label="Map pin legend">
          {legendEntries.map((entry) => (
            <span className="map-legend-item" key={entry.code}>
              <span className="map-legend-swatch" style={{ background: entry.fill }}>{entry.code}</span>
              {entry.cuisine}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

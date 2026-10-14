import { useEffect, useRef } from "react";
import branchCoords from "./data/branch-coords.json";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

// Per-cuisine SVG pin, so the basemap marker color matches the card cuisine.
function pinIconFor(cuisine) {
  const fill = CUISINE_COLOR[cuisine] || "#2a78b8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path fill="${fill}" stroke="#fff" stroke-width="1.5" d="M12.5 0C5.6 0 0 5.6 0 12.5 0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/><circle cx="12.5" cy="12.5" r="4.5" fill="#fff"/></svg>`;
  return L.icon({
    iconUrl: "data:image/svg+xml;utf8," + encodeURIComponent(svg),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });
}

// Circular cuisine-code pin for the sample map styles.
function letterIconFor(restaurant) {
  const fill = CUISINE_COLOR[restaurant.cuisine] || "#2a78b8";
  const code = CUISINE_SHORT[restaurant.cuisine] || String(restaurant.name || "?").charAt(0).toUpperCase();
  const two = code.length > 1 ? " two" : "";
  return L.divIcon({
    className: "map-letter-pin-wrap",
    html: `<span class="map-letter-pin${two}" style="--pin:${fill}">${code}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

const BAHRAIN = [26.15, 50.55];

export default function MapView({ restaurants, onOpen, design }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return undefined;
    const map = L.map(ref.current).setView(BAHRAIN, 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
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
        L.marker([p.lat, p.lng], { icon: design === "a" ? pinIconFor(r.cuisine) : letterIconFor(r) })
          .addTo(layer)
          .bindPopup(
            `<strong>${r.name}</strong>${p.label ? ` — ${p.label}` : ""}<br/>${r.shortAddress || r.address || ""}<br/><a href="#" data-open="${r.id}">Details</a>`
          );
      });
    });
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
      layer.remove();
      map.off("popupopen");
    };
  }, [restaurants, onOpen, design]);

  const locateMe = () => {
    const map = mapRef.current;
    if (!map || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const at = [pos.coords.latitude, pos.coords.longitude];
      map.flyTo(at, 14, { duration: 1 });
      L.circleMarker(at, { radius: 9, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map);
    });
  };

  return (
    <div className="map-wrap">
      <div ref={ref} className="map-view" style={{ height: "70vh", width: "100%", borderRadius: 12 }} />
      {design === "c" && (
        <button type="button" className="map-locate" onClick={locateMe}>
          📍 Near me
        </button>
      )}
    </div>
  );
}

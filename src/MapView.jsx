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

// Circular cuisine-code pin: food-type code in the cuisine color.
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

export default function MapView({ restaurants, onOpen }) {
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
        L.marker([p.lat, p.lng], { icon: letterIconFor(r) })
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
  }, [restaurants, onOpen]);

  return <div ref={ref} className="map-view" style={{ height: "70vh", width: "100%", borderRadius: 12 }} />;
}

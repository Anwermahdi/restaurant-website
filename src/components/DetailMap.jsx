import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * A small, quiet map for the details panel.
 *
 * It only ever shows one real pin: the branch (or restaurant) that the
 * visitor is looking at. Scroll zoom is off so the popup keeps scrolling
 * the way a popup should, and the map is redrawn when the branch changes.
 */
export default function DetailMap({ lat, lng, label }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    const map = L.map(box, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
      keyboard: false,
    }).setView([lat, lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const pin = L.divIcon({
      className: "detail-map-pin-wrap",
      html: '<span class="detail-map-pin"></span>',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const marker = L.marker([lat, lng], { icon: pin, keyboard: false }).addTo(map);
    if (label) {
      marker.bindTooltip(label, { direction: "top", offset: [0, -14], opacity: 1 });
    }

    mapRef.current = map;
    markerRef.current = marker;

    // The popup animates in, so give the pane a beat before measuring it.
    const settle = window.setTimeout(() => map.invalidateSize(), 180);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is built once; later branches move the pin in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLatLng([lat, lng]);
    if (label) marker.setTooltipContent(label);
    map.setView([lat, lng], map.getZoom() || 15, { animate: true });
    map.invalidateSize();
  }, [lat, lng, label]);

  return (
    <div
      ref={boxRef}
      className="detail-map"
      role="img"
      aria-label={label ? `Map showing ${label}` : "Map showing the restaurant location"}
    />
  );
}

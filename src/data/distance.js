import branchCoords from "./branch-coords.json";

/**
 * How far each restaurant is from the visitor, from its map points: every
 * branch with known coordinates, else the place's own pin. The visitor's
 * position stays in the browser; nothing here sends it anywhere.
 */

const valid = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng);

/**
 * Every known map point of a restaurant (one per branch where we have it).
 * `exact` is false when all we have is the middle of its area
 * (coordSource "area"): good enough to sort by, not to print as a distance.
 */
export function placePoints(restaurant) {
  const points = [];
  (restaurant.branches || []).forEach((branch) => {
    const point = branchCoords[`${restaurant.id}|${branch}`];
    if (point && valid(point.lat, point.lng)) points.push(point);
  });
  (restaurant.locations || []).forEach((location) => {
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    if (valid(lat, lng)) points.push({ lat, lng });
  });
  if (points.length) return { points, exact: true };
  if (valid(Number(restaurant.lat), Number(restaurant.lng))) {
    points.push({ lat: Number(restaurant.lat), lng: Number(restaurant.lng) });
  }
  return { points, exact: restaurant.coordSource !== "area" };
}

// Straight-line distance on the globe, in kilometres.
function kmBetween(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Distance to the closest branch: { km, exact }, or null when the place has
 * no map point at all.
 */
export function nearestKm(restaurant, here) {
  const { points, exact } = placePoints(restaurant);
  if (!here || !points.length) return null;
  return { km: Math.min(...points.map((point) => kmBetween(here, point))), exact };
}

/** "850 m", "2.4 km", "14 km": as straight-line distance, rounded honestly. */
export function distanceLabel(km) {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

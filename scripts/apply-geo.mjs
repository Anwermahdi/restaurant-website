import fs from 'fs';
const path = 'src/data/restaurants.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');
const coords = {
  'wadi-altayibin-grills': [26.116263399999998, 50.5718038],
  'omy-and-banatha': [26.069617899999997, 50.5006231],
  'black-strip': [26.2398074, 50.574179199999996],
  'burger-fries-more': [26.159044599999998, 50.5183259],
  'lab-burger': [26.1142802, 50.576505399999995],
  'golden-bun': [26.237278999999997, 50.5239712],
  'bacon': [26.2709036, 50.5939494],
  'three-lines': [26.210009, 50.5758438],
  'neon-burger': [26.137599299999998, 50.5699943],
  'burger-waqif': [26.2208787, 50.5004833],
  'phillys': [26.212971, 50.6028899],
  'milano': [26.1303311, 50.574189999999994],
  'klakiz': [26.2235305, 50.5875935],
  'risotto': [26.0996229, 50.4851777],
  'yebilna-pasta': [26.0996229, 50.4851777],
  'le-pasta': [26.1273372, 50.543959],
};
const researchedStart = lines.findIndex((l) => l.includes('const RESEARCHED = {'));
for (const [id, [lat, lng]] of Object.entries(coords)) {
  const idx = lines.findIndex((l) => l.trim() === `"${id}": {`);
  if (idx >= 0) {
    const window = lines.slice(idx, idx + 8).join('\n');
    if (!/lat:/.test(window)) {
      lines.splice(idx + 1, 0, `    lat: ${lat},`, `    lng: ${lng},`, `    dataSource: "google-maps",`);
      console.log('updated', id);
    } else console.log('already has lat', id);
  } else {
    lines.splice(researchedStart + 1, 0, `  "${id}": { lat: ${lat}, lng: ${lng}, dataSource: "google-maps" },`);
    console.log('added new entry', id);
  }
}
fs.writeFileSync(path, lines.join('\n'));

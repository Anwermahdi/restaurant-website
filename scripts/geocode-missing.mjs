import fs from 'fs';
const missing = `wadi-altayibin-grills
omy-and-banatha
sando-x-urban
layla-aldiyra
akbars-kitchen
naughty-by-raaw
alsikka
uplift
the-block
black-strip
freid
burger-fries-more
lab-burger
golden-bun
sammonah-sandwich
bacon
three-lines
adam-subs
burger-waqif
cluckys
phillys
tostado
milano
klakiz
risotto
yebilna-pasta
le-pasta`.split('\n');
const names = {
  'wadi-altayibin-grills': 'Wadi Al Tayibeen Grills Bahrain',
  'omy-and-banatha': 'Omy and Banatha Bahrain',
  'sando-x-urban': 'Sando X Urban Bahrain',
  'layla-aldiyra': 'Layla Aldiyra Bahrain',
  'akbars-kitchen': "Akbar's Kitchen Bahrain",
  'naughty-by-raaw': 'Naughty by Raaw Bahrain',
  'alsikka': 'Al Sikka Bahrain',
  'uplift': 'Uplift Bahrain restaurant',
  'the-block': 'The Block Bahrain',
  'black-strip': 'Black Strip Bahrain',
  'freid': 'Freid Bahrain burger',
  'burger-fries-more': 'Burger Fries and More Bahrain',
  'lab-burger': 'Burger Lab Bahrain',
  'golden-bun': 'Golden Bun Bahrain burger',
  'sammonah-sandwich': 'Sammonah Sandwich Bahrain',
  'bacon': 'Bacon Burger Bahrain',
  'three-lines': 'Three Lines Bahrain',
  'adam-subs': 'Adam Subs Bahrain',
  'burger-waqif': 'Burger Waqif Bahrain',
  'cluckys': "Cluckys Bahrain",
  'phillys': 'Phillys Bahrain',
  'tostado': 'Tostado Bahrain',
  'milano': 'Milano Pizza Bahrain',
  'klakiz': 'Klakiz Bahrain',
  'risotto': 'Risotto Malkiya Bahrain',
  'yebilna-pasta': 'Yebilna Pasta Bahrain',
  'le-pasta': 'Le Pasta Bahrain',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
for (const id of missing) {
  const q = encodeURIComponent(names[id]);
  let res;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, { headers: { 'User-Agent': 'restaurant-site-geocoder' } });
    res = await r.json();
  } catch (e) { console.log(id, 'ERR', e.message); await sleep(1100); continue; }
  if (res && res[0]) {
    out.push(`  "${id}": { lat: ${Number(res[0].lat).toFixed(6)}, lng: ${Number(res[0].lon).toFixed(6)}, dataSource: "openstreetmap" },`);
    console.log(id, res[0].lat, res[0].lon);
  } else {
    console.log(id, 'NOT FOUND');
  }
  await sleep(1100);
}
fs.writeFileSync('geo-results.txt', out.join('\n'));
console.log('written', out.length, 'entries');

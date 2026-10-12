const names = ['Wadi Al Tayibeen Grills Bahrain','Omy and Banatha Bahrain','Sando X Urban Bahrain','Layaly Aldiyra Bahrain','Akbar Kitchen Bahrain','Naughty by Raaw Bahrain','AlSikka Bahrain','Uplift Bahrain','The Block Bahrain','Black Strip Burgers Bahrain','Freid Burger Bahrain','Burger Fries More Bahrain','Burger Lab Bahrain','Golden Bun Bahrain','Sammonah Sandwich Bahrain','Bacon Burger Bahrain','Three Lines Bahrain','Adam Subs Bahrain','Burger Waqif Bahrain','Cluckys Bahrain','Phillys Bahrain','Tostado Bahrain','Milano Pizza Bahrain','Klakiz Bahrain','Risotto Malkiya Bahrain','Yebilna Pasta Bahrain','Le Pasta Bahrain'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const n of names) {
  try {
    const r = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(n + ' google maps'), { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const t = await r.text();
    const m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || t.match(/ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
    console.log(n, '=>', m ? m[1] + ',' + m[2] : 'not found');
  } catch { console.log(n, 'ERR'); }
  await sleep(1200);
}

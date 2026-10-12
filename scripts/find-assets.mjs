const r = await fetch(process.argv[2], { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await r.text();
const urls = [...t.matchAll(/https:\/\/[^"'\s]+dhmedia[^"'\s]+/g)].map((m) => m[0]);
console.log([...new Set(urls)].slice(0, 25).join('\n'));

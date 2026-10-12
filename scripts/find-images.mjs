const r = await fetch(process.argv[2], { headers: { 'User-Agent': 'Mozilla/5.0' } });
const t = await r.text();
const m = [...t.matchAll(/https?:\/\/[^"'\s]+/g)].map((x) => x[0]);
const interesting = [...new Set(m)].filter((u) => /logo|image|jpg|png|webp/i.test(u) && !/fonts|css|js/.test(u));
console.log(interesting.slice(0, 25).join('\n'));

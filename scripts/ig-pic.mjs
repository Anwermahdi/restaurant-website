const handle = process.argv[2].replace(/^@/, '');
const r = await fetch(`https://www.instagram.com/${handle}/`, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' } });
const t = await r.text();
const m = t.match(/https:\/\/[^"']*profile[^"']*/g) || t.match(/https:\/\/scontent[^"']*\.jpg[^"']*/g);
console.log(m ? [...new Set(m)].slice(0, 5).join('\n') : 'no match');
console.log('status', r.status, 'len', t.length);

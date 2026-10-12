const branches = ['Tubli', 'Umm Al Hassam', 'Al Lawzi', 'Sitra', 'Saar'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const b of branches) {
  const q = encodeURIComponent('Arabian Broasted ' + b + ' Bahrain');
  const t = await fetch('https://www.google.com/search?tbm=map&hl=en&gl=bh&q=' + q, { headers: { 'user-agent': 'Mozilla/5.0' } }).then((r) => r.text());
  const c = t.match(/\[null,null,(\d{2}\.\d{4,}),(\d{2}\.\d{4,})\]/);
  const name = t.match(/"([^"]{3,60})",null,\[/);
  console.log(b, '=>', c ? c[1] + ',' + c[2] : 'miss', name ? name[1] : '');
  await sleep(800);
}

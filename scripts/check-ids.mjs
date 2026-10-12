import fs from 'fs';
const src = fs.readFileSync('src/data/restaurants.js', 'utf8');
const ids = ['wadi-altayibin-grills','omy-and-banatha','black-strip','freid','burger-fries-more','lab-burger','golden-bun','bacon','three-lines','neon-burger','burger-waqif','phillys','milano','klakiz','risotto','yebilna-pasta','le-pasta','the-bossman','tikka-village'];
for (const id of ids) {
  const count = (src.match(new RegExp('"' + id + '": \\{', 'g')) || []).length;
  console.log(id, count);
}

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const jobs = [
  ["chicket", "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWkj_YvTNOpjijEZBpI_OCl-vJrE8wGFEf14YgY5qLhmcl2b1_I2jfgQHIlNk6_XWiVNd63y4ZHCcCzSxuv_tHilqi6SNm_AIiFtX1DnTB1op9SzXM1CDMz_JG_fa82W1SmVPVuR=s680-w680-h510-rw"],
  ["klakiz", "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWmr5Vcgy9gz-2rkmQ_Vsr0QYz-zsNTYsbLF457da-Wzp3YOj4dN7qfOFtLmlziu7mqfmMTgEguv0fJlOgERFQAk9H8H7cAKIWpiFdJzz69QwBZx0X0l0wwNJkiZz8b-P_5PI_ig=s680-w680-h510-rw"],
  ["risotto", "https://lh3.googleusercontent.com/grass-cs/ACvplmOOSQ2HCX722_GlGaHmGNvDesftanmG70sfwiOBRF3djFgRBTLgmE9-4p_D94NrdNz8G_2HkNFdbnoug_NTfUnEQGbtapsErbDoRNV8DZVblhH7Te7iBkJieTxB6iLK1Hqc66aa=s680-w680-h510-rw"],
  ["yebilna-pasta", "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlu35a3wO8rY_Ln9Q5-8MlCj5DbHn-7iFfakmA1YXV1GpPqEjpL9F9M30mGuzvE7j2j7kNZsk3nETgNYzYKW21GUIotk0caK_p8-DYV4F2B7Vhc3asx6hTF_X2AgiNhQwf5FaN9=s680-w680-h510-rw"],
  ["le-pasta", "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnj1bbSNPYf-vyMe_ArRSFgA2eTeRVIkZzur-r3WBJaw8w1vAm3afTQ4-YkQ1Lr4ZPWt7XpMykahHK1MtEI-HuwAApVjkYkekRaTpc5nK7V03JzHTSd1e-c-VvEMLProgxngB5UQOhTjmSl=s680-w680-h510-rw"],
  ["flap-fried-chicken", "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWl6dk7MPKSDB2WEesbDDgbZsNQg6hFZDPjL5fzLMGFjRQF7Tpen-fcootUEi3pYWkW35bDx9hGYDNO1QH8HvESaECWg_EhcI929gLZas0gZC4IXtCgJl2bHr0BHSw_Y6xGMPC0=s680-w680-h510-rw"],
  ["three-lines", "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWnnT_ziLQH4Boavo7LNLBF7lUNvw_-k-aLF83KU4OXSa0ELQC-9j9iTGQl8nuyhC49CgOOXSu9B8IQy8y8XDnVcISiWBfzmiq0ytwiCb-Y4qCb0U-ATgFOi-cF4y9-s_uAa881elQ=s680-w680-h510-rw"],
  ["villa-rosa", "https://lh3.googleusercontent.com/grass-cs/ACvplmN7ZZEzpqZJ2GxhgkOJmQPAlMLP3i-q67dwgxjOQA42JPtZPITeYdXX9s0nbI7Cl8QZmVo6TFFb7bMIV2vzZasux9sR3ovAzgvF9JnEJiwsEA4-m0QQCA6C0orY074yqY9lFbit=s680-w680-h510-rw"],
];

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "restaurants");
for (const [id, url] of jobs) {
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`FAIL ${id}: HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 3000) { console.warn(`FAIL ${id}: too small`); continue; }
    fs.writeFileSync(path.join(OUT, `${id}.jpg`), buf);
    console.log(`ok ${id} (${(buf.length / 1024).toFixed(0)}kb)`);
  } catch (e) { console.warn(`FAIL ${id}: ${e.message}`); }
}

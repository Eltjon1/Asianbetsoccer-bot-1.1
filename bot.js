const fs = require('fs');

const url =
  'https://botbot3.space/tables/v4/Q/tablelast/2026-09-01/b4b38b1a82273d8d182bbf2cf2b72497e92ab56e.js';

(async () => {
  const res = await fetch(url);

  console.log('Status:', res.status);

  if (!res.ok) {
    throw new Error(`Download fallito: ${res.status}`);
  }

  const text = await res.text();

  fs.writeFileSync('lastgame-data.js', text);

  const matches = text.match(/getData2\([\s\S]*?\);/g) || [];

  fs.writeFileSync(
    'getData2-blocks.txt',
    matches.join('\n\n--------------------\n\n')
  );

  console.log('File scaricato:', text.length, 'caratteri');
  console.log('Blocchi getData2 trovati:', matches.length);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

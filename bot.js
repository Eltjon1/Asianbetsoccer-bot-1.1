const fs = require('fs');

const url =
  'https://www.asianbetsoccer.com/settings/tablefunc.v5.book.min.js';

(async () => {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('Status:', res.status);

  if (!res.ok) {
    throw new Error(`Download fallito: ${res.status}`);
  }

  const text = await res.text();

  fs.writeFileSync('tablefunc.js', text);

  const pos = text.indexOf('function getData2');

  console.log('Dimensione:', text.length);
  console.log('Posizione getData2:', pos);

  if (pos >= 0) {
    const estratto = text.slice(
      Math.max(0, pos - 500),
      pos + 30000
    );

    fs.writeFileSync('getData2-function.txt', estratto);
    console.log('Funzione getData2 trovata ✅');
  } else {
    fs.writeFileSync('getData2-function.txt',
      'getData2 non trovata nel file');
    console.log('getData2 non trovata');
  }

})().catch(err => {
  console.error(err);
  process.exit(1);
});

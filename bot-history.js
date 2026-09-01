const fs = require('fs');
const path = require('path');

const BASE = 'https://botbot3.space';
const STATS = 'Q';
const BOOK = 'b4b38b1a82273d8d182bbf2cf2b72497e92ab56e';
const START_DATE = process.env.START_DATE || '2025-01-01';
const END_DATE = process.env.END_DATE || romeToday();
const SAVE_RAW = (process.env.SAVE_RAW || '1') !== '0';
const DELAY_MS = Number(process.env.DELAY_MS || 400);
const RETRIES = Number(process.env.RETRIES || 3);

function romeToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());

  const o = Object.fromEntries(
    parts.map(p => [p.type, p.value])
  );

  return `${o.year}-${o.month}-${o.day}`;
}

function* dateRange(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);

  if (
    Number.isNaN(s.getTime()) ||
    Number.isNaN(e.getTime()) ||
    s > e
  ) {
    throw new Error(
      `Intervallo date non valido: ${start} -> ${end}`
    );
  }

  for (
    let d = s;
    d <= e;
    d = new Date(d.getTime() + 86400000)
  ) {
    yield d.toISOString().slice(0, 10);
  }
}

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, retries = RETRIES) {
  let lastErr;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (AsianBetSoccer archive bot)',
          'Accept': '*/*'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.text();

    } catch (err) {
      lastErr = err;

      if (attempt < retries) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw lastErr;
}

function extractCalls(text) {
  const calls = [];
  let i = 0;

  while (true) {
    const p = text.indexOf('getData2(', i);

    if (p < 0) break;

    let j = p + 'getData2('.length;
    let depth = 1;
    let quote = null;
    let esc = false;

    while (j < text.length && depth) {
      const ch = text[j];

      if (quote) {
        if (esc) {
          esc = false;
        } else if (ch === '\\') {
          esc = true;
        } else if (ch === quote) {
          quote = null;
        }
      } else {
        if (ch === "'" || ch === '"') {
          quote = ch;
        } else if (ch === '(') {
          depth++;
        } else if (ch === ')') {
          depth--;
        }
      }

      j++;
    }

    if (depth === 0) {
      calls.push(text.slice(p, j));
    }

    i = Math.max(j, p + 1);
  }

  return calls;
}

function splitArgs(call) {
  const s = call.slice(
    call.indexOf('(') + 1,
    call.lastIndexOf(')')
  );

  const args = [];

  let cur = '';
  let quote = null;
  let esc = false;
  let depth = 0;

  for (const ch of s) {
    if (quote) {
      cur += ch;

      if (esc) {
        esc = false;
      } else if (ch === '\\') {
        esc = true;
      } else if (ch === quote) {
        quote = null;
      }

    } else {
      if (ch === "'" || ch === '"') {
        quote = ch;
        cur += ch;

      } else if ('([{'.includes(ch)) {
        depth++;
        cur += ch;

      } else if (')]}'.includes(ch)) {
        depth--;
        cur += ch;

      } else if (ch === ',' && depth === 0) {
        args.push(cur.trim());
        cur = '';

      } else {
        cur += ch;
      }
    }
  }

  if (cur.trim() || s.endsWith(',')) {
    args.push(cur.trim());
  }

  return args.map(parseLiteral);
}

function parseLiteral(v) {
  const t = v.trim();

  if (
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    const body = t.slice(1, -1);

    return body
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\');
  }

  if (t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;

  if (
    t !== '' &&
    !Number.isNaN(Number(t))
  ) {
    return Number(t);
  }

  return t;
}

function csvCell(v) {
  const s =
    v == null
      ? ''
      : String(v);

  return '"' +
    s.replaceAll('"', '""') +
    '"';
}

function safeMkdir(p) {
  fs.mkdirSync(p, {
    recursive: true
  });
}

(async () => {

  const outDir =
    path.resolve('archive');

  const rawDir =
    path.join(outDir, 'raw');

  safeMkdir(outDir);

  if (SAVE_RAW) {
    safeMkdir(rawDir);
  }

  console.log(
    'Scarico firma getData2...'
  );

  const tablefuncUrl =
    'https://www.asianbetsoccer.com/settings/tablefunc.v5.book.min.js';

  const tablefunc =
    await fetchText(tablefuncUrl);

  fs.writeFileSync(
    path.join(outDir, 'tablefunc.js'),
    tablefunc
  );

  const sig =
    tablefunc.match(
      /function\s+getData2\s*\((.*?)\)\s*\{/s
    );

  if (!sig) {
    throw new Error(
      'Firma getData2 non trovata'
    );
  }

  const params =
    sig[1]
      .split(',')
      .map(x => x.trim());

  if (params.length !== 167) {
    throw new Error(
      `Numero parametri inatteso: ${params.length} (attesi 167)`
    );
  }

  const combinedPath =
    path.join(
      outDir,
      `LastGame_${START_DATE}_${END_DATE}.csv`
    );

  const failuresPath =
    path.join(
      outDir,
      'failures.csv'
    );

  const summaryPath =
    path.join(
      outDir,
      'summary.json'
    );

  const combined =
    fs.createWriteStream(
      combinedPath,
      { encoding: 'utf8' }
    );

  combined.write(
    ['date', ...params]
      .map(csvCell)
      .join(',') +
    '\n'
  );

  const failures = [];

  let daysOk = 0;
  let daysFailed = 0;
  let recordsTotal = 0;
  let emptyDays = 0;

  for (
    const date of dateRange(
      START_DATE,
      END_DATE
    )
  ) {

    const url =
      `${BASE}/tables/v4/${STATS}/tablelast/${date}/${BOOK}.js`;

    process.stdout.write(
      `${date} ... `
    );

    try {

      const text =
        await fetchText(url);

      if (SAVE_RAW) {
        fs.writeFileSync(
          path.join(
            rawDir,
            `${date}.js`
          ),
          text
        );
      }

      const calls =
        extractCalls(text);

      const parsed =
        calls.map(splitArgs);

      const valid =
        parsed.filter(
          r => r.length === params.length
        );

      const invalid =
        parsed.length -
        valid.length;

      for (const row of valid) {
        combined.write(
          [date, ...row]
            .map(csvCell)
            .join(',') +
          '\n'
        );
      }

      recordsTotal +=
        valid.length;

      daysOk++;

      if (valid.length === 0) {
        emptyDays++;
      }

      if (invalid > 0) {
        failures.push([
          date,
          'PARSE',
          `${invalid} record con numero campi diverso da 167`,
          url
        ]);
      }

      console.log(
        `${valid.length} record`
      );

    } catch (err) {

      daysFailed++;

      failures.push([
        date,
        'DOWNLOAD',
        err.message,
        url
      ]);

      console.log(
        `ERRORE: ${err.message}`
      );
    }

    await sleep(DELAY_MS);
  }

  combined.end();

  await new Promise(
    resolve =>
      combined.on(
        'finish',
        resolve
      )
  );

  const failLines = [
    [
      'date',
      'type',
      'message',
      'url'
    ],
    ...failures

  ].map(
    r =>
      r.map(csvCell)
        .join(',')

  ).join('\n');

  fs.writeFileSync(
    failuresPath,
    failLines,
    'utf8'
  );

  const summary = {
    start_date: START_DATE,
    end_date: END_DATE,
    stats_segment: STATS,
    book_hash: BOOK,
    parameters: params.length,
    days_ok: daysOk,
    days_failed: daysFailed,
    empty_days: emptyDays,
    records_total: recordsTotal,
    save_raw: SAVE_RAW,
    generated_at:
      new Date().toISOString()
  };

  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      summary,
      null,
      2
    )
  );

  console.log(
    '\nCOMPLETATO'
  );

  console.log(
    JSON.stringify(
      summary,
      null,
      2
    )
  );

  console.log(
    `CSV: ${combinedPath}`
  );

  console.log(
    `Errori: ${failuresPath}`
  );

})().catch(err => {

  console.error(err);
  process.exit(1);

});

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 }
  });

  console.log('Apro AsianBetSoccer...');

  // Primo tentativo di apertura pagina
  try {
    await page.goto(
      'https://www.asianbetsoccer.com/it/lastgame.html',
      {
        waitUntil: 'commit',
        timeout: 45000
      }
    );

    console.log('Primo caricamento avviato');
  } catch (error) {
    console.log('Primo tentativo fallito:', error.message);

    // Secondo tentativo
    try {
      await page.goto(
        'https://www.asianbetsoccer.com/it/lastgame.html',
        {
          waitUntil: 'commit',
          timeout: 45000
        }
      );

      console.log('Secondo caricamento avviato');
    } catch (error2) {
      console.log('Secondo tentativo fallito:', error2.message);
      console.log('Continuo comunque con la pagina disponibile');
    }
  }

  // Lascia tempo al sito di caricare HTML e script
  await page.waitForTimeout(8000);

  // Gestione Cookiebot
  try {
    const soloNecessari = page.getByText('Solo necessari', {
      exact: true
    });

    const count = await soloNecessari.count();

    console.log(
      'Pulsanti "Solo necessari" trovati:',
      count
    );

    if (count > 0) {
      await soloNecessari.first().click({
        force: true,
        timeout: 10000
      });

      console.log('COOKIE: Solo necessari cliccato');
    }
  } catch (error) {
    console.log(
      'Problema gestione cookie:',
      error.message
    );
  }

  await page.waitForTimeout(3000);

  console.log(
    'Cookiebot ancora visibile:',
    await page.getByText('Solo necessari', {
      exact: true
    }).isVisible().catch(() => false)
  );

  // Aspetta caricamento dinamico delle partite
  console.log('Attendo caricamento partite...');

  await page.waitForTimeout(20000);

  // Prova ad aspettare un po' di attività di rete,
  // ma senza bloccare il bot se il sito continua a caricare
  try {
    await page.waitForLoadState('domcontentloaded', {
      timeout: 10000
    });

    console.log('DOM caricato');
  } catch {
    console.log(
      'DOM non completamente segnalato, continuo comunque'
    );
  }

  // Screenshot
  try {
    await page.screenshot({
      path: 'lastgame.png',
      fullPage: true,
      timeout: 30000
    });

    console.log('Screenshot salvato');
  } catch (error) {
    console.log(
      'Errore screenshot:',
      error.message
    );
  }

  // HTML
  try {
    const html = await page.content();

    fs.writeFileSync(
      'lastgame.html',
      html,
      'utf8'
    );

    console.log('HTML salvato');
  } catch (error) {
    console.log(
      'Errore salvataggio HTML:',
      error.message
    );
  }

  // Testo visibile della pagina
  try {
    const testo = await page.locator('body').innerText({
      timeout: 10000
    });

    fs.writeFileSync(
      'lastgame.txt',
      testo,
      'utf8'
    );

    console.log('Testo pagina salvato');
  } catch (error) {
    console.log(
      'Errore salvataggio testo:',
      error.message
    );
  }

  // Salva anche URL finale
  fs.writeFileSync(
    'debug.txt',
    `URL finale: ${page.url()}\n`,
    'utf8'
  );

  console.log('Debug salvato');

  await browser.close();

  console.log('FINE');
})();

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 1200 }
  });

  console.log('Apro AsianBetSoccer...');

  await page.goto(
    'https://www.asianbetsoccer.com/it/lastgame.html',
    {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    }
  );

  console.log('Pagina aperta');

  // Attendi che Cookiebot venga visualizzato
  await page.waitForTimeout(3000);

  try {
    const soloNecessari = page.getByText('Solo necessari', {
      exact: true
    });

    console.log(
      'Pulsanti "Solo necessari" trovati:',
      await soloNecessari.count()
    );

    if (await soloNecessari.count() > 0) {
      await soloNecessari.first().click({
        force: true
      });

      console.log('COOKIE: Solo necessari cliccato');
    }
  } catch (error) {
    console.log('Errore gestione Cookiebot:', error.message);
  }

  // Diamo tempo al banner di sparire
  await page.waitForTimeout(3000);

  console.log(
    'Cookiebot ancora visibile:',
    await page.getByText('Solo necessari', { exact: true })
      .isVisible()
      .catch(() => false)
  );

  // Aspetta il caricamento dinamico delle partite
  console.log('Attendo caricamento partite...');

  await page.waitForTimeout(15000);

  // Screenshot
  await page.screenshot({
    path: 'lastgame.png',
    fullPage: true
  });

  console.log('Screenshot salvato');

  // HTML DOM dopo caricamento JS
  const html = await page.content();

  fs.writeFileSync(
    'lastgame.html',
    html,
    'utf8'
  );

  console.log('HTML salvato');

  // Salviamo anche il testo della pagina per diagnostica
  const testo = await page.locator('body').innerText();

  fs.writeFileSync(
    'lastgame.txt',
    testo,
    'utf8'
  );

  console.log('Testo pagina salvato');

  await browser.close();

  console.log('FINE');
})();

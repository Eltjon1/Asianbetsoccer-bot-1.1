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

  // Aspetta il banner Cookiebot
  try {
    const cookieButton = page.locator(
      '#CybotCookiebotDialogBodyButtonDecline'
    );

    await cookieButton.waitFor({
      state: 'visible',
      timeout: 15000
    });

    console.log('Banner cookie trovato');

    await cookieButton.click();

    console.log('Cliccato: Solo necessari');

    await page.waitForTimeout(3000);
  } catch (error) {
    console.log('Banner cookie non presente o già gestito');
  }

  // Aspettiamo che la pagina completi il caricamento dinamico
  console.log('Attendo caricamento Last Game...');

  await page.waitForTimeout(15000);

  // Salva screenshot completo
  await page.screenshot({
    path: 'lastgame.png',
    fullPage: true
  });

  console.log('Screenshot salvato');

  // Salva HTML dopo l'esecuzione JavaScript
  const html = await page.content();

  fs.writeFileSync(
    'lastgame.html',
    html,
    'utf8'
  );

  console.log('HTML salvato');

  console.log('Operazione completata correttamente');

  await browser.close();
})();

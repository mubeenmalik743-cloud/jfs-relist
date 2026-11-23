const { chromium } = require('playwright');

(async () => {
  const username = process.env.JFS_USER;
  const password = process.env.JFS_PASS;

  if (!username || !password) {
    console.error('Error: JFS_USER ya JFS_PASS secret missing hai.');
    process.exit(1);
  }

  console.log('Browser launch kiya ja raha hai...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    // 1. Login Page
    console.log('JFS login page khola ja raha hai...');
    await page.goto('https://joiningforsuccess.com/admin/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const userInput = page.locator('input[type="email"], input[name="email"], input[name="username"], input[type="text"]').first();
    const passInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();

    await userInput.fill(username);
    await passInput.fill(password);
    await submitBtn.click();
    console.log('Login credentials submit kar diye gaye...');

    await page.waitForTimeout(6000);
    console.log('Current URL after login:', page.url());

    // 2. All Products Page par jana (Menu click ke zariye)
    console.log('Products menu par navigate kiya ja raha hai...');
    const productsMenu = page.locator('a:has-text("Products"), span:has-text("Products")').first();
    if (await productsMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await productsMenu.click();
      await page.waitForTimeout(1500);
      const allProductsLink = page.locator('a:has-text("All Products"), span:has-text("All Products")').first();
      await allProductsLink.click();
    } else {
      await page.goto('https://joiningforsuccess.com/admin/dashboard', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    }

    await page.waitForTimeout(6000);
    console.log('Products page URL:', page.url());

    // Table load hone ka wait karein
    await page.waitForSelector('table, .table, tr', { timeout: 15000 }).catch(() => {
      console.log('Table direct nahi mili, aam locator check kiya ja raha hai...');
    });

    let pageNum = 1;
    let totalRelisted = 0;

    while (true) {
      console.log(`\n==========================================`);
      console.log(`--- Page ${pageNum} checking ---`);
      console.log(`==========================================`);

      // Relist selector: text, class ya link
      const relistButtons = page.locator('button:has-text("Relist"), a:has-text("Relist"), [title*="Relist" i], td:has-text("Relist") a, td:has-text("Relist") button');
      const count = await relistButtons.count();
      console.log(`Page ${pageNum} par total ${count} Relist buttons mile.`);

      if (count === 0) {
        // Agar button na mile toh check karein table mein kya a raha hai
        const pageText = await page.innerText('body').catch(() => '');
        if (pageText.includes('Relist')) {
          console.log('Page par "Relist" ka lafz mojood hai lekin selector match nahi hua.');
        } else {
          console.log('Is page par Relist ka text hi load nahi hua.');
        }
        break;
      }

      for (let i = 0; i < count; i++) {
        const btn = relistButtons.nth(i);
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click({ force: true });
          totalRelisted++;
          console.log(`[#${totalRelisted}] Product relist ho gaya.`);
          await page.waitForTimeout(900);
        }
      }

      // Next Page Check
      const nextBtn = page.locator('li.next a, a[rel="next"], a:has-text("Next"), button:has-text("Next"), .pagination .next a').first();
      const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const isDisabled = await nextBtn.getAttribute('class').then(cls => cls && cls.includes('disabled')).catch(() => false);

      if (hasNext && !isDisabled) {
        console.log(`Page ${pageNum + 1} par agay barh rahe hain...`);
        await nextBtn.click({ force: true });
        pageNum++;
        await page.waitForTimeout(5000);
      } else {
        console.log('\nSabhi pages aur products process ho gaye.');
        break;
      }
    }

    console.log(`\n🎉 Process Complete! Total ${totalRelisted} products relist kar diye gaye hain.`);

  } catch (err) {
    console.error('Execution Error:', err.message);
  } finally {
    await browser.close();
    console.log('Browser safely closed.');
  }
})();

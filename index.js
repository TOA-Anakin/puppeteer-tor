const puppeteer = require('puppeteer');
const puppeteerExtraPluginStealth = require('puppeteer-extra-plugin-stealth');
const puppeteerExtraPluginUserAgentOverride = require('puppeteer-extra-plugin-stealth/evasions/user-agent-override');
const {PuppeteerExtra} = require('puppeteer-extra');

function preload(device) {
  Object.defineProperty(navigator, 'platform', {
    value: device.platform,
    writable: true,
  });
  Object.defineProperty(navigator, 'userAgent', {
    value: device.userAgent,
    writable: true,
  });
  Object.defineProperty(screen, 'height', {
    value: device.viewport.height,
    writable: true,
  });
  Object.defineProperty(screen, 'width', {
    value: device.viewport.width,
    writable: true,
  });
  Object.defineProperty(window, 'devicePixelRatio', {
    value: device.viewport.deviceScaleFactor,
    writable: true,
  });
}

const device = {
  userAgent: 'Mozilla/5.0 (Macintosh)', // set our fake user-agent
  viewport: {
    width: 1000,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    isLandscape: true,
  },
  locale: 'en-US,en;q=0.9',
  platform: 'Macintosh',  // set our fake platform
};

(async () => {
  try {
    const pptr = new PuppeteerExtra(puppeteer);
    const pluginStealth = puppeteerExtraPluginStealth();
    pluginStealth.enabledEvasions.delete('user-agent-override'); // Remove this specific stealth plugin from the default set
    pptr.use(pluginStealth);

    const pluginUserAgentOverride = puppeteerExtraPluginUserAgentOverride({
      userAgent: device.userAgent,
      locale: device.locale,
      platform: device.platform,
    });
    pptr.use(pluginUserAgentOverride);

    const browser = await pptr.launch({
      args: [
        '--proxy-server=socks5://127.0.0.1:9050',   // Use one of your SOCKS ports
        '--disable-features=site-per-process',
        `--window-size=${device.viewport.width},${device.viewport.height}`,
      ],
      headless: false,
      defaultViewport: device.viewport,
    });
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(preload, device);
    await page.goto('https://check.torproject.org');  // Check if we're using Tor

    await page.waitForTimeout(6000);
    await page.goto('https://ipleak.net');  // Check IP address, user agent, etc.
  } catch (err) {
    console.error(err);
  }
})();
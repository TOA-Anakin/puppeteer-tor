# Using Puppeteer anonymously with TOR

## Puppeteer

Puppeteer is a Node library maintained by Google, it provides a high-level API to control headless and non-headless Chrome/Chromium over the DevTools Protocol. This makes Puppeteer a perfect tool programmers and testers, allowing them to use it for web UI testing, E2E testing, web crawling and automation of actions such as form submission, keyboard input or page screenshotting.

With few lines of code, you can control a Chrome browser and do almost all the operations that a user would do manually. However, with great power comes great oposition, and this meme also applies to web crawling. A lot of large website owners (Amazon, GoDaddy) have implemented countermeasures against malicious crawlers. If you are not careful and they notice something suspecious, such as that somebody had traversed the whole website in seconds, you can get your IP banned from ever accessing their domain.

To stay anonymous you could connect to a VPN while using Puppeteer, but this method requires you to pay for the VPN service. The other method of staying anonymous is free and involves using an anonymity network called TOR. 

## TOR

First, we are gonna establish TOR circuits via *SOCKS* ports. A TOR circuit is the combination of entry/guard relay, it also peridocally changes the IP address so that when you are transmitting data though it, nobody can find out what your real IP address is.

1. To install TOR on Windows, you first need *Chocolatey*, which is a command-line package manager for Windows software.

    1.1 Open PowerShell as an administrator and run `Get-ExecutionPolicy`

    1.2 If the previous command returned `Restricted`, then run `Set-ExecutionPolicy AllSigned` or run `Set-ExecutionPolicy Bypass -Scope Process`

    1.3 Lastly install *Chocolatey* via: 
    ```
    Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    ```

    1.4 You can check if you have *Chocolatey* installed: `choco --version`

2. Now, you can use *Chocolatey* to install the *tor* [package](https://community.chocolatey.org/packages/tor):
    ```
    choco install tor
    ```
    
    2.1 With *tor* package installed, we can specify the *SOCKS* ports through which we want our Tor circuits to be established. Open the file `C:\Users\__YOUR_USERNAME__\AppData\Roaming\tor\torrc` (create the file if it doesn't exist) and paste:
    ```
    # Open these SOCKS ports, each will provide a new Tor circuit.
    SocksPort 9050
    SocksPort 9052
    SocksPort 9053
    SocksPort 9054
    ```

    **Note:** *Port 9051 is the default port of the TOR controller, so we should not be using it as a SOCKS port*


## Puppeteer demo project

Next, we are gonna create a Puppeteer demo project and configure it to use one of our prepared Tor circuits. The idea is for the Puppeteer to open a Chromium browser and visit a couple of websites to check if we are indeed browsing completely anonymously.

1. Create an *npm* project based on this *package.json*:
```
{
  "name": "puppeteer-tor",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "puppeteer": "^15.3.2",
    "puppeteer-extra": "^3.3.4",
    "puppeteer-extra-plugin-stealth": "^2.11.0"
  }
}
```

The purspose of the 2 additional packages `puppeteer-extra` and `puppeteer-extra-plugin-stealth` is to change our user-agent and hide information about our system and the browser we are using.

2. Install the packages via `npm install`

3. Create a file `index.js` and paste this:

```
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

    await page.waitForTimeout(6000);        // Waits 6 seconds
    await page.goto('https://ipleak.net');  // Check IP address, user agent, etc.
  } catch (err) {
    console.error(err);
  }
})();
```

4. Start the TOR package executable `C:\ProgramData\chocolatey\lib\tor\tools\Tor\tor.exe` to establish TOR circuits

![Establishing TOR circuits](/images/tor_exe.png "Establishing TOR circuits")

5. With circuits created, we can now launch Puppeteer code `node index.js`.

The first webpage visit should confirm that we are really using TOR:

![Checking if we are using TOR](/images/check_tor.png "Checking if we are using TOR")

Next webpage should display our fake URL provided by the Tor circuit and other fake data that we have configured for the Chromium

![Checking the URL and leaking browser/system data](/images/check_ip_leak.png "Checking the URL and leaking browser/system data")




## [Github repository](https://github.com/TOA-Anakin)

Happy testing!
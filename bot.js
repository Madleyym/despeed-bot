// Import dependencies
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs').promises;
const path = require('path');
const punycode = require('punycode/');

// Define the banner
const banner = `

╔══════════════════════════════════════════════════════╗
║                    MAD-JR SPEED                      ║
║                Network Speed Tester                  ║
║                                                      ║
║              Professional Edition 1.0                ║
╠══════════════════════════════════════════════════════╣
║        Developed & Maintained by Github Mad-jr       ║
║          Enterprise Network Testing Solution         ║
╚══════════════════════════════════════════════════════╝

Initializing system components...
`;

// Configuration
const config = {
  tokenFile: "tokens.txt",
  tokens: [],
  currentTokenIndex: 0,
  baseUrl: "https://speedtest.dnet.id",
  apiPath: "/api",
  checkInterval: 60000,
  debug: false,
  location: {
    latitude: -6.175110,
    longitude: 106.865036
  },
  proxy: {
    enabled: true,
    type: "auto",
    proxyFile: "proxies.txt",
    currentProxyIndex: 0,
    proxyList: [],
    timeout: 15000,
    maxRetries: 3,
    rotateInterval: 300000,
    testUrl: "https://api.ipify.org?format=json",
    retryDelay: 5000
  },
  security: {
    userAgents: [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
    ],
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
      'Origin': 'https://speedtest.dnet.id',
      'Referer': 'https://speedtest.dnet.id/'
    }
  }
};

// Debug logging
function debugLog(message, data = null) {
  if (config.debug) {
    console.log(`[DEBUG] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

// Function to load tokens from file
async function loadTokens() {
  try {
    const content = await fs.readFile(config.tokenFile, 'utf8');
    config.tokens = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    console.log(`Successfully loaded ${config.tokens.length} tokens`);
    return config.tokens.length > 0;
  } catch (error) {
    console.error('Error loading tokens:', error.message);
    return false;
  }
}

// Function to load proxies from file
async function loadProxies() {
  try {
    const content = await fs.readFile(config.proxy.proxyFile, 'utf8');
    config.proxy.proxyList = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    console.log(`Successfully loaded ${config.proxy.proxyList.length} proxies`);
    return config.proxy.proxyList.length > 0;
  } catch (error) {
    console.error('Error loading proxies:', error.message);
    return false;
  }
}

// Function to create proxy agent
async function createProxyAgent(proxyConfig) {
  try {
    const proxyUrl = `${proxyConfig.type}://${encodeURIComponent(proxyConfig.username)}:${encodeURIComponent(proxyConfig.password)}@${proxyConfig.host}:${proxyConfig.port}`;

    console.log(`Creating proxy agent for: ${proxyConfig.host}:${proxyConfig.port}`);

    return proxyConfig.type === 'http' 
      ? new HttpsProxyAgent(proxyUrl)
      : new SocksProxyAgent(proxyUrl);
  } catch (error) {
    console.error(`Failed to create proxy agent: ${error.message}`);
    return null;
  }
}

// Function to get the next token
function getNextToken() {
  if (config.tokens.length === 0) return null;
  const token = config.tokens[config.currentTokenIndex];
  config.currentTokenIndex = (config.currentTokenIndex + 1) % config.tokens.length;
  console.log(`Using token: ${token}`);
  return token;
}

// Main function
(async () => {
  console.log(banner);

  if (!(await loadTokens())) {
    console.error('Failed to load tokens. Exiting.');
    return;
  }

  if (!(await loadProxies())) {
    console.error('Failed to load proxies. Exiting.');
    return;
  }

  console.log(`Connected with token ID: ${getNextToken()}`);
  while (true) {
    const proxyConfig = parseProxyString(config.proxy.proxyList[config.proxy.currentProxyIndex]);

    if (proxyConfig) {
      const agent = await createProxyAgent(proxyConfig);
      if (agent) {
        console.log(`Proxy ${proxyConfig.host} is ready to use.`);
        await fetch(config.proxy.testUrl, { agent })
          .then(res => res.json())
          .then(data => console.log(`Speed test IP: ${data.ip}`))
          .catch(err => console.error('Speed test failed:', err.message));
      }
    }

    config.proxy.currentProxyIndex = (config.proxy.currentProxyIndex + 1) % config.proxy.proxyList.length;
    await new Promise(resolve => setTimeout(resolve, config.checkInterval));
  }
})();

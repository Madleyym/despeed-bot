// Import dependencies
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const fs = require('fs').promises;
const path = require('path');

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

// Function to get the next token
function getNextToken() {
  if (config.tokens.length === 0) return null;
  const token = config.tokens[config.currentTokenIndex];
  config.currentTokenIndex = (config.currentTokenIndex + 1) % config.tokens.length;
  return token;
}

// Parse proxy with special format
function parseProxyString(proxyStr) {
  try {
    const proxyRegex = /^(http|socks):\/\/([^-]+)-session-([^-]+)-duration-(\d+):([^@]+)@([^:]+):(\d+)$/;
    const match = proxyStr.match(proxyRegex);

    if (!match) {
      console.warn('Invalid proxy format:', proxyStr);
      return null;
    }

    const [_, protocol, username, sessionId, duration, password, host, port] = match;

    return {
      type: protocol.toLowerCase(),
      host,
      port: parseInt(port),
      username: `${username}-session-${sessionId}-duration-${duration}`,
      password,
      sessionId,
      duration: parseInt(duration)
    };
  } catch (error) {
    console.error('Error parsing proxy:', error.message);
    return null;
  }
}

// Create proxy agent
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

// Validate proxy
async function validateProxy(agent, proxyConfig) {
  for (let attempt = 1; attempt <= config.proxy.maxRetries; attempt++) {
    try {
      console.log(`Testing proxy ${proxyConfig.host} (Attempt ${attempt}/${config.proxy.maxRetries})`);

      const response = await fetch(config.proxy.testUrl, {
        agent: agent,
        headers: {
          'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)],
          ...config.security.headers
        },
        timeout: config.proxy.timeout
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`Proxy ${proxyConfig.host} validated successfully (IP: ${data.ip})`);
        return true;
      }
    } catch (error) {
      console.warn(`Proxy validation attempt ${attempt} failed:`, error.message);
      if (attempt < config.proxy.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, config.proxy.retryDelay));
      }
    }
  }

  return false;
}

// Perform speed test
async function performSpeedTest(agent) {
  const token = getNextToken();
  if (!token) {
    console.error('No valid token available');
    return null;
  }

  try {
    debugLog('Starting speed test with token', token.substring(0, 10) + '...');

    // Fetch server list
    const serverListResponse = await fetch(`${config.baseUrl}${config.apiPath}/servers`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent
    });

    if (!serverListResponse.ok) {
      throw new Error(`Failed to fetch server list: ${serverListResponse.status}`);
    }

    const servers = await serverListResponse.json();
    const selectedServer = servers[0];

    // Initialize speed test
    const initResponse = await fetch(`${config.baseUrl}${config.apiPath}/test/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent,
      body: JSON.stringify({
        server_id: selectedServer.id,
        latitude: config.location.latitude,
        longitude: config.location.longitude
      })
    });

    if (!initResponse.ok) {
      throw new Error(`Test initialization failed: ${initResponse.status}`);
    }

    const initData = await initResponse.json();

    // Simulate speed test results
    const downloadSpeed = Math.floor(Math.random() * (100 - 50 + 1)) + 50;
    const uploadSpeed = Math.floor(Math.random() * (50 - 20 + 1)) + 20;

    // Submit results
    const submitResponse = await fetch(`${config.baseUrl}${config.apiPath}/test/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent,
      body: JSON.stringify({
        test_id: initData.test_id,
        download_speed: downloadSpeed,
        upload_speed: uploadSpeed,
        ping: Math.floor(Math.random() * 50) + 10,
        jitter: Math.floor(Math.random() * 10) + 1,
        timestamp: new Date().toISOString()
      })
    });

    if (!submitResponse.ok) {
      throw new Error(`Failed to submit test results: ${submitResponse.status}`);
    }

    const resultData = await submitResponse.json();
    console.log('Speed test completed:', resultData);
    return resultData;
  } catch (error) {
    console.error('Speed test error:', error.message);
    return null;
  }
}

// Main function
(async () => {
  console.log(banner);

  if (!(await loadTokens())) {
    console.error('Failed to load tokens. Exiting.');
    return;
  }

  while (true) {
    const proxyConfig = parseProxyString(config.proxy.proxyList[config.proxy.currentProxyIndex]);

    if (proxyConfig) {
      const agent = await createProxyAgent(proxyConfig);
      if (agent && await validateProxy(agent, proxyConfig)) {
        await performSpeedTest(agent);
      }
    }

    config.proxy.currentProxyIndex = (config.proxy.currentProxyIndex + 1) % config.proxy.proxyList.length;
    await new Promise(resolve => setTimeout(resolve, config.checkInterval));
  }
})();

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
  tokenFile: "tokens.txt",  // File untuk menyimpan tokens
  tokens: [],               // Array untuk menyimpan multiple tokens
  currentTokenIndex: 0,     // Index untuk token yang sedang digunakan
  baseUrl: "https://app.despeed.net",
  checkInterval: 60000,
  location: {
    latitude: 39.904202,
    longitude: 116.407394
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
      'Connection': 'keep-alive'
    }
  }
};

// Function untuk memuat tokens dari file
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

// Function untuk mendapatkan token berikutnya
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

// Rotate to next valid proxy
async function rotateToNextValidProxy() {
  const startIndex = config.proxy.currentProxyIndex;
  let attempts = 0;
  
  while (attempts < config.proxy.proxyList.length) {
    config.proxy.currentProxyIndex = (config.proxy.currentProxyIndex + 1) % config.proxy.proxyList.length;
    
    const currentProxy = config.proxy.proxyList[config.proxy.currentProxyIndex];
    const agent = await createProxyAgent(currentProxy);
    
    if (agent && await validateProxy(agent, currentProxy)) {
      console.log(`Successfully rotated to proxy: ${currentProxy.host}`);
      return agent;
    }
    
    attempts++;
  }
  
  throw new Error('No valid proxies found after checking all available proxies');
}

// Perform speed test with token
async function performSpeedTest(agent) {
  const token = getNextToken();
  if (!token) {
    console.error('No valid token available');
    return null;
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/speedtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent,
      body: JSON.stringify({
        latitude: config.location.latitude,
        longitude: config.location.longitude,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Token invalid or expired');
        return null;
      }
      throw new Error(`Speed test failed with status: ${response.status}`);
    }

    const result = await response.json();
    return {
      downloadSpeed: result.download,
      uploadSpeed: result.upload,
      token: token
    };
  } catch (error) {
    console.error('Speed test error:', error.message);
    return null;
  }
}

// Initialize configuration
async function initConfig() {
  try {
    // Load tokens first
    console.log('Loading tokens...');
    const tokensLoaded = await loadTokens();
    if (!tokensLoaded) {
      throw new Error('No valid tokens found');
    }

    console.log('Loading proxy configuration...');
    const proxyContent = await fs.readFile(config.proxy.proxyFile, 'utf8');
    const proxies = proxyContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(parseProxyString)
      .filter(proxy => proxy !== null);
    
    if (proxies.length === 0) {
      throw new Error('No valid proxies found in configuration file');
    }
    
    config.proxy.proxyList = proxies;
    console.log(`Successfully loaded ${proxies.length} proxies`);
    
    // Validate initial proxy
    const initialProxy = proxies[0];
    const agent = await createProxyAgent(initialProxy);
    if (agent && await validateProxy(agent, initialProxy)) {
      console.log('Initial proxy validation successful');
    } else {
      console.log('Initial proxy validation failed, will attempt rotation on start');
    }
    
    return true;
  } catch (error) {
    console.error('Initialization failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  let currentAgent = null;
  
  while (true) {
    try {
      if (!currentAgent) {
        currentAgent = await rotateToNextValidProxy();
      }
      
      const speedTestResult = await performSpeedTest(currentAgent);
      if (speedTestResult) {
        console.log(`Speed test results - Download: ${speedTestResult.downloadSpeed}Mbps, Upload: ${speedTestResult.uploadSpeed}Mbps (Token: ${speedTestResult.token.substring(0, 10)}...)`);
      } else {
        console.log('Speed test failed, rotating proxy...');
        currentAgent = null;
      }
      
    } catch (error) {
      console.error('Error in main loop:', error.message);
      currentAgent = null;
    }
    
    await new Promise(resolve => setTimeout(resolve, config.checkInterval));
  }
}

// Start the application
console.clear();
console.log(banner);

initConfig().then(success => {
  if (success) {
    console.log('Initialization complete, starting speed tests...');
    main().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  } else {
    console.error('Failed to initialize, exiting...');
    process.exit(1);
  }
});

// Cleanup handling
process.on('SIGINT', () => {
  console.log('\nGracefully shutting down...');
  process.exit(0);
});
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

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

// Enhanced security configuration
const config = {
  token: "",
  baseUrl: "https://app.despeed.net",
  checkInterval: 60000,
  location: {
    latitude: 39.904202,
    longitude: 116.407394
  },
  proxy: {
    enabled: true,
    type: "http",
    proxyFile: "proxies.txt",
    currentProxyIndex: 0,
    proxyList: [],
    timeout: 15000,
    maxRetries: 5,
    rotateInterval: 300000, // Rotate proxy every 5 minutes
    testUrl: "https://api.ipify.org?format=json"
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
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    }
  }
};

// Parse proxy with custom format
function parseProxyString(proxyStr) {
  try {
    // Format: http://username:password@host:port
    const url = new URL(proxyStr);
    const [username, password] = url.username.split('-session-');
    return {
      host: url.hostname,
      port: url.port,
      username: username,
      password: url.password,
      sessionId: password.split('-')[0]
    };
  } catch (error) {
    console.error('Error parsing proxy format:', error.message);
    return null;
  }
}

// Enhanced headers generation
function getRandomUserAgent() {
  return config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)];
}

function generateHeaders(extraHeaders = {}) {
  const headers = {
    ...config.security.headers,
    'User-Agent': getRandomUserAgent(),
    'X-Request-ID': uuidv4(),
    'X-Client-Time': new Date().toISOString(),
    ...extraHeaders
  };

  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  return headers;
}

// Enhanced proxy agent creation
async function createProxyAgent(proxyConfig) {
  const auth = `${encodeURIComponent(proxyConfig.username)}:${encodeURIComponent(proxyConfig.password)}`;
  const proxyUrl = `${config.proxy.type}://${auth}@${proxyConfig.host}:${proxyConfig.port}`;

  const agentOptions = {
    proxy: proxyUrl,
    timeout: config.proxy.timeout,
    keepAlive: true,
    keepAliveMsecs: 1000,
    scheduling: 'lifo',
    maxSockets: 256,
    maxFreeSockets: 256,
    headers: {
      'Connection': 'keep-alive',
      'X-Session-ID': proxyConfig.sessionId
    }
  };

  return config.proxy.type === 'http' 
    ? new HttpsProxyAgent(agentOptions)
    : new SocksProxyAgent(agentOptions);
}

// Enhanced proxy validation
async function validateProxy(agent, proxyConfig) {
  try {
    const startTime = Date.now();
    const response = await fetch(config.proxy.testUrl, {
      agent,
      headers: generateHeaders(),
      timeout: config.proxy.timeout
    });

    if (!response.ok) return false;

    const data = await response.json();
    const endTime = Date.now();
    
    // Verify the IP is different from the local IP
    const responseIp = data.ip;
    console.log(`Proxy ${proxyConfig.host} response time: ${endTime - startTime}ms`);
    
    return true;
  } catch {
    return false;
  }
}

// Add rotation timer
let proxyRotationTimer;

function startProxyRotation() {
  if (proxyRotationTimer) clearInterval(proxyRotationTimer);
  
  proxyRotationTimer = setInterval(() => {
    config.proxy.currentProxyIndex = (config.proxy.currentProxyIndex + 1) % config.proxy.proxyList.length;
    console.log('Rotating to next proxy...');
  }, config.proxy.rotateInterval);
}

// Modified main functions to use enhanced security
async function performSpeedTest() {
  // ... existing speed test code with enhanced headers ...
}

async function reportResults(downloadSpeed, uploadSpeed) {
  // ... existing reporting code with enhanced headers ...
}

// Initialize configuration
async function initConfig() {
  console.log('Initializing configuration...');
  
  // Load proxy list
  try {
    const proxyContent = await fs.readFile('proxies.txt', 'utf8');
    const proxies = proxyContent.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(parseProxyString)
      .filter(proxy => proxy !== null);
    
    config.proxy.proxyList = proxies;
    console.log(`Loaded ${proxies.length} proxies successfully`);
    
    if (proxies.length > 0) {
      startProxyRotation();
    }
  } catch (error) {
    console.error('Failed to load proxy list:', error.message);
    process.exit(1);
  }
  
  // ... rest of initialization code ...
}

// Cleanup handling
process.on('SIGINT', () => {
  if (proxyRotationTimer) clearInterval(proxyRotationTimer);
  console.log('\nGracefully shutting down...');
  process.exit(0);
});

// Start the application
console.clear();
console.log(banner);
initConfig().then(() => {
  main();
}).catch(error => {
  console.error('Initialization failed:', error.message);
  process.exit(1);
});
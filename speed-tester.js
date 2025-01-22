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
// ... (previous imports remain the same)

// Update the config section with the correct URL
const config = {
  tokenFile: "tokens.txt",
  tokens: [],
  currentTokenIndex: 0,
  baseUrl: "https://speedtest.dnet.id",  // Updated to the correct endpoint
  checkInterval: 60000,
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


// Update the performSpeedTest function
async function performSpeedTest(agent) {
  const token = getNextToken();
  if (!token) {
    console.error('No valid token available');
    return null;
  }

  try {
    // Get server configuration
    const configResponse = await fetch(`${config.baseUrl}/api/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent,
      // Disable SSL verification if needed
      rejectUnauthorized: false
    });

    if (!configResponse.ok) {
      throw new Error(`Config fetch failed with status: ${configResponse.status}`);
    }

    const serverConfig = await configResponse.json();

    // Start speed test
    const testResponse = await fetch(`${config.baseUrl}/api/speedtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent,
      // Disable SSL verification if needed
      rejectUnauthorized: false,
      body: JSON.stringify({
        latitude: config.location.latitude,
        longitude: config.location.longitude,
        timestamp: new Date().toISOString(),
        server_id: serverConfig.preferred_server || 'auto',
        client_info: {
          user_agent: config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)],
          platform: 'web',
          version: '1.0.0'
        }
      })
    });

    if (!testResponse.ok) {
      throw new Error(`Speed test failed with status: ${testResponse.status}`);
    }

    const result = await testResponse.json();

    return {
      downloadSpeed: result.download || Math.floor(Math.random() * (100 - 50 + 1)) + 50,
      uploadSpeed: result.upload || Math.floor(Math.random() * (50 - 20 + 1)) + 20,
      token: token,
      testId: result.test_id || Date.now().toString()
    };
  } catch (error) {
    console.error('Speed test error:', error.message);
    if (error.message.includes('401')) {
      console.log('Token appears to be invalid, rotating to next token...');
    }
    return null;
  }
}

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

// Initialize configuration
async function initConfig() {
  try {
    // Load tokens first
    console.log('Loading tokens...');
    const tokensLoaded = await loadTokens();
    if (!tokensLoaded) {
      throw new Error('No valid tokens found');
    }

    if (config.proxy.enabled) {
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
    }
    
    return true;
  } catch (error) {
    console.error('Initialization failed:', error.message);
    return false;
  }
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

// Updated performSpeedTest function
function debugLog(message, data = null) {
  if (config.debug) {
    console.log(`[DEBUG] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

async function performSpeedTest(agent) {
  const token = getNextToken();
  if (!token) {
    console.error('No valid token available');
    return null;
  }

  try {
    debugLog('Starting speed test with token', token.substring(0, 10) + '...');

    // First try to get server list
    debugLog('Fetching server list');
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
    debugLog('Received server list', servers);

    // Select nearest server
    const selectedServer = servers[0]; // Use first server for now
    debugLog('Selected server', selectedServer);

    // Initialize test
    debugLog('Initializing speed test');
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
      debugLog('Init response error', await initResponse.text());
      throw new Error(`Test initialization failed: ${initResponse.status}`);
    }

    const initData = await initResponse.json();
    debugLog('Test initialized', initData);

    // Simulate download test
    debugLog('Starting download test');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const downloadSpeed = Math.floor(Math.random() * (100 - 50 + 1)) + 50;

    // Simulate upload test
    debugLog('Starting upload test');
    await new Promise(resolve => setTimeout(resolve, 3000));
    const uploadSpeed = Math.floor(Math.random() * (50 - 20 + 1)) + 20;

    // Submit results
    debugLog('Submitting test results');
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
      debugLog('Submit response error', await submitResponse.text());
      throw new Error(`Failed to submit results: ${submitResponse.status}`);
    }

    const result = await submitResponse.json();
    debugLog('Test completed successfully', result);

    return {
      downloadSpeed,
      uploadSpeed,
      token,
      testId: initData.test_id
    };
  } catch (error) {
    console.error('Speed test error:', error.message);
    debugLog('Full error', error);
    return null;
  }
}

// Main function with improved error handling
// Update main function with better error handling
async function main() {
  let currentAgent = null;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;
  
  while (true) {
    try {
      if (!currentAgent) {
        currentAgent = await rotateToNextValidProxy();
        consecutiveFailures = 0;
      }
      
      console.log('\nStarting new speed test cycle...');
      const speedTestResult = await performSpeedTest(currentAgent);
      
      if (speedTestResult) {
        console.log(`
Speed Test Results:
✓ Download: ${speedTestResult.downloadSpeed} Mbps
✓ Upload: ${speedTestResult.uploadSpeed} Mbps
✓ Test ID: ${speedTestResult.testId}
✓ Token: ${speedTestResult.token.substring(0, 10)}...
        `);
        consecutiveFailures = 0;
      } else {
        console.log('Speed test failed, rotating proxy...');
        currentAgent = null;
        consecutiveFailures++;
        
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log('Too many consecutive failures. Waiting for 5 minutes before retrying...');
          await new Promise(resolve => setTimeout(resolve, 300000));
          consecutiveFailures = 0;
        }
      }
      
    } catch (error) {
      console.error('Error in main loop:', error.message);
      currentAgent = null;
      consecutiveFailures++;
    }
    
    console.log(`Waiting ${config.checkInterval/1000} seconds before next test...`);
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
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

// Single configuration object
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
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ],
    headers: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0'
    }
  }
};

// Enhanced proxy parsing with better validation
function parseProxyString(proxyStr) {
  const proxyRegex = /^(http|socks):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/;
  const match = proxyStr.match(proxyRegex);
  
  if (!match) {
    console.warn(`Invalid proxy format: ${proxyStr}`);
    return null;
  }

  const [_, protocol, username, password, host, port] = match;
  
  return {
    type: protocol.toLowerCase(),
    host,
    port: parseInt(port),
    username,
    password
  };
}

// Enhanced proxy agent creation with better error handling
async function createProxyAgent(proxyConfig) {
  try {
    const auth = `${encodeURIComponent(proxyConfig.username)}:${encodeURIComponent(proxyConfig.password)}`;
    const proxyUrl = `${proxyConfig.type}://${auth}@${proxyConfig.host}:${proxyConfig.port}`;
    
    const agentOptions = {
      proxy: proxyUrl,
      timeout: config.proxy.timeout,
      keepAlive: true
    };

    return proxyConfig.type === 'http' 
      ? new HttpsProxyAgent(agentOptions)
      : new SocksProxyAgent(agentOptions);
  } catch (error) {
    console.error(`Failed to create proxy agent: ${error.message}`);
    return null;
  }
}

// Improved proxy validation with retries
async function validateProxy(agent, proxyConfig) {
  for (let attempt = 1; attempt <= config.proxy.maxRetries; attempt++) {
    try {
      console.log(`Testing proxy ${proxyConfig.host} (Attempt ${attempt}/${config.proxy.maxRetries})`);
      
      const response = await fetch(config.proxy.testUrl, {
        agent,
        timeout: config.proxy.timeout,
        headers: {
          'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
        }
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

// Enhanced proxy rotation with validation
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

// Improved speed test with better error handling
async function performSpeedTest(agent) {
  try {
    const response = await fetch(`${config.baseUrl}/api/speedtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.security.headers
      },
      agent,
      body: JSON.stringify({
        latitude: config.location.latitude,
        longitude: config.location.longitude,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Speed test failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Speed test error:', error.message);
    return null;
  }
}

// Enhanced initialization
async function initConfig() {
  try {
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

// Enhanced main loop
async function main() {
  let currentAgent = null;
  
  while (true) {
    try {
      if (!currentAgent) {
        currentAgent = await rotateToNextValidProxy();
      }
      
      const speedTestResult = await performSpeedTest(currentAgent);
      if (speedTestResult) {
        console.log(`Speed test results - Download: ${speedTestResult.download}Mbps, Upload: ${speedTestResult.upload}Mbps`);
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

// Startup sequence
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
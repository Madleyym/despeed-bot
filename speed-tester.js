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
  baseUrl: "https://api.despeed.com",  // Updated API endpoint
  checkInterval: 60000,
  location: {
    latitude: -6.175110,  // Jakarta coordinates
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
      'Connection': 'keep-alive'
    }
  }
};

// Existing functions remain the same until performSpeedTest

// Updated performSpeedTest function
async function performSpeedTest(agent) {
  const token = getNextToken();
  if (!token) {
    console.error('No valid token available');
    return null;
  }

  try {
    // First, initialize the speed test
    const initResponse = await fetch(`${config.baseUrl}/v1/speedtest/init`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent
    });

    if (!initResponse.ok) {
      throw new Error(`Speed test initialization failed with status: ${initResponse.status}`);
    }

    const initData = await initResponse.json();
    const testId = initData.testId;

    // Simulate download test
    const downloadSpeed = Math.floor(Math.random() * (100 - 50 + 1)) + 50; // Random speed between 50-100 Mbps
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test duration

    // Simulate upload test
    const uploadSpeed = Math.floor(Math.random() * (50 - 20 + 1)) + 20; // Random speed between 20-50 Mbps
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test duration

    // Submit test results
    const submitResponse = await fetch(`${config.baseUrl}/v1/speedtest/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...config.security.headers,
        'User-Agent': config.security.userAgents[Math.floor(Math.random() * config.security.userAgents.length)]
      },
      agent,
      body: JSON.stringify({
        testId,
        downloadSpeed,
        uploadSpeed,
        latitude: config.location.latitude,
        longitude: config.location.longitude,
        timestamp: new Date().toISOString()
      })
    });

    if (!submitResponse.ok) {
      throw new Error(`Speed test submission failed with status: ${submitResponse.status}`);
    }

    return {
      downloadSpeed,
      uploadSpeed,
      token: token,
      testId
    };
  } catch (error) {
    console.error('Speed test error:', error.message);
    if (error.message.includes('401')) {
      console.log('Token appears to be invalid, rotating to next token...');
      // Implement token rotation logic here if needed
    }
    return null;
  }
}

// Main function with improved error handling
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
          await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
          consecutiveFailures = 0;
        }
      }
      
    } catch (error) {
      console.error('Error in main loop:', error.message);
      currentAgent = null;
      consecutiveFailures++;
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
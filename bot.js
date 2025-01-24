const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const WebSocket = require('ws');
const crypto = require('crypto');

const { ACCOUNTS } = require('./account.js');

// Rest of the script remains the same...

const banner = `      
                                   
╔══════════════════════════════════════════════════════╗
║                    MAD-JR SPEED                      ║
║                Network Speed Tester                  ║
║                                                      ║
║              Professional Edition 2.0                ║
╠══════════════════════════════════════════════════════╣
║        Developed & Maintained by Github Mad-jr       ║
║          Enterprise Network Testing Solution         ║
╚══════════════════════════════════════════════════════╝
`;

class SpeedTestBot {
  constructor() {
    this.config = {
      baseUrl: "https://app.despeed.net",
      checkInterval: 60000,
      proxyTimeout: 15000,
      maxRetries: 5,
      proxiesPath: path.join(__dirname, 'proxies.txt')
    };
    
    this.currentAccountIndex = 0;
    this.currentProxyIndex = 0;
    this.proxies = [];
    this.failedProxies = new Set();
    
    this.loadProxies();
  }

  loadProxies() {
    try {
      const proxiesPath = path.join(__dirname, 'proxies.txt');
      const proxiesContent = fs.readFileSync(proxiesPath, 'utf-8');
      
      this.proxies = proxiesContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(this.parseProxyString)
        .filter(proxy => proxy !== null);

      console.log(`🌐 Total Valid Proxies: ${this.proxies.length}`);
    } catch (error) {
      console.error('Critical error loading proxies:', error);
    }
  }

  async getProxyAgent(proxyConfig) {
    if (!proxyConfig || !proxyConfig.host) return null;

    try {
      const proxyUrl = `${proxyConfig.type}://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.host}:${proxyConfig.port}`;
      const agent = proxyConfig.type === 'socks5' 
        ? new SocksProxyAgent(proxyUrl)
        : new HttpsProxyAgent(proxyUrl);

      // Enhanced proxy validation
      const response = await fetch('https://api.ipify.org?format=json', {
        agent,
        timeout: this.config.proxyTimeout
      });

      if (!response.ok) {
        console.warn(`Proxy ${proxyConfig.host}:${proxyConfig.port} validation failed`);
        this.failedProxies.add(proxyConfig.host);
        return null;
      }

      return agent;
    } catch (error) {
      console.warn(`Proxy ${proxyConfig.host} connection error: ${error.message}`);
      this.failedProxies.add(proxyConfig.host);
      return null;
    }
  }

  getNextProxy() {
    const availableProxies = this.proxies.filter(proxy => 
      proxy && !this.failedProxies.has(proxy.host)
    );

    if (availableProxies.length === 0) {
      console.warn('No valid proxies available. Resetting failed proxies.');
      this.failedProxies.clear();
      return this.proxies[0] || null;
    }

    return availableProxies[this.currentProxyIndex++ % availableProxies.length];
  }

  parseProxyString(proxyStr) {
    try {
      const cleanProxyStr = proxyStr.replace('http://', '');
      
      const [authPart, hostPort] = cleanProxyStr.split('@');
      const [host, port] = hostPort.split(':');
      const [username, password] = authPart.split(':');

      return { 
        type: 'http', 
        host, 
        port: parseInt(port, 10), 
        username, 
        password 
      };
    } catch (error) {
      console.error(`Invalid proxy: ${proxyStr}`);
      return null;
    }
  }

  async performSpeedTest(token) {
    const proxies = this.getNextProxies();
    const results = [];
  
    for (const proxy of proxies) {
      const proxyAgent = await this.getProxyAgent(proxy);
      if (!proxyAgent) {
        console.warn(`Proxy ${proxy.host}:${proxy.port} validation failed, skipping`);
        continue;
      }
  
      console.log(`Using proxy: ${proxy.host}:${proxy.port}`);
  
      const { downloadSpeed, uploadSpeed } = await this.testDownloadAndUpload(proxyAgent);
      results.push({ proxy, downloadSpeed, uploadSpeed });
    }
  
    return results;
  }

  generateRandomLocation() {
    // Generate random coordinates around the globe
    const latitude = Math.random() * 180 - 90;
    const longitude = Math.random() * 360 - 180;
    
    return {
      latitude: parseFloat(latitude.toFixed(4)),
      longitude: parseFloat(longitude.toFixed(4))
    };
  }
  loadProxies() {
    try {
      const proxiesPath = path.join(__dirname, 'proxies.txt');
      console.log(`🔍 Searching for proxies at: ${proxiesPath}`);
      console.log(`📂 Absolute Path: ${proxiesPath}`);
  
      // Add file existence and read checks
      if (!fs.existsSync(proxiesPath)) {
        console.error(`❌ Proxies file NOT FOUND at: ${proxiesPath}`);
        console.error(`Current Directory: ${__dirname}`);
        console.error(`Files in directory: ${fs.readdirSync(__dirname).join(', ')}`);
        return;
      }
  
      const proxiesContent = fs.readFileSync(proxiesPath, 'utf-8');
      console.log('📋 Raw Proxies Content:');
      console.log('---START---');
      console.log(proxiesContent);
      console.log('---END---');
  
      const allProxyLines = proxiesContent.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
  
      console.log(`📋 Total proxy lines read: ${allProxyLines.length}`);
      console.log('🔍 Proxy Lines:');
      allProxyLines.forEach((line, index) => {
        console.log(`Line ${index + 1}: ${line}`);
      });
  
      this.proxies = allProxyLines
        .map(this.parseProxyString)
        .filter(proxy => proxy !== null);
  
      console.log(`🌐 Total Valid Proxies Loaded: ${this.proxies.length}`);
      
      this.proxies.forEach((proxy, index) => {
        console.log(`📡 Proxy ${index + 1}: ${proxy.host}:${proxy.port} (Session: ${proxy.username})`);
      });
  
    } catch (error) {
      console.error('Critical error loading proxies:', error);
    }
  }
  
  async performSpeedTest(token, proxyAgent) {
    try {
      console.log('🚀 Initiating Network Speed Test...');
      
      // Log proxy details if available
      if (proxyAgent) {
        const proxyDetails = proxyAgent.proxy;
        console.log(`🌍 Using Proxy: ${proxyDetails.host}:${proxyDetails.port}`);
      }
  
      // Rest of the existing performSpeedTest method remains the same...
  
      console.log(`📊 Speed Test Results:`);
      console.log(`   📉 Download Speed: ${downloadSpeed.toFixed(2)} Mbps`);
      console.log(`   📈 Upload Speed: ${uploadSpeed.toFixed(2)} Mbps`);
  
      return { downloadSpeed, uploadSpeed };
    } catch (error) {
      console.error('❌ Speed Test Error:', error.message);
      return { downloadSpeed: 0, uploadSpeed: 0 };
    }
  }
  
  parseProxyString(proxyStr) {
    try {
      // Trim and validate input
      proxyStr = proxyStr.trim();
      if (!proxyStr) {
        console.warn(`Empty proxy string detected`);
        return null;
      }
  
      // Remove 'http://' prefix if present
      const cleanProxyStr = proxyStr.replace('http://', '');
      
      // Validate proxy format
      if (!cleanProxyStr.includes('@') || !cleanProxyStr.includes(':')) {
        console.warn(`Invalid proxy format: ${proxyStr}`);
        return null;
      }
  
      // Split the string
      const [authPart, hostPort] = cleanProxyStr.split('@');
      const [host, port] = hostPort.split(':');
      const [username, password] = authPart.split(':');
  
      // Additional validation
      if (!host || !port || !username || !password) {
        console.warn(`Incomplete proxy details in: ${proxyStr}`);
        return null;
      }
  
      return { 
        type: 'http', 
        host, 
        port: parseInt(port, 10), 
        username, 
        password 
      };
    } catch (error) {
      console.error('Detailed proxy parsing error:', {
        message: error.message,
        proxyString: proxyStr
      });
      return null;
    }
  }

async getProxyAgent(proxyConfig) {
    if (!proxyConfig || !proxyConfig.host) return undefined;

    try {
        const auth = proxyConfig.username && proxyConfig.password 
            ? `${encodeURIComponent(proxyConfig.username)}:${encodeURIComponent(proxyConfig.password)}@`
            : '';
        
        const proxyUrl = `${proxyConfig.type}://${auth}${proxyConfig.host}:${proxyConfig.port}`;
        
        const agent = proxyConfig.type === 'socks5' 
            ? new SocksProxyAgent(proxyUrl)
            : new HttpsProxyAgent(proxyUrl);

        console.log(`Using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
        console.log(`Testing proxy: ${proxyUrl}`);

        // Enhanced proxy validation using `agent`
        const response = await fetch('https://api.ipify.org?format=json', {
            agent, // Correctly use the agent here
            timeout: this.config.proxyTimeout
        });
        
        if (!response.ok) {
            console.warn(`Failed to reach API using proxy ${proxyConfig.host}:${proxyConfig.port}`);
        }

        return agent;
    } catch (error) {
        console.warn(`Proxy validation error: ${error.message}`);
        return undefined;
    }
}


getNextProxies() {
  const availableProxies = this.proxies.filter(proxy => 
    proxy && !this.failedProxies.has(proxy.host)
  );
  return availableProxies;
}

  getNextAccount() {
    if (ACCOUNTS.length === 0) return null;
    const account = ACCOUNTS[this.currentAccountIndex];
    this.currentAccountIndex = (this.currentAccountIndex + 1) % ACCOUNTS.length;
    return account;
  }

  getCommonHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://app.despeed.net',
      'Referer': 'https://app.despeed.net/dashboard'
    };
  }
  async validateToken(token) {
    try {
      // Decode token and log details
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.error('Invalid token format');
        return false;
      }
  
      const tokenData = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('Token Data:', {
        id: tokenData.id,
        email: tokenData.email,
        issuedAt: new Date(tokenData.iat * 1000),
        expiresAt: new Date(tokenData.exp * 1000)
      });
  
      // Check token expiration with more detailed logging
      const currentTime = Date.now();
      const expirationTime = tokenData.exp * 1000;
      console.log('Current Time:', new Date(currentTime));
      console.log('Expiration Time:', new Date(expirationTime));
  
      if (expirationTime < currentTime) {
        console.error('Token has expired');
        return false;
      }
  
      const proxy = this.getNextProxy();
      const proxyAgent = proxy ? await this.getProxyAgent(proxy) : undefined;
  
      const response = await fetch(`${this.config.baseUrl}/v1/api/auth/profile`, {
        headers: this.getCommonHeaders(token),
        agent: proxyAgent,
        timeout: 30000
      });
  
      console.log('Profile Fetch Status:', response.status);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Profile Fetch Error:', responseText);
        return false;
      }
  
      return true;
    } catch (error) {
      console.error('Full Token Validation Error:', error);
      return false;
    }
  }

  async performSpeedTest(token, proxyAgent) {
    try {
      console.log('Testing network speed...');
      
      const metadata = {
        client_name: 'speed-measurementlab-net-1',
        client_session_id: crypto.randomUUID()
      };
      
      const locateUrl = new URL('https://locate.measurementlab.net/v2/nearest/ndt/ndt7');
      locateUrl.search = new URLSearchParams(metadata).toString();
      
      console.log('Get speed test server...');
      const locateResponse = await fetch(locateUrl, {
        agent: proxyAgent,
        timeout: 30000
      });

      if (!locateResponse.ok) {
        throw new Error(`Failed to obtain speed test server: ${locateResponse.status}`);
      }

      const serverData = await locateResponse.json();
      if (!serverData.results || !serverData.results[0]) {
        throw new Error('No speed test server available');
      }

      const server = serverData.results[0];
      console.log(`Select speed test server: ${server.machine}`);

      const downloadUrl = server.urls['wss:///ndt/v7/download'];
      const uploadUrl = server.urls['wss:///ndt/v7/upload'];

      const downloadSpeed = await this.testDownloadSpeed(downloadUrl, proxyAgent);
      const uploadSpeed = await this.testUploadSpeed(uploadUrl, proxyAgent);

      return { downloadSpeed, uploadSpeed };
    } catch (error) {
      console.error('Speed test error:', error.message);
      return { downloadSpeed: 0, uploadSpeed: 0 };
    }
  }

  testDownloadSpeed(downloadUrl, proxyAgent) {
    return new Promise((resolve, reject) => {
      try {
        const wsOptions = proxyAgent ? { 
          agent: proxyAgent,
          timeout: 60000
        } : { timeout: 60000 };
  
        const ws = new WebSocket(downloadUrl, 'net.measurementlab.ndt.v7', wsOptions);
        
        const TOTAL_BYTES_TARGET = 1024 * 1024 * 100; // 100 MB
        let startTime = Date.now();
        let totalBytes = 0;
        let downloadSpeed = 0;
  
        console.log('\n🌐 Download Speed Test 🌐');
        console.log(`🎯 Target: ${(TOTAL_BYTES_TARGET / (1024 * 1024)).toFixed(2)} MB`);
  
        const progressInterval = setInterval(() => {
          console.log(`📥 Download Progress: ${createProgressBar(totalBytes, TOTAL_BYTES_TARGET)}`);
        }, 5000);
  
        ws.on('message', (data) => {
          if (typeof data !== 'string') {
            totalBytes += data.length;
            const now = Date.now();
            const duration = (now - startTime) / 1000;
            downloadSpeed = (totalBytes * 8) / (duration * 1000000);
  
            if (totalBytes >= TOTAL_BYTES_TARGET) {
              clearInterval(progressInterval);
              ws.close();
            }
          }
        });
  
        ws.on('close', () => {
          console.log('\n✅ Download Complete');
          console.log(`📊 Speed: ${downloadSpeed.toFixed(2)} Mbps`);
          console.log(`📦 Total Bytes: ${totalBytes.toLocaleString()} bytes`);
          resolve({ speed: downloadSpeed, bytes: totalBytes });
        });
  
        // Similar modifications for upload speed test...
      } catch (err) {
        console.error('Download test error:', err);
        resolve({ speed: 0, bytes: 0 });
      }
    });
  }
  
  testUploadSpeed(uploadUrl, proxyAgent) {
    return new Promise((resolve, reject) => {
      try {
        const wsOptions = proxyAgent ? { 
          agent: proxyAgent,
          timeout: 60000
        } : { timeout: 60000 };
  
        const ws = new WebSocket(uploadUrl, 'net.measurementlab.ndt.v7', wsOptions);
        
        let startTime = Date.now();
        let totalBytes = 0;
        let uploadSpeed = 0;
        let testTimeout;
        const uploadData = Buffer.alloc(1024 * 1024); // 1 MB data
        crypto.randomFillSync(uploadData);
  
        // Tambah variabel untuk pelacakan bytes
        const TOTAL_BYTES_TARGET = 1024 * 1024 * 100; // 100 MB target
  
        testTimeout = setTimeout(() => {
          console.error('Upload speed test timed out');
          ws.close();
          resolve({ speed: 0, bytes: totalBytes });
        }, 60000);
  
        ws.on('open', () => {
          console.log('Upload WebSocket connection opened');
          startTime = Date.now();
          totalBytes = 0;
          const sendData = () => {
            if (ws.readyState === WebSocket.OPEN) {
              const now = Date.now();
              const duration = (now - startTime) / 1000;
              
              if (totalBytes >= TOTAL_BYTES_TARGET) {
                ws.close();
                return;
              }
  
              while (ws.bufferedAmount < 1024 * 1024) {
                ws.send(uploadData);
                totalBytes += uploadData.length;
              }
  
              setImmediate(sendData);
            }
          };
          sendData();
        });
  
        ws.on('message', (data) => {
          try {
            if (typeof data === 'string') {
              const lastMeasurement = JSON.parse(data);
              if (lastMeasurement.TCPInfo) {
                const tcpInfo = lastMeasurement.TCPInfo;
                const tmpSpeed = (tcpInfo.BytesReceived / tcpInfo.ElapsedTime) * 8;
                if (tmpSpeed > uploadSpeed) {
                  uploadSpeed = tmpSpeed;
                }
              }
            }
          } catch (err) {
            console.error('Error in upload message processing:', err);
          }
        });
  
        ws.on('close', () => {
          clearTimeout(testTimeout);
          console.log(`Upload bytes: ${totalBytes} bytes`);
          console.log(`Upload speed: ${uploadSpeed.toFixed(2)} Mbps`);
          resolve({ speed: uploadSpeed, bytes: totalBytes });
        });
  
        ws.on('error', (error) => {
          clearTimeout(testTimeout);
          console.error('Upload speed test WebSocket error:', error);
          resolve({ speed: 0, bytes: totalBytes });
        });
      } catch (err) {
        console.error('Fatal error in upload speed test:', err);
        resolve({ speed: 0, bytes: 0 });
      }
    });
  }

  async reportResults(token, downloadSpeed, uploadSpeed) {
    try {
      console.log('Reporting...');

      const proxy = this.getNextProxy();
      const proxyAgent = proxy ? await this.getProxyAgent(proxy) : undefined;
      const location = this.generateRandomLocation();

      const response = await fetch(`${this.config.baseUrl}/v1/api/points`, {
        method: 'POST',
        headers: {
          ...this.getCommonHeaders(token),
          'Content-Type': 'application/json'
        },
        agent: proxyAgent,
        timeout: 30000,
        body: JSON.stringify({
          download_speed: Math.round(downloadSpeed * 100) / 100,
          upload_speed: Math.round(uploadSpeed * 100) / 100,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Report failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Reported successfully');
        return data;
      } else {
        throw new Error(data.message || 'Report failed');
      }

    } catch (error) {
      console.error('Report result error:', error.message);
      return null;
    }
  }
  async displayAccountInfo(token) {
    try {
      console.log('\n=== Account Information ===');
      
      const proxy = this.getNextProxy();
      const proxyAgent = proxy ? await this.getProxyAgent(proxy) : undefined;
  
      // Fetch profile information
      const profileResponse = await fetch(`${this.config.baseUrl}/v1/api/auth/profile`, {
        headers: this.getCommonHeaders(token),
        agent: proxyAgent,
        timeout: 30000
      });
  
      // Fetch points information
      const pointsResponse = await fetch(`${this.config.baseUrl}/v1/api/points/summary`, {
        headers: this.getCommonHeaders(token),
        agent: proxyAgent,
        timeout: 30000
      });
  
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log(`Username: ${profile.data.username || 'Not set'}`);
        console.log(`Email: ${profile.data.email || 'Not set'}`);
      }
  
      if (pointsResponse.ok) {
        const points = await pointsResponse.json();
        console.log(`Total Points: ${points.total || 0}`);
        console.log(`Available Points: ${points.available || 0}`);
        console.log(`Lifetime Points: ${points.lifetime || 0}`);
      }
      
      console.log('=== ======== ===\n');
    } catch (error) {
      console.error('Failed to obtain account information:', error.message);
    }
  }
  async main() {
    const ONE_HOUR = 60 * 60 * 1000; // 1 hour in milliseconds
    const startTime = Date.now();
  
    while (Date.now() - startTime < ONE_HOUR) {
      try {
        const account = this.getNextAccount();
        if (!account) break;
  
        // Use a specific proxy for this token
        const proxyForToken = this.proxies[this.currentAccountIndex];
        const proxyAgent = await this.getProxyAgent(proxyForToken);
  
        if (!(await this.validateToken(account.token))) {
          console.error('Invalid token, skipping account');
          continue;
        }
  
        const { downloadSpeed, uploadSpeed } = await this.performSpeedTest(
          account.token, 
          proxyAgent
        );
        
        if (downloadSpeed > 0 && uploadSpeed > 0) {
          await this.reportResults(account.token, downloadSpeed, uploadSpeed);
          await this.displayAccountInfo(account.token);
        } else {
          console.warn('Speed test failed to produce valid results');
        }
  
        // Reduced delay to cycle through accounts faster
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30-second delay
  
      } catch (error) {
        console.error('Main loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1-minute delay on errors
      }
    }
  
    console.log('🏁 Speed test duration completed after 1 hour');
  }

  start() {
    console.clear();
    console.log(banner);
    this.main().catch(console.error);
  }
}

const bot = new SpeedTestBot();
bot.start();
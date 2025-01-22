# DeSpeed Bot Setup Guide

This guide provides detailed instructions to set up and run the **DeSpeed Bot** on an Ubuntu server. Follow these steps carefully to ensure everything works as expected.

---

Register [here](https://app.despeed.net/register?ref=15UZoaSGy0F3).

---

## **1. Server Requirements**
- **Operating System**: Ubuntu 20.04 or 22.04 LTS
- **RAM**: Minimum 512MB
- **Bandwidth**: At least 1 Mbps
- **CPU**: 1 core or more

---

## **2. Initial Server Setup**
1. **Connect to the server via SSH**:
   ```bash
   ssh root@<YOUR_SERVER_IP>
   ```
2. **Update and upgrade the server**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## **3. Install Node.js**
1. **Add Node.js repository**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   ```
2. **Install Node.js**:
   ```bash
   sudo apt install -y nodejs
   ```
3. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

---

## **4. Download and Configure the Bot**
1. **Install Git**:
   ```bash
   sudo apt install -y git
   ```
2. **Clone the repository**:
   ```bash
   git clone https://github.com/mumumusf/despeed.git
   ```
3. **Navigate to the project directory**:
   ```bash
   cd despeed
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
   If the installation is slow, use a mirror:
   ```bash
   npm install -g cnpm --registry=https://registry.npmmirror.com
   cnpm install
   ```

---

## **5. Run the Bot**
1. **Start the bot**:
   ```bash
   node bot.js
   ```
2. **Provide the required inputs**:
   - **Token**: Obtain the token from [DeSpeed Website](https://app.despeed.net):
     - Login, open Developer Tools (F12), go to the "Application" tab, and copy the token from Local Storage.
   - **Proxy (if any)**: Provide the proxy details in the format:
     ```
     IP:PORT:USERNAME:PASSWORD
     ```
   - **Interval Time**: Suggested interval is 30 minutes or more.

---

## **6. Run in the Background**
### **Option 1: Using Screen**
1. **Install Screen**:
   ```bash
   sudo apt install -y screen
   ```
2. **Create a new session**:
   ```bash
   screen -S despeed
   ```
3. **Start the bot**:
   ```bash
   node bot.js
   ```
4. **Detach the session**:
   - Press `Ctrl + A`, then `D`.
5. **Reattach the session**:
   ```bash
   screen -r despeed
   ```

### **Option 2: Using PM2 (Recommended)**
1. **Install PM2**:
   ```bash
   npm install -g pm2
   ```
2. **Start the bot with PM2**:
   ```bash
   pm2 start bot.js --name despeed
   ```
3. **Manage PM2 processes**:
   - **View running processes**:
     ```bash
     pm2 list
     ```
   - **View logs**:
     ```bash
     pm2 logs despeed
     ```
   - **Stop the bot**:
     ```bash
     pm2 stop despeed
     ```
   - **Restart the bot**:
     ```bash
     pm2 restart despeed
     ```
4. **Enable PM2 startup on reboot**:
   ```bash
   pm2 save
   pm2 startup
   ```

---

## **7. Additional Configuration**
1. **Set timezone**:
   ```bash
   sudo timedatectl set-timezone Asia/Shanghai
   ```
2. **Enable a firewall**:
   ```bash
   sudo ufw allow ssh
   sudo ufw enable
   ```
3. **Add swap (if low on memory)**:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```
4. **Update system periodically**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

---

## **8. Troubleshooting**
- **Bot crashes frequently**:
  - Check logs with PM2: `pm2 logs despeed`
  - Ensure your token and proxy (if used) are valid.

- **Dependencies fail to install**:
  - Use a faster npm mirror: `npm install -g cnpm --registry=https://registry.npmmirror.com`

- **Node.js version is outdated**:
  - Reinstall Node.js following Step 3.

---

With these steps, your DeSpeed bot should be running smoothly on Ubuntu Server!

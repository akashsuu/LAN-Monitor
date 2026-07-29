const net = require('net');

const COMMON_PORTS = [
  { port: 21, name: 'FTP' },
  { port: 22, name: 'SSH' },
  { port: 23, name: 'Telnet' },
  { port: 25, name: 'SMTP' },
  { port: 53, name: 'DNS' },
  { port: 80, name: 'HTTP' },
  { port: 110, name: 'POP3' },
  { port: 143, name: 'IMAP' },
  { port: 443, name: 'HTTPS' },
  { port: 445, name: 'SMB' },
  { port: 993, name: 'IMAPS' },
  { port: 995, name: 'POP3S' },
  { port: 1433, name: 'MSSQL' },
  { port: 1521, name: 'Oracle' },
  { port: 2049, name: 'NFS' },
  { port: 3306, name: 'MySQL' },
  { port: 3389, name: 'RDP' },
  { port: 5432, name: 'PostgreSQL' },
  { port: 5900, name: 'VNC' },
  { port: 6379, name: 'Redis' },
  { port: 8080, name: 'HTTP-Alt' },
  { port: 8443, name: 'HTTPS-Alt' },
  { port: 27017, name: 'MongoDB' },
  { port: 25565, name: 'Minecraft' }
];

const portService = {
  async checkPort(host, port, timeout = 3000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ host, port, open: true, latency, service: this.getServiceName(port), error: null });
      });

      socket.on('error', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({ host, port, open: false, latency, service: this.getServiceName(port), error: null });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ host, port, open: false, latency: timeout, service: this.getServiceName(port), error: 'Timeout' });
      });

      socket.connect(port, host);
    });
  },

  async scanCommonPorts(host) {
    const results = [];
    const concurrency = 10;
    for (let i = 0; i < COMMON_PORTS.length; i += concurrency) {
      const chunk = COMMON_PORTS.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(p => this.checkPort(host, p.port))
      );
      results.push(...chunkResults);
    }
    return results;
  },

  getServiceName(port) {
    const found = COMMON_PORTS.find(p => p.port === port);
    return found ? found.name : 'Unknown';
  }
};

module.exports = portService;

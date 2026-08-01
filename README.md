# LAN Monitor

LAN Monitor is a Node.js command-line tool for inspecting your local network, testing connectivity, monitoring websites and servers, and checking whether commonly used sites are reachable from the current network.

```bash
ln doctor
ln ping google.com
ln scan
ln blocked scan
```

## Installation

```bash
git clone https://github.com/akashsuu/LAN-Monitor.git
cd LAN-Monitor
npm install
node index.js help
```

To use the short `ln` command globally:

```bash
npm install -g .
ln help
```

Without global installation, replace `ln` in the examples below with `node index.js`.

## Quick Start

```bash
# Check the local network, DNS, and internet access
ln doctor
ln internet

# Ping a domain or IP address
ln ping google.com
ln ping 192.168.1.1

# Find devices on the LAN
ln scan

# Check sites that may be blocked on this network
ln blocked scan
```

## Blocked-Site Checks

`ln blocked` checks 261 built-in domains across social media, streaming, gaming, shopping, AI, work tools, news, dating, and adult-content categories. A scan prints the names of sites detected as blocked.

| Command | What it does |
|---------|--------------|
| `ln blocked` | Scan the full built-in and custom checklist |
| `ln blocked scan` | Scan the full built-in and custom checklist |
| `ln blocked check <site>` | Check one domain, for example `ln blocked check youtube.com` |
| `ln blocked list` | Print all domains in the checklist |
| `ln blocked add <site>` | Add a custom domain to future scans |
| `ln blocked remove <site>` | Remove a custom domain from future scans |

Example:

```bash
ln blocked check youtube.com
ln blocked add example.com
ln blocked scan
```

DNS failures are shown separately from blocked sites, so a sandbox or network that blocks DNS does not incorrectly mark every domain as blocked.

## DNS in Restricted Sandboxes

Some sandboxes permit HTTPS requests but block ordinary DNS traffic. LAN Monitor tries the system resolver first. If it is unavailable, it uses a DNS-over-HTTPS fallback automatically.

```bash
ln dns
ln doctor
```

The DNS command shows the configured DNS server and whether resolution used the system resolver or the DNS-over-HTTPS fallback.

## Commands

### Diagnostics and network

| Command | Description |
|---------|-------------|
| `ln help` | Display all commands |
| `ln status` | System and connectivity overview |
| `ln doctor` | Run system diagnostics |
| `ln ping <host>` | Ping a host and show latency |
| `ln scan [subnet]` | Scan the local network |
| `ln devices` | List known devices |
| `ln device <ip>` | Show details for one device |
| `ln port <host> <port>` | Check a port |
| `ln ports <host>` | Scan common ports |

### Website and server monitoring

| Command | Description |
|---------|-------------|
| `ln website` | Scan the local network for web servers |
| `ln website scan <host>` | Scan a host for web ports |
| `ln website scan <host:port>` | Check one web port |
| `ln website add <url>` | Add a website to monitor |
| `ln website list` | List monitored websites |
| `ln website check <name>` | Check HTTP, SSL, and DNS status |
| `ln server` | Scan the local network for servers |
| `ln server scan <host>` | Scan a host for open ports |
| `ln server add <ip>` | Add a server |
| `ln server list` | List monitored servers |

### Internet information

| Command | Description |
|---------|-------------|
| `ln internet` | Show internet status |
| `ln publicip` | Show the public IP address |
| `ln gateway` | Show the default gateway |
| `ln dns` | Show DNS configuration and lookup status |
| `ln speed` | Run a download, upload, and ping test |
| `ln ethernet` | Show network adapter information |

### Management

| Command | Description |
|---------|-------------|
| `ln dashboard` | Start the dashboard |
| `ln alerts` | Manage alerts |
| `ln report [today\|week\|month]` | Generate a report |
| `ln export <csv\|pdf>` | Export data |
| `ln config [show\|set\|reset]` | View or change configuration |

## Requirements

- Node.js 14 or newer
- Windows, Linux, or macOS

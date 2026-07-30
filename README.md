# LAN Monitor

A professional network monitoring CLI built with Node.js.

```bash
ln ping google.com
ln scan
ln website
ln server
ln speed
```

## Installation

```bash
git clone https://github.com/akashsuu/LAN-Monitor.git
cd LAN-Monitor
npm install
node index.js help
```

For global `ln` command:
```bash
npm install -g .
```

## Commands

### Root
| Command | Description |
|---------|-------------|
| `ln help` | Display all commands |
| `ln status` | System & connectivity overview |
| `ln doctor` | Run diagnostics |
| `ln update` | Check for updates |

### Network
| Command | Description |
|---------|-------------|
| `ln ping <host>` | Ping a host |
| `ln scan [subnet]` | Scan local network |
| `ln devices` | List known devices |
| `ln device <ip>` | Show device details |
| `ln port <host> <port>` | Check a port |
| `ln ports <host>` | Scan common ports |

### Websites
| Command | Description |
|---------|-------------|
| `ln website` | Scan local network for web servers |
| `ln website scan <host>` | Scan a host for web ports |
| `ln website scan <host:port>` | Check a specific host:port |
| `ln website scan <subnet/24>` | Scan subnet for web servers |
| `ln website add <url>` | Add website to monitor |
| `ln website remove <name>` | Remove a website |
| `ln website list` | List monitored websites |
| `ln website check <name>` | Check website (HTTP, SSL, DNS) |
| `ln website history <name>` | Show check history |

### Servers
| Command | Description |
|---------|-------------|
| `ln server` | Scan local network for servers |
| `ln server scan <host>` | Scan a host for open ports |
| `ln server scan <host:port>` | Check a specific port |
| `ln server add <ip>` | Add a server |
| `ln server list` | List servers |
| `ln server stats <name>` | Server stats |
| `ln server remove <name>` | Remove a server |

### Info
| Command | Description |
|---------|-------------|
| `ln ethernet` | Network adapter info |
| `ln internet` | Internet status |
| `ln publicip` | Show public IP |
| `ln gateway` | Show gateway |
| `ln dns` | DNS info |
| `ln speed` | Speed test (download/upload/ping) |

### Management
| Command | Description |
|---------|-------------|
| `ln dashboard` | Start dashboard |
| `ln alerts` | Manage alerts |
| `ln report [today\|week\|month]` | Generate report |
| `ln export <csv\|pdf>` | Export data |
| `ln config [show\|set\|reset]` | Configuration |

## Structure

```
lan-monitor/
├── index.js              # Entry point
├── cli/index.js          # Commander.js setup
├── commands/             # Command modules (16 files)
├── services/             # Business logic (6 files)
├── utils/                # Helpers (4 files)
├── config/store.js       # JSON config storage
└── logs/                 # Log files
```

## Requirements

- Node.js >= 14
- Windows / Linux / macOS

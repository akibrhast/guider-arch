# Port Allocation Guide for Synology

## Common Service Ports (Avoid These)
- 80, 443: Synology DSM Web UI / Reverse Proxy
- 5000, 5001: Synology DSM
- 32400: Plex Media Server
- 8080: Often used by various services
- 8096: Jellyfin
- 8989: Sonarr
- 7878: Radarr
- 9091: Transmission
- 6767: Bazarr
- 8686: Lidarr
- 5055: Overseerr/Jellyseerr

## Recommended Port for GUIDER Architecture
**Port 8090** (or any unused port 8000-9000 range)

## Check for Port Conflicts on Synology

SSH into your Synology and run:
```bash
sudo netstat -tulpn | grep LISTEN | sort -n -k4
```

This shows all listening ports. Pick a port that's NOT in the list.

## Suggested Safe Ports
- 8090
- 8091
- 8092
- 9090
- 9091
- 3030

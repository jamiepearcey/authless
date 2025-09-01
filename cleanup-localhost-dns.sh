#!/bin/bash

echo "🧹 Cleaning up localhost DNS setup..."

# Stop dnsmasq if running
if pgrep -x "dnsmasq" > /dev/null; then
    echo "🛑 Stopping dnsmasq..."
    sudo brew services stop dnsmasq
fi

# Remove dnsmasq resolver
if [ -f "/etc/resolver/localhost" ]; then
    echo "🗑️ Removing dnsmasq resolver..."
    sudo rm /etc/resolver/localhost
fi

# Restore hosts file from backup
LATEST_BACKUP=$(ls -t /etc/hosts.backup.* 2>/dev/null | head -n1)
if [ -n "$LATEST_BACKUP" ]; then
    echo "🔄 Restoring /etc/hosts from backup..."
    sudo cp "$LATEST_BACKUP" /etc/hosts
    echo "✅ /etc/hosts restored from $LATEST_BACKUP"
else
    echo "⚠️ No hosts file backup found"
fi

echo "✅ Cleanup completed!"
echo "🔄 Flushing DNS cache..."
sudo dscacheutil -flushcache

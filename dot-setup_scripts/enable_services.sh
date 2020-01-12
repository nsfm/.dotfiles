#!/bin/bash

# Services to enable.
service=(
  ntpd
  NetworkManager
  dbus
  clightd
  dhcpcd
)

for service in "${services[@]}"; do
    echo "Enabling service: $service"
    systemctl enable $service
done

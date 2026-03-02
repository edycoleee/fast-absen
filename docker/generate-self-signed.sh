#!/usr/bin/env sh
set -e

mkdir -p ./ssl

openssl req -x509 -newkey rsa:2048 -sha256 -days 365 \
  -nodes -keyout ./ssl/key.pem -out ./ssl/cert.pem \
  -subj "/C=ID/ST=Local/L=Local/O=Local/OU=Dev/CN=192.10.10.154"

echo "Self-signed cert generated at ./ssl/cert.pem and ./ssl/key.pem"
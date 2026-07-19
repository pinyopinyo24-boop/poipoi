#!/bin/bash

# PoiPoi Android Keystore Generation Script
# This script generates a keystore for signing Android APKs

set -e

KEYSTORE_DIR=".android"
KEYSTORE_FILE="${KEYSTORE_DIR}/poipoi.keystore"
KEYSTORE_ALIAS="poipoi-key"
VALIDITY_DAYS=10950  # 30 years
KEY_SIZE=2048

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}PoiPoi Android Keystore Generation${NC}"
echo "========================================"

# Check if Java is installed
if ! command -v keytool &> /dev/null; then
    echo -e "${RED}Error: keytool not found. Please install Java Development Kit (JDK).${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Java keytool found${NC}"

# Create .android directory if it doesn't exist
if [ ! -d "$KEYSTORE_DIR" ]; then
    mkdir -p "$KEYSTORE_DIR"
    echo -e "${GREEN}✓ Created $KEYSTORE_DIR directory${NC}"
fi

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    echo -e "${YELLOW}Warning: Keystore already exists at $KEYSTORE_FILE${NC}"
    read -p "Do you want to regenerate it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Skipping keystore generation${NC}"
        exit 0
    fi
    rm -f "$KEYSTORE_FILE"
    echo -e "${GREEN}✓ Removed old keystore${NC}"
fi

# Generate keystore
echo ""
echo "Generating keystore..."
echo "Please enter the following information:"
echo ""

keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -keyalg RSA \
    -keysize $KEY_SIZE \
    -validity $VALIDITY_DAYS \
    -alias "$KEYSTORE_ALIAS" \
    -storepass poipoi123 \
    -keypass poipoi123 \
    -dname "CN=PoiPoi Developer, OU=PoiPoi, O=PoiPoi, L=Tokyo, S=Tokyo, C=JP"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Keystore generated successfully${NC}"
    echo -e "${GREEN}✓ Location: $KEYSTORE_FILE${NC}"
    echo -e "${GREEN}✓ Alias: $KEYSTORE_ALIAS${NC}"
    echo -e "${GREEN}✓ Validity: $VALIDITY_DAYS days${NC}"
    
    # Display keystore info
    echo ""
    echo "Keystore Information:"
    keytool -list -v -keystore "$KEYSTORE_FILE" -storepass poipoi123
    
    echo ""
    echo -e "${YELLOW}IMPORTANT: Keep this keystore file safe!${NC}"
    echo -e "${YELLOW}Store password: poipoi123${NC}"
    echo -e "${YELLOW}Key password: poipoi123${NC}"
else
    echo -e "${RED}✗ Failed to generate keystore${NC}"
    exit 1
fi

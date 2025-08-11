#!/bin/bash

# Export Mermaid Diagrams Script
# This script converts Mermaid diagrams to PNG and SVG formats

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if mmdc is installed
if ! command -v mmdc &> /dev/null; then
    echo -e "${RED}Error: mmdc (mermaid-cli) is not installed.${NC}"
    echo -e "${YELLOW}Install it with: npm install -g @mermaid-js/mermaid-cli${NC}"
    exit 1
fi

# Create output directories
mkdir -p diagrams/png
mkdir -p diagrams/svg

echo -e "${BLUE}Exporting Mermaid diagrams...${NC}"

# Function to extract and export diagram
export_diagram() {
    local input_file="$1"
    local base_name=$(basename "$input_file" .md)
    
    echo -e "${YELLOW}Processing: $input_file${NC}"
    
    # Extract Mermaid code blocks and export them
    sed -n '/```mermaid/,/```/p' "$input_file" | sed '/^```/d' | sed '/^$/d' > "diagrams/temp_${base_name}.mmd"
    
    if [ -s "diagrams/temp_${base_name}.mmd" ]; then
        # Export to PNG
        mmdc -i "diagrams/temp_${base_name}.mmd" -o "diagrams/png/${base_name}.png" -b transparent
        echo -e "${GREEN}✓ Exported PNG: diagrams/png/${base_name}.png${NC}"
        
        # Export to SVG
        mmdc -i "diagrams/temp_${base_name}.mmd" -o "diagrams/svg/${base_name}.svg" -b transparent
        echo -e "${GREEN}✓ Exported SVG: diagrams/svg/${base_name}.svg${NC}"
    else
        echo -e "${RED}✗ No Mermaid diagram found in $input_file${NC}"
    fi
    
    # Clean up temporary file
    rm -f "diagrams/temp_${base_name}.mmd"
}

# Export all diagram files
for file in diagrams/*.md; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "README.md" ]; then
        export_diagram "$file"
    fi
done

echo -e "${GREEN}✓ All diagrams exported successfully!${NC}"
echo -e "${BLUE}Output directories:${NC}"
echo -e "  PNG: diagrams/png/"
echo -e "  SVG: diagrams/svg/"

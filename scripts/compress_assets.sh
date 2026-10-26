#!/bin/bash
cd /Users/ibrahimaltukhaim/Downloads/PAPERROUTE/public/assets
mkdir -p backup

# Compress pink tree
echo "Compressing tree_pink..."
cp tree_pink.glb backup/
npx gltf-pipeline -i backup/tree_pink.glb -o tree_pink.glb -d

# Compress green tree
echo "Compressing tree_green..."
cp tree_green.glb backup/
npx gltf-pipeline -i backup/tree_green.glb -o tree_green.glb -d

# Compress yellow tree
echo "Compressing tree_yellow..."
cp tree_yellow.glb backup/
npx gltf-pipeline -i backup/tree_yellow.glb -o tree_yellow.glb -d

# Update manifest
cd ../..
node scripts/update_manifest.mjs
node scripts/update_lantern.mjs
node scripts/update_house.mjs

echo "Compression complete!"

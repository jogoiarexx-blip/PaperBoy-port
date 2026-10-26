#!/bin/bash
FILES="horse.glb house_start.glb tree_green.glb tree_pink.glb tree_yellow.glb lantern.glb"
for f in $FILES; do
  echo "Optimizing $f..."
  npx -y @gltf-transform/cli optimize "public/assets/$f" "public/assets/${f}.new" --compress draco --texture-compress webp --texture-size 1024
  if [ -f "public/assets/${f}.new" ]; then
    mv "public/assets/${f}.new" "public/assets/$f"
    echo "$f optimized successfully!"
  fi
done

#!/usr/bin/env bash
set -e

base_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

(cd "$base_dir/Kinyozi" && exec node server.js) &
kinyozi_pid=$!
(cd "$base_dir/Pet_DES" && exec node server.js) &
petcare_pid=$!

trap 'kill "$kinyozi_pid" "$petcare_pid" 2>/dev/null || true' EXIT INT TERM
echo "Kinyozi: http://localhost:3000"
echo "Petcare: http://localhost:3001"
echo "Press Ctrl+C to stop both websites."
wait

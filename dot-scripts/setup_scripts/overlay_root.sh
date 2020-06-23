#!/bin/sh

script=$(readlink -f "$0")
dir=$(dirname "$script")

echo "Overlaying $dir/root over /"
cp -rsu $dir/root/. /

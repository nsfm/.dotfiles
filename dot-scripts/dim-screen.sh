#!/usr/bin/env bash
# dim-screen.sh - xss-lock notifier. fades the backlight down ahead of the lock; xss-lock kills
# this script on user activity or when the locker starts, and the trap restores brightness.
bl=/sys/class/backlight/intel_backlight
max=$(cat "$bl/max_brightness"); start=$(cat "$bl/brightness")
floor=$(( max * 12 / 100 ))        # dim to 12%
steps=40; dur=4                     # over 4 seconds
restore() { echo "$start" > "$bl/brightness"; exit 0; }
trap restore TERM INT EXIT
[ "$start" -le "$floor" ] && { sleep infinity; exit 0; }
for ((i=1; i<=steps; i++)); do
  echo $(( start - (start - floor) * i / steps )) > "$bl/brightness"
  sleep "$(echo "scale=3; $dur / $steps" | bc)"
done
sleep infinity   # stay alive dimmed; xss-lock ends us

#!/usr/bin/env bash
# dim-screen.sh - idle notifier. fades the backlight down ahead of the lock; restores on TERM/EXIT.
# swayidle runs it on timeout and `dim-screen.sh stop` on resume / before locking.
bl=/sys/class/backlight/intel_backlight
pidfile="${XDG_RUNTIME_DIR:-/tmp}/dim-screen.pid"

if [ "$1" = stop ]; then
  [ -s "$pidfile" ] && kill -TERM "$(cat "$pidfile")" 2>/dev/null
  exit 0
fi

echo $$ > "$pidfile"
max=$(cat "$bl/max_brightness"); start=$(cat "$bl/brightness")
floor=$(( max * 12 / 100 ))        # dim to 12%
steps=40; dur=4                     # over 4 seconds
restore() { echo "$start" > "$bl/brightness"; rm -f "$pidfile"; exit 0; }
trap restore TERM INT EXIT
[ "$start" -le "$floor" ] && { sleep infinity; exit 0; }
for ((i=1; i<=steps; i++)); do
  echo $(( start - (start - floor) * i / steps )) > "$bl/brightness"
  sleep "$(echo "scale=3; $dur / $steps" | bc)"
done
sleep infinity   # stay alive dimmed until we're told to stop

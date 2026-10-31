#!/usr/bin/env bash
# brightness.sh up|down|show - hardware backlight (intel_backlight, dpcd on the oled) in 5% steps,
# with a dunst progress-bar osd. never goes below 5% so the panel can't be stepped to black.
bl=/sys/class/backlight/intel_backlight
max=$(cat "$bl/max_brightness"); cur=$(cat "$bl/brightness")
step=$(( max * 5 / 100 )); floor=$(( max * 5 / 100 ))
case "$1" in
  up)   new=$(( cur + step )); [ "$new" -gt "$max" ] && new=$max ;;
  down) new=$(( cur - step )); [ "$new" -lt "$floor" ] && new=$floor ;;
  show) new=$cur ;;
  *) echo "usage: $0 up|down|show" >&2; exit 1 ;;
esac
echo "$new" > "$bl/brightness"
pct=$(( new * 100 / max ))
notify-send -r 9912 -u low -t 1200 -a brightness -i display-brightness \
  -h string:x-dunst-stack-tag:brightness -h int:value:"$pct" "brightness  ${pct}%"

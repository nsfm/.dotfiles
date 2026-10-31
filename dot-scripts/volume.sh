#!/usr/bin/env bash
# volume.sh up|down|mute|micmute|show - pipewire via wpctl, dunst progress-bar osd.
sink=@DEFAULT_AUDIO_SINK@; src=@DEFAULT_AUDIO_SOURCE@
case "$1" in
  up)      wpctl set-volume -l 1.0 "$sink" 5%+ ;;
  down)    wpctl set-volume "$sink" 5%- ;;
  mute)    wpctl set-mute "$sink" toggle ;;
  micmute) wpctl set-mute "$src" toggle
           if wpctl get-volume "$src" | grep -q MUTED; then t="mic muted"; i=microphone-sensitivity-muted; else t="mic on"; i=microphone-sensitivity-high; fi
           notify-send -r 9914 -u low -t 1200 -a volume -i "$i" -h string:x-dunst-stack-tag:mic "$t"; exit 0 ;;
  show)    ;;
  *) echo "usage: $0 up|down|mute|micmute|show" >&2; exit 1 ;;
esac
read -r _ vol muted < <(wpctl get-volume "$sink")
pct=$(awk -v v="$vol" 'BEGIN{printf "%d", v*100+0.5}')
if [ "$muted" = "[MUTED]" ]; then
  notify-send -r 9913 -u low -t 1200 -a volume -i audio-volume-muted -h string:x-dunst-stack-tag:volume -h int:value:"$pct" "muted"
else
  if   [ "$pct" -le 0 ];  then i=audio-volume-muted
  elif [ "$pct" -le 33 ]; then i=audio-volume-low
  elif [ "$pct" -le 66 ]; then i=audio-volume-medium
  else i=audio-volume-high; fi
  notify-send -r 9913 -u low -t 1200 -a volume -i "$i" -h string:x-dunst-stack-tag:volume -h int:value:"$pct" "volume  ${pct}%"
fi

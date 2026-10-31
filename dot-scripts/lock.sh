#!/usr/bin/env bash
# lock.sh - the one locker. used by: mod+l, idle (xss-lock), lid close / suspend (xss-lock sleep lock).
# screenshot -> lossless pixelation, darkened for oled -> i3lock-color (pink palette, rose-tinted).
# image lives in XDG_RUNTIME_DIR (0700 tmpfs), never /tmp. capture failure still locks on black.

run="${XDG_RUNTIME_DIR:-/tmp}"
img="$run/lock.png"
font="Operator Mono Light"

opts=(
  --color=000000                      # fill before the image decodes: black, not grey
  --ignore-empty-password --show-failed-attempts
  --pass-media-keys --pass-volume-keys
  # indicator (only drawn while typing, by default)
  --radius=110 --ring-width=10
  --ring-color=ffb3c6a6     --inside-color=ffe4ec40
  --ringver-color=ff8fabff  --insidever-color=ffd6e080
  --ringwrong-color=e0457bff --insidewrong-color=ffc2d180
  --keyhl-color=ff8fabff    --bshl-color=e0457bff
  --line-color=00000000     --separator-color=00000000
  --verif-color=ff8fabff    --wrong-color=e0457bff    --modif-color=ffa6c1ff
  --verif-text=""  --wrong-text="nope ♡"  --noinput-text=""  --lock-text=""  --lockfailed-text="!!!"
  # clock, always on, sits inside where the ring appears
  --clock --time-str="%H:%M" --date-str="%a %d %b"
  --time-font="$font" --time-size=58 --time-color=fff0f5ff
  --date-font="$font" --date-size=24 --date-color=ffb3c6ff
  --time-pos="ix:iy-12" --date-pos="ix:iy+40"
)

geom=$(xrandr --current 2>/dev/null | sed -n 's/.*current \([0-9]*\) x \([0-9]*\).*/\1x\2/p' | head -1)
if [ -n "$geom" ] && timeout 3s maim -q -u -f bmp 2>/dev/null \
     | timeout 5s magick bmp:- -scale 4% -scale 2500% -resize "${geom}!" -modulate 55,70 -fill "#ff9ebb" -colorize 10% "png:$img" 2>/dev/null \
     && [ -s "$img" ]; then
  chmod 600 "$img"
  opts+=(--image="$img")
fi

# from the xss-lock docs: hold the sleep lock until i3lock is up, then release it
if [[ -e /dev/fd/${XSS_SLEEP_LOCK_FD:--1} ]]; then
  kill_i3lock() { pkill -xu "$EUID" "$@" i3lock; }
  trap kill_i3lock TERM INT
  i3lock "${opts[@]}" {XSS_SLEEP_LOCK_FD}<&-
  exec {XSS_SLEEP_LOCK_FD}<&-
  while kill_i3lock -0; do sleep 0.05; done
else
  trap 'kill %%' TERM INT
  i3lock -n "${opts[@]}" &
  wait
fi

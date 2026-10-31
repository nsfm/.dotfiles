#!/usr/bin/env bash
# lock.sh - the one locker. used by: mod+l, idle (swayidle), lid close / suspend, loginctl lock.
# grim per output -> lossless pixelation, darkened for oled, rose tint -> swaylock -f (pink ring).
# -f returns once the lock is up, which is what swayidle -w's before-sleep wants.
# images live in XDG_RUNTIME_DIR (0700 tmpfs), never /tmp. capture failure still locks on black.

run="${XDG_RUNTIME_DIR:-/tmp}"
font="Operator Mono Light"
pixelate=(-scale 4% -scale 2500% -modulate 55,70 -fill "#ff9ebb" -colorize 10%)

wopts=(
  -f -e -F -c 000000 -s fill
  --font "$font" --font-size 24
  --indicator-radius 110 --indicator-thickness 10
  --ring-color ffb3c6a6        --inside-color ffe4ec40
  --ring-ver-color ff8fabff    --inside-ver-color ffd6e080
  --ring-wrong-color e0457bff  --inside-wrong-color ffc2d180
  --ring-clear-color ffa6c1ff  --inside-clear-color ffe4ec40
  --ring-caps-lock-color ffb86bff --inside-caps-lock-color ffe4ec40
  --key-hl-color ff8fabff      --bs-hl-color e0457bff
  --line-color 00000000        --separator-color 00000000
  --text-color fff0f5ff --text-ver-color ff8fabff --text-wrong-color e0457bff
  --text-clear-color ffa6c1ff --text-caps-lock-color ffb86bff
)
for out in $(swaymsg -t get_outputs -r | jq -r '.[] | select(.active) | .name'); do
  f="$run/lock-$out.png"
  if timeout 3s grim -o "$out" -t ppm - 2>/dev/null \
       | timeout 5s magick ppm:- "${pixelate[@]}" "png:$f" 2>/dev/null && [ -s "$f" ]; then
    chmod 600 "$f"
    wopts+=(-i "$out:$f")
  fi
done
exec swaylock "${wopts[@]}"

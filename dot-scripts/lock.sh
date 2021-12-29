#!/usr/bin/sh

i3lock_options=(
  --verif-text=""
  --wrong-text="???"
  --noinput-text="?"
  --lock-text=""
  --lockfailed-text="!!!"
  --radius=40
  --ring-width=10
  --insidever-color=0000a0bf
  --insidewrong-color=ff8000bf
  --inside-color=ffffffbf
  --ringver-color=0020ffff
  --ringwrong-color=4040ffff
  --ring-color=404090ff
  --line-color=aaaaaaff
  --keyhl-color=30ccccff
  --bshl-color=ff8000ff
  --ignore-empty-password
  --show-failed-attempts
)

# -selective-blur geometry
# -adaptive-blur
timeout 1s maim -q -m 1 -u -f jpg | convert -taint -scale 10% -scale 1000% - jpg:/tmp/sc.jpg
if [ $? -eq 0 ]; then
  i3lock_options+=(--image=/tmp/sc.jpg)
fi

# From the xss-lock docs
if [[ -e /dev/fd/${XSS_SLEEP_LOCK_FD:--1} ]]; then
    kill_i3lock() {
        pkill -xu $EUID "$@" i3lock
    }

    trap kill_i3lock TERM INT
    i3lock ${i3lock_options[@]} {XSS_SLEEP_LOCK_FD}<&-
    exec {XSS_SLEEP_LOCK_FD}<&-

    while kill_i3lock -0; do
        sleep 0.03
    done
else
    trap 'kill %%' TERM INT
    echo "${i3lock_options[@]}"
    i3lock -n ${i3lock_options[@]} &
    wait
fi

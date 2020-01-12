#!/usr/bin/sh

# -selective-blur geometry
# -adaptive-blur
maim -q -m 5 -u | convert -taint -scale 10% -scale 1000% - png:/tmp/sc.png

i3lock_options=(
  --veriftext=""
  --wrongtext=""
  --noinputtext=""
  --locktext=""
  --lockfailedtext="?!"
  --radius=25
  --ring-width=5
  -e -f -i /tmp/sc.png
)

# Borrowed from the xss-lock docs
get_brightness() {
    if [[ -z $sysfs_path ]]; then
        xbacklight -get
    else
        cat $sysfs_path
    fi
}

set_brightness() {
    if [[ -z $sysfs_path ]]; then
        xbacklight -steps 1 -set $1
    else
        echo $1 > $sysfs_path
    fi
}

fade_brightness() {
    if [[ -z $sysfs_path ]]; then
        xbacklight -time $fade_time -steps $fade_steps -set $1
    elif [[ -z $fade_step_time ]]; then
        set_brightness $1
    else
        local level
        for level in $(eval echo {$(get_brightness)..$1}); do
            set_brightness $level
            sleep $fade_step_time
        done
    fi
}

# Also borrowed from the xss-lock docs
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
    i3lock -n ${i3lock_options[@]} &
    wait
fi

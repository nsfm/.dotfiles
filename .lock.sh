#!/usr/bin/sh
# -selective-blur geometry
# -adaptive-blur
maim -q -m 5 -u | convert -taint -scale 10% -scale 1000% - png:/tmp/sc.png
i3lock --veriftext="" --wrongtext="..." -e -f -i /tmp/sc.png

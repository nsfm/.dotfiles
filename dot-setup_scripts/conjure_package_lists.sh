#!/bin/bash
pacman -Qqe | grep -v "$(pacman -Qqm)" > pacman_packages
pacman -Qqm > yay_packages

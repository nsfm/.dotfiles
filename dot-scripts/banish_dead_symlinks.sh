#!/bin/zsh
# Delete all those dead symlinks left behind after unstowing changes to dotfiles.
rm -- *(-@D)

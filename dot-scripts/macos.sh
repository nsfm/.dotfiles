#!/bin/sh
# macos.sh - link ~/.dotfiles/dot-* into ~ as .* (what `stow --dotfiles` does on linux; homebrew's
# stow mishandles --dotfiles). sourceable: no `exit`, no `set -e`. skips anything that already exists.
dotfiles="${DOTFILES:-$HOME/.dotfiles}"
link_dotfiles() {
  for src in "$dotfiles"/dot-*; do
    [ -e "$src" ] || continue
    name=$(basename "$src")
    dst="$HOME/.${name#dot-}"
    if [ -e "$dst" ] || [ -L "$dst" ]; then
      printf 'skip  %s (exists)\n' "$dst"
    else
      ln -s "$src" "$dst" && printf 'link  %s -> %s\n' "$dst" "$src"
    fi
  done
}
link_dotfiles

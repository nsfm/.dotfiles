# Dotfiles

## Installation

### Linux

```bash
cd ~
git clone https://github.com/nsfm/.dotfiles
stow --dotfiles -d .dotfiles .
```

### MacOS

```bash
cd ~
git clone https://github.com/nsfm/.dotfiles
# Homebrew provides a GNU `stow` package, but the `--dotfiles` option does not work as expected.
source ~/.dotfiles/dot-scripts/macos.sh
```

if [ ! -f "~/.config" ]; then ln -s ~/.dotfiles/dot-config ~/.config fi
if [ ! -f "~/.zshrc" ]; then ln -s ~/.dotfiles/dot-zshrc ~/.zshrc fi
if [ ! -f "~/.vimrc" ]; then ln -s ~/.dotfiles/dot-vimrc ~/.vimrc fi 
if [ ! -f "~/.gitconfig" ]; then ln -s ~/.dotfiles/dot-gitconfig ~/.gitconfig fi 
if [ ! -f "~/.scripts" ]; then ln -s ~/.dotfiles/dot-scripts ~/.scripts fi

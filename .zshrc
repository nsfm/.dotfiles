ENABLE_CORRECTION="true"
COMPLETION_WAITING_DOTS="true"
HIST_STAMPS="dd.mm.yyyy"
TERM=rxvt
HISTFILE=~/.histfile
HISTSIZE=1000000
SAVEHIST=1000000
plugins=(git battery command-not-found jsontools)

setopt appendhistory autocd nomatch

source $ZSH/oh-my-zsh.sh

autoload -U edit-command-line;
zle -N edit-command-line;
bindkey '^F' edit-command-line;

zmodload zsh/mathfunc

autoload bashcompinit
bashcompinit

# pacman -S zsh-syntax-highlighting
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

# Disable godforsaken PC beeping.
xset -b
unsetopt beep

extract () {
  if [ -f $1 ] ; then
    case $1 in
      *.tar.bz2)   tar xvjf $1    ;;
      *.tar.gz)    tar xvzf $1    ;;
      *.bz2)       bunzip2 $1     ;;
      *.rar)       unrar x $1     ;;
      *.gz)        gunzip $1      ;;
      *.tar)       tar xvf $1     ;;
      *.tbz2)      tar xvjf $1    ;;
      *.tgz)       tar xvzf $1    ;;
      *.zip)       unzip $1       ;;
      *.Z)         uncompress $1  ;;
      *.7z)        7z x $1        ;;
      *)           echo "don't know how to extract '$1'..." ;;
    esac
  else
    echo "'$1' is not a valid file!"
  fi
}

alias ls="ls -Fhv --color=auto --group-directories-first"
alias diff="colordiff"
alias alsa="alsamixer"
alias fileman="pcmanfm > /dev/null 2>&1 &"
alias highdpi='xrandr --output eDP1 --dpi 150'
alias lowdpi='xrandr --output eDP1 --dpi 100'
alias top='htop'
alias rm='rm -I --preserve-root'

export ZSH=/home/nate/.oh-my-zsh
export PATH=$PATH:~/.config/yarn/global
export EDITOR=vim
export PAGER="/bin/sh -c \"unset PAGER;col -b -x | \
    vim -R -c 'set ft=man nomod nolist' -c 'map q :q<CR>' \
    -c 'map <SPACE> <C-D>' -c 'map b <C-U>' \
    -c 'nmap K :Man <C-R>=expand(\\\"<cword>\\\")<CR><CR>' -\""
export GPG_TTY=$(tty)

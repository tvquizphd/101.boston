## Dev environment

This is everything needed for my dev environment on a linux server using `yum` package manager.

```
sudo yum install tmux -y
sudo yum install git -y
```

Copy this content to `~/.tmux.conf`:

```
set-option -g prefix 😂
bind -r k select-pane -U
bind -r j select-pane -D
bind -r h select-pane -L
bind -r l select-pane -R
```

Copy this content to `~/.vimrc`:

```
set fileencodings=utf-8
set ts=2 sw=2
set expandtab

call pathogen#infect()
syntax on
filetype plugin indent on

map <C-n> :NERDTreeToggle<CR>
```

Finish setup of `vim`:
```
mkdir -p ~/.vim/autoload ~/.vim/bundle
curl -LSso ~/.vim/autoload/pathogen.vim https://tpo.pe/pathogen.vim
git clone https://github.com/preservim/nerdtree.git ~/.vim/bundle/nerdtree
```

Copy this content to `~/.gitconfig`:

```
[user]
  name = John Hoffer
  email = john@hoff.in
```

Copy private and public keys and finish setup.

```
sudo chmod 600 ~/.ssh/id_ed25519
sudo chmod 600 ~/.ssh/id_ed25519.pub
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_ed25519
```

### For JS

```
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 24
nvm use 24
```

### For AWS

```
aws login --remote
```

and follow instructions.

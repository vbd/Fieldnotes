# Vim

> **Intern** Check Todo: notes.*, master.*, logger.*, todo.* and paper notes for examples.  
> Maybe useful: fb mapping, argdo, bufdo, search and replace without plugins, completions, navigate functions/methods

## Learning Vim

I learned vim in a way most younger people can't imagine I didn't know any books, youtube wasn't available and I didn't know what a plugin is.
My first vim contact was a remote session from Windows via telnet to a linux machine which I couldn't figure out to quit - no joke.  
Finally I did alt+F4...

But since that time I got hooked, and I didn't regret to learn it. I still use Vim today. I do 95% of my work with it.

Today I would recommend the following:

1. [Vim Tutorial for Beginners](https://www.youtube.com/watch?v=RZ4p-saaQkc)
2. [How to Do 90% of What Plugins Do (With Just Vim)](https://www.youtube.com/watch?v=XA2WjJbmmoM)
3. Ask the great help, sometime it's a bit tricky to find the right keyword. You can take a full shot on the help file as PDF https://nathangrigg.com/vimhelp/vimhelp-a4.pdf
4. [Vimcasts.org](http://vimcasts.org/episodes/)
5. [Vim Cookbook by Steve Oualline](http://www.oualline.com/vim-cook.html). He wrote my [first Vim book I read](http://www.oualline.com/books/index.html) dated ~2000/2001/2002
6. :books: Practical Vim: Edit Text at the Speed of Thought https://www.amazon.de/Practical-Vim-Edit-Speed-Thought/dp/1680501275/
7. :books: Modern Vim: Craft Your Development Environment with Vim 8 and Neovim https://www.amazon.de/Modern-Vim-Development-Environment-Neovim/dp/168050262X/


I try to watch as few vim videos on youtube as possible because they might distract me too much from my work but
there are some greast youtuber's fiddling with vim/neovim e.g.:

- [ThePrimeagen](https://www.youtube.com/@ThePrimeagen/search?query=vim)
- [Ben Awad](https://www.youtube.com/@bawad/search?query=vim)
- [SeniorMars](https://www.youtube.com/@SeniorMarsTries/search?query=vim)
- [Sebastian Daschner](https://www.youtube.com/@SebastianDaschnerIT/search?query=vim)
- [DistroTube](https://www.youtube.com/@DistroTube/search?query=vim)


## General

```
    open file todo.md and jump to line 39
    vim +39 todo.md

    delete from current line to last line visible on screen
    dL

    delete from current cursor position up to PATTERN
    d/PATTERN

    display the character count of the current file
    g CTRL-G

    To turn off highlighting until the next search
    :noh

    Indent in insert mode
    Indent: ctrl+t
    Unindent: ctrl+d

    Movement command in insert mode e.g. to go forward one word type 
    ctrl+o w

    jump to next / previous empty line
    } / {

    cancel auto completion
    ctrl + e

    Pipe result to vim
    e.g.:
        rg -i PATTERN | vim -
        python abr.py | vim -

    Paste clipboard content while in insert mode 
    (depends on OS and compile options listed :version)
    ctrl+r *
    ctrl+r "

    send current line to vim terminal
    1. copy current line with yy
    2. :term
    3. ctrl+w ""

    Substiute with confirmation
    :%s/foo/bar/gc

    Count number of matches of a pattern
    :%s/pattern//n

    Show content of registers
    :reg

    Insert from register e.g. m
    "mp

    To run your last search again
    //
```

 

## Export to HTML including manual folds  
```
  :set background=light
  :TOhtml 
```

## Digraph / unicode
In insert mode
`ctrl + k` followed by `>>` will result in: »  
```
<< «
Rg ®
TM ™
Co ©
```
:dig

More: https://devhints.io/vim-digraphs

To insert a Unicode character while in insert mode, type `ctrl+vuxxxx` e.g. `ctrl+vu2713`.


## Encryption

Remove encryption key from file which was set with :X
```
  :set key=
  :w
```

## Troubleshooting

Info: https://vi.stackexchange.com/questions/2003/how-do-i-debug-my-vimrc-file

`vim -u NONE -U NONE -N`

Capture ex command output to buffer e.g. `:version`

```
  :redir @m | silent version | redir END
  "mp
```


## RegEx

> **NOTE**: untested :g can possibly be omitted

Add " to the begin of the line -> : instead of / used for better readability  
`:%s:^:":g`  

Add " to the end of the line -> : instead of / used for better readability  
`:%s:$:":g` 


## vimgrep
```
    vimgrep /PATTERN/f % | copen
        vimgrep   - grep for
        /PATTERN/ - PATTERN
        f         - with fuzzy mode
        %         - in current file
        | copen   - open quickfix window for results
```

## Search and replace special chars

- Cursor on char
- typing `ga` to identify what it is
- Use `\%u` pattern to search for the four digits hex e.g. `%s/\%ufb01//gn` to remove fb01



## Folding

- `za` toggle fold under cursor
- `zR` open all folds
- `zM`close all folds

Mapping in vimrc to toggle a fold when cursor is on the fold
```
    nmap <space> zA
````


## Buffer
```
    :buffers
    :Buffers (if fzf plugin is used :BLines to search in buffer)

    jump between last and current buffer
    ctrl+6 or :b#

    alle Buffer schließen, bis auf die die noch nicht gespeichert sind
    :%bd

    Split buffer vertical
    ctrl+wv

    Split buffer horizontal
    ctrl+ws
```

## Marks
```
    show current marks
    :marks

    set mark m at current cursor location
    mm

    jump to line of mark m
    'm

    jump to position (row and column) of mark m
    `m

    yank text to from cursor to position of mark m
    y`m

    delete from current line to line of mark m
    d'm

    delete from current cursor position to mark m position
    d`m
```


## Export diff as html
`vim -d old.txt new.txt -c TOhtml -c "w! diff.html" -c q! -c q! -c q!`

## Macro execution

Source: https://stackoverflow.com/questions/390174/in-vim-how-do-i-apply-a-macro-to-a-set-of-lines

    Execute the macro stored in register a on lines 5 through 10.
    :5,10norm! @a

    Execute the macro stored in register a on lines 5 through the end of the file.
    :5,$norm! @a

    Execute the macro stored in register a on all lines.
    :%norm! @a

    oder
    :%normal @a

    Execute the macro store in register a on all lines matching pattern.
    :g/pattern/norm! @a

    To execute the macro on visually selected lines, press V and the j or k 
    until the desired region is selected. Then type :norm! @a and observe 
    the that following input line is shown.
    :'<,'>norm! @a





## Creating scripts

`vim -w script.vim`

Additional info: https://stackoverflow.com/questions/3981535/using-the-w-option-of-vim



## Convert German Umlaute

    conv.vim:
        :%s/Ã¶/ö/g
        :%s/Ã¤/ä/g
        :%s/Ã¼/ü/g
        :%s/ÃŸ/ß/g

    in vimrc
    command! CONV :so d:\vim\vimscripts\conv.vim


## Show defined key mappings

    :help index
    :map
    :verbose map
    
    If you just want to see what mappings you have that are prefixed by a 
    certain key, you can do
    :map <key> 
    to list them all.


## Using Languagetool without plugins

Very very, crude way!

    new | r! java -Dfile.encoding=UTF-8 -jar d:\apps\LanguageTool-5.1\languagetool-commandline.jar -c utf-8 -d WHITESPACE_RULE,EN_QUOTES -l de-DE


## Troubleshooting

Info: https://vi.stackexchange.com/questions/2003/how-do-i-debug-my-vimrc-file

`vim -u NONE -U NONE -N`

Capture ex command output to buffer e.g. `:version`

    :redir @m | silent version | redir END
    "mp


## Python and vim

    Check if Python and Vim are the same bit (64), not mixed!

    Python dependencies and Anaconda on Win OS
    chechk if `pythonhome=c:\Anaconda3` is set

    check if defined in vimrc
    let &pythonthreedll = 'C:\Anaconda3\python36.dll'

    in vim
    :echo has('python3')

    vim --startuptime perf

## Codeblocks

### Remove ?utm from urls

`:%s/?utm.*$//g`  
- `:%s` replace in whole buffer  
- `?utm.*$` is the search pattern that will match from starting `?utm` up to the end of the line.
- `//` pattern which replace the match in this case it's empty.
- `g` means global, will replace multiple occurences in line. Could be omitted because we replace from pattern start till end of line, but it's my (bad) habit.
 

### Append text to the end of multiple lines

before:

    a
    b
    c

after:

    a TEXT
    b TEXT
    c TEXT

- visual select lines
- type `:norm A TEXT`, this will add TEXT to the end of all lines visually selected



# Vim

> **Intern** Check Todo: notes.*, master.*, logger.*, todo.* and paper notes for examples.  
> Maybe useful: fb mapping, argdo, bufdo, search and replace without plugins, completions, navigate functions/methods

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



### Convert German Umlaute

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


### Python in vim

    Check if Python and Vim are the same bit (64), not mixed!

    Python dependencies and Anaconda on Win OS
    chechk if `pythonhome=c:\Anaconda3` is set

    check if defined in vimrc
    let &pythonthreedll = 'C:\Anaconda3\python36.dll'

    in vim
    :echo has('python3')

    vim --startuptime perf

 



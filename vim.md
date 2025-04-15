# Vim

> [!NOTE]
> Intern check Todo: notes.*, master.*, logger.*, todo.* and paper notes for examples.  
> Maybe useful: fb mapping, argdo, bufdo, search and replace without plugins, completions, navigate functions/methods

## Learning Vim

I learned vim in a way most younger people can't imagine I didn't know any books, youtube wasn't available and I didn't know what a plugin is.
My first vim contact was a remote session from Windows via telnet to a linux machine which I couldn't figure out to quit - no joke.  
Finally I did alt+F4...

But since that time I got hooked, and I didn't regret to learn it. I still use Vim today. I do almost all of my work with it.

> [!NOTE]
> ♨️ If you prefer to learn by video rather than by book then I can recommend the [Vim Masterclass](https://www.udemy.com/course/vim-commands-cheat-sheet/) on Udemy. It certainly took me more years of "learning by doing" to learn what is taught in the course. It's not an affiliate link.

- Vim help files as HTML with search: https://vimhelp.org
- Seven habits of effective text editing: https://www.moolenaar.net/habits.html by Bram Moolenaar
- All things Vim!: https://github.com/mhinz/vim-galore
- ♨️ [Learn Vim the Smart Way](https://learnvim.irian.to/)
- [Vim Commands: A Beginner Guide with Examples](https://thevaluable.dev/vim-commands-beginner/)
- [A Vim Guide for Intermediate Users](https://thevaluable.dev/vim-intermediate/)
- [A Vim Guide for Advanced Users](https://thevaluable.dev/vim-advanced/)
- [A Vim Guide for Adept Users](https://thevaluable.dev/vim-adept/)
- [A Vim Guide For Veteran Users](https://thevaluable.dev/vim-veteran/)
- [A Vim Guide For Experts](https://thevaluable.dev/vim-expert/)
- [Vim Search and Replace With Examples](https://thevaluable.dev/vim-search-find-replace/)
- [The Basics of Vim Regular Expressions](https://thevaluable.dev/regular-expression-basics-vim-grep/)
- [How to Create Vim Text-Objects in Lua](https://thevaluable.dev/vim-create-text-objects/)
- [Managing Local and Remote Filesystems with Vim and netrw](https://thevaluable.dev/vim-browsing-remote-netrw/)
- [What's The Vim Runtime? A Guide With Examples](https://thevaluable.dev/vim-runtime-guide-example/)
- ~~[Vim Text Objects: The Definitive Guide](https://blog.carbonfive.com/vim-text-objects-the-definitive-guide/)~~ -- 2025-04-08 no longer available

- Books about Vim<br>https://gist.github.com/yegappan/494e9597aeb9df37c6c02294f1511cf3
- Updating a quickfix/location list asynchronously without interfering with another plugin<br>https://gist.github.com/yegappan/3b50ec9ea86ad4511d3a213ee39f1ee0
- My development process for contributing to Vim<br>https://gist.github.com/yegappan/1e88a9aed4f9f266d91d768b633487f3
- My Vim-related gists<br>https://gist.github.com/romainl/4b9f139d2a8694612b924322de1025ce

 
- :tv: [Vim Tutorial for Beginners](https://www.youtube.com/watch?v=RZ4p-saaQkc)
- :tv: [How to Do 90% of What Plugins Do (With Just Vim)](https://www.youtube.com/watch?v=XA2WjJbmmoM)
- Ask the great help, sometime it's a bit tricky to find the right keyword. You can take a full shot on the help file as PDF https://nathangrigg.com/vimhelp/vimhelp-a4.pdf
- :tv: [Vimcasts.org](http://vimcasts.org/episodes/)
- :tv: [10 Advanced Vim Features (You Probably Didn't Know)](https://www.youtube.com/watch?v=gccGjwTZA7k)
- :tv: [Vim Tips And Tricks Some Of My Favorite Vim Commands](https://www.youtube.com/watch?v=13gNtgqzzmM)
- :tv: [Vim Tips I Wish I Knew Earlier](https://www.youtube.com/watch?v=5BU2gBOe9RU) really helpful!
- [Vim Cookbook by Steve Oualline](http://www.oualline.com/vim-cook.html). He wrote my [first Vim book I read](http://www.oualline.com/books/index.html) dated ~2000/2001/2002
- :books: Practical Vim: Edit Text at the Speed of Thought https://www.amazon.de/Practical-Vim-Edit-Speed-Thought/dp/1680501275/
- :books: Modern Vim: Craft Your Development Environment with Vim 8 and Neovim https://www.amazon.de/Modern-Vim-Development-Environment-Neovim/dp/168050262X/

I try to watch as few vim videos on youtube as possible because they might distract me too much from my work but
there are some great youtuber's fiddling with vim/neovim e.g.:

- https://www.youtube.com/@DistroTube/search?query=vim
- https://www.youtube.com/@ElijahManor/videos
- https://www.youtube.com/@GavinFreeborn/search?query=vim
- https://www.youtube.com/@GregHurrell
- https://www.youtube.com/@LukeSmithxyz/search?query=vim
- https://www.youtube.com/@SebastianDaschnerIT/search?query=vim
- https://www.youtube.com/@SeniorMarsTries/search?query=vim
- https://www.youtube.com/@TheNycRat/search?query=vim
- https://www.youtube.com/@ThePrimeagen/search?query=vim
- https://www.youtube.com/@bawad/search?query=vim
- https://www.youtube.com/@chrisatmachine/videos
- https://www.youtube.com/@denvaar/search?query=vim
- https://www.youtube.com/@devaslife/videos
- https://www.youtube.com/@devopstoolbox/videos
- https://www.youtube.com/@leeren_/videos
- https://www.youtube.com/@nirlichtman/search?query=vim
- https://www.youtube.com/@rwxrob/search?query=vim
- https://www.youtube.com/@semicolonsons/search?query=vim
- https://www.youtube.com/@teej_dv/videos
- https://www.youtube.com/@theena/search?query=vim
- https://www.youtube.com/@typecraft_dev/videos
- https://www.youtube.com/@vimjoyer/search?query=vim
- https://www.youtube.com/@yukiuthman8358/videos 

Recently I came across a video series that is a kind of quantum leap for me ...

- [Problem Solving with Vim - 1 (expression register)](https://www.youtube.com/watch?v=P7yTg1SdNNQ)
- [Problem Solving with Vim - 2 (substitute, match group, expression register)](https://www.youtube.com/watch?v=ZK6WO-ZIjd0)
- [Problem Solving with Vim - 3 (macro, sub-replace-expression)](https://www.youtube.com/watch?v=e5FkKJyleDg)
- [Problem Solving with Vim - 4 (more expression substitution)](https://www.youtube.com/watch?v=pIeLl_uYV98)
- [Problem Solving with Vim - 5](https://www.youtube.com/watch?v=uY22eECYorI)
- [Problem Solving with Vim - 6 (Regular expression, scriptin arg)](https://www.youtube.com/watch?v=iwiHAbkr1vQ)
- [Problem Solving with Vim - 7](https://www.youtube.com/watch?v=GJVwojkn8Io)
- [Problem Solving with Vim - 8 (Abusing Vim)](https://www.youtube.com/watch?v=7c50GG3w-0M)
- [Problem Solving with Vim (9th edition) My favorite substitute](https://www.youtube.com/watch?v=QE5c_bWyJ-k)
- [Problem Solving with Vim (10th edition) - Key Code Hell](https://www.youtube.com/watch?v=j3psP-s9FOM)

Great ressource for for people who are familiar with Python and want to start with Vim9 script
- Vim9 Script for Python Developers<br>https://github.com/yegappan/Vim9ScriptForPythonDevelopers/blob/main/Vim9ScriptForPythonDevelopers.md


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

    Indent text
    - insert mode: ctrl-t / ctrl-d
    - normal mode: >> / <<
    
    Movement command in insert mode e.g. to go forward one word type 
    ctrl+o w

    jump to next / previous empty line
    } / {

    yank / copy line without CR
    yg_

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

    To search for word under cursor with word boundaries /\<word\>
    *

    To search for word under cursor without word boundaries
    g*

    Join without additional space
    gJ
```

## Navigation



### file / complete buffer
~~~
gg -> jump to begin of file
G -> jump to end of file
~~~

### visible buffer
~~~
H -> buffer viewport high
M -> buffer viewport middle
L -> buffer viewport low
~~~

### line
~~~
0 -> jump to begin of line
_ -> jump to begin of first char in line
$ -> jump to end of line
~~~

### misc
~~~
[[, ]] -> jump between methods
]c, c] -> jump between changes
]g, g] -> jump between warning/error messages (lsp needed)
ctrl+o, ctrl+i -> jump using jumplist
~~~



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
OK ✓ 
```
- `:dig`
- To insert a Unicode character while in insert mode, type `ctrl+vuxxxx` e.g. `ctrl+vu2713`.
- A table of digraphs can be shown with: `:h digraph-table`
- to search for digrpahs, take a look at the Unicode-Plugin https://github.com/chrisbra/unicode.vim written by Christian Brabandt.
- More: https://devhints.io/vim-digraphs

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


## Python and vim

    Check if Python and Vim are the same bit (64), not mixed!

    Python dependencies and Anaconda on Win OS
    chechk if `pythonhome=c:\Anaconda3` is set

    check if defined in vimrc
    let &pythonthreedll = 'C:\Anaconda3\python36.dll'

    in vim
    :echo has('python3')

    vim --startuptime perf

## Search for a pattern and if found delete to end of line
`:%s/pattern.*//g`

Let pattern be `?utm`:

`:%s/?utm.*$//g`  
- `:%s` replace in whole buffer  
- `?utm.*$` is the search pattern that will match from starting `?utm` up to the end of the line.
- `//` pattern which replace the match in this case it's empty.
- `g` means global, will replace multiple occurences in line. Could be omitted because we replace from pattern start till end of line, but it's my (bad) habit.
 

## Append text to the end of multiple lines

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

### Prepend and append text to lines in command-line mode

- used `:` insted of `/` for better readability
- lines are marked visually `'<,'>` 

before:

    a
    b
    c

`:'<,'>s:^:before`

after:

    before a
    before b
    before c


before:

    before a
    before b
    before c

`:'<,'>s:$: after:`

after:

    before a after
    before b after
    before c after 


## moving text

### move lines containing PATTERN to top of current buffer.
`g:PATTERN:m0` 

### move lines matching match to another buffer

```
qaq -- to make sure named register a is empty
:g/match/y A -- to yank all matching lines into named register a (capital a to append)
:b2 -- to switch buffer
"ap -- to paste named register a
```


source https://www.reddit.com/r/vim/comments/1fmq9c8/comment/loch0vq/


### dt, df, dT, dF -- delete movement
```
   Starting point:
    [,] where cursor is located

    a, b, c[,] d, e

    dt,
    a, b, c[,] e

    df,
    a, b, c[ ]e

    dT,
    a, b,[,] d, e

    dF,
    a, b[,] d, e
 
```

## Simple sum up calculations


Example:

    20
    5
    10
    20
    10
    20

1. Join all lines
```
    20 5 10 20 10 20
```

2. :s: :+:g
```
    20+5+10+20+10+20
```

3. yank line
4. :ctrl-r = ctrl-*

To get floats change e.g. 20 to 20.0. One number is enough!




---
If you find this notes helpful and want to support me, you can do so by [Buy me a coffee! ☕](https://www.buymeacoffee.com/vbduetsch) it will keep my motivation high and I will be really thankful.

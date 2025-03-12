# Snippets


## fd (https://github.com/sharkdp/fd)
Find all test_*.py files and open them in vim:  
`fd -g 'test_*.py' -X vim`

Won't work:  
`fd --changed-within "2021-10-09" --exec rg -i drv`  
`fd --changed-within "2021-10-09" | rg -i drv`   
Will work:  
`fd --changed-within "2021-10-09" -X rg -i drv` 

Find by date/time  
`fd --changed-after 2023-03-10 --changed-before 2023-03-12`  
`fd --changed-within 24h`  

Find markdown files an run `wc -l` on them  
`fd -e md --exec wc -l`  

Copy files containing vim in name and extension txt to ziel (cmd is required because copy is part of MS Windows cmd)  
`fd vim -e txt -x cmd /c copy {/} d:\ziel`

Find files without extension  
`fd "^[^.]*$" --type f`  

find all files consisting of exactly one letter  
`fd '^[a-zA-Z]$'`  

find all files named a  
`fd '^a$'`  
or  
`fd -g a`

Finding exact matches  
`fd -g go` 

Show only dirs, one level deep from current working directory  
`fd -t d -d 1`

Finding files containing `go` and `domain` in name and show their full path (-a)  
`fd go --and domain -a`

## rg (https://github.com/BurntSushi/ripgrep)

Limit search to files with extension md (markdown)  
`rg -t md`

Search for files beginning with `jobc` and containing `'// TODO'`  
`rg -g 'jobc*.md' '// TODO'`  

patterns from file
`rg -f patternfile.txt` 

search for title: in files ending with .md and open them in vim  
`rg title: --glob=*.md | vim -`

search for timebox in files containing url (no need for fd)  
`rg timebox --glob *url*.md`

search for ab or de  
`rg ab | de`

search for ab and de  
`rg ab | rg de`

Search over multiple lines, seems to work in many of my use cases but not always (requires further evaluation: think its the pattern part)
`rg -i -U --multiline-dotall "pattern1.*pattern2.*pattern3"`






## imagemagick
TODO

## robocopy
Copy all *.docx files from the current directory to archive  
`robocopy . *.docx x:\archive\` 

Poor man's mirror backup  
`robocopy d:\source r:\sync\source /NP /S /TEE /E /MIR /MT:8 /R:5 /LOG+:d:\backup-source.log` 



## fzf
For windows use [ff](https://github.com/genotrance/ff) as wrapper for fzf.
And define a shortcut like `ff -a gvim` to open the result from fzf in gvim.

## Windows
Check if a python virtual environment is active  
`echo %VIRTUAL_ENV%`








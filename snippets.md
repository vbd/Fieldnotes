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



## rg (https://github.com/BurntSushi/ripgrep)

Limit search to files with extension md (markdown)  
`rg -t md`

Search for files beginning with `jobc` and containing `'// TODO'`  
`rg -g 'jobc*.md' '// TODO'`


## imagemagick


## robocopy
Copy all *.docx files from the current directory to archive  
`robocopy . *.docx x:\archive\`  


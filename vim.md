# Vim

> **Intern** Check Todo: notes.*, master.*, logger.*, todo.* and paper notes for examples.


## Export to HTML including manual folds  
```
  :set background=light
  :TOhtml 
```

## Digraph
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


## Encryption

Remove encryption key from file which was set with :X
```
  :set key=
  :w
```

## RegEx

> **NOTE**: untested :g can possibly be omitted

Add " to the begin of the line -> : instead of / used for better readability  
`:%s:^:":g`  

Add " to the end of the line -> : instead of / used for better readability  
`:%s:$:":g` 

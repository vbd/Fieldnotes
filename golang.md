In the projects, in which I work, it comes up that I am asked what I recommend for xyz. So that I don't forget half of the information, I'll started to collect it thematically and in a more or less structured way and publish it here.
Here my hopefully helpful resources for the Go language.

## Blogs
- [research!rsc](https://research.swtch.com/) Thoughts and links about programming, by Russ Cox
- [Bitfield Consulting friendly, professional go mentoring](https://bitfieldconsulting.com/golang)
- [Boldly Go](https://boldlygo.tech/media/)
- [Eli Bendersky's website](https://eli.thegreenplace.net/tag/go) / [Golang tools](https://eli.thegreenplace.net/tag/go-tooling)
- [Three Dots Labs](https://threedots.tech/start/)
- [Go 101 Blog](https://go101.org/blog/101.html)
- [The Go Blog](https://go.dev/blog/)
- [Redowan's Reflections](https://rednafi.com/archive/)
- [Over-Engineered](https://totallygamerjet.hashnode.dev/)
- [Practical Go](https://dave.cheney.net/practical-go) A collection of real world advice for writing maintainable Go programs.
- [willem.dev](https://www.willem.dev/articles/)
- [Sameer Ajmani](https://ajmani.net/go/)
- [Noam Yadgar](https://nyadgar.com/)

## Newsletter

- Go Weekly: https://golangweekly.com/issues/
- Golang Weekly @Medium: https://golang.thisweekin.io/
- Golang Nugget: https://golangnugget.com/
- The applied Go weekly newsletter: https://newsletter.appliedgo.net/archive

## Recommended readings
- my recommend books on golang can be found [here](https://github.com/vbd/Fieldnotes/blob/main/booklist.md#golang)
- [The Zen of Go](https://dave.cheney.net/2020/02/23/the-zen-of-go)
- [Go Proverbs](https://go-proverbs.github.io/)
- [Coroutines for Go](https://research.swtch.com/coro)
- [A Guide to the Go Garbage Collector](https://tip.golang.org/doc/gc-guide)
- [Getting to Go: The Journey of Go's Garbage Collector](https://go.dev/blog/ismmkeynote)
- [Writing and Optimizing Go code](https://github.com/dgryski/go-perfbook/blob/master/performance.md)
- [Implementing WebSocket Protocol in Go](https://hassansin.github.io/implementing-websocket-protocol-in-go)
- [Common pitfalls in Go benchmarking](https://eli.thegreenplace.net/2023/common-pitfalls-in-go-benchmarking/)
- [Avelinos awesome-go: A curated list of awesome Go frameworks, libraries and software](https://github.com/avelino/awesome-go)
- [Rob Muhlesteins awesome-go](https://github.com/rwxrob/awesome-go)
- [Quick tip: A time-saving Makefile for your Go projects](https://www.alexedwards.net/blog/a-time-saving-makefile-for-your-go-projects)
- 🌶️ [Picnic-TUI - Where Go and Groceries Create a Command-Line Feast](https://dev.to/simonmartyr/picnic-tui-where-go-and-groceries-create-a-command-line-feast-1op4)
- [Use Abstraction to Improve Function Readability](https://testing.googleblog.com/2023/09/use-abstraction-to-improve-function.html)
- [Disagreeing with "best practices"](https://blog.separateconcerns.com/2023-08-06-disagreeing-best-practices.html)
- [Linear code is more readable](https://blog.separateconcerns.com/2023-09-11-linear-code.html) :arrow_right:
There is always the danger that with time compact functions become real "monsters" that are hard to read or understand. one of my last experiences was a function where the indented code was only visible, without scrolling, on the last 20% of the monitor (49" Samsung CRG 9) on the right side.
Not my code, should help to debug, will we need a 49" monitor for debugging or two of them side by side in future? A healthy balance would suit us all.
- [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) This page collects common comments made during reviews of Go code, so that a single detailed explanation can be referred to by shorthands. This is a laundry list of common style issues, not a comprehensive style guide.
- A curated list of awesome Machine Learning frameworks, libraries and software.: https://github.com/josephmisiti/awesome-machine-learning?tab=readme-ov-file#go

## Asking go questions

- Go Forum: https://forum.golangbridge.org/
- ~~Go Forum: https://godev.com/~~ 2025-03-18: no longer accessible
- r/golang: https://www.reddit.com/r/golang/
- golang-nuts: https://groups.google.com/g/golang-nuts
- golang-dev: https://groups.google.com/g/golang-dev

## Coming from Python
- [Go vs. Python: an introduction to Go for senior (Python) developers](https://www.augmentedmind.de/2023/01/22/go-vs-python-senior-developers/)
- [Learning Go as a Python Developer: The Good and The Bad](https://new.pythonforengineers.com/blog/learning-go-as-a-python-developer-the-good-the-bad-and-the-ugly/)
- [Go for Python Programmers](https://golang-for-python-programmers.readthedocs.io/en/latest/)


## Style guide, "best" practices, templates...
- [Go Style](https://google.github.io/styleguide/go/index)
- [golang-standards](https://github.com/golang-standards)
- [Tools for Go projects](https://github.com/nikolaydubina/go-recipes)
- [How to start a Go project in 2023](https://boyter.org/posts/how-to-start-go-project-2023/)
- [Go gotchas, surprises, puzzles](https://github.com/golang-leipzig/gotchas)
- [Do you make these Go coding mistakes?](https://yourbasic.org/golang/gotcha/)
- [golangci-lint](https://github.com/golangci/golangci-lint), fast linters Runner for Go
- :hot_pepper: [JSON-to-Go, convert JSON to Go struct](https://mholt.github.io/json-to-go/)
- When is it OK to panic in Go?: https://www.alexedwards.net/blog/when-is-it-ok-to-panic-in-go
- On the uses and misuses of panics in Go: https://eli.thegreenplace.net/2018/on-the-uses-and-misuses-of-panics-in-go/


## Concurrency (aka Nebenläufigkeit)
- [Hands on exercises with real-life examples to study and practice Go concurrency patterns. Test-cases are provided to verify your answers.](https://github.com/loong/go-concurrency-exercises)
- [Google I/O 2013 - Advanced Go Concurrency Patterns](https://www.youtube.com/watch?v=QDDwwePbDtw)
- [Mastering Concurrency: Unveiling the Magic of Go's Scheduler](https://community.sap.com/t5/additional-blogs-by-sap/mastering-concurrency-unveiling-the-magic-of-go-s-scheduler/ba-p/13577437)


  
## TUI
- [A powerful little TUI framework](https://github.com/charmbracelet/bubbletea)
- :hot_pepper: [Charm libs Everything you need to build great stuff for the terminal.](https://charm.sh/)
- [Terminal UI library with rich, interactive widgets — written in Golang](https://github.com/rivo/tview)

## CLI

- [Struct-based argument parsing in Go](https://github.com/alexflint/go-arg)
- [A simple, fast, and fun package for building command line apps in Go](https://github.com/urfave/cli)
- [A Commander for modern Go CLI interactions](https://github.com/spf13/cobra) 
- :hot_pepper: [Kong is a command-line parser for Go](https://github.com/alecthomas/kong)
- [Simple, extremely lightweight, extensible, configuration management library for Go](https://github.com/knadh/koanf) Support for JSON, TOML, YAML, env, command line, file, S3 etc. Alternative to viper.
- [The simplest config loader for Go that reads/watches from file, env, flag and clouds (AWS, Azure, GCP)](https://github.com/nil-go/konf)
- Config file validator: Cross Platform tool to validate configuration files:  
https://github.com/Boeing/config-file-validator
- go-flags: go command line option parser<br>https://github.com/jessevdk/go-flags
- go-arg: Struct-based argument parsing in Go<br>https://github.com/alexflint/go-arg



## Podcasts
- [Cup o' Go](https://cupogo.dev/) Stay up to date with the Go community in just 15 minutes per week.
- [Ardan Labs Podcast](https://ardanlabs.buzzsprout.com/) This podcast features intimate conversations with engineers who are in the forefront of building or teaching technology.
- [go podcast()](https://gopodcast.dev/episodes)
- [Go Time](https://changelog.com/gotime)

## GUI / TUI
- [Build desktop applications using Go & Web Technologies.](https://wails.io/)
- [bubbletea, A powerful little TUI framework](https://github.com/charmbracelet/bubbletea)
- [gocui - Minimalist Go package aimed at creating Console User Interfaces.](https://github.com/jroimartin/gocui)
- React-like desktop GUI toolkit for Go: https://github.com/roblillack/spot/
- Cogent Core - A free and open source framework for building powerful, fast, elegant 2D and 3D apps that run on macOS, Windows, Linux, iOS, Android, and the web with a single Go codebase, allowing you to Code Once, Run Everywhere.: https://github.com/cogentcore/core
- nucular: https://github.com/aarzilli/nucular
  
## Finding libs
- [Trending Go Projects](https://www.libhunt.com/l/go)
- [grank.dev](https://www.grank.dev/) tries to help to choose the right dependencies for your next golang project.
- [Go packages](https://pkg.go.dev/)
- [A curated list of awesome Go frameworks, libraries and software](https://github.com/avelino/awesome-go)
- [Awesome-go list with stars. Automatically updated.](https://github.com/amanbolat/awesome-go-with-stars)
- Top Go Libraries 2025: https://libs.tech/go

## Release / Deployment
- goreleaser - Deliver Go binaries as fast and easily as possible: https://github.com/goreleaser/goreleaser
- The ultimate justfile for any golang project: https://github.com/crazywolf132/ultimate-gojust
- What do you use as build system?: https://www.reddit.com/r/golang/comments/196cowu/what_do_you_use_as_build_system/
- task/taskfile - task runner/simpler Make alternative written in Go: https://github.com/go-task/task
- just - a command runner: https://github.com/casey/just

## Profiling
Based on a question from my team mate who is used to Pythons line_profiler (%lprun) and memory_profiler (%mprun).

- [The Busy Developer's Guide to Go Profiling, Tracing and Observability](https://github.com/DataDog/go-profiler-notes/blob/main/guide/README.md)
- [Debugging Go Code: Using pprof and trace to Diagnose and Fix Performance Issues](https://www.infoq.com/articles/debugging-go-programs-pprof-trace/)
- [Profiling Go Programs](https://go.dev/blog/pprof)
- [Profiling Go programs with pprof](https://jvns.ca/blog/2017/09/24/profiling-go-with-pprof/)
- [How I investigated memory leaks in Go using pprof on a large codebase](https://www.freecodecamp.org/news/how-i-investigated-memory-leaks-in-go-using-pprof-on-a-large-codebase-4bec4325e192/)
- [Go pprof – How to Understand Where There is Memory Retention](https://www.neteye-blog.com/2019/06/go-pprof-how-to-understand-where-there-is-memory-retention/)
- 🌶️ [felixge's notes on the various go profiling methods that are available.](https://github.com/DataDog/go-profiler-notes)
- [Package collectors provides implementations of prometheus.Collector to conveniently collect process and Go-related metrics.](https://pkg.go.dev/github.com/prometheus/client_golang@v1.16.0/prometheus/collectors)
- [Parca is a continuous profiling project.](https://www.parca.dev/)
- [Grafana Phlare lets you aggregate continuous profiling data with high availability, multi-tenancy, and durable storage.](https://grafana.com/oss/phlare/)
- [Package trace contains facilities for programs to generate traces for the Go execution tracer.](https://pkg.go.dev/runtime/trace)
- 🌶️ [Go by Example: Testing and Benchmarking](https://gobyexample.com/testing-and-benchmarking)
- [Profiling and Optimising Go Code](https://medium.com/@ajitem/performance-optimization-in-go-checkmate-performance-using-chess-piece-movements-as-an-example-920a2b22be19)
- Tips to debug hanging Go programs: https://michael.stapelberg.ch/posts/2025-02-27-debug-hanging-go-programs/
- Unlocking Hidden Performance Bottlenecks in Golang using GoFr: The Underrated Power of pprof: https://dev.to/aryanmehrotra/unlocking-hidden-performance-bottlenecks-in-golang-using-gofr-the-underrated-power-of-pprof-2dc7
- Patterns and Techniques for Writing High-Performance Applications with Go: https://goperf.dev/

## Learning & Miscellaneous

- my recommend books on golang can be found [here](https://github.com/vbd/Fieldnotes/blob/main/booklist.md#golang)
- Practice Go: a collection of Go programming challenges: https://github.com/plutov/practice-go
- GoLab is a collection of simple Go projects designed to help learn and explore the Go programming language.: https://github.com/MuhammadSaim/go-lab
- Five Go Projects: https://github.com/dreamsofcode-io/goprojects Not only five ideas to start with also **includes** code!
- [List of Golang books](https://github.com/dariubs/GoBooks?tab=readme-ov-file)
- Go go-to guide: https://yourbasic.org/golang/ by Stefan Nilsson
- Golang tutorial series: https://golangbot.com/learn-golang-series/ by Naveen Ramanathan
- Practical Go: Real world advice for writing maintainable Go programs:  
https://dave.cheney.net/practical-go/presentations/gophercon-singapore-2019.html
- Concurrency vs. Parallelism:  
https://www.thecoder.cafe/p/concurrency-is-not-parallelism
- :sound: [Jumping into an existing codebase](https://changelog.com/gotime/307)
- 🌶️ [Algorithms and Data Structures implemented in Go for beginners, following best practices.](https://github.com/TheAlgorithms/Go)
- [Effective Go](https://go.dev/doc/effective_go)
- [Building an application with go and sqlite](https://www.allhandsontech.com/programming/golang/how-to-use-sqlite-with-go/)
- [Building a web app with go and sqlite](https://www.allhandsontech.com/programming/golang/web-app-sqlite-go/)
- [Building a web app with go and sqlite part 2](https://www.allhandsontech.com/programming/golang/web-app-sqlite-go-2/)
- [Building a web app with go and sqlite part 3](https://www.allhandsontech.com/programming/golang/web-app-sqlite-go-3/)
- [Building a web app with go and sqlite part 4](https://www.allhandsontech.com/programming/golang/web-app-sqlite-go-4/)
- [Building a web app with go and sqlite part 5](https://www.allhandsontech.com/programming/golang/web-app-sqlite-go-5/)
- [govulncheck](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck) Govulncheck reports known vulnerabilities that affect Go code.
- [Crash Course on Go Interfaces](https://www.calhoun.io/crash-course-on-go-interfaces/)
- [Deliver Go binaries as fast and easily as possible](https://github.com/goreleaser/goreleaser)
- [Structured, pluggable logging for Go.](https://github.com/sirupsen/logrus) :arrow_right: Go 1.21 will offer the new [slog package](https://tip.golang.org/doc/go1.21#slog)
- [AI on the command line](https://github.com/charmbracelet/mods)
- [A language for writing HTML user interfaces in Go.](https://github.com/a-h/templ)
- [Go by Example](https://gobyexample.com/)

- On Udemy I can recommend the golang courses from [Trevor Sawler](https://www.udemy.com/user/trevor-sawler/)
- :tv: [Golang UK Conference 2017 | Achilleas Anagnostopoulos - Can you write an OS Kernel in Go?](https://www.youtube.com/watch?v=8T3VxGrrJwc)
- [go_assessment](https://github.com/dmh2000/go_assessment), a port of Rebecca Murphey's js-assessment for Go. This is a tool for assessing or practicing beginner level programming in Golang.
- [Tutorial: Getting started with fuzzing](https://go.dev/doc/tutorial/fuzz)
- [Go Excellence: A Deep Dive into Error Handling](https://do-tech.medium.com/go-excellence-a-deep-dive-into-error-handling-4b74697f12a1)
- [Visualize Go slices and arrays](https://www.willem.dev/projects/slice-visualizer/) Explore the connection between slices and arrays by generating diagrams from Go code.
- [Go Tutorials & Examples](https://gosamples.dev/)
- :memo: [go-form](https://github.com/donseba/go-form) Render forms in go based on struct layout 
- Official Golang Frequently Asked Questions (FAQ): https://go.dev/doc/faq
- r/golang FAQ: https://www.reddit.com/r/golang/wiki/r_golang_faqs/

  
## Cheatsheets
- [An overview of Go syntax and features.](https://github.com/a8m/golang-cheat-sheet)
- [cheat sheet GO](https://golang.sk/images/blog/cheatsheets/go-cheat-sheet.pdf) PDF
- [Go Programming (Golang) Cheat Sheet](https://zerotomastery.io/cheatsheets/golang-cheat-sheet/)
- [Go cheatsheet](https://devhints.io/go)

## Roadmaps, Jobs, Career
- :hotsprings: [Stream: Go 10 Week Backend Eng Onboarding](https://stream-wiki.notion.site/Stream-Go-10-Week-Backend-Eng-Onboarding-625363c8c3684753b7f2b7d829bcd67a)
- [Companies using Go](https://docs.google.com/spreadsheets/d/17hsYk_qUTQgXujbyuKdd4G1r07LmX5_6K8YeXWYbp3k/edit?gid=0#gid=0)
- [Roadmap: Go Developer](https://roadmap.sh/golang)
- [Roadmap: Backend Developer](https://roadmap.sh/backend)
- [Roadmap: DevOps Roadmap](https://roadmap.sh/devops)
- [Roadmap: System Design](https://roadmap.sh/system-design)
- [Find your remote work here](https://www.opentoworkremote.com/) :arrow_right: it's backend on github [Collection of remote job opportunities from around the world.](https://github.com/maurobonfietti/remote-jobs)
- [Remote Jobs](https://remotejobs.com/)
- [Remote Software Engineering Jobs](https://remotesoftwareengineeringjobs.com/?tech=Golang)
- [echojobs](https://echojobs.io/)
- [German tech jobs](https://germantechjobs.de/jobs/Golang/all)
- [Go / Golang Jobs & developers](https://www.golangprojects.com/)
- Golang Jobs - OnSite and Remote Golang Jobs: https://golangjob.xyz/
- A curated list of awesome remote jobs and resources. Inspired by: https://github.com/lukasz-madon/awesome-remote-job 
- Working Nomads: https://www.workingnomads.com/jobs?tag=golang
- Remote OK: https://remoteok.com/remote-golang-jobs
- We Work Remotely: https://weworkremotely.com/remote-jobs/search?term=golang
- foundit.in (mostly India): https://www.foundit.in/srp/results?query=golang
- gojobs: https://gojobs.run/
- Jobs for developers: https://jobsfordevelopers.com/golang-jobs

## Learning to code from source

Starting projects to learn from source and to get ideas what to build to learn and improve your skills.

- :hotsprings: [Generate invoices from the command line](https://github.com/maaslalani/invoice)
- :hotsprings: [Simple command-line snippet manager, written in Go.](https://github.com/knqyf263/pet)
- :hotsprings: [A small ecomerce site for buying books](https://github.com/madxmike/zenith-bookshop)
- [Browsers Extensions Finder (BEXfinder) is a portable and cross-platform (Windows, Linux and MacOS) command-line tool to find out all web browsers (Google Chrome, Microsoft Edge, Brave Browser, Mozilla FireFox, Opera, etc.) extensions installed on system.](https://github.com/ch4meleon/BEXfinder)
- [Command line tool written in Go. It allows developers to scan their local Git repositories and generate a visual contributions graph.](https://github.com/abdullah-alaadine/local-git-contributions-visualizer)
- [CLI for interacting with the recreation.gov API](https://github.com/opencamp-hq/cli)
- [Repositories in Golang by Mitchell Hashimoto](https://github.com/mitchellh)
- [Storing IP addresses for quick CLI access](https://github.com/charlesdevelops/ipster)
- [A practical event-driven microservices demo built with Golang. Nomad, Consul Connect, Vault, and Terraform for deployment](https://github.com/thangchung/go-coffeeshop)
- [What are your favourite, opensource golang projects from a code quality perspective](https://www.reddit.com/r/golang/comments/15b146i/what_are_your_favourite_opensource_golang/)
- [Live collaboration tool built with Go backend and Next.js, Typescript, & Tailwind frontend](https://github.com/Wave-95/boards)
- [htmx-hackernews](https://github.com/sunesimonsen/htmx-hackernews) Hackernews made with htmx and Go
- [gotes-mx](https://github.com/muhwyndhamhp/gotes-mx) This is a teeny tiny template repo for my own personal use. This setup meant for a fullstack Go project with templating support with HTMX.
- [cli generator for .ignore files](https://github.com/neptunsk1y/ignore)
- [Go-based web crawler for data extraction](https://github.com/AgentGino/krawl)
- [Simple CLI tool for working with Gitlab issues](https://github.com/ArjArav98/Issue)
- [Telegram bot](https://github.com/Arturomtz8/github-inspector-telegram)
- [Language Server (LSP) für die Deutsche Programmiersprache](https://github.com/DDP-Projekt/DDPLS)
- [YouTube description and information downloader.](https://github.com/HaloGamer33/YouTube-Stat-Scraper)
- [A TUI app for finding anime scenes by image.](https://github.com/acgtools/trace-moe-go)
- [clipboard for golang](https://github.com/atotto/clipboard)
- [Making it easy to write shell-like scripts in Go](https://github.com/bitfield/script)
- [Self-hosted file converter server](https://github.com/danvergara/morphos)
- [A CLI tool for displaying data related to the English Premier League.](https://github.com/digitalghost-dev/pl-cli/tree/main)
- [Airbnb scraper made in Go](https://github.com/johnbalvin/gobnb)
- [Amazon crawler made in Go](https://github.com/johnbalvin/gozon)
- [A commands bookmark for terminal](https://github.com/linhx/tbmk)
- [Bookmarking CLI tool with automatic sync](https://github.com/loghinalexandru/anchor)
- [minesweeper cli](https://github.com/maxpaulus43/go-sweep)
- [Terminal dictionary for English Learners](https://github.com/mburakerman/cambridge-cli)
- [Go programs for interacting with Mastodon](https://github.com/mischavandenburg/mastodon)
- [A reddit multimedia downloader](https://github.com/noornee/reddit-dl)
- [Reddit Top Posts Scraper](https://github.com/nyx6965/grawddit)
- [A CLI based daily timer](https://github.com/pedrojreis/ScrumChrono)
- [HTTP status codes on speed dial](https://github.com/rednafi/httpurr)
- [graft is a tool to find and transfer files written in go](https://github.com/sandreas/graft)
- [This command-line application generates random words based on user preferences and allows you to save them to a file.](https://github.com/seandadonntech/wordago)
- :hotsprings: [A highly customisable CLI tool for writing conventional commits](https://github.com/stefanlogue/meteor)
- [Spotify TUI player, written in Go](https://github.com/szktkfm/sptui)
- [Create GIFs on the fly with ffmpeg](https://github.com/theIYD/go-gif-maker)
- [A CLI tool for importing and utilizing exported social media data from popular services on Hugo websites.](https://github.com/ttybitnik/diego)
- A distributed, fault-tolerant task queue: https://github.com/hatchet-dev/hatchet
- ClickUp is a Go-based CLI tool that fetches and organizes tasks from ClickUp using their API: https://github.com/halabito8/clickup-tasks/tree/master
- boring: The `boring` SSH tunnel manager: https://github.com/alebeck/boring
- An persistent relational database built in Go.: https://github.com/Sahilb315/AtomixDB
- A modern command-line interface for TickTick task management: https://github.com/sho0pi/tickli
- Visualize your local Git contributions with Go: https://flaviocopes.com/go-git-contributions/
- Build a Command Line app with Go: lolcat: https://flaviocopes.com/go-tutorial-lolcat/
- Building a CLI command with Go: cowsay: https://flaviocopes.com/go-tutorial-cowsay/
- Go CLI tutorial: fortune clone: https://flaviocopes.com/go-tutorial-fortune/
- Use Go to get a list of repositories from GitHub: https://flaviocopes.com/go-github-api/
- Command line weather app written in Go: https://github.com/josephburgess/gust
- cz is a command-line tool for creating consistent, semantic commit messages with an interactive and user-friendly interface.: https://github.com/rockingrohit9639/cz
- A CLI tool written in Go that allows you to view data about Pokémon from the terminal.: https://github.com/digitalghost-dev/poke-cli
- A no-frills time tracking toolkit for command line nerds: https://github.com/dhth/hours
- GoTOTP is a Simple Time-Based One-Time Password (TOTP) Library: https://github.com/MrTuNNe/GoTOTP

## Learning game development from source
- Cemetery Escape is a game that you can play in your terminal: https://github.com/tom-on-the-internet/cemetery-escape
- Clone of the MicroProse game, Master of Magic: https://github.com/kazzmir/master-of-magic
- A simple shooting game using ebitengine and golang: https://github.com/yohamta/godanmaku
- top down panzer game written in golang and ebiten: https://github.com/brotherhood-of-recursive-descent/tankism
- Roguelite game made with Go and Raylib - Demo & Game is available on Steam: https://github.com/unklnik/mr_snuggles_dungeon_adventure

## Learning by coding and contributing

- To find open source projects to contribute to check [good first issue](https://goodfirstissue.dev/language/go)
- [Explore open source projects and jump in!](https://up-for-grabs.net/)
- [Community-Powered, Connecting you with Open-Source](http://github-help-wanted.com/)

## Youtube videos

- [Go Class](https://www.youtube.com/playlist?list=PLoILbKo9rG3skRCj37Kn5Zj803hhiuRK6) by Matt KØDVB
- [Go Programming – Golang Course with Bonus Projects](https://www.youtube.com/watch?v=un6ZyFkqFKo) by Freecodecamp
- [Learn Go Programming - Golang Tutorial for Beginners](https://www.youtube.com/watch?v=YS4e4q9oBaU) by Freecodecamp
- [Learn Go Programming by Building 11 Projects – Full Course](https://www.youtube.com/watch?v=jFfo23yIWac) by Freecodecamp
- [GPN18 - Go für Programmierer](https://www.youtube.com/watch?v=Bq9zubsyPSg)
- [Advanced Golang](https://www.youtube.com/playlist?list=PLYEESps429vo2vvoUuAA6-fEDVgeqx3HW)
- [Golang By Example For Beginners](https://www.youtube.com/playlist?list=PL0xRBLFXXsP5cru52B5GAQmIrTTAL8A66)
- [10x Golang Engineer](https://www.youtube.com/playlist?list=PLkTEMR8VpCyns8PG4yNvxo5XyxGX2ScF3)
- Go (Golang): Eine Einführung in 130 Minuten // deutsch: https://www.youtube.com/watch?v=eqSjKOPt7dg
- Golang Tutorial for Beginners | Full Go Course: https://www.youtube.com/watch?v=yyUHQIec83I
- Learn GO Fast: Full Tutorial: https://www.youtube.com/watch?v=8uiZC0l4Ajw
- Full Golang Tutorial - Learn Go by Building a TodoList App: https://www.youtube.com/watch?v=XCZWyN9ZbEQ
- Go for Absolute Beginners – Tutorial: https://www.youtube.com/watch?v=akosxcqJorU
- Go Programming Tutorial – 3 Beginner Projects: https://www.youtube.com/watch?v=k_V5VvYSlS4

Some resources to find recorded talks from GopherCon Conferences:

- [Gopher Academy](https://www.youtube.com/@GopherAcademy/playlists)
- [GopherConAU](https://www.youtube.com/@gopherconau534/playlists)
- [GopherCon Europe](https://www.youtube.com/@GopherConEurope)
- [GopherCon UK](https://www.youtube.com/@GopherConUK/playlists) 


## Youtuber

- [https://www.youtube.com/@NicJackson/videos](https://www.youtube.com/@NicJackson/videos)
- [https://www.youtube.com/@MarioCarrion](https://www.youtube.com/@MarioCarrion)
- [https://www.youtube.com/@nicolasparada](https://www.youtube.com/@nicolasparada)
- [https://www.youtube.com/@ChamiViews](https://www.youtube.com/@ChamiViews)
- [https://www.youtube.com/@anthonygg_](https://www.youtube.com/@anthonygg_) 
- ~~[https://www.youtube.com/@NerdCademyDev/featured](https://www.youtube.com/@NerdCademyDev/featured)~~ no longer active
- [https://www.youtube.com/@bmdavis419](https://www.youtube.com/@bmdavis419)
- [https://www.youtube.com/@ThomasLanghorst](https://www.youtube.com/@ThomasLanghorst)
- [https://www.youtube.com/@MelkeyDev](https://www.youtube.com/@MelkeyDev)
- [https://www.youtube.com/@codeheim](https://www.youtube.com/@codeheim)
- [https://www.youtube.com/@TiagoTaquelim/](https://www.youtube.com/@TiagoTaquelim/)
- <https://www.youtube.com/@joshrosso/> (seems inactive, but anyways interesting)
- <https://www.youtube.com/@programmingpercy/>
- <https://www.youtube.com/@AkhilSharmaTech/>
- <https://www.youtube.com/@DonaldFeury/> (dated, but interesting)
- <https://www.youtube.com/@samxsmith9102/>
- <https://www.youtube.com/@samvcodes>
- <https://www.youtube.com/@rwxrob/>
- <https://www.youtube.com/@JustForFunc/> (dated, but still interesting)
- <https://www.youtube.com/@TsodingDaily/search?query=golang>
- <https://www.youtube.com/@mr_mux408/search?query=golang>
- <https://www.youtube.com/@FloWoelki/search?query=golang>
- <https://www.youtube.com/@kantancoding/videos> (not about golang, but interesting for coding in general)
- <https://www.youtube.com/@softwarechats9307/videos> (short videos with ideas to think about)
- <https://www.youtube.com/@NetNinja/search?query=golang>
- <https://www.youtube.com/@BekBrace/>
- <https://www.youtube.com/@bastisprogrammingcorner/>
- <https://www.youtube.com/@codingwithsphere/>
- <https://www.youtube.com/@packagemain/>

## WebDev

- [bluemonday: a fast golang HTML sanitizer (inspired by the OWASP Java HTML Sanitizer) to scrub user generated content of XSS](https://github.com/microcosm-cc/bluemonday)
- [How I write HTTP services after eight years.](https://pace.dev/blog/2018/05/09/how-I-write-http-services-after-eight-years.html)
- [go-app: A package to build progressive web apps with Go programming language and WebAssembly.](https://github.com/maxence-charriere/go-app)
- [chi - lightweight, idiomatic and composable router for building Go HTTP services](https://github.com/go-chi/chi)

## Security & Malware

- :tv: [DEF CON 29 - Ben Kurtz - Offensive Golang Bonanza: Writing Golang Malware](https://www.youtube.com/watch?v=3RQb05ITSyk)
- [awesome-go-security](https://github.com/Binject/awesome-go-security)

## Github repos of developers using Golang among others

Drop by and learn!

- https://github.com/Jeffail
- https://github.com/TotallyGamerJet
- https://github.com/aarzilli
- https://github.com/alecthomas/
- https://github.com/benbjohnson
- https://github.com/bradfitz
- https://github.com/chewxy
- https://github.com/fogleman
- https://github.com/jackc
- https://github.com/kelseyhightower
- https://github.com/klauspost
- https://github.com/lesismal
- https://github.com/mattn
- https://github.com/mr-karan
- https://github.com/nalgeon
- https://github.com/robpike
- https://github.com/rs
- https://github.com/rsc


## Reminder: Some of the libraries already used in projects

- :memo: age: A simple, modern and secure encryption tool (and Go library) with small explicit keys, no config options, and UNIX-style composability.  
https://github.com/FiloSottile/age

- mage: a Make/rake-like dev tool using Go  
https://github.com/magefile/mage

- :memo: go-winres: Command line tool for adding Windows resources to executable files  
https://github.com/tc-hib/go-winres

- go-sqlite-bench: Benchmarks for Golang SQLite Drivers  
https://github.com/cvilsmeier/go-sqlite-bench

- go-fswatch: Go bindings for libfswatch  
https://github.com/dunglas/go-fswatch

- Copier: for golang, copy value from struct to struct and more  
https://github.com/jinzhu/copier

- lo: Iterate over slices, maps, channels...  
https://github.com/samber/lo?tab=readme-ov-file

- dblab: The database client every command line junkie deserves.  
https://github.com/danvergara/dblab

- anyquery: Query anything (JSON, CSV, GitHub, Notion, Airtable, etc.) with SQL  
https://github.com/julien040/anyquery

- formulosity: Self-hosted Surveys as Code platform.  
https://github.com/plutov/formulosity

- :memo: gocron: Easy and fluent Go cron scheduling.  
https://github.com/go-co-op/gocron

- prs: Stay updated on PRs from your terminal  
https://github.com/dhth/prs

- :memo: sqlc: Generate type-safe code from SQL  
https://github.com/sqlc-dev/sqlc

- conc: Better structured concurrency for go  
https://github.com/sourcegraph/conc

- testify: A toolkit with common assertions and mocks that plays nicely with the standard library  
https://github.com/stretchr/testify

- color: Color package for Go (golang)  
https://github.com/fatih/color

- tb.go: Tasks, boards & notes for the command-line habitat  
https://github.com/araaha/tb.go

- gofumpt: A stricter gofmt  
https://github.com/mvdan/gofumpt

- modfmt: Tidy up your go.mod files by merging the require blocks  
https://github.com/abhijit-hota/modfmt

- koanf: Simple, extremely lightweight, extensible, configuration management library for Go. Support for JSON, TOML, YAML, env, command line, file, S3 etc. Alternative to viper.  
https://github.com/knadh/koanf

- :memo: Kong is a command-line parser for Go  
https://github.com/alecthomas/kong

- env: A simple, zero-dependencies library to parse environment variables into structs  
https://github.com/caarlos0/env

- cleanenv: Clean and minimalistic environment configuration reader for Golang  
https://github.com/ilyakaznacheev/cleanenv

- konf: The simplest config loader for Go that reads/watches from file, env, flag and clouds (AWS, Azure, GCP).  
https://github.com/nil-go/konf

- :memo: bubbletea: A powerful little TUI framework  
https://github.com/charmbracelet/bubbletea

- :memo: rod: A Chrome DevTools Protocol driver for web automation and scraping.  
https://github.com/go-rod/rod

- :memo: goawk: A POSIX-compliant AWK interpreter written in Go, with CSV support  
https://github.com/benhoyt/goawk

- :memo: miller: is like awk, sed, cut, join, and sort for name-indexed data such as CSV, TSV, and tabular JSON  
https://github.com/johnkerl/miller 
 
## Reminder: libraries to use / to test in future projects?

- pulse: Like a fitness tracker for your coding sessions  
https://github.com/creativecreature/pulse

- revive: ~6x faster, stricter, configurable, extensible, and beautiful drop-in replacement for golint  
https://github.com/mgechev/revive

- pipet: Swiss-army tool for scraping and extracting data from online assets, made for hackers  
https://github.com/bjesus/pipet


---
If you find this notes helpful and want to support me, you can do so by [Buy me a coffee! ☕](https://www.buymeacoffee.com/vbduetsch) it will keep my motivation high and I will be really thankful.

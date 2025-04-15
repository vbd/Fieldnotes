# Insights and experiences of > 25 years being a dev

This document, like the entire repo, is work in progress.

I will share some experiences and resources that might be helpful for starting developers, nerds, like me, tech savy users and everyone interested. Language specific topics can be found in the named accordingly repo files.

I'll try to add 1-2 sections a week depending on my health in this file.

I nowadays mostly develop with Python and Golang. I tried Rust but a third language is currently to much for me. So I will stick with Python and Golang.

The focus of my development projects were and are:
- bring different -glue- applications and platforms together (data exchange, data import, data export, etc.)
- tooling for (small) big data, up to 5 TB
- CRUD web applications
- cli tools and text user interface tools
- automation scripts
- mostly backend, frontend only if I couldn't avoid or couldn't hand over to someone else. I'm not good in making shiny, fancy web frontends

> Being a dev is not being a code monkey! A dev creates solutions to solve problems and to get things done in a more convenient way!


## My must have links for the beginning

- 🌶️ The Missing Semester of Your CS Education: https://missing.csail.mit.edu/ :arrow_right: If it was available on my start it would have saved me ~5 years
- Developer Roadmaps: https://roadmap.sh/ :arrow_right: Great ressource for topics
- Go Developer: https://roadmap.sh/golang
- Python Developer: https://roadmap.sh/python
- Backend Developer: https://roadmap.sh/backend
- DevOps Roadmap: https://roadmap.sh/devops
- Cyber Security Expert: https://roadmap.sh/cyber-security :arrow_right: maybe a bit exaggerated but a number of topics are relevant for every developer
- Security Certification Roadmap: https://pauljerimy.com/security-certification-roadmap/ :arrow_right: best overview for this topic
- Git for Beginners: Zero to Hero (free): https://jdsalaro.com/tutorial/git/ :arrow_right: Time machine for everything text based. Besides git I like [fossil-scm](https://www2.fossil-scm.org/home/doc/trunk/www/index.wiki)
- How Web Works: https://github.com/vasanthk/how-web-works
- System Design Cheatsheet: https://gist.github.com/vasanthk/485d1c25737e8e72759f
- Web Security Basics: https://github.com/vasanthk/web-security-basics
- Optional, but helpful<br>An opinionated guide on how to become a professional Web/Mobile App Developer: https://github.com/apptension/developer-handbook/tree/master
- The XY Problem: https://xyproblem.info/
- How To Ask Questions The Smart Way: http://www.catb.org/esr/faqs/smart-questions.html

## Some "easy" insights
Being a software dev is about solving problems and creating solutions to solve these problems. Coding is only a part of it!

Some may sound surprising, obvious, not worth talking about but that is some of my experience. Btw. I learned to code in a time Google doesn't exist. I learned from code listings printed on paper and published in magazines.
Besides the first point not sorted in anyway.


- organize yourself! Great books that may help you:
    - Make it Stick: The Science of Successful Learning: https://www.amazon.de/Make-Stick-Science-Successful-Learning/dp/0674729013/
    - How to Take Smart Notes: One Simple Technique to Boost Writing, Learning and Thinking – for Students, Academics and Nonfiction Book Writers: https://www.amazon.de/gp/product/1542866502/
    - Building a Second Brain: A Proven Method to Organise Your Digital Life and Unlock Your Creative Potential: https://www.amazon.de/Building-Second-Brain-Organise-Potential-ebook/dp/B09MDNDYYF/ 

- make notes in a simple and easy searchable way (I use markdown, vim, rg, fd and git). Paper is also a great option, but it lack searchability.
- comment code: code tells you how, comments tell you why
- document decisions: often makes sense in retrospect why a decision was made that way
- reduce your cognitive load
- if you are stuck switch context, go on a walk etc. (I once spent a whole day debugging without getting any further. The next morning it took less than 15 minutes and the problem was discovered and solved. This is common and almost experienced any developer in one or another way)
- don't start a war of beliefs about programming languages, editors etc. it's just not worth it and most of the time both sides are not right. This endless discussions are fruitless and cost energy. Energy which could be used for better.
- avoid fomo (fear of missing out)
- don't remember the source but it is so true: beginners, intermediate and advanced, be a teacher and a student we can all learn from each other!
- software development is an iterative process!
- don't overengineer, keep it simple and stupid.
- as often as possible go on a walk and let your thoughts fly.
- be curious and open minded
- be friendly and patient
- use AI when it's allowed and where it might be helpful. **Be careful what you reveal!**
- don't copy code 1:1 if you don't understand it
- don't grab and test every tool you can get, often it makes sense to stick by the top docs (git, make/makefile, ...)
- you are a software developer not an imposter. So overcome it. (it's easy written, but it's hard)
- you don't have to know everything, you just have to know where to look it up.
- your piece of software should focus on one task and should do "it well".
- data strutures are the central topic of coding. If the data structure fits, the algorithms almost always result by themselves. Don't let that hear the ML people :)


 

## How to "become" agile

You have to distinguish between being agile certified and working agile. Working agile means mostly in the boundaries of the Scrum framework.

I have not needed a PSM or PSPO certification so far. I do have other
certifications but possibly not so respected. But times seem to change.
A certificate won't make you agile. But I've noticed increasingly if you
do not have one you will be sorted out. With a certificate you
will get possibly more interviews.

So before working agile you need to be agile certified. Something I really dislike.

Personally I am just of the opinion I won't get a PSM, PSPO, CSM, CSPO
cert etc. to bypass the filters of HR to get a project. Maybe I need to see.


### To become agile certified

HR mostly defines agile as the Scrum framework, so I recommend the PSM,
because no renewal and no expensive course participation required.

I didn't want to write this down because it's a pretty specific topic and
also has to do with mindset (I don't like that term), but the question
keeps coming up and so here's what I think may work.

Both books help to get you an idea what Scrum is:

- Read "Doing twice the work in half the time": https://www.amazon.de/gp/product/B00I52D6KQ/
- Read "The Scrum Fieldbook: Faster performance. Better results. Starting now.": https://www.amazon.de/gp/product/B07SXFG8SC/

Both books are not required for the certification process but I think knowledge can't hurt and they improve understanding.
**Be aware of the changes in the scrum guide.**

For the certification process:

1. follow the Scrum Master Learning Path on scrum.org: https://www.scrum.org/pathway/scrum-master
2. visit the Scrum.orgs resource-center: https://www.scrum.org/resource-center
3. read the Scrum Guide: https://scrumguides.org/
4. take and retake the scrum pre tests until you reach constantly 95%+: https://www.scrum.org/open-assessments/scrum-open
5. also read the Scrum Guide multiple times
6. take the PSM1 certification


### To work agile and to be agile

In my experience most projects are a mix of waterfall, xp, scrum, kanban, traditional pm, cynefin, v-model etc.
But scrum is very popular and widely used, so it is a not so bad starting point.

Outside of the Scrum Framework this could be helpful:

- read and practice https://agilemanifesto.org/ what the idea behind agile really is
- read Extreme Programming Explained: Embrace Change: https://www.amazon.de/gp/product/B00N1ZN6C0/
- watch "Agile Product Ownership in a Nutshell": https://www.youtube.com/watch?v=502ILHjX9EE
- watch "Spotify Engineering Culture - Part 1 (aka the "Spotify Model")": https://www.youtube.com/watch?v=Yvfz4HGtoPc
- watch "Spotify Engineering Culture - Part 2 (aka the "Spotify Model")": https://www.youtube.com/watch?v=vOt4BbWLWQw


My essential agile way:

- Find out what your customer really want. Talk with them. Use a language
  that is appropriate to the situation and be patient.
- Find out what is the most helpful/valuable thing for them.
- Make sure all parties involved understand DoR and DoD.
- Build it and release it.
- Let the customer use it and get feedback.
- Clarify what you need to do next, or if you're done.
- Repeat until it's done.
- Stop sales from selling unwanted features :)
- Avoid unnecessary features and over-engineering.
- don't skip retrospective / lessons learned.
- daily stand up challenging yes sometimes even annoying but it is good for mutual understanding.
- visualize your work with a board. Have the board filmed by a webcam to which the relevant people have access. Write clearly.

Some keywords that may be of interest:
- kanban
- reduce complexity
- pair programming
- mob programming
- Cynefin
- FaST Agile
- agile vs waterfall
- mix of methods and frameworks
- if possible within the project pick what works best for you and your time. Can be a mix of different methods/frameworks and so on.

## Becoming a senior software engineer
[Path to Senior Engineer handbook](https://github.com/jordan-cutler/path-to-senior-engineer-handbook) This repo has all the resources you need to reach Senior Software Engineer!

More todo.
 
TODO:
## Finding and fixing bugs / technical debt
## Getting into new codesbases
## idea: Automation
## Focus, flow and context switching
## idea: "Green" software
## Softskills
## Being criticized and criticizing / getting feedback, giving feedback
## Scrum, Agile, Watrefall, Kanban, ... or how I got my projects really done
## Personal resilience and health and why I failed at it
## Why freelancer a very personal view
## Self-organization, not in the meaning of Scrum
## idea: productivity, efficiency, effectiveness and self-optimization 10x devs etc.
## idea: how to become "agile", why a certificate doesn't make you "agile" and why sometimes a certificate may be necessary
## idea: In the face of AI: the future of software development (imho) more problem solving, solution-oriented and critical thinking, less code writing and hard, for many of us, more soft skills




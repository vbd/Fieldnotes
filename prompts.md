
# Understanding prompts and how to make them work explained like I'm 5

Based on my notes from what I've learned, translated from german to
english by hand. Therefore it can read a bit rough.

I use it let me explain code from other people that I don't understand,
generating regex and include the explanation into the source code :smiley:,
summarize text and let me explain bureaucratic texts in particular from
the field of compliance like 5 and also let write software tests. Sometimes I have suggestions made for
emails so that the response is appropriate and I don't accidentally slip
in tone. Unpleasant discussions are best never held by email!


## LLM
A large language model is based on a neural network of transformers
(multiple layers of encoders and decoders).

    Prompt (user input) -> Encoder -> NLP model -> Decoder -> Prompt (Chatgpt output)

NLP = natural language processing model e.g. BERT or ChatGPT

A base LLM predicts next word under consideration of the attention
mechanism and based on it's training data.

## Instruction tuned LLM

Follows the instructions of the base LLM. normally fine tuned on the
instructions of the base LLM to deliver good results following the
underlying instructions. Trained with additional data and often RHLF
reinforcement learning with human feedback (chatgpt's button finger up /
finger down).


## Prompts

A Prompt is used to tell the instruction tuned LLM what we want from it.
Instruction tuned because it delivers better results than the base model.
The prompt describes the problem/request. Better prompts deliver better
results!

Prompts work with tokens. In English language 1 token equals approx. 4
chars. To see how a word, sentence, or prompt instruction is deconstructed
in tokens checkout https://platform.openai.com/tokenizer
Tokens form the basis for billing.

Basically, the system works in such a way that the LLM tries to make a
prediction for the next word based on the prompt. The so called attention
mechanism plays a role, because a 1:1 word conversion is often not useful
especially for translations. Detection of patterns and relations is
necessary.

For complex prompts it can make sense to use a delimiter.
I use #### because it equals 1 token.
Usually hardly ever occurs and it's inexpensive.

The temperature parameter comes to play for the prompt output.
High temperature -> prompt output is predictable. Running the prompt over
and over again will return nearly identical result
Low temperature -> prompt output is less predictable more randomness is
added.

### Zero, one, few shot prompts

This definition is not 100%, but it helps for my understanding and memory.

Zero shot prompt
The prompt does not contain an example output.

One shot prompt
The prompt does contain an example output.

Few shot prompt
The prompt does containt multiple examples output.


### Role model

system: defines the behavior of the assistant
assistant: the chat model
user: you

Reflect the role model when writing the prompt.

system: you are an experienced python developer.
system: all your responses must be a sentence long.


### Writing prompts

When formulating the prompt I have made the experience that the following
can be useful. Eat the elephant bite by bite, not all at once. Break down a
complex request / problem into single prompts (chaining / incremental /
laddering prompting)

- define a role
    - as a experienced python developer
    - as a marketing expert
    - as a scrum master

- define a goal
    - write a script
    - write a function
    - write an blog article
    - write a tweet
    - make a checklist of risks that can occur

- give context and constraints
    - use library xy for scripts
    - no third party lib
    - answer should be not longer as 5 sentences.
    - article should be 1000 words.
    - show the result as table.
    - the code to analyze is delimited by ####
    - example of how the input looks
    - example of how the output should look like
    - return the result in plantuml code (Chatgpt cannot generate
      graphics, but the source code for it)
    - return the result as XML/YAML, CSV, json, markdown
    - return the result as scorecard, checklist
    - summarize context in bullet format
    - define a target audience
    - respond in a friendly tone (could be helpful by answering an
      unpleasant request)
    - mark the place in the text where an image should be inserted and
      describe what the image should contain (for image placeholders)
    - avoid emojis
    - use emojis
    - the article should target tech related people.
    - give me a list with SEO relevant keywords that should be included in the xxxe to reach a bigger audience.

    - create an outline for the article, that should not exceed 1200 words
    - include SEO keywords where possible
 

Let chatgpt know if something is unclear it should ask you with the so
called Ask-Before-Answer Prompting. e.h. `before answering I want you to
ask for any extra information that helps you to produce a better answer`

Ask follow-up questions to learn more. Especially when using it for
scripts, debugging etc. Let you explain the code in detail. Usually
chatgpt provides an explanation of the generated code, but on demand
certain facts are explained better and clearer.

Show ChatGpt an example and ask it which prompt should be used to produce
an output like that. `Given the example output, between ### which prompt
would I have to write to get a similar output`

Let Chatgpt add comments to your code or others code.
Let it explain the code to you.

Use Chatgpt for brainstorming/planning. Ask it for a bullet list of what
you have to do and be aware when starting a new project. This can be
useful for project managers, developers, scrum masters, product owners
etc. Let it explain unclear steps.


Write software tests. Not only in legacy codebases there are often no
tests... I have noticed this in some new code bases as well. I am not a
friend of tests either but they can be very useful and for automated code
deploys it is a must.


## Limits

- Output of ChatGPT may be faulty. Caution of hallucinations: ChatGPT can
  create incorrect or non-context related output that still sounds
  plausible. Hallucinations are words or phrases that are generated by the
  model that are often nonsensical or grammatically incorrect. Causes for
  hHallucinations:
    - The model is not trained on enough data
    - The model is trained on noisy or dirty data
    - The model is not given enough context
    - The model is not given enough constraints
- LLMs are trained so that the result is designed to sound useful to the
  user whether it is or not is a different matter again the result should
  please the user
- Scripts generated usually don't have error handling or logging. If
  needed ask chatgpt for it or add it by hand.

- Don't trust the scripts. Test it carefully. Especially bash scripts and
  scripts that move and or remove files. Also scripts for changing user
  credentials.

- Be aware of what you copy into the prompt, you don't know what will
  happen with the inserted data. in particular, this applies to source
  codes, internal documents, general information that does not concern
  others You, your boss and your company do not want the company secrets
  to go public.


---

Test it with chatgpt for e.g. sausage and let chatgpt reverse it:

sausage = 7 chars = 3 tokens.
[s][aus][age]

The result is not what we expected.

To let chatgpt reverse the word correctly write s-a-u-s-a-g-e. Every char becomes a token and it will work.

Note: 2023-07-03 seems not to be any longer the case.

---

## Useful links

- [Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide)
- [Awesome ChatGPT Prompts](https://prompts.chat/)
- [50 ChatGPT Prompts for Web Developers](https://dev.to/mursalfk/50-chatgpt-prompts-for-web-developers-2oeh) 
- [100 Best ChatGPT Prompts to Unleash AI’s Potential](https://mpost.io/100-best-chatgpt-prompts-to-unleash-ais-potential/)
- :scroll: [ChatGPT - The Complete Guide to ChatGPT & OpenAI APIs](https://www.udemy.com/course/chatgpt-bard-bing-complete-guide-to-chatgpt-openai-apis/)
- :scroll: [ChatGPT Prompt Engineering for Developers](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)
- :scroll: [Building Systems with the ChatGPT API](https://www.deeplearning.ai/short-courses/building-systems-with-chatgpt/)
- :scroll: [Introduction to Generative AI](https://www.cloudskillsboost.google/course_templates/536)
- :tv: [Use ChatGPT to Build a RegEx Generator – OpenAI API Low Code Course](https://www.youtube.com/watch?v=D6Xj_W4leu8)
- :tv: [Build AI Apps with ChatGPT, DALL-E, and GPT-4 – Full Course for Beginners](https://www.youtube.com/watch?v=jlogLBkPZ2A)
- :tv: [Use ChatGPT to Code a Full Stack App – Full Course](https://www.youtube.com/watch?v=GizsSo-EevA)
- :tv: [ChatGPT Course – Use The OpenAI API to Code 5 Projects](https://www.youtube.com/watch?v=uRQH2CFvedY)
- [Prompt Engineering Roadmap](https://roadmap.sh/prompt-engineering)
- [ChatGPT Prompts: A Guide for Developers](https://dev.to/kanani_nirav/chatgpt-prompts-a-guide-for-developers-p6m)
- [A collection of ChatGPT and GPT-3.5 instruction-based prompts for generating and classifying text.](https://github.com/kevinamiri/Instructgpt-prompts)
- 🌶️[Dive into cheat sheets, AI courses, prompt engineering tutorials, and more to enhance your understanding and skills in AI.](https://www.aifire.co/c/ai-learning-resources)




<p align="center">
  <img src="/annotate.png?raw=true" width="100%" title="Logo">
</p>

## What is it?

It is a simple web app that lets you write Markdown side notes on your code,
without making changes to the source files.

The idea is to write notes and comments outside the code so that code stays
 clean, short, and readable.
Notes are matched based on similarity when the code changes.
The matching algorithm might need improvements.

We intend to use it for  personal note taking to understand code,
writing [tutorials](http://blog.varunajayasiri.com/ml/transformer.html),
and for collaboration.

🚧 This project is still in its infant stage,
 and slowly improving.

## How to use

Compile `TypeScript` files in folder `ui` using compile directives defined in `tsconfig.ts`.

Run `server/ann.py` from the folder with your python source code.

Go to `localhost:8888/static/index.html`


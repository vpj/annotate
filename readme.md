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

## How to use

Run `node server/out/app.js` from the folder with your python source code.

Visit `localhost:8088` in the browser.


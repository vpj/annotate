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

### Clone and install

```bash
git clone git@github.com:vpj/annotate.git
cd annotate
git submodule init
git submodule update
./install.sh
```

To update run a git update

```bash
cd annotate
git pull
git submodule update
./install.sh
```

### Starting the server

Navigate to the path of the project and run the following command to start the server.

```bash
annotate
```

### Example

[Annotation of Lab sample](http://blog.varunajayasiri.com/ml/lab3/#samples%2Fmnist_loop.py)

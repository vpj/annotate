#!/usr/bin/env python
import json
import os
from pathlib import Path
from typing import Optional, Awaitable

import tornado.ioloop
import tornado.web

UI_PATH = Path(os.path.abspath(__file__)).parent.parent / 'ui'
print(UI_PATH)

CWD = Path(os.getcwd())
print(CWD)


class MainHandler(tornado.web.RequestHandler):
    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        pass

    def get(self):
        self.write("Hello, world")


def python_files(path: Path):
    assert path.is_dir()

    files = []

    for p in path.iterdir():
        if p.is_dir():
            files += python_files(p)
        else:
            if p.suffix == '.py':
                files.append(p)

    return files


def read_file(path: Path):
    with open(str(path), 'r') as f:
        lines = f.readlines()
        lines = [l.rstrip() for l in lines]

    return lines


def get_source():
    files = python_files(CWD)

    source = {str(p.relative_to(CWD)): read_file(p) for p in files}

    return source


def get_notes():
    try:
        with open(str(CWD / 'notes.json'), 'r') as f:
            return f.read()
    except FileNotFoundError:
        return '{}'


def save_notes(notes: str):
    with open(str(CWD / 'notes.json'), 'w') as f:
        return f.write(notes)


class SourceHandler(tornado.web.RequestHandler):
    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        pass

    def get(self):
        self.write(json.dumps(get_source()))
        self.finish()


class NotesHandler(tornado.web.RequestHandler):
    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        pass

    def get(self):
        self.write(get_notes())
        self.finish()

    def post(self):
        notes = self.request.body.decode('utf-8')
        save_notes(notes)
        self.write("Done")
        self.finish()


def make_app():
    return tornado.web.Application([
        (r"/", MainHandler),
        (r"/source", SourceHandler),
        (r"/notes", NotesHandler),
        (r"/static/(.*)", tornado.web.StaticFileHandler, dict(path=str(UI_PATH)))
    ])


if __name__ == "__main__":
    app = make_app()
    app.listen(8888)
    tornado.ioloop.IOLoop.current().start()

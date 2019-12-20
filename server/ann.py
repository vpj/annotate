#!/usr/bin/env python
import json
import os
from pathlib import Path
from typing import Optional, Awaitable

import tornado.ioloop
import tornado.web

STATIC_PATH = Path(os.path.abspath(__file__)).parent.parent / 'ui' / 'static'
UI_PATH = Path(os.path.abspath(__file__)).parent.parent / 'ui'

CWD = Path(os.getcwd())

extensions = []


class MainHandler(tornado.web.RequestHandler):
    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        pass

    def get(self):
        with open(str(UI_PATH / 'index.html'), 'r') as f:
            self.write(f.read())


def source_files(path: Path):
    assert path.is_dir()

    files = []

    for p in path.iterdir():
        if p.is_dir():
            files += source_files(p)
        else:
            for e in extensions:
                if p.suffix == f'.{e}':
                    files.append(p)
                    break

    return files


def read_file(path: Path):
    with open(str(path), 'r') as f:
        lines = f.readlines()
        lines = [l.rstrip() for l in lines]

    return lines


def get_source():
    files = source_files(CWD)

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


def save_source(source: str):
    with open(str(CWD / 'source.json'), 'w') as f:
        return f.write(source)


class SourceHandler(tornado.web.RequestHandler):
    def data_received(self, chunk: bytes) -> Optional[Awaitable[None]]:
        pass

    def get(self):
        source = json.dumps(get_source())
        save_source(source)
        self.write(source)
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
        (r"/index.html", MainHandler),
        (r"/source.json", SourceHandler),
        (r"/notes.json", NotesHandler),
        (r"/static/(.*)", tornado.web.StaticFileHandler, dict(path=str(STATIC_PATH)))
    ])


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Run annotate server.')
    parser.add_argument('--extensions', metavar='e', type=str, nargs='+',
                        default=['py'],
                        help='list of extensions')
    parser.add_argument('--port', default=8888, type=int,
                        help='Port')

    args = parser.parse_args()

    print(f"Project folder: {CWD}")
    # print(f"Static files: {UI_PATH}")
    print(f"Starting server at http://localhost:{args.port}/")
    extensions = args.extensions
    print(f"Opening files with extensions: {extensions}")

    app = make_app()
    app.listen(args.port)
    tornado.ioloop.IOLoop.current().start()

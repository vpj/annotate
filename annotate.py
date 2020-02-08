import subprocess
import pathlib


def start_server():
    installation = pathlib.PurePath(__file__).parent
    try:
        subprocess.run(["node", str(installation / 'dist' / 'server' / 'server' / 'app.js')])
    except KeyboardInterrupt:
        return

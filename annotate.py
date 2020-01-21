import subprocess
import pathlib

def start_server():
	installation = pathlib.PurePath(__file__).parent
	print("Starting NodeJS server...")
	try:
		subprocess.run(["node", str(installation / 'server' / 'out' / 'app.js')])
	except KeyboardInterrupt:
		print("Stopped the server")


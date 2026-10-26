import os,runpy,sys
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('generate_living_world.py')),run_name='__main__')
sys.stdout.flush();sys.stderr.flush();os._exit(0)

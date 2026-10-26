"""Official bpy wheel entry point; exceptions must propagate before clean exit."""
import runpy,sys,os
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('generate_detail_world.py')),run_name='__main__')
sys.stdout.flush();sys.stderr.flush();os._exit(0)

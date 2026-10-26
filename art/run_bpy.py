"""Run the generator with the official bpy wheel, then exit before bpy teardown.

The standalone Blender binary should use --background --python instead.
The explicit successful exit avoids a bpy 4.2 USD teardown crash in restricted
containers. Export exceptions still propagate and result in a failing command.
"""
import os,runpy,sys
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('generate_assets.py')),run_name='__main__')
sys.stdout.flush();sys.stderr.flush();os._exit(0)

# -*- mode: python -*-
from PyInstaller.utils.hooks import collect_dynamic_libs

block_cipher = None


a = Analysis(['api.py'],
             pathex=['/Users/rmp/dev/ONT/baserunner'],
             binaries=collect_dynamic_libs('zmq','h5py'),
             datas=[],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
#          exclude_binaries=True,
          name='api',
          debug=False,
          strip=False,
          upx=True,
          console=True )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               name='api')

# -*- mode: python -*-

from PyInstaller.utils.hooks import collect_dynamic_libs
block_cipher = None

a = Analysis(['pycalc/api.py'],
             pathex=['/Users/rmp/dev/ONT/nanodesk'],
             binaries=collect_dynamic_libs('zmq'),
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
          a.binaries,
          a.zipfiles,
          a.datas,
          name='api',
          debug=False,
          strip=False,
          upx=True,
          console=True )

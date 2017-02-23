npm_config_target=1.4.15 # electron version
npm_config_arch=x64
npm_config_target_arch=x64
npm_config_disturl=https://atom.io/download/electron
npm_config_runtime=electron
npm_config_build_from_source=true

all: pack

clean:
	rm -rf ~/.node-gyp ~/.electron-gyp ./node_modules
	rm -rf include lib .Python pip-selfcheck.json bin build

deps_linux:
	sudo apt-get install libzmq-dev virtualenv

deps_mac:
	brew install zmq

deps: clean
	npm_config_target=$(npm_config_target) npm_config_arch=$(npm_config_arch) npm_config_target_arch=$(npm_config_target_arch) npm_config_disturl=$(npm_config_disturl) npm_config_runtime=$(npm_config_runtime) npm_config_build_from_source=$(npm_config_build_from_source) npm install
	virtualenv . --always-copy
	(source ./bin/activate ; pip install zerorpc ; pip install pyinstaller)

pack: deps
	touch pycalcdist
	rm -rf pycalcdist
	./bin/pyinstaller api.spec
#	pyinstaller --onefile pycalc/api.py --distpath pycalcdist --add-binary="/usr/local/lib/libzmq.5.dylib:libzmq.5.dylib"
#	rm -rf build/
#	rm -rf api.spec
	touch nanodesk-darwin-x64
	rm -rf nanodesk-darwin-x64
	./node_modules/.bin/electron-packager . --overwrite --ignore="pycalc$$" --ignore="\.venv" --ignore="old-post-backup"

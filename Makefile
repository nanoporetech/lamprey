npm_config_target=1.4.15 # electron version
npm_config_arch=x64
npm_config_target_arch=x64
npm_config_disturl=https://atom.io/download/electron
npm_config_runtime=electron
npm_config_build_from_source=true

MAJOR ?= 0
MINOR ?= 0
SUB   ?= 0
PATCH ?= $CI_BUILD_ID

all: pack

clean:
	touch .node-gyp
	rm -rf ~/.node-gyp ~/.electron-gyp ./node_modules baserunner* include lib .Python pip-selfcheck.json bin build

deps_linux:
	sudo apt-get install libzmq-dev virtualenv

deps_mac:
	brew install zmq

deps: clean
	npm_config_target=$(npm_config_target) npm_config_arch=$(npm_config_arch) npm_config_target_arch=$(npm_config_target_arch) npm_config_disturl=$(npm_config_disturl) npm_config_runtime=$(npm_config_runtime) npm_config_build_from_source=$(npm_config_build_from_source) npm install
	virtualenv . --always-copy
	(. ./bin/activate ; pip install zerorpc ; pip install pyinstaller)

pack: deps
	touch dist
	rm -rf dist build
	./bin/pyinstaller api.spec
	touch nanodesk-darwin-x64
	rm -rf nanodesk-*
	./node_modules/.bin/electron-packager . --overwrite --ignore="pycalc$$" --ignore="\.venv" --ignore="old-post-backup"
	cp externals/$(shell uname -s)/* baserunner-*/
	mv baserunner-* baserunner-$(shell uname -s)-$(MAJOR).$(MINOR).$(SUB).$(PATCH)

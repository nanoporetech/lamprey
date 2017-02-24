npm_config_target=1.4.15 # electron version
npm_config_arch=x64
npm_config_target_arch=x64
npm_config_disturl=https://atom.io/download/electron
npm_config_runtime=electron
npm_config_build_from_source=true

MAJOR ?= 0
MINOR ?= 0
SUB   ?= 0
PATCH ?= 1

all: pack

clean:
	touch .node-gyp
	rm -rf ~/.node-gyp ~/.electron-gyp ./node_modules baserunner* include lib .Python pip-selfcheck.json bin build externals/nanonet

deps_mac:
	brew install zmq

deps_js:
	npm_config_target=$(npm_config_target) npm_config_arch=$(npm_config_arch) npm_config_target_arch=$(npm_config_target_arch) npm_config_disturl=$(npm_config_disturl) npm_config_runtime=$(npm_config_runtime) npm_config_build_from_source=$(npm_config_build_from_source) npm install

deps_py:
#	virtualenv . --no-site-packages --always-copy
#	(. ./bin/activate ; pip install zerorpc ; pip install pyinstaller ; pip install h5py ; pip install myriad)
	pip install --user zerorpc pyinstaller h5py myriad numpy

deps: clean
	git submodule update --init --recursive
	make deps_js deps_py

py:
	touch dist
	rm -rf dist build
	cd externals/nanonet ; python setup.py develop --user
	PATH=$(HOME)/.local/bin:$(HOME)/Library/Python/2.7/bin:$(PATH) pyinstaller api.spec

pack: deps
	make py
	touch nanodesk-darwin-x64
	rm -rf nanodesk-*
	./node_modules/.bin/electron-packager . --overwrite --ignore="\.venv" --ignore="old-post-backup" --ignore="externals"
	cp externals/$(shell uname -s)/* baserunner-*/
	mv baserunner-* baserunner-$(shell uname -s)-$(MAJOR).$(MINOR).$(SUB).$(PATCH)

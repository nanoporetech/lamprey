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
	touch node_modules
	rm -rf ~/.node-gyp ~/.electron-gyp ./node_modules baserunner-* include lib .Python pip-selfcheck.json bin build externals/nanonet

deps_mac:
	brew install zmq

deps_js:
	npm_config_target=$(npm_config_target) npm_config_arch=$(npm_config_arch) npm_config_target_arch=$(npm_config_target_arch) npm_config_disturl=$(npm_config_disturl) npm_config_runtime=$(npm_config_runtime) npm_config_build_from_source=$(npm_config_build_from_source) npm install

#deps_py3:
#	pip3 install --user zerorpc aiozmq numpy scipy h5py
#	pip3 install --user git+https://github.com/pyinstaller/pyinstaller.git
#	cd externals/nanonet ; python3 setup.py develop --user
#py3: deps_py3
#	PATH=$(HOME)/.local/bin:$(HOME)/Library/Python/3.6/bin:$(PATH) pyinstaller --clean --log-level DEBUG api.spec

deps_py:
	pip install --user zerorpc pyinstaller myriad h5py future
	pip install --user pyzmq --no-binary :all:
	cd externals/nanonet ; python setup.py develop --user

py: deps_py
	touch dist
	rm -rf dist
	PATH=$(HOME)/.local/bin:$(HOME)/Library/Python/2.7/bin:$(PATH) pyinstaller --clean --log-level DEBUG api.spec

deps: clean
	git submodule update --init --recursive
	make deps_js deps_py

pack: deps
	make py
	touch baserunner-darwin-x64
	rm -rf baserunner-*
	./node_modules/.bin/electron-packager . --icon="assets/baserunner512x512" --overwrite --appBundleId="com.nanoporetech.baserunner"
#	cp externals/$(shell uname -s)/* baserunner-*/
	mv baserunner-* baserunner-$(shell uname -s)-$(MAJOR).$(MINOR).$(SUB).$(PATCH)

// main.js

const electron      = require('electron')
const path          = require('path')
const getopt        = require('node-getopt')
const bunyan        = require('bunyan')
const app           = electron.app
const Menu          = electron.Menu
const BrowserWindow = electron.BrowserWindow
const basePort      = 28320
const osUtil        = require("./osutil")
const osutil        = new osUtil({log:bunyan.createLogger({name:"main"})})

var opts = getopt.create([
    ["h", "help",            "This help"],
    ["i", "input=ARG",       "Input folder"],
    ["o", "ofq=ARG",         "Output FastQ file Default=out.fastq"],
    ["l", "log=ARG",         "Log file. Default=baserunner.log"],
    ["m", "model=ARG",       "Model file. Default=internal r9_template.npy"],
    ["c", "concurrency=ARG", "Worker concurrency. Default = 1"],
    ["d", "depth=ARG",       "Folder watch depth. Default = 2"],
    ["a", "autostart",       "Autostart"],
    ["", "debug",            "Open debug console"],
])
    .bindHelp()
    .parseSystem()

if(opts.options.autostart && !opts.options.input) {
    console.log("Cannot autostart without an input folder")
    process.exit()
}

if(!opts.options.log) {
    opts.options.log = path.join(app.getPath('home'), "baserunner.log")
}

if(!opts.options.ofq) {
    opts.options.ofq = path.join(app.getPath('home'), "out.fastq")
}

if(!opts.options.basePort) {
    opts.options.basePort = basePort
}

let mainWindow = null
const createWindow = () => {
    mainWindow = new BrowserWindow({
	width: 1000,
	height: 400,
	resizable: opts.options.debug ? true : false
    })

    mainWindow.loadURL(require('url').format({
	pathname: path.join(__dirname, 'index.html'),
	protocol: 'file:',
	slashes: true
    }))

    // pass commandline options
    mainWindow.opts = opts
    if(opts.options.debug) {
	mainWindow.webContents.openDevTools()
    }

    var menu = Menu.buildFromTemplate([
	{
	    label: 'Baserunner',
	    submenu: [
		{
		    label: 'Setup',
		    click: (item, window) => {
			mainWindow.webContents.send('menu-event', 'setup');
		    }
		},
		{
		    label: 'Start',
		    click: (item, window) => {
			mainWindow.webContents.send('menu-event', 'start');
		    }
		},
		{
		    label: 'Stop',
		    click: (item, window) => {
			mainWindow.webContents.send('menu-event', 'stop');
		    }
		},
		{
		    label: 'Quit',
		    accelerator: "Command+Q", 
		    click: () => {
			app.quit()
		    }
		}
	    ]
	}
    ])
    Menu.setApplicationMenu(menu)

    mainWindow.on('closed', () => {
	mainWindow = null
    })
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
	app.quit()
    }
})

app.on('activate', () => {
    if (mainWindow === null) {
	createWindow()
    }
})

// add these to the end or middle of main.js

let pyProcs = new Array(opts.options.concurrency)

const PY_DIST_FOLDER = 'dist'
const PY_FOLDER = ''
const PY_MODULE = 'api' // without .py suffix

const guessPackaged = () => {
    const fullPath = path.join(__dirname, PY_DIST_FOLDER)
    return require('fs').existsSync(fullPath)
}

const getScriptPath = () => {
    if (!guessPackaged()) {
	return path.join(__dirname, PY_FOLDER, PY_MODULE + '.py')
    }

    if (process.platform === 'win32') {
	return path.join(__dirname, PY_DIST_FOLDER, PY_MODULE, PY_MODULE, '.exe')
    }

    return path.join(__dirname, PY_DIST_FOLDER, PY_MODULE, PY_MODULE)
}

const createPyProc = () => {
    let script = getScriptPath()

    console.log(`child process using ${script}`)

    for(i=0; i< opts.options.concurrency; i += 1) {
	let port   = '' + (basePort + i)
	let pyProc = null

	if (guessPackaged()) {
	    pyProc = require('child_process').execFile(script, [port])
	} else {
	    pyProc = require('child_process').spawn('python', [script, port])
	}

	if (pyProc != null) {
	    //console.log(pyProc)
	    console.log(`child process ${i} on port ${port}`)
	    pyProcs[i] = pyProc;
	} else {
	    console.log(`child failed on port ${port}`)
	}
    }
}

const exitPyProc = () => {
    console.log("terminating child service")
    pyProcs.forEach((o) => {
	if(o) {
	    if(o.spawnargs) {
		console.log("killing", o.spawnargs.join(" "))
	    }
	    o.kill()
	}
	return null
    })
}

const cpuCheck = () => {
    if(opts.options.concurrency) {
	return createPyProc()
    }

    osutil.procs((err, logical) => {
	if(err) {
	    console.log("error discovering logical cpus", err)
	    opts.options.concurrency = 4
	    return createPyProc()
	}
	console.log(logical, "logical cpus detected")
	opts.options.concurrency = logical-1
	return createPyProc()
    })
}

app.on('ready', cpuCheck)
app.on('will-quit', exitPyProc)

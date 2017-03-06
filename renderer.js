// renderer.js

const chokidar = require("chokidar")
const path     = require("path")
const bunyan   = require('bunyan')
const fs       = require("fs")
const Consumer = require('./consumer')
const notifier = require('node-notifier');
const electron = require('electron')
const remote   = electron.remote
const IPC      = electron.ipcRenderer

let menu        = remote.Menu.getApplicationMenu()
let opts        = remote.getCurrentWindow().opts
let concurrency = opts.options.concurrency ? opts.options.concurrency : 1
let watchDepth  = opts.options.depth       ? opts.options.depth    : 2
let basePort    = opts.options.basePort    ? opts.options.basePort : 28320
let logfile     = opts.options.log         ? opts.options.log      : "baserunner.log"
let fastqfile   = opts.options.ofq         ? opts.options.ofq      : "out.fastq"
let modelfile   = opts.options.model       ? opts.options.model    : path.join(remote.app.getAppPath(), "externals","nanonet","nanonet","data","r9_template.npy")
const loglines  = 16
let consumers   = []
let fastqstream = null
let logstream   = bunyan.createLogger({
    name: "baserunner",
    streams: [{
        path: logfile
    }]
})

/* logging setup */
let logTranscript = document.querySelector("#log")
logTranscript.innerHTML = (new Array(loglines)).join("\n")

const log = (str) => {
    let tmp                 = logTranscript.innerHTML
    logTranscript.innerHTML = logTranscript.innerHTML.split(/\n/).splice(1, loglines).join("\n") + str + "\n"
    logstream.info(str)
}

/* consumer/handoff for each child process */
log("detected", opts.options.concurrency, "logical cpus")
for (var i = 0; i < opts.options.concurrency; i+= 1) {
    let consumer = new Consumer({
	id: i,
	port: basePort+i,
	check: () => {
	    let job = workWaiting.shift()
	    if(job) {
		job.startTime = new Date()
		log("begin " + short_path(job.path))
	    }
	    return job
	},
	complete: (error, res, job) => {
	    let endTime = new Date()
	    let dTime   = endTime - job.startTime;
	    let path    = job.path || ""
	    avgTime     = ((successCount + failureCount) * avgTime + dTime) / (1 + successCount + failureCount)
	    etaIndicator.innerHTML = etaDate().toLocaleString()
	    
	    if(error) {
		log("error " + short_path(path))
		log("message " + error)
		console.error(error)
		failureCount++
		return
	    }
	    
	    let fastq   = res[0];
	    let failure = res[1];
	    if(failure) {
		log(failure.toString() + " " + short_path(path))
		failureCount++
		return
	    }

	    if(fastq) {
		log("end " + short_path(path))
		fastqstream.write(fastq.toString())
		successCount++
		return
	    }

	    log("failed to run job")
	    failureCount++

	    /* immediately check for more work */
	    return
	}
    })
    consumers.push(consumer)
}

/* button and menu handles */
let setupButton   = document.querySelector("#setup")
let startButton   = document.querySelector("#start")
let stopButton    = document.querySelector("#stop")
let setupMenuItem = menu.items[0].submenu.items[0];
let startMenuItem = menu.items[0].submenu.items[1];
let stopMenuItem  = menu.items[0].submenu.items[2];

/* log configuration information */
log("watch depth=" + watchDepth)
log("worker concurrency=" + concurrency)
log("output fastq=" + fastqfile)
log("logfile=" + logfile)

/* average processing time per read */
let avgTime      = 0
let etaIndicator = document.querySelector("#etaCounter")

/* progress indicator setup */
let stateIndicator       = document.querySelector("#state")
stateIndicator.innerHTML = "stopped"

/* setup input folder */
let folderSelection = null

const setupSelectionAction = (selection) => {
    folderSelection            = selection
    let folder_indicator       = document.querySelector("#folders")
    folder_indicator.innerHTML = folderSelection + " FastQ: " + fastqfile + " Log: " + logfile + " Model: " + modelfile.split("/").slice(-1)[0]
    startMenuItem.enabled      = true
    startButton.removeAttribute("disabled")

    log("selected " + folderSelection)
}

/* setup button action */
const setupAction = () => {
    let selection = remote.dialog.showOpenDialog(null, {
	properties: ['openDirectory']
    })

    if(!selection) {
	return
    }

    setupSelectionAction(selection[0]) // only keep the first selection
}

let watcher      = null
let workWaiting  = new Array()
let successCount = 0
let failureCount = 0
let progress     = document.querySelector("#progress")
let counters     = {
    success: document.querySelector("#successCounter"),
    failure: document.querySelector("#failureCounter"),
    total:   document.querySelector("#totalCounter"),
    queued:  document.querySelector("#queuedCounter"),
}
const notify = (msg, title) => {
    return notifier.notify({
	title: title ? title : "baserunner",
	icon: path.join(__dirname, 'assets/baserunner80x80.png'),
	message: msg
    });
}

const workIndicatorUpdate = () => {
    let perc  = 100 * (successCount + failureCount) / (workWaiting.length + successCount + failureCount)
    let percS = 100 * (successCount) / (workWaiting.length + successCount + failureCount)
    let percF = 100 * (failureCount) / (workWaiting.length + successCount + failureCount)
//    let bar  = document.querySelector("#workProgress .progress")
//    let pxw  = bar.parentElement.offsetWidth * perc / 100
//    bar.style.setProperty('width', pxw + "px")

    let barS  = document.querySelector("#workProgress .success")
    let pxwS  = barS.parentElement.offsetWidth * percS / 100
    barS.style.setProperty('width', pxwS + "px")

    let barF  = document.querySelector("#workProgress .failure")
    let pxwF  = barF.parentElement.offsetWidth * percF / 100
    barF.style.setProperty('width', pxwF + "px")

    document.querySelector("#workProgress .label").innerHTML = perc.toFixed(2) + "%"

    counters.success.innerHTML = successCount
    counters.failure.innerHTML = failureCount
    counters.total.innerHTML   = successCount + failureCount
    counters.queued.innerHTML  = workWaiting.length
}

const short_path = (str) => {
    return str.replace(folderSelection,"").replace(/^\/?/,"")
}

let workIndicatorInterval = null

const etaDate = () => {
    return new Date((new Date()).getTime() + avgTime * workWaiting.length)
}

/* start button action */
const startAction = () => {
    if(!folderSelection) {
	alert("please set up a folder")
	return
    }
    log("selected " + folderSelection)

    fastqstream           = fs.createWriteStream(fastqfile)
    workDone              = 0
    workFailed            = 0
    workIndicatorInterval = setInterval(workIndicatorUpdate, 5000)

    setupButton.setAttribute("disabled", "disabled")
    startButton.setAttribute("disabled", "disabled")
    stopButton.removeAttribute("disabled")
    setupMenuItem.enabled = false
    startMenuItem.enabled = false
    stopMenuItem.enabled  = true

    let tmp = [folderSelection]
	.map((o) => {
	    return path.join(o, "**", "*.fast5")
	})

    watcher = chokidar
	.watch(tmp, {
	    depth: watchDepth,
	    ignored: /(^|[\/\\])\../
	})
	.on('add', (path, stats) => {
	    log("queued " + short_path(path))
	    workWaiting.push({
		func: 'process_read',
		path: path,
		model: modelfile
	    })
	})
    stateIndicator.innerHTML = "running"

    /* kick off */
    notify("starting")
}

/* stop button action */
const stopAction = () => {
    if(!watcher) {
	alert("already stopped")
	return
    }

    log("stopping file watcher")
    watcher.close()

    log("emptying queue")
    workWaiting=[]

    log("stopping indicators")
    workIndicatorUpdate()
    clearInterval(workIndicatorInterval)

    setupButton.removeAttribute("disabled")
    startButton.removeAttribute("disabled")
    stopButton.setAttribute("disabled", "disabled")
    setupMenuItem.enabled = true
    startMenuItem.enabled = true
    stopMenuItem.enabled  = false

    log("closing fastq stream")
    fastqstream.end()

    stateIndicator.innerHTML="stopped"

    notify("stopped")
    log("stopped")
}

setupButton.addEventListener('click', setupAction)
window.addEventListener('setup', setupAction)

startButton.addEventListener('click', startAction)
window.addEventListener('start', startAction)

stopButton.addEventListener('click', stopAction)
window.addEventListener('stop', stopAction)

IPC.on("menu-event", (event, arg) => {
    console.log("menu-event handler", event, arg);
    window.dispatchEvent(new Event(arg));
});

/* initial button state */
setupButton.removeAttribute("disabled")
startButton.setAttribute("disabled", "disabled")
stopButton.setAttribute("disabled", "disabled")
setupMenuItem.enabled = true
startMenuItem.enabled = false
stopMenuItem.enabled  = false

/* additional commandline arg handling */
if(opts.options.input) {
    setupSelectionAction(opts.options.input)
}

if(opts.options.autostart) {
    startAction()
}

// renderer.js

const zerorpc  = require("zerorpc")
const chokidar = require("chokidar")
const path     = require("path")
const queue    = require("queue")
const electron = require('electron')
const remote   = electron.remote
const bunyan   = require('bunyan')
const fs       = require("fs")

let logfile    = "baserunner.log"
let fastqfile  = "out.fastq"
let logstream  = bunyan.createLogger({
    name: "baserunner",
    streams: [{
        path: logfile
    }]
})
let fastqstream = null

/* zerorpc setup */
let client = new zerorpc.Client()
client.connect("tcp://127.0.0.1:4242")

/* logging setup */
let logTranscript = document.querySelector("#log")
logTranscript.innerHTML = (new Array(10)).join("\n")

const log = (str) => {
    let tmp                 = logTranscript.innerHTML
    logTranscript.innerHTML = logTranscript.innerHTML.split(/\n/).splice(1, 10).join("\n") + str + "\n"
    logstream.info(str)
}

/* progress indicator setup */
let stateIndicator       = document.querySelector("#state")
stateIndicator.innerHTML = "stopped"

const setupSelectionAction = (selection) => {
    folderSelection            = selection
    let folder_indicator       = document.querySelector("#folders")
    folder_indicator.innerHTML = folderSelection //.join(",")
    start.removeAttribute("disabled", "disabled")
    log("selected " + folderSelection)
}

/* setup button action */
let setup = document.querySelector("#setup")
let folderSelection = null
setup.addEventListener('click', () => {
    let selection = remote.dialog.showOpenDialog(null, {
	properties: ['openDirectory']
    })

    if(!selection) {
	return
    }

    setupSelectionAction(selection[0]) // only keep the first selection
})

let workWaiting = new Array()
let workSuccess = 0
let workFailure = 0
let progress    = document.querySelector("#progress")
let watcher     = null
let workQueue   = queue({
    concurrency: 1,
    autostart: 1
})

const workIndicatorUpdate = () => {
    let perc  = 100 * (workSuccess + workFailure) / (workWaiting.length + workSuccess + workFailure)
    let percS = 100 * (workSuccess) / (workWaiting.length + workSuccess + workFailure)
    let percF = 100 * (workFailure) / (workWaiting.length + workSuccess + workFailure)
//    let bar  = document.querySelector("#workProgress .progress")
//    let pxw  = bar.parentElement.offsetWidth * perc / 100
//    bar.style.setProperty('width', pxw + "px")

    let barS  = document.querySelector("#workProgress .success")
    let pxwS  = barS.parentElement.offsetWidth * percS / 100
    barS.style.setProperty('width', pxwS + "px")

    let barF  = document.querySelector("#workProgress .failure")
    let pxwF  = barF.parentElement.offsetWidth * percF / 100
    barF.style.setProperty('width', pxwF + "px")

    document.querySelector("#workProgress .label").innerHTML = perc.toFixed(2) + "% (" + workSuccess + " : " + workFailure + " : " + workWaiting.length + ")"
}

const short_path = (str) => {
    return str.replace(folderSelection,"").replace(/^\/?/,"")
}

let workIndicatorInterval = null

const checkWork = (qcb) => {

    let cb = () => {
	workIndicatorUpdate()
	if(stateIndicator.innerHTML !== "stopped") {
	    workQueue.push(checkWork) // self-perpetuating
	}
	qcb()
    }

    let len = workWaiting.length
    if(len) {
	let path = workWaiting.shift()
	log("begin " + short_path(path))
	client.invoke("process_read", path, (error, res) => {
	    if(error) {
		log("error " + short_path(path))
		log("message " + error)
		console.error(error)
		workFailure++
		return cb()
	    }

	    let fastq   = res[0];
	    let failure = res[1];
	    if(failure) {
		log(failure.toString() + " " + short_path(path))
		workFailure++
	    } else {
		log("end " + short_path(path))
		fastqstream.write(fastq.toString())
		workSuccess++
	    }
	    /* immediately check for more work */
	    return cb()
	})

    } else {
	/* no work to do. wait for a bit */
	log("nothing to do")
	setTimeout( () => { cb(); }, 5000)
    }
}

/* start button action */
const startAction = () => {
    if(!folderSelection) {
	alert("please set up a folder")
	return
    }
    log("selected " + folderSelection)

    fastqstream = fs.createWriteStream(fastqfile)
    workDone    = 0
    workFailed  = 0
    workIndicatorInterval = setInterval(workIndicatorUpdate, 5000)

    setup.setAttribute("disabled","disabled")
    start.setAttribute("disabled","disabled")
    stop.removeAttribute("disabled")

    let tmp = [folderSelection].map(function(o) {
	return path.join(o, "**", "*.fast5")
    })

    watcher = chokidar.watch(tmp, {
	depth: 2,
	ignored: /(^|[\/\\])\../
    })
	.on('add', (path, stats) => {
	    log("queued " + short_path(path))
	    workWaiting.push(path)
	})
    stateIndicator.innerHTML = "running"

    /* kick off */
    checkWork(() => { })
}

/* stop button action */
const stopAction = () => {
    if(!watcher) {
	alert("already stopped")
	return
    }

    log("stopping file watcher")
    watcher.close()

    log("stopping workers")
    workQueue.end("stopping")

    log("emptying queue")
    workWaiting=[]

    log("stopping indicators")
    workIndicatorUpdate()
    clearInterval(workIndicatorInterval)

    setup.removeAttribute("disabled")
    start.removeAttribute("disabled")
    stop.setAttribute("disabled", "disabled")

    log("closing fastq stream")
    fastqstream.end()

    stateIndicator.innerHTML="stopped"
    log("stopped")
}

let start = document.querySelector("#start")
start.addEventListener('click', startAction)

let stop = document.querySelector("#stop")
stop.addEventListener('click', stopAction)

/* initial button state */
setup.removeAttribute("disabled")
start.setAttribute("disabled","disabled")
stop.setAttribute("disabled","disabled")

/* commandline arg handling */
let opts = remote.getCurrentWindow().opts
if(opts.options.input) {
    setupSelectionAction(opts.options.input)
}

if(opts.options.autostart) {
    startAction()
}

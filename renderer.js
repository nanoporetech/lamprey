// renderer.js

const zerorpc  = require("zerorpc")
const chokidar = require("chokidar")
const path     = require("path")
const electron = require('electron')
const remote   = electron.remote

let client = new zerorpc.Client()
client.connect("tcp://127.0.0.1:4242")
/*
let formula = document.querySelector('#formula')
let result = document.querySelector('#result')

formula.addEventListener('input', () => {
  client.invoke("calc", formula.value, (error, res) => {
    if(error) {
      console.error(error)
    } else {
      result.textContent = res
    }
  })
})
formula.dispatchEvent(new Event('input'))
*/

let logTranscript = document.querySelector("#log")
logTranscript.innerHTML=(new Array(10)).join("\n");
const log = (str) => {
    let tmp = logTranscript.innerHTML;
    logTranscript.innerHTML = logTranscript.innerHTML.split(/\n/).splice(1,10).join("\n") + str + "\n"
}

let stateIndicator = document.querySelector("#state")
stateIndicator.innerHTML="stopped"

let setup = document.querySelector("#setup")
let folderSelection = null
setup.addEventListener('click', () => {
    let selection=remote.dialog.showOpenDialog(null, {
	properties: ['openDirectory']
    })
    if(!selection) {
	return
    }

    folderSelection=selection
    let folder_indicator = document.querySelector("#folders")
    folder_indicator.innerHTML=folderSelection.join(",");
})

let start = document.querySelector("#start")
let watcher = null;
start.addEventListener('click', () => {
    if(!folderSelection) {
	alert("please set up a folder")
	return
    }
    console.log(folderSelection)

    let tmp = folderSelection.map(function(o) {
	return path.join(o,"**","*.fast5");
    });
    watcher = chokidar.watch(tmp, {
	depth: 2,
	ignored: /(^|[\/\\])\../
    })
	.on('all', (event, path) => {
	    log(path);
	});
    stateIndicator.innerHTML="running"
})

let stop = document.querySelector("#stop")
stop.addEventListener('click', () => {
    if(!watcher) {
	alert("already stopped")
	return
    }
    watcher.close();
    stateIndicator.innerHTML="stopped"
})

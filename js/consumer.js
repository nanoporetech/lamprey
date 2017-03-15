/*
 * Copyright (c) 2017 Oxford Nanopore Technologies Ltd.
 * Author: rmp
 */
/*global require, module */
const zerorpc  = require("zerorpc")

function Consumer(options) {
    let that          = this
    that.id           = options.id
    that.port         = options.port
    that.workChecker  = options.check
    that.workComplete = options.complete
    that.client       = new zerorpc.Client({heartbeatInterval: 20000})
    that.client.connect("tcp://127.0.0.1:" + that.port)
    that.timer        = setTimeout(() => {
	that.workTimer()	
    }, 1000)
}

Consumer.prototype.workTimer = function () {
    let that = this
    let work = that.workChecker()
    if(work) {
	that.client.invoke(work.func, work.path, work.model, (error, res) => {
	    that.workComplete(error, res, work)
            that.timer = setTimeout(() => {
		that.workTimer()
	    }, 1000)
	})
	return
    }

    that.timer = setTimeout(() => {
	that.workTimer()
    }, 5000)
}

module.exports=Consumer

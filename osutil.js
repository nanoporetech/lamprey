/* Copyright (c) 2014 Oxford Nanopore Technologies Ltd.
 * Author:          rpettett
 * Last Maintained: $Author$
 * Last Modified:   $Date$
 * Id:              $Id$
 * $HeadURL$
 * $LastChangedRevision$
 * $Revision$
 */
/*global require, module */
var childproc = require('child_process');

function osUtil(opts) {
    "use strict";

    this.log = opts.log.child({lib: "osutil"});

    return this;
}

module.exports = osUtil;
module.exports.version = '0.0.3';

osUtil.prototype = {
    uname: function (cb) {
        "use strict";

        childproc.exec("uname", function (e, stdout) { // , stderr
            var uname = stdout.replace(/\s/g, "");
            cb(e, uname);
        });
        return this;
    },

    procs: function (cb) {
        "use strict";
        this.uname(function (e, uname) {
            if (e) {
                throw "error running uname" + e;
            }

            if (uname === 'Linux') {
                childproc.exec("grep processor /proc/cpuinfo | wc -l", function (e, stdout) {
                    var procs = stdout.replace(/\s/g, "");
                    cb(e, procs);
                });

            } else if (uname === 'Darwin') {
                childproc.exec("sysctl -n hw.ncpu", function (e, stdout) {
                    var procs = stdout.replace(/\s/g, "");
                    cb(e, procs);
                });

            } else {
                throw "unsupported operating system: " + uname;
            }
        });
        return this;
    }
};

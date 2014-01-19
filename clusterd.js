var cn = require(__dirname+"/server"); 
var fs = require("fs"); 
var cluster = require("cluster"); 

if (cluster.isMaster) {
  cluster.fork();
  
  cluster.on('exit', function(worker, code, signal) {
		console.log('worker %d died (%s). restarting...',
			worker.process.pid, signal || code);
		cluster.fork();
	});
} else {
  cn.node({
		key:    fs.readFileSync('keys/server.key').toString(),
		cert:   fs.readFileSync('keys/server.crt').toString(),
		ca:     fs.readFileSync('keys/ca.crt').toString(),
	}).listen();
}


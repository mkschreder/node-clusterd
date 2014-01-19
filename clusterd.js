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
	var config = "{}"; 
	try {
		config = JSON.parse(fs.readFileSync("config.json").toString()); 
		console.log("Using config.json"); 
	} catch(e){
		config = {
			key:    fs.readFileSync('keys/server.key').toString(),
			cert:   fs.readFileSync('keys/server.crt').toString(),
			ca:     fs.readFileSync('keys/ca.crt').toString(),
		}; 
		console.log("Using default config (config.json file not found)!"); 
	}
  cn.node(config).listen();
}


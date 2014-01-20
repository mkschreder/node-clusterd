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
	var config = {
		key:    fs.readFileSync('keys/server.key').toString(),
		cert:   fs.readFileSync('keys/server.crt').toString(),
		ca:     fs.readFileSync('keys/ca.crt').toString(),
	};
	try {
		var obj = JSON.parse(fs.readFileSync("config.json").toString()); 
		Object.keys(obj).map(function(x){
			config[x] = obj[x]; 
		}); 
		console.log("Using extra fields imported from config.json!"); 
	} catch(e){
		console.log("Using default config (could not load config.json): "+e); 
	}
  cn.node(config).listen();
}


var tls = require('tls'); 
var fs = require('fs');
var JSON = require("JSON"); 
var vm = require("vm"); 
var Q = require("q"); 
var domain = require("domain"); 
var EventEmitter = require("events").EventEmitter; 
var async = require("async"); 
var child = require("child_process"); 
var os = require("os"); 

;(function(exports){
	var DEFAULT_PORT = 8191; 

	var specs = null; 
	
	function read_specs(){
		var ret = Q.defer(); 
		
		process.nextTick(function(){
			if(specs) {
				ret.resolve(specs); 
				return; 
			} 
			
			specs = {hardware: {}}; 
			var prev_cpus = specs.cpus = os.cpus(); 
			specs.totalmem = os.totalmem(); 
			
			function update(){
				specs.load = os.loadavg(); 
				specs.freemem = os.freemem(); 
				var c = os.cpus(); 
				for(var i = 0; i < c.length; i++){
					Object.keys(c[i].times).map(function(k){
						c[i].times[k] = c[i].times[k] - prev_cpus[i].times[k]; 
					});
				}
				specs.cpus = c; 
				prev_cpus = os.cpus(); 
				
				specs.cpus.map(function(x){
					var time = x.times["user"] + x.times["nice"] + x.times["sys"] + x.times["irq"]; 
					if(time+x.times["idle"] == 0) x.usage = 0; 
					else x.usage = time / (time + x.times["idle"]); 
				});
			}
			update(); 
			setInterval(update, 1000); 
			
			ret.resolve(specs); 
		}); 
		return ret.promise; 
	}
	
	read_specs(); 
	
	var Server = function(opts){
		this.options = Object.create(opts); 
		this.options.requestCert = true; 
		this.options.rejectUnauthorized = false; 
	}
	
	var exec = function(data, s){
		var work = Q.defer(); 
		
		process.nextTick(function(){
			work.promise._ee = new EventEmitter(); 
			work.promise.on = function(e, cb){
				this._ee.on(e, cb); 
			}
			work.promise.emit = function(e){
				this._ee.emit(e); 
			}
			work.on = function(e, cb){
				this.promise.on(e, cb); 
			}
			work.emit = function(e){
				this.promise.emit(e); 
			}
			//console.log("Running function: "+data.program); 
			var dom = domain.create(); 
			
			dom.on("error", function(e){
				work.reject({error: true, data: e.stack}); 
				//throw Error(e);
			}); 
			
			dom.run(function(){
				try {
					var prog = eval("("+data.program+")"); 
					s.specs = specs; 
					work.item = data.work; 
					prog(work, s); 
				} catch(e){
					throw Error("Could not run program: "+e);
					console.error(e); 
				}
			}); 
		}); 
		
		return work.promise; 
	}
	
	Server.prototype.listen = function(port){
		var self = this; 
		var ret = Q.defer(); 
		
		var server = tls.createServer(this.options, function(s) {
			var dom = domain.create(); 
			dom.on("error", function(e){
				console.log("SERVER ERROR: "+e); 
			}); 
			
			s.on("close", function(){
				console.log("[CLOSE] client disconnected"); 
				if(this.work){
					//console.log("Sending cancel event.."); 
					this.work.emit("cancel"); 
				}
			}); 
			
			dom.run(function(){
				console.log('[NEW] incoming connection from '+s.remoteAddress);
				s.setEncoding('utf8');
				//s.write(JSON.stringify({my: "message"})+"\n");
				if(s.authorized){
					var message = ""; 
					s.on('data', function(chunk) {
						
						message += chunk;

						var i = false; 
						while((i = message.indexOf("\n")) != -1){
							var data = message.slice(0, i);
							try{
								data = JSON.parse(data); 
								
								if(data.command == "ping"){
									read_specs().done(function(specs){
										s.write(JSON.stringify({success: true, data: specs}));
										s.end();  
									}); 
								} else {
									try{
										var work = exec(data, self);
										s.work = work; 
										work.progress(function(data){
											s.write(JSON.stringify({progress: true, data: data})+"\n"); 
										}).done(function accept(data){
											s.write(JSON.stringify({success: true, data: data})+"\n"); 
											s.end(); 
										}, function reject(err){
											if(typeof err == "object" && err.error == true)
												s.write(JSON.stringify({error: true, data: err.data})+"\n"); 
											else 
												s.write(JSON.stringify({reject: true, data: err})+"\n"); 
											s.end(); 
										}); 
									} catch(e){
										s.write(JSON.stringify({error: true, data: e})+"\n"); 
										s.end(); 
									}
								}
							} catch(e){
								console.error("ERROR: Server::on(data): "+e); 
							}
							message = message.slice(i + 1);
						}
						//client.write("DATA: "+data);    // Just send data back to server
					});
				} else {
					//s.write(JSON.stringify({error: true, data: "Forbidden!"})+"\n"); 
					s.end(); 
				}
				//s.pipe(s);
			}); 
		});
		server.on("error", function(){
			ret.reject(); 
		}); 
		self.options.port = parseInt(port||self.options.port||DEFAULT_PORT); 
		server.listen(self.options.port, function(){
			ret.resolve();
		});
		this._server = server; 
		
		return ret.promise; 
	}
	
	exports.node = function(opts){
		return new Server(opts); 
	}
})(exports); 

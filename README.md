clusterd - secure cluster daemon
-------

Allows distributed execution of javascript on an array of linux servers. 

Usage
-----

var clusterd = require("clusterd"); 

clusterd.node({
	key: fs.readFileSync("server.key"),
	cert: fs.readFileSync("server.cert"),
	ca: fs.readFileSync("ca.crt")
}).listen(); // will listen on default port 8191

This allows you to then on the client connect to the server using the cluster-client library also available from npm. Check out the cluster-client library for examples on how to run distributed code on your cluster. 

How to use
---------

Normally you would create a certifficate for each client that you want to allow access to the server and sign that certifficate with a common ca.key. This is done like this: 

	# generate key for the client
	openssl genrsa -des3 -out client.key 1024
	# create a signing request so we can sign the key using our common ca
	openssl req -new -key client.key -out client.csr
	---> Common Name: supply hostname for the client. If CN != hostname then client will be rejected by the server!
	# sign the client certifficate with the client key ca
	openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt -days 500
	# remove password from 
	openssl rsa -in server.key -out server.key.nopass
	mv server.key.nopass server.key
	
To generate certifficate authority key that will sign all client sertifficates do this: 
	# generate a new key
	openssl genrsa -des3 -out ca.key 4096
	# ca is self signed in this case
	openssl req -new -x509 -days 365 -key ca.key -out ca.crt

To generate the key for the server itself do this: 
	openssl genrsa -des3 -out server.key 1024
	openssl req -new -key server.key -out server.csr
	# sign with ca that is used to authenticate servers (you will have to supply server_ca.crt as "ca" parameter for each client. 
	openssl x509 -req -in server.csr -CA keys/server_ca.crt -CAkey keys/server_ca.key -CAcreateserial -out server.crt -days 500

Always make sure that Common Name == hostname that the key will be used for. Otherwise the connection can not be authorized. 

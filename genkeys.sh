DIR="$(dirname "$(readlink -f "$0")")"
cd $DIR

echo "======== GENERATING SERVER CERTIFFICATE ========"
if [ ! -d keys ]; then mkdir keys; fi
if [ ! -f keys/server.key ]; then
	openssl genrsa -out keys/server.key 1024
	openssl rsa -in keys/server.key -out keys/server.key.out
	mv keys/server.key.out keys/server.key

	openssl req -subj "/C=US/ST=Oregon/L=Portland/O=IT/CN=`hostname`" -new -key keys/server.key -out keys/server.csr

	echo "################################################"
	echo "# Please use keys/server.csr to sign the certifficate 
	# using a trusted CA and then place the resulting server.crt 
	# in 'keys' folder along with the ca.crt signed CA public 
	# certifficate. This is necessary before you can connect to 
	# this cluster node!"
	echo "################################################"
fi

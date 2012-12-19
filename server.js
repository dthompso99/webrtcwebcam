var http = require('http');
var WebSocketServer = require('websocket').server;
var connections = [];

var server = http.createServer(function(request, response) {
	console.log((new Date()) + ' Received request for ' + request.url);
	response.writeHead(404);
	response.end();
});
server.listen(7777, function() {
	console.log((new Date()) + ' Server is listening on port 7777');
});
function originIsAllowed(origin) {
	return true;
}

wsServer = new WebSocketServer({
	httpServer : server,
	autoAcceptConnections : false
});

wsServer.on('request', function(request) {
	if (!originIsAllowed(request.origin)) {
		request.reject();
		console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
		return;
	}
	console.warn("new connection");
	var connection = request.accept('vid', request.origin);
	connections.push(connection);
	connection.on('message', function(message) {
		console.warn("new message ", message.type, " data: ", message.utf8Data);
		var objMsg = JSON.parse(message.utf8Data);
		if (objMsg.channel) this.channel = objMsg.channel;
		for ( var i in connections) {
			if (connections[i] !== this && connections[i].channel == this.channel) {
				connections[i].send(message.utf8Data);
			}
		}

	});
});

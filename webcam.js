	var htmlphone = function(config) {
		this.config = config;
		this.name = config.name?config.name:"default";
		this.channel = config.channel?config.channel:"defaultchannel";
		this.remoteContainer = config.videocontainer;
		this.localStream = null;
		this.localConnection = null;
		
		this.loadStream = function() {
			var objThis = this;
			this.createSocket();
			this.localConnection = new webkitRTCPeerConnection({
				"iceServers" : [ {
					"url" : "stun:stun.l.google.com:19302"
				} ]
			});
			this.localConnection.onicecandidate = function(e) {
				if (e.candidate) {
					objThis.sendMessage({
						"type" : "iceCandidate",
						"data" : e.candidate
					});
				}
			};
			this.localConnection.onaddstream = function(stream) {
				console.warn("onaddstream (connect)", objThis.name, stream);
				objThis.startReceive(stream.label, stream.stream);
			};
			this.localConnection.onremovestream = function(stream){
				console.warn("Stream Removed!", stream, objThis.remoteContainer);
				var vid = document.getElementById(stream.label);
				vid.parentNode.removeChild(vid);
			};
		};
		this.startVideo = function(){
			var objThis = this;
			navigator.webkitGetUserMedia({
				audio : true,
				video : true
			}, function(stream) {
				console.log("getUserMedia success");
				objThis.localStream = stream;
				objThis.onVideoStarted(stream);
				
			}, function(e) {
				console.log("Failed to getUserMedia", e);
			});			
		};
		
		this.onVideoStarted = function(){
			if (this.localStream.videoTracks.length > 0)
				console.warn('Using Video device: ' + this.localStream.videoTracks[0].label);
			if (this.localStream.audioTracks.length > 0)
				console.warn('Using Audio device: ' + this.localStream.audioTracks[0].label);
			if (this.localConnection)
				this.localConnection.addStream(this.localStream);
				this.startReceive("local", this.localStream);
			
		};
		
		this.loadTabStream = function() {
			//http://dev.chromium.org/developers/design-documents/extensions/proposed-changes/apis-under-development/webrtc-tab-content-capture
			//chrome.experimental.capture.getTabMedia(integer tabId, object options, function callback);
			var tab = chrome.experimental.capture.getTabMedia(1, {}, function(a, b, c) {
				console.warn("getTabMedia", a, b, c);
			});
		};
		this.startBroadcast = function() {
			var objThis = this;
			console.warn("Adding Local Stream to peer connection");
			this.localConnection.createOffer(function(desc) {
				console.warn("createOffer", this.name, desc);
				objThis.localConnection.setLocalDescription(desc);
				objThis.sendMessage({
					"type" : "setRemoteDescription",
					"data" : desc
				});
			});
		};

		this.addIceCandidate = function(canidate) {
			var cand = new RTCIceCandidate(canidate);
			this.localConnection.addIceCandidate(cand);
		};

		this.setRemoteDescription = function(desc) {
			var objThis = this;
			console.warn("setRemoteDescription", this.name, desc);
			this.localConnection.setRemoteDescription(new RTCSessionDescription(desc), function() {
				console.warn("setRemoteDescription", objThis.name, "success");
				objThis.localConnection.createAnswer(function(desc) {
					objThis.localConnection.setLocalDescription(desc);
					objThis.sendMessage({
						"type" : "setRemoteDescription",
						"data" : desc
					});
				});
			}, function() {
				console.warn("setRemoteDescription", objThis.name, "fail");
			});

		};
		
		this.connect = function() {
			console.warn("connecting to broadcast", this.name);
			//we should fetch a list of canidates from the server first;
			var objThis = this;
			this.localConnection.createAnswer(function(desc) {
				console.warn("createAnswer: ", this.name, desc);
				objThis.localConnection.setLocalDescription(desc);
				objThis.sendMessage({
					"type" : "setRemoteDescription",
					"data" : desc
				});
			});

		};
		
		this.startReceive = function(id, stream) {
			console.warn("got remote stream", id, this.name, stream);
			var vid = document.createElement("video");
			vid.autoplay = true
			vid.width = this.config.videosize;
			vid.height = this.config.videosize;
			vid.id = stream.label;
			this.remoteContainer.appendChild(vid);
			vid.src = webkitURL.createObjectURL(stream) || stream;
		};
		
		this.end = function() {
			if (this.localConnection)
				this.localConnection.close();
			if (this.localStream){
				this.localStream.stop();
			}
		};
		
		this.sendMessage = function(objMessage) {
			objMessage.source = this.name;
			objMessage.channel = this.channel;
			this.socket.send(JSON.stringify(objMessage));
		};
		
		this.createSocket = function() {
			var objThis = this;
			this.socket = new WebSocket(this.config.socketserver, [ 'vid' ]);
			this.socket.onopen = function() {
				console.warn("Opened websocket connection", this.name);
				objThis.sendMessage({
					"msg" : "connected",
					"name" : this.name,
					"channel": this.channel
				});
			};
			
			this.socket.onerror = function(error) {
				console.warn('WebSocket Error ', error);
			};
			
			this.socket.onmessage = function(evt) {
				var data = JSON.parse(evt.data);
				switch (data.type) {
				case "iceCandidate":
					objThis.addIceCandidate(data.data);
					break;
				case "setRemoteDescription":
					objThis.setRemoteDescription(data.data);
					break;
				default:
					console.warn("unknown message type", data);
				}
			};

		};
		this._construct = function() {
			navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
			window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
		};
		this._construct();
	};
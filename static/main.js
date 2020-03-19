import Config from './config.js';

//Config constructor gets gloabals from localStorage if available
//and connects to web socket 
const CONFIG = new Config();

//globals declarations
// var display_name, current_channel, socket;
// var channels = [];


//templates
//const message_template = Handlebars.compile('<div style="font-size: 4_0px"><strong>{{ sender }}</strong>@{{ timestamp }}: {{ content }}</div>');
const channel_template = Handlebars.compile('<li>{{ channel_name }} <button class="join-button" data-channel={{ channel_name }}>Join</button></li>');
const message_template = Handlebars.compile('<div class="message"><strong>{{ sender }}</strong>@{{ timestamp }}<div>{{ content }}</div></div>');


document.addEventListener('DOMContentLoaded', () => {
	// Connect to websocket
    //socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    resizeInterface();
    addDOMListeners();
    CONFIG.socket.on('connect', () => {
    	addSocketIOListeners();
    	if (CONFIG.display_name) {
    		console.log("config loaded from localStorage")
    		console.log(CONFIG);
    		CONFIG.socket.emit('rejoin', 
    			{display_name: CONFIG.display_name, previous_client_id: CONFIG.clientID});
    	} else {
    		renderDisplayNamePrompt();
    	}
    	CONFIG.setClientID(CONFIG.socket.io.engine.id);
    });


});



function renderDisplayNamePrompt (message='') {
	bootbox.prompt({
    	title: 'Please choose your display name',
    	message: `<p style="color: red">${message}</p>`,
    	pattern:  '^[a-z0-9_-]{3,15}$',
    	closeButton: false,
    	onEscape: false,
    	callback: (res) => {
    		CONFIG.socket.emit('add user', {display_name: res});
    	}
    });
}

function addSocketIOListeners() {
	CONFIG.socket.on('user added', (data) => {
		//display_name = data['display_name'];
		//channels = data['channels'];
		CONFIG.setDisplayName(data['display_name']);
		CONFIG.setChannels(data['channels']);
		renderChannelList();
	});
	CONFIG.socket.on('add user failed', (data) => {
		console.log("failed to add user");
		renderDisplayNamePrompt(data['message']);
	});
	CONFIG.socket.on('channel added', (data) => {
		//channels.push(data['channel_name']);
		CONFIG.addChannel(data['channel_name']);
		renderChannelList();
	});
	CONFIG.socket.on('add channel failed', (data) => {
		bootbox.alert(data['message']);
	});
	CONFIG.socket.on('channel joined', (data) => {
		//current_channel = data['channel_name'];
		CONFIG.setCurrentChannel(data['channel_name']);
		renderMessages(data['messages']);
	});
	CONFIG.socket.on('send message to clients', (data) => {
  		const message_area = document.querySelector('#messages-window');
		const msg = data['message'];
		message_area.innerHTML += message_template(
				{'sender' : msg['sender'], 'timestamp' : msg['timestamp'], 'content' : msg['content']});
		document.querySelector("#main-window").scrollBy(0, 100)
	});
	CONFIG.socket.on('channel left', (data) => {
		CONFIG.setCurrentChannel(null);
		const channel_name = data['channel_name'];
		const join_button = document.querySelector(`.join-button[data-channel=${channel_name}]`);
		join_button.disabled = false;
		//document.querySelector('#messages-window').innerHTML = '<h1>Choose channel to send and receive messages.</h1>';
	});
}

function addDOMListeners() {
	//add channel
	const add_channel_btn = document.querySelector("#add-channel");
	const new_channel_input = document.querySelector("#new-channel-input")
	add_channel_btn.onclick = () => {
		const channel_name = new_channel_input.value;
		CONFIG.socket.emit('add channel', {channel_name: channel_name});
		new_channel_input.value = '';
	}

	//send message
	const send_button = document.querySelector("#send-button");
	const message_input = document.querySelector("#message-input");
	//send message if send button clicked or Enter key pressed
	send_button.onclick = sendMessage;
	message_input.onkeyup = (e) => {
		if (e.keyCode === 13)
			sendMessage();
	}

	//log out
	document.querySelector("#log-out-button").onclick = () => {
		CONFIG.clearAll();
		window.location.reload(true);
	}

	//adjust interface if window size changes
	window.onresize = () => {
		resizeInterface();
	}
}

function sendMessage() {
	const send_button = document.querySelector("#send-button");
	const message_input = document.querySelector("#message-input");

	const message = message_input.value;
	CONFIG.socket.emit('send message to server', 
		{message: message, channel: CONFIG.current_channel, display_name: CONFIG.display_name});
	message_input.value = '';
}

function resizeInterface() {

	const message_bar = document.querySelector("#message-bar");
	const message_input = document.querySelector("#message-input");
	const main_window = document.querySelector("#main-window");
	const sidebar = document.querySelector("#sidebar");
	const attach_button = document.querySelector("#attach-button");
	const send_button = document.querySelector("#send-button");

	//fill the whole screen
	sidebar.style.height = `${window.innerHeight}px`;
	main_window.style.height = `${window.innerHeight}px`;

	message_bar.style.height = `${window.innerHeight * 0.05}px`;
	main_window.style.height = `${window.innerHeight * 0.95}px`;

	message_bar.style.width = `${main_window.offsetWidth}px`;
	message_input.style.width = `${main_window.offsetWidth 
		- attach_button.offsetWidth - send_button.offsetWidth - 10}px`

	main_window.scrollTo(0, main_window.offsetHeight+1000); 
}
function renderChannelList() {
	const channel_list = document.querySelector('#channels')
	channel_list.innerHTML = '';
	CONFIG.channels.forEach(ch => {
		let channel = channel_template({'channel_name' : ch});	
		channel_list.innerHTML += channel;
		//join handler
		document.querySelectorAll('.join-button').forEach(button => {
			if (button.dataset.channel === CONFIG.current_channel)
				button.disabled = true;

			button.onclick = () => {
				//leave current channel
				if (CONFIG.current_channel)
					CONFIG.socket.emit('leave channel', {channel_name: CONFIG.current_channel, display_name: CONFIG.display_name});
				//join new channel
				CONFIG.socket.emit('join channel', 
					{channel_name: button.dataset.channel, display_name: CONFIG.display_name});
				button.disabled = true;
				}
			});

	});
}

function renderMessages(messages) {
	const message_area = document.querySelector('#messages-window');
	message_area.innerHTML = '';
	messages.forEach(msg => {
		message_area.innerHTML += message_template(
				{'sender' : msg['sender'], 'timestamp' : msg['timestamp'], 'content' : msg['content']});
	});
	let main_window = document.querySelector("#main-window");
	main_window.scrollTo(0, main_window.offsetHeight+1000); 
}

import Globals from './config.js';

//Config constructor gets gloabals from localStorage if available
//and connects to web socket 
const GLOBALS = new Globals();

//globals declarations
// var display_name, current_channel, socket;
// var channels = [];


//templates
//const message_template = Handlebars.compile('<div style="font-size: 4_0px"><strong>{{ sender }}</strong>@{{ timestamp }}: {{ content }}</div>');
//const channel_template = Handlebars.compile('<li>{{ channel_name }} <button class="join-button btn-sm btn-primary" data-channel={{ channel_name }}>Join</button></li>');
const channel_template = Handlebars.compile('<li class="channel" data-channel={{ channel_name }}><span class="channel-name-btn" data-channel={{ channel_name }}>{{ channel_name }} </span><img class="icon join-ch-icon" src="static/icons/user-plus.svg" alt="join channel" data-channel={{ channel_name }}><img class="icon leave-ch-icon" src="static/icons/user-minus.svg" alt="leave channel" data-channel={{ channel_name }}></li>');
const message_template = Handlebars.compile('<div class="message"><strong>{{ sender }}</strong>@{{ timestamp }}<div>{{ content }}</div></div>');
const user_template = Handlebars.compile('<li data-user={{ display_name }}>{{ display_name }} <img class="icon priv-msg-icon" src="static/icons/message-dots.svg" alt="send priv msg"></li>');


document.addEventListener('DOMContentLoaded', () => {
	// Connect to websocket
    //socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    resizeInterface();
    addDOMListeners();
    GLOBALS.socket.on('connect', () => {
    	addSocketIOListeners();
    	if (GLOBALS.display_name) {
    		console.log(GLOBALS);
    		GLOBALS.socket.emit('add user', {display_name: GLOBALS.display_name, token: GLOBALS.token});
    	} else {
    		renderDisplayNamePrompt();
    	}
    	
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
    		GLOBALS.socket.emit('add user', {display_name: res});
    	}
    });
}

function addSocketIOListeners() {
	GLOBALS.socket.on('user added', (data) => {
		//display_name = data['display_name'];
		//channels = data['channels'];
		GLOBALS.setDisplayName(data['user']['display_name']);
		GLOBALS.setUserToken(data['user']['token'])
		GLOBALS.setJoinedChannels(data['user']['joined_channels']);
		GLOBALS.setChannels(data['channels']);
		renderChannelList();
		if (GLOBALS.current_channel)
			GLOBALS.socket.emit('load channel', {channel_name: GLOBALS.current_channel});
	});
	GLOBALS.socket.on('add user failed', (data) => {
		console.log("failed to add user");
		renderDisplayNamePrompt(data['message']);
	});
	GLOBALS.socket.on('channel added', (data) => {
		//channels.push(data['channel_name']);
		GLOBALS.addChannel(data['channel_name']);
		renderChannelList();
	});
	GLOBALS.socket.on('add channel failed', (data) => {
		bootbox.alert(data['message']);
	});
	GLOBALS.socket.on('channel joined', (data) => {
		//current_channel = data['channel_name'];
		const channel_name = data['channel_name'];
		GLOBALS.setCurrentChannel(channel_name);
		renderMessages(data['messages']);
		document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.add("joined-channel");
		GLOBALS.socket.emit('load channel', {channel_name: channel_name});
	});
	GLOBALS.socket.on('send message to clients', (data) => {
		console.log("rec msg from server");
  		const message_area = document.querySelector('#messages-window');
		const msg = data['message'];
		message_area.innerHTML += message_template(
				{'sender' : msg['sender'], 'timestamp' : msg['timestamp'], 'content' : msg['content']});
		document.querySelector("#main-window").scrollBy(0, 1000)
	});
	GLOBALS.socket.on('channel left', (data) => {
		GLOBALS.setCurrentChannel(null);
		const channel_name = data['channel_name'];
		document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.remove("joined-channel", 'current-channel');
		document.querySelector('#messages-window').innerHTML = '<h1>Choose channel to send and receive messages.</h1>';
	});
	GLOBALS.socket.on('channel loaded', (data) => {
		const channel_name = data['channel_name'];
		GLOBALS.setCurrentChannel(channel_name);
		renderMessages(data['messages']);
		const current_channel = document.querySelector(`li.current-channel`);
		if (current_channel)
			current_channel.classList.remove("current-channel");
		document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.add("current-channel");
		// const leave_icon = document.querySelector(`.leave-ch-icon[data-channel=${channel_name}]`);
		// leave_icon.parentNode.style.color = '#ff6b6b';
	});
		GLOBALS.socket.on('load channel failed', (data) => {
			bootbox.alert(data['message']);
	});
	GLOBALS.socket.on('announce users', (data) => {
		console.log('announce users received by client: ' + data['users']);
		const online_list = document.querySelector('#online-list');
		online_list.innerHTML = '';
		data['users'].forEach(display_name => {
			const user = user_template({display_name: display_name});
			online_list.innerHTML += user;
		})
	});
}

function addDOMListeners() {
	//add channel
	const add_channel_btn = document.querySelector("#add-channel");
	const new_channel_input = document.querySelector("#new-channel-input")
	add_channel_btn.onclick = () => {
		const channel_name = new_channel_input.value;
		GLOBALS.socket.emit('add channel', {channel_name: channel_name});
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
		GLOBALS.clearAll();
		window.location.reload(true);
	}

	//adjust interface if window size changes
	window.onresize = () => {
		resizeInterface();
	}
}

function sendMessage() {
	console.log("sending mesage");
	console.log(GLOBALS);
	const send_button = document.querySelector("#send-button");
	const message_input = document.querySelector("#message-input");

	const message = message_input.value;
	GLOBALS.socket.emit('send message to server', 
		{message: message, channel: GLOBALS.current_channel, display_name: GLOBALS.display_name});
	message_input.value = '';
}

function resizeInterface() {

	const message_bar = document.querySelector("#message-bar");
	const message_input = document.querySelector("#message-input");
	const main_window = document.querySelector("#main-window");
	const sidebar = document.querySelector("#sidebar");
	const attach_button = document.querySelector("#attach-button");
	const send_button = document.querySelector("#send-button");

	const new_channel_input = document.querySelector("#new-channel-input");

	//fill the whole screen
	sidebar.style.height = `${window.innerHeight}px`;
	main_window.style.height = `${window.innerHeight}px`;

	message_bar.style.height = `${window.innerHeight * 0.05}px`;
	main_window.style.height = `${window.innerHeight * 0.95}px`;

	message_bar.style.width = `${main_window.offsetWidth}px`;
	message_bar.style.left = `${sidebar.offsetWidth}px`;
	message_input.style.width = `${main_window.offsetWidth
		- attach_button.offsetWidth - send_button.offsetWidth - 10}px`;

	new_channel_input.style.width = '80%';

	main_window.scrollTo(0, main_window.offsetHeight+1000); 
}
function renderChannelList() {
	const channel_list = document.querySelector('#channels')
	channel_list.innerHTML = '';
	GLOBALS.channels.forEach(ch => {
		let channel = channel_template({'channel_name' : ch});	
		channel_list.innerHTML += channel;
		
		if (GLOBALS.current_channel === ch)
			document.querySelector(`li.channel[data-channel=${ch}]`).classList.add("current-channel");

		if (GLOBALS.joined_channels.includes(ch))
			document.querySelector(`li.channel[data-channel=${ch}]`).classList.add("joined-channel");

		//join handler
		document.querySelectorAll('.join-ch-icon').forEach(icon => {
			// if (GLOBALS.joined_channels.includes(icon.dataset.channel))
			// 	icon.hidden = true;

			icon.onclick = () => {
				const channel_name = icon.dataset.channel;
				GLOBALS.addJoinedChannel(channel_name);
				GLOBALS.socket.emit('join channel', 
					{channel_name: channel_name, display_name: GLOBALS.display_name, token: GLOBALS.token});
				document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.add("joined-channel");
				}
			});

		//leave handler 
		document.querySelectorAll('.leave-ch-icon').forEach(icon => {
			const channel_name = icon.dataset.channel;
			icon.onclick = () => {
				GLOBALS.LeaveChannel(channel_name);
				GLOBALS.socket.emit('leave channel', {channel_name: channel_name, display_name: GLOBALS.display_name, token: GLOBALS.token});
				document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.remove("joined-channel");
				}
			});

		//load channel handler
		document.querySelectorAll('.channel-name-btn').forEach(btn => {
			const channel_name = btn.dataset.channel;
			//GLOBALS.setCurrentChannel(channel_name)
			btn.onclick = () => {
				console.log("channel name clicked");
				GLOBALS.socket.emit('load channel', {channel_name: channel_name});
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

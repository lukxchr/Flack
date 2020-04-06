import Globals from './config.js';
import {channel_template, message_template, user_template, priv_window_template} from './templates.js'

//init: try to load user from localStorage - if failed ask for new display name. Add DOM/socket.io listerners 
const GLOBALS = new Globals();
document.addEventListener('DOMContentLoaded', () => {
    addDOMListeners();
    GLOBALS.socket.on('connect', () => {
    	addSocketIOListeners();
    	if (GLOBALS.display_name) {
    		GLOBALS.socket.emit('add user', {display_name: GLOBALS.display_name, token: GLOBALS.token});
    	} else {
    		renderDisplayNamePrompt();
    	}
    });
});

function addSocketIOListeners() {
	GLOBALS.socket.on('user added', (data) => {
		//update globals
		GLOBALS.setDisplayName(data['user']['display_name']);
		GLOBALS.setUserToken(data['user']['token']);
		GLOBALS.setJoinedChannels(data['user']['joined_channels']);
		GLOBALS.setChannels(data['channels']);

		renderChannelList();
		//handle the case where user was removed from the channel on server side 
		if (!GLOBALS.joined_channels.includes(GLOBALS.current_channel)) {
			GLOBALS.setCurrentChannel(null);
		} else if (GLOBALS.current_channel)
			GLOBALS.socket.emit('load channel', {channel_name: GLOBALS.current_channel});
	});
	GLOBALS.socket.on('add user failed', (data) => {
		renderDisplayNamePrompt(data['message']);
	});
	GLOBALS.socket.on('channel added', (data) => {
		GLOBALS.addChannel(data['channel_name']);
		renderChannelList();
	});
	GLOBALS.socket.on('add channel failed', (data) => {
		bootbox.alert(data['message']);
	});
	GLOBALS.socket.on('channel joined', (data) => {
		const channel_name = data['channel_name'];
		GLOBALS.setCurrentChannel(channel_name);
		renderMessages(data['messages']);
		document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.add("joined-channel");
		GLOBALS.socket.emit('load channel', {channel_name: channel_name});
	});
	GLOBALS.socket.on('send message to clients', (data) => {
  		const message_area = document.querySelector('#messages-window');
		const msg = data['message'];
		message_area.innerHTML += message_template(
				{'sender' : msg['sender'], 'timestamp' : msg['timestamp'].slice(11,16), 'content' : msg['content'], 
				priv_btn: (GLOBALS.display_name != msg['sender'] && msg['sender'] !== 'admin') });
		message_area.scrollBy(0, message_area.scrollHeight);
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
	});
		GLOBALS.socket.on('load channel failed', (data) => {
			bootbox.alert(data['message']);
	});
	GLOBALS.socket.on('announce users', (data) => {
		renderOnlineUsersList(data['users']);
	});
	GLOBALS.socket.on('send priv message to clients', (data) => {
		const sender = data['message']['sender'];
		const receiver = data['receiver'];
		const message = message_template(
				{sender: sender, timestamp: data['message']['timestamp'].slice(11,16), content: data['message']['content'],
				priv_btn: false});

		let priv_window;
		if (GLOBALS.display_name === sender) {
			priv_window = document.querySelector(`.priv-msg-container[data-receiver=${receiver}]`);
		} else if (GLOBALS.display_name === receiver) {
			priv_window = document.querySelector(`.priv-msg-container[data-receiver=${sender}]`);
			if (!priv_window) {
				renderPrivateWindow(sender);
				priv_window = document.querySelector(`.priv-msg-container[data-receiver=${sender}]`);
			}
		}
		let message_area = priv_window.querySelector('.priv-messages-area');
		message_area.innerHTML += message;	
		message_area.scrollBy(0, message_area.scrollHeight);
	});
}

function addDOMListeners() {
	//button click listeners
	document.addEventListener('click', (e) => {
		if (e.target.matches('#send-button')) {
			sendMessage();
		} else if (e.target.matches('.close-icon')) {
			const priv_window = e.target.closest('.priv-msg-container');
			priv_window.parentNode.removeChild(priv_window);
		} else if (e.target.matches('.priv-send-msg-icon')) {
			sendPrivateMessage(e.target.dataset.receiver);
		} else if (e.target.matches('#add-channel')) {
			addChannel();
		} else if (e.target.matches('.priv-msg-icon')) {
			renderPrivateWindow(e.target.dataset.receiver);
		} else if (e.target.matches('.channel-name-btn')) {
			const channel_name = e.target.dataset.channel;
			if (!GLOBALS.joined_channels.includes(channel_name)) 
				bootbox.alert('You need to join the channel before viewing it.');
			else 
				GLOBALS.socket.emit('load channel', {channel_name: channel_name});
		} else if (e.target.matches('.join-ch-icon')) {
			const channel_name = e.target.dataset.channel;
			GLOBALS.addJoinedChannel(channel_name);
			GLOBALS.socket.emit('join channel', 
				{channel_name: channel_name, display_name: GLOBALS.display_name, token: GLOBALS.token});
			document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.add("joined-channel");
		} else if (e.target.matches('.leave-ch-icon')) {
			const channel_name = e.target.dataset.channel;
			GLOBALS.leaveChannel(channel_name);
			GLOBALS.socket.emit('leave channel', {channel_name: channel_name, display_name: GLOBALS.display_name, token: GLOBALS.token});
			document.querySelector(`li.channel[data-channel=${channel_name}]`).classList.remove("joined-channel");
		} else if (e.target.matches('#log-out-button')) {
			GLOBALS.clearAll();
			window.location.reload(true);
		} 
	});
	//keyboard event listeners
	document.addEventListener('keyup', (e) => {
		//listen only to Enter
		if (e.keyCode !== 13) return;
		if (e.target.matches('#message-input')) {
			sendMessage();
		} else if (e.target.matches('.priv-msg-input')) {
			const priv_window = e.target.closest('.priv-msg-container');
			sendPrivateMessage(priv_window.dataset.receiver);
		} else if (e.target.matches('#new-channel-input')) {
			addChannel();
		} 
	});
}

/*
function for loading UI and other helper functions 
*/

function sendMessage() {
	const send_button = document.querySelector("#send-button");
	const message_input = document.querySelector("#message-input");
	const message = message_input.value;
	GLOBALS.socket.emit('send message to server', 
		{message: message, channel: GLOBALS.current_channel, display_name: GLOBALS.display_name});
	message_input.value = '';
}

function sendPrivateMessage(receiver) {
	const priv_window = document.querySelector(`.priv-msg-container[data-receiver=${receiver}]`);
	const message_input = priv_window.querySelector('.priv-msg-input');
	GLOBALS.socket.emit('send priv message to server', 
		{message: message_input.value, sender: GLOBALS.display_name, receiver: receiver, token: GLOBALS.token});
	message_input.value = '';
}

function addChannel() {
	const new_channel_input = document.querySelector("#new-channel-input")
	const channel_name = new_channel_input.value;
	GLOBALS.socket.emit('add channel', {channel_name: channel_name});
	new_channel_input.value = '';
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
	});
}

function renderOnlineUsersList(users) {
	const online_list = document.querySelector('#online-list');
	online_list.innerHTML = '';
	users.forEach(display_name => {
		const user = user_template({display_name: display_name, priv_btn: display_name != GLOBALS.display_name});
		online_list.innerHTML += user;
	});
}

function renderPrivateWindow(receiver) {
	const priv_window = priv_window_template({display_name: receiver});
	document.querySelector('#priv-messages').innerHTML += priv_window;
	$(`.priv-msg-container[data-receiver=${receiver}]`).draggable();
}

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

function renderMessages(messages) {
	const message_area = document.querySelector('#messages-window');
	message_area.innerHTML = '';
	messages.forEach(msg => {
		message_area.innerHTML += message_template(
				{'sender' : msg['sender'], 'timestamp' : msg['timestamp'].slice(11,16), 'content' : msg['content'],
				priv_btn: (GLOBALS.display_name != msg['sender'] && msg['sender'] !== 'admin')});
	});
	message_area.scrollBy(0, message_area.scrollHeight); 
}
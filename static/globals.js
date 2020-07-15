export default class {
	constructor() {
		this.display_name = localStorage.getItem('display_name');
		this.channels = JSON.parse(localStorage.getItem('channels'));
		if (!this.channels) { this.channels = []; } //if channels is null, change to empty array
		this.joined_channels = JSON.parse(localStorage.getItem('joined_channels'));
		if (!this.joined_channels) { this.joined_channels = []; } //if null, change to empty array
		this.current_channel = localStorage.getItem('current_channel');
		this.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
		this.token = localStorage.getItem('token');
	}
	setDisplayName (display_name) {
		this.display_name = display_name;
		localStorage.setItem('display_name', display_name);
	}
	setChannels(channels) {
		this.channels = channels;
		localStorage.setItem('channels', JSON.stringify(channels));
	}
	addChannel(channel) {
		this.channels.push(channel);
		localStorage.setItem('channels', JSON.stringify(this.channels));
	}
	setJoinedChannels(joined_channels) {
		this.joined_channels = joined_channels;
		localStorage.setItem('joined_channels', JSON.stringify(joined_channels));
	}
	addJoinedChannel(channel) {
		this.joined_channels.push(channel);
		localStorage.setItem('joined_channels', JSON.stringify(this.joined_channels));
	}
	leaveChannel(channel) {
		this.joined_channels = this.joined_channels.filter(x => x != channel);
	}
	setCurrentChannel(current_channel) {
		this.current_channel = current_channel;
		localStorage.setItem('current_channel', current_channel);
	}
	setUserToken (token) {
		this.token = localStorage.setItem('token', token);
	}
	clearAll() {
		this.display_name = null;
		this.channels = []
		this.current_channel = null;
		this.token = null;
		localStorage.clear();
	}
}


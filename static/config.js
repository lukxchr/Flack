export default class {
	constructor() {
		this.display_name = localStorage.getItem('display_name');
		this.channels = JSON.parse(localStorage.getItem('channels'));
		if (!this.channels) { this.channels = []; } //if channels is null, change to empty array
		this.current_channel = localStorage.getItem('current_channel');
		this.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
	}
	setDisplayName (display_name) {
		this.display_name = display_name;
		localStorage.setItem('display_name', display_name);
	}
	setChannels(channels) {
		console.log("set channels called: " + channels);
		this.channels = channels;
		localStorage.setItem('channels', JSON.stringify(channels));
	}
	setCurrentChannel(current_channel) {
		this.current_channel = current_channel;
		localStorage.setItem('current_channel', current_channel);
	}
}


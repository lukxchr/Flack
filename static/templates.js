export const channel_template = Handlebars.compile(`
	<li class="channel" data-channel={{ channel_name }}>
		<span class="channel-name-btn" data-channel={{ channel_name }}>#{{ channel_name }} </span>
		<img class="icon join-ch-icon" src="static/icons/user-plus.svg" 
		alt="join channel" data-channel={{ channel_name }}>
		<img class="icon leave-ch-icon" src="static/icons/user-minus.svg" 
		alt="leave channel" data-channel={{ channel_name }}>
	</li>`);

export const message_template = Handlebars.compile(`
	<div class="message">
		<strong>
			{{ sender }}
			{{#if priv_btn}}
			<img class="icon priv-msg-icon" src="static/icons/message-dots.svg" 
			alt="send priv msg" data-receiver={{ sender }}>
			{{/if}}
		</strong>
		@{{ timestamp }}
		<div>{{ content }}</div>
	</div>`);

export const user_template = Handlebars.compile(`
	<li data-user={{ display_name }}>{{ display_name }} 
		{{#if priv_btn}}
		<img class="icon priv-msg-icon" src="static/icons/message-dots.svg" 
		alt="send priv msg" data-receiver={{ display_name }}>
		{{/if}}
	</li>`);

export const priv_window_template = Handlebars.compile(`
	<div class="priv-msg-container" data-receiver={{ display_name }}>
		<div class="priv-header">
			<strong>~{{ display_name }}</strong>
			<img class="icon close-icon" src="static/icons/x.svg" alt="close priv">
		</div>
		<div class="priv-body">
			<div class="priv-messages-area"></div>
			<div class="priv-message-bar">
				<input type="text" class="priv-msg-input" placeholder="Your message...">
				<img id="priv-send-button" class="icon priv-send-msg-icon" src="static/icons/send.svg" 
				alt="send priv message" data-receiver={{ display_name }}>
			</div>
		</div>
	</div>`);
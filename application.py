import os
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from string import ascii_lowercase, digits
import re
from random import choices
from models import Channel, Message

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app, always_connect=False)

users = set()
client_ids = {} #client id : display name
channels = []

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("add user")
def add_user(data):
	display_name = data['display_name']
	if display_name in users:
		emit("add user failed", {'display_name' : display_name, 
			'message' : 'This display name is already in use'})
	elif not re.match('^[a-z0-9_-]{3,15}$', display_name):
		emit("add user failed", {'display_name' : display_name, 
			'message' : 'Invalid display name. Please use between 3 and 15 (letters, digits, _ or -)'})
	else:
		users.add(display_name)
		client_ids[request.sid] = display_name
		emit("user added", {'display_name' : display_name, 
			'channels' : [ch.name for ch in channels]})

@socketio.on('add channel')
def add_channel(data):
	channel_name = data['channel_name']
	if channel_name in channels:
		emit('add channel failed', 
			{'channel_name' : channel_name, 'message': 'Channel already exists. Please choose a different name.'})
	elif not channel_name.isalnum():
		emit('add channel failed', 
			{'channel_name' : channel_name, 'message': 'Invalid channel name. Please use letrers and digits only.'})
	elif len(channel_name) > 20:
		emit('add channel failed', 
			{'channel_name' : channel_name, 'message': 'Channel name too long. Please use up to 20 characters.'})
	else:
		channels.append(Channel(channel_name))
		emit('channel added', {'channel_name' : channel_name}, broadcast=True)

@socketio.on('join channel')
def join_channel(data):
	channel_name = data["channel_name"]
	join_room(channel_name)
	channel = next(ch for ch in channels if ch == channel_name)
	channel.add_user(data['display_name'])
	#print([m.serialize() for m in channel.messages])
	emit('channel joined', 
		{'messages': [m.serialize() for m in channel.messages], 
		'channel_name' : channel_name})

@socketio.on('leave channel')
def leave_channel(data):
	print("leave_channel called on server")
	channel_name = data["channel_name"]
	leave_room(channel_name)
	channel = next(ch for ch in channels if ch == channel_name)
	channel.remove_user(data['display_name'])
	emit('channel left', {'channel_name': channel_name})

@socketio.on('send message to server')
def send_message(data):
	message_text = data['message']
	channel_name = data['channel']
	sender = data['display_name']
	message = Message(message_text, sender)

	channel = next(ch for ch in channels if ch == channel_name)
	channel.add_message(message)

	emit('send message to clients', {'message' : message.serialize()}, 
		room=channel_name, broadcast=True)

@socketio.on('rejoin')
def rejoin(data):
	display_name = data['display_name']
	prev_id = data['previous_client_id']
	prev_display_name = client_ids.get(prev_id)
	if display_name in users and prev_display_name != display_name:
		emit("add user failed", {'display_name' : display_name, 
			'message' : 'Authentication failed. Please use a different display name'})
	else:
		emit("user added", {'display_name' : display_name, 
			'channels' : [ch.name for ch in channels]})
		joined_channels = [ch for ch in channels if display_name in ch.users]
		for ch in joined_channels:
			leave_room(ch.name, sid=prev_id)
			join_room(ch.name)
			emit('channel joined', {'messages': [m.serialize() for m in ch.messages], 'channel_name' : ch.name})




@socketio.on("connect")
def connect():
    print('client connected ' + request.sid)
    return True
 
@socketio.on('disconnect')
def disconnect():
	print(f"{request.sid} disconnected")
	display_name = client_ids.get(request.sid)
	users.discard(display_name)
	joined_channels = [ch for ch in channels if display_name in ch.users]
	for ch in joined_channels:
		ch.remove_user(display_name)

if __name__ == '__main__':
	socketio.run(app, debug=True)


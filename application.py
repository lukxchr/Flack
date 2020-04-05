import os
from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from string import ascii_lowercase, digits
import re
from random import choices
from models import Channel, Message, User

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app, always_connect=False)


users = []
channels = []
private_channels = []

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("add user")
def add_user(data):
	display_name = data['display_name']
	token = data.get('token')
	user = next((user for user in users if user.display_name == display_name), None)
	#user rejoins
	if token and user:
		if user.token != token:
			emit('add user failed', {'display_name' : display_name, 
				'message' : f'Failed to authenticate. Please choose a different display name.'})
		else:
			user.update_token(request.sid)
			for ch in user.joined_channels:
				join_room(ch.name)
			emit("user added", {'user' : user.serialize(), 
				'channels' : [ch.name for ch in channels]})
			emit('announce users', {'users' : [user.display_name for user in users]}, broadcast=True)
			join_room(request.sid)
	#new user
	else:
		if display_name in users:
			emit("add user failed", {'display_name' : display_name, 
				'message' : 'This display name is already in use'})
		elif not re.match('^[a-z0-9_-]{3,15}$', display_name):
			emit("add user failed", {'display_name' : display_name, 
				'message' : 'Invalid display name. Please use between 3 and 15 (letters, digits, _ or -)'})
		else: 
			user = User(display_name, request.sid)
			users.append(user)
			emit("user added", {'user' : user.serialize(), 
				'channels' : [ch.name for ch in channels]})
			emit('announce users', {'users' : [user.display_name for user in users]}, broadcast=True)
			join_room(request.sid)

@socketio.on('add channel')
def add_channel(data):
	channel_name = data['channel_name']
	if channel_name in channels:
		emit('add channel failed', 
			{'channel_name' : channel_name, 'message': 'Channel already exists. Please choose a different name.'})
	elif not channel_name.isalnum():
		emit('add channel failed', 
			{'channel_name' : channel_name, 'message': 'Invalid channel name. Please use letters and digits only.'})
	elif len(channel_name) > 20:
		emit('add channel failed', 
			{'channel_name' : channel_name, 'message': 'Channel name too long. Please use up to 20 characters.'})
	else:
		channels.append(Channel(channel_name))
		emit('channel added', {'channel_name' : channel_name}, broadcast=True)



@socketio.on('join channel')
def join_channel(data):
	channel_name = data["channel_name"]
	#display_name = data['display_name']
	join_room(channel_name)
	channel = next(ch for ch in channels if ch == channel_name)
	user = next(user for user in users if user.token == request.sid)
	user.join_channel(channel)
	#print([m.serialize() for m in channel.messages])
	#message = Message(f'{display_name} has joined', 'admin')
	send_message({'message' : f'{user.display_name} has joined', 'channel' : channel_name, 'display_name' : 'admin'})

	emit('channel joined', 
		{'messages': [m.serialize() for m in channel.messages], 
		'channel_name' : channel_name})

@socketio.on('leave channel')
def leave_channel(data):
	print("leave_channel called on server")
	channel_name = data["channel_name"]
	leave_room(channel_name)
	channel = next(ch for ch in channels if ch == channel_name)
	user = next(user for user in users if user.token == request.sid)
	user.leave_channel(channel)
	send_message({'message' : f'{user.display_name} has left', 'channel' : channel_name, 'display_name' : 'admin'})
	emit('channel left', {'channel_name': channel_name})

@socketio.on('load channel')
def load_channel(data):
	channel_name = data['channel_name']
	channel = next((ch for ch in channels if ch == channel_name), None)
	if channel:
		emit('channel loaded', {'channel_name' : channel_name, 'messages' : [m.serialize() for m in channel.messages]})
	else: 
		emit('load channel failed', {'channel_name' : channel_name, 'message' : 'Channel does not exist'})

@socketio.on('send message to server')
def send_message(data):
	print("send msg tos erver called ", data)
	message_text = data['message']
	channel_name = data['channel']
	sender = data['display_name']
	message = Message(message_text, sender)

	channel = next(ch for ch in channels if ch == channel_name)
	channel.add_message(message)

	emit('send message to clients', {'message' : message.serialize()}, 
		room=channel_name, broadcast=True)

@socketio.on('send priv message to server')
def send_priv_message(data):
	print(f'send_priv_message: {data}')
	sender = next((user for user in users if user == data['sender']), None)
	receiver = next((user for user in users if user == data['receiver']), None)
	if sender and receiver:
		message = Message(data['message'], sender.display_name)
		emit('send priv message to clients', {'message': message.serialize(), 
			'receiver' : receiver.display_name},
			room=receiver.token)
		emit('send priv message to clients', {'message': message.serialize(), 
			'receiver' : receiver.display_name},
			room=sender.token)
	else:
		print(f'priv message failed s{sender} / r{receiver}')



@socketio.on("connect")
def connect():
    print('client connected ' + request.sid)
    return True
 
@socketio.on('disconnect')
def disconnect():
	print(f"{request.sid} disconnected")
	user = next((user for user in users if user.token == request.sid), None)
	if user:
		for ch in user.joined_channels:
			send_message({'message' : f'{user.display_name} has left', 'channel' : ch.name, 'display_name' : 'admin'})
		users.remove(user)
		emit('announce users', {'users' : [user.display_name for user in users]}, broadcast=True)




if __name__ == '__main__':
	socketio.run(app, debug=True)


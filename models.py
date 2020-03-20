from collections import namedtuple 
from collections import deque
from datetime import datetime

class Channel():
	def __init__(self, name):
		self.name = name
		self.messages = deque(maxlen=100)
		self.users = set()
	def add_user(self, display_name):
		self.users.add(display_name)
		#message = Message(f"{display_name} has joined", "admin")
		#self.messages.append(message)
	def remove_user(self, display_name):
		self.users.discard(display_name)
		#message = Message(f"{display_name} has left", "admin")
		#self.messages.append(message)
	def add_message(self, message):
		self.messages.append(message)
	def __eq__(self, other):
		if type(other) == str:
			return self.name == other
		else:
			return self.name == other.name 
	def __repr__(self):
		return f"Channel: {self.name} | # users: {len(self.users)} | # messages: {len(self.messages)}"


class Message():
	def __init__(self, content, sender, timestamp=datetime.utcnow()):
		self.content = content
		self.sender = sender
		self.timestamp = timestamp
	def serialize(self):
		return {"content" : self.content, "sender" : self.sender, "timestamp" : str(self.timestamp)}



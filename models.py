from collections import deque
from datetime import datetime


class User():

    def __init__(self, display_name, token):
        self.display_name = display_name
        self.token = token
        self.joined_channels = []

    def join_channel(self, channel):
        if channel in self.joined_channels:
            raise Exception(f'User {self.display_name} \
                already in channel {channel.name}')
        self.joined_channels.append(channel)

    def leave_channel(self, channel):
        try:
            self.joined_channels.remove(channel)
        except:
            raise Exception(f'User {self.display_name} \
                not in channel {channel.name}')

    def update_token(self, token):
        self.token = token

    def serialize(self):
        return {'display_name' : self.display_name, 'token': self.token,
                'joined_channels' : [ch.name for ch in self.joined_channels]}

    def __eq__(self, other):
        if isinstance(other, str):
            return self.display_name == other
        else:
            return self.display_name == other.display_name


class Channel():
    def __init__(self, name):
        self.name = name
        self.messages = deque(maxlen=100)

    def add_message(self, message):
        self.messages.append(message)

    def __eq__(self, other):
        if isinstance(other, str):
            return self.name == other
        else:
            return self.name == other.name

    def __repr__(self):
        return f"Channel: {self.name} | # messages: {len(self.messages)}"


class Message():
    def __init__(self, content, sender, timestamp=datetime.utcnow()):
        self.content = content
        self.sender = sender
        self.timestamp = timestamp

    def serialize(self):
        return {"content" : self.content, "sender" : self.sender,
                "timestamp" : str(self.timestamp)}

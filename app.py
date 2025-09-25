from flask import Flask

app = Flask(__name__)
app.secret_key = 'your_super_secret_key_here'

# This file now only creates the app. The routes are in routes.py
# and this file will be run by a professional server (Gunicorn).
from routes import *

# Note: We have removed the if __name__ == '__main__': block.
# The production server will run the 'app' object directly.


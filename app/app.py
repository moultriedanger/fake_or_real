from flask import Flask, request, render_template
from flask_cors import CORS
import requests
import os
import librosa
import io


app = Flask(__name__)
CORS(app)

@app.route("/")
def render_home():
    return render_template('index.html')

data_path = '/Users/moultriedangerfield/Desktop/fake_or_real/data'

@app.route("/upload", methods=["POST"])
def hello_world():
    file_content = ''
    if 'myFile' in request.files:
        file = request.files['myFile']
        if file:

            #save the audio
            file_path = os.path.join(data_path, file.filename)
            file.save(file_path)

            #process audio
            sr, duration = process_audio(file_path)

            file_content = "File written. Duration: " + str(duration) + " seconds. Sample rate: " + str(sr)
        else:
            file_content = 'No file selected'
    else:
        file_content = 'No file part in the request.'

    return render_template('index.html', file_content=file_content)

def process_audio(file_path):
    # Load the audio file directly from the file path
    y, sr = librosa.load(file_path, sr=None)  # sr=None to preserve the original sample rate
    
    # Calculate the duration
    duration = librosa.get_duration(y=y, sr=sr)
    
    return sr, duration
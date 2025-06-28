from flask import Flask, request, render_template
from flask_cors import CORS
import requests, jsonify
import os
import librosa
import io
import tensorflow as tf
import numpy as np


m = tf.keras.models.load_model('../app/model/my_model.h5')

data_path = '/Users/moultriedangerfield/Desktop/fake_or_real/data'

app = Flask(__name__)
CORS(app)

@app.route("/")
def render_home():
    return render_template('index.html')

# @app.route("/upload_rec", methods=["POST"])
# def result():
#     if 'file' in request.files:  # This matches the 'file' key used in your frontend
#         file = request.files['file']  # Access the uploaded file
#         if file:
#             # Save the audio
#             file_path = os.path.join(data_path, file.filename)  # Save the file to your specified directory
#             file.save(file_path)  # Save the file locally

#             processed = process_audio_file(file_path)

#             prediction = m.predict(processed)

#             silent_input = np.zeros((1, 40, 220, 1), dtype='float32')
#             print("Prediction for silence:", m.predict(silent_input))
            
#             #Interpret results
#             if prediction[0][0] > prediction[0][1]:
#                 result = 'Fake'
#                 confidence_level = prediction[0][0]
#             else:
#                 result = 'Real'
#                 confidence_level = prediction[0][1]

#             message = "Upload sucess! Audio clip predicted as " + str(result) + " " + "with confidence of " + str(confidence_level)


@app.route("/test_silence")
def test_silence():
    silent_input = np.zeros((1, 40, 220, 1), dtype='float32')
    prediction = m.predict(silent_input)
    return f"Prediction for silence: {prediction.tolist()}"

@app.route("/upload_rec", methods=["POST"])
def result():
    if 'file' in request.files:
        file = request.files['file']
        if file:
            file_path = os.path.join(data_path, file.filename)
            file.save(file_path)

            processed = process_audio_file(file_path)

            # 🔍 TEST: what does the model predict for silence?
            silent_input = np.zeros((1, 40, 220, 1), dtype='float32')
            print("Prediction for silence:", m.predict(silent_input))

            prediction = m.predict(processed)

            if prediction[0][0] > prediction[0][1]:
                result = 'Fake'
                confidence_level = prediction[0][0]
            else:
                result = 'Real'
                confidence_level = prediction[0][1]

            message = "Upload success! Audio clip predicted as " + str(result) + " with confidence of " + str(confidence_level)
            return message, 200

@app.route("/upload", methods=["POST"])
def hello_world():
    file_content = ''
    if 'myFile' in request.files:
        file = request.files['myFile']
        if file:

            #save the audio
            file_path = os.path.join(data_path, file.filename)
            file.save(file_path)            

            #process audio to be put in model
            processed = process_audio_file(file_path)

            prediction = m.predict(processed)

            #Interpret results
            if prediction[0][0] > prediction[0][1]:
                result = 'fake'
                confidence_level = prediction[0][0]
            else:
                result = 'real'
                confidence_level = prediction[0][1]

            file_content = "File written. Predicted as " + str(result) + " " + "with confidence of " + str(confidence_level)
        else:
            file_content = 'No file selected'
    else:
        file_content = 'No file part in the request.'

    return render_template('index.html', file_content=file_content)

def process_audio_file(file_path):
    # Load the audio file
    audio, sr = librosa.load(file_path, sr=44100)

    # Extract MFCCs with 40 coefficients
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)

    # Pad or truncate MFCCs to ensure a consistent shape (40, 220)
    desired_length = 220
    if mfccs.shape[1] < desired_length:
        pad_width = desired_length - mfccs.shape[1]
        mfccs = np.pad(mfccs, pad_width=((0, 0), (0, pad_width)), mode='constant')
    else:
        mfccs = mfccs[:, :desired_length]  # Truncate if too long

    # Add the channel dimension (required by the model)
    mfccs = np.expand_dims(mfccs, axis=-1)

    # Add the batch dimension (for a single sample)
    mfccs = np.expand_dims(mfccs, axis=0) 

    mfccs = mfccs.astype('float32')  # Ensure correct dtype
    return mfccs
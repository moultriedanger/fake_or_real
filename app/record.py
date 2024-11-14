import sounddevice
from scipy.io.wavfile import write
import os

fs= 44100
second =  int(input("Enter time duration in seconds: "))
print("Recording.....n")

record_voice = sounddevice.rec( int ( second * fs ) , samplerate = fs , channels = 1 )
sounddevice.wait()

output_dir = "/Users/moultriedangerfield/Desktop/fake_or_real"

file_path = os.path.join(output_dir, "recording.wav")

write(file_path,fs,record_voice)
print("Finished")
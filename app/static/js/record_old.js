//https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API
const record = document.querySelector(".record");
const stop = document.querySelector(".stop");

//
const result_box = document.querySelector(".result_box");

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log("getUserMedia supported.");
    navigator.mediaDevices
      .getUserMedia(
        // constraints - only audio needed for this app
        {
          audio: true,
        },
      )
      // Success callback
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);

        record.onclick = () => {
            mediaRecorder.start();
            console.log(mediaRecorder.state);
            console.log("recorder started");
            record.style.background = "red";
            record.style.color = "black";
          };

        let chunks = [];

        mediaRecorder.ondataavailable = (e) => {
            chunks.push(e.data);
        };
        
        stop.onclick = () => {
            mediaRecorder.stop();
            console.log(mediaRecorder.state);
            console.log("recorder stopped");
            record.style.background = "";
            record.style.color = "";
        };
        
        mediaRecorder.onstop = async (e) => {

          const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });

          console.log('Blob type:', blob.type); // Inspect blob properties

          chunks = []; 

          const wavBlob = await blobToWav(blob, 44100, 1);

          // Create a FormData object to send the Blob
          const formData = new FormData();
          formData.append('file', wavBlob, 'recording.wav');

          // Send the FormData to the backend
          const response = await fetch('/upload_rec', {
            method: 'POST',
            body: formData
          });
          const data = await response.text();
          
          const paragraph = document.createElement('p')
          paragraph.textContent = data

          result_box.appendChild(paragraph)
          
          };
      });
  } else {
    console.log("getUserMedia not supported on your browser!");
}

// source: chat gpt
function createWavHeader(dataLength, numChannels, sampleRate) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // File length minus "RIFF" and file description
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // Length of "fmt " subchunk
  view.setUint16(20, 1, true); // Audio format (1 = PCM)
  view.setUint16(22, numChannels, true); // Number of channels
  view.setUint32(24, sampleRate, true); // Sample rate
  view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
  view.setUint16(32, numChannels * 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // "data" subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true); // Data chunk length

  return header;
}

async function blobToWav(blob, sampleRate = 44100, numChannels = 1) {
  const arrayBuffer = await blob.arrayBuffer();

  // Use Web Audio API to decode the audio
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Extract PCM data from the audio buffer
  const pcmData = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    pcmData.push(audioBuffer.getChannelData(i)); // Float32Array for each channel
  }

  // Convert Float32 PCM data to Int16
  const int16PcmData = float32ToInt16(pcmData[0]); // Use only the first channel for mono

  // Create WAV header
  const wavHeader = createWavHeader(int16PcmData.length * 2, numChannels, sampleRate);

  // Combine WAV header and PCM data into a single Blob
  const wavBlob = new Blob([wavHeader, new Uint8Array(int16PcmData.buffer)], { type: 'audio/wav' });

  return wavBlob;
}

// Function to convert Float32Array to Int16Array
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    int16Array[i] = Math.max(-1, Math.min(1, float32Array[i])) * 0x7fff; // Clamp values and scale
  }
  return int16Array;
}
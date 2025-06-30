let audioContext;
let processor;
let input;
let stream;
let recordedChunks = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

startBtn.onclick = async () => {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });

  input = audioContext.createMediaStreamSource(stream);

  processor = audioContext.createScriptProcessor(4096, 1, 1);
  input.connect(processor);
  processor.connect(audioContext.destination);

  processor.onaudioprocess = (e) => {
    const channelData = e.inputBuffer.getChannelData(0); // Float32Array
    recordedChunks.push(new Float32Array(channelData)); // copy
  };

  console.log('Recording started');
};

stopBtn.onclick = () => {
  processor.disconnect();
  input.disconnect();
  audioContext.close();

  // Flatten and convert to Int16
  const buffer = flattenArray(recordedChunks);
  const wavBuffer = encodeWAV(buffer, 1, 44100);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });

  // Upload to backend
  const formData = new FormData();
  formData.append('file', blob, 'recording.wav');

  fetch('/upload_rec', {
    method: 'POST',
    body: formData
  }).then(res => res.text()).then(alert);

  recordedChunks = [];
};

function flattenArray(channelBuffer) {
  const length = channelBuffer.reduce((acc, cur) => acc + cur.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  channelBuffer.forEach(chunk => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function encodeWAV(samples, numChannels, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // subchunk1Size
  view.setUint16(20, 1, true); // audioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // byteRate
  view.setUint16(32, numChannels * 2, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // PCM data
  floatTo16BitPCM(view, 44, samples);

  return view;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}
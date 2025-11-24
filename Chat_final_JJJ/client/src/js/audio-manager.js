// ===================== audio-manager.js (Adaptado) =====================
class AudioManager {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.currentCall = null;
    this.audioContext = null;
    this.processor = null;
    this.sendBuffer = [];
    this.bufferQueue = [];
    this.isPlaying = false;
    this.callListener = null;
    
    // Configuración del procesador de audio
    this.SAMPLE_RATE = 44100;
    this.BUFFER_SIZE = 2048;
    this.SEND_THRESHOLD = 8;
  }

  async initAudio() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.SAMPLE_RATE
        }
      });
      
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.SAMPLE_RATE
      });
      
      console.log("[AudioManager] Audio inicializado");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
      return false;
    }
  }

  startLiveRecording() {
    if (!this.stream || !this.audioContext) {
      console.error("[AudioManager] No hay stream de audio disponible");
      return false;
    }

    try {
      const audioInput = this.audioContext.createMediaStreamSource(this.stream);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.5;

      this.processor = this.audioContext.createScriptProcessor(
        this.BUFFER_SIZE, 
        1, 
        1
      );

      audioInput.connect(gainNode);
      gainNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (e) => {
        if (!this.currentCall) return;

        const input = e.inputBuffer.getChannelData(0);
        const boosted = this.applySoftCompression(input);
        const pcm16 = this.floatToPCM16(boosted);
        this.sendBuffer.push(pcm16);

        if (this.sendBuffer.length >= this.SEND_THRESHOLD) {
          const merged = this.mergePCM(this.sendBuffer);
          this.sendBuffer = [];
          
          // Enviar audio por ICE
          if (window.IceDelegate) {
            window.IceDelegate.sendAudio(new Uint8Array(merged.buffer));
          }
        }
      };

      this.isRecording = true;
      console.log("[AudioManager] Grabación en vivo iniciada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al iniciar grabación:", error);
      return false;
    }
  }

  stopLiveRecording() {
    try {
      // Enviar buffer restante
      if (this.sendBuffer.length > 0 && this.currentCall) {
        const merged = this.mergePCM(this.sendBuffer);
        if (window.IceDelegate) {
          window.IceDelegate.sendAudio(new Uint8Array(merged.buffer));
        }
        this.sendBuffer = [];
      }

      if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
      }
      this.processor = null;

      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
      }
      this.stream = null;

      this.isRecording = false;
      console.log("[AudioManager] Grabación en vivo detenida");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al detener grabación:", error);
      return false;
    }
  }

  // Grabación de mensajes de audio
  startRecording() {
    if (!this.stream) {
      console.error("[AudioManager] No hay stream de audio disponible");
      return false;
    }

    try {
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      console.log("[AudioManager] Grabación de mensaje iniciada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al iniciar grabación:", error);
      return false;
    }
  }

  stopRecording() {
    if (!this.mediaRecorder || !this.isRecording) return false;

    try {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log("[AudioManager] Grabación de mensaje detenida");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al detener grabación:", error);
      return false;
    }
  }

  async handleRecordingStop() {
    const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
    this.audioChunks = [];

    // Convertir a PCM16 para enviar por ICE
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const pcm16 = this.floatToPCM16(audioBuffer.getChannelData(0));
    const uint8 = new Uint8Array(pcm16.buffer);

    // Guardar localmente para reproducir
    const audioUrl = URL.createObjectURL(audioBlob);
    
    return {
      url: audioUrl,
      blob: audioBlob,
      pcm16: uint8,
      timestamp: new Date().toISOString()
    };
  }

  async initiateCall(recipientId, recipientName) {
    try {
      const hasPermission = await this.initAudio();
      if (!hasPermission) return false;

      // Iniciar llamada por ICE
      const success = await window.IceDelegate.startCall(recipientId);
      
      if (success) {
        this.currentCall = {
          id: `call_${Date.now()}`,
          recipientId,
          recipientName,
          startTime: Date.now(),
          duration: 0
        };

        console.log("[AudioManager] Llamada iniciada con:", recipientName);
        return this.currentCall;
      }
      
      return null;
    } catch (error) {
      console.error("[AudioManager] Error al iniciar llamada:", error);
      return null;
    }
  }

  async answerCall(callerId) {
    try {
      const hasPermission = await this.initAudio();
      if (!hasPermission) return false;

      const success = await window.IceDelegate.acceptCall(callerId);
      
      if (success) {
        await this.startLiveRecording();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("[AudioManager] Error al responder llamada:", error);
      return false;
    }
  }

  async rejectCall(callerId) {
    try {
      if (window.IceDelegate) {
        await window.IceDelegate.rejectCall(callerId);
      }
      
      if (this.currentCall) {
        this.currentCall = null;
      }
      
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al rechazar llamada:", error);
      return false;
    }
  }

  async endCall() {
    if (this.currentCall) {
      const duration = (Date.now() - this.currentCall.startTime) / 1000;
      this.currentCall.duration = duration;

      // Colgar por ICE
      if (window.IceDelegate) {
        await window.IceDelegate.colgar(this.currentCall.recipientId);
      }

      console.log("[AudioManager] Llamada finalizada. Duración:", duration, "segundos");
      this.currentCall = null;
    }

    this.stopLiveRecording();
    this.bufferQueue = [];
    this.isPlaying = false;
  }

  // Procesamiento de audio
  applySoftCompression(buffer) {
    const threshold = 0.65;
    const ratio = 4.0;
    const out = new Float32Array(buffer.length);
    
    for (let i = 0; i < buffer.length; i++) {
      let v = buffer[i];
      if (Math.abs(v) > threshold) {
        v = Math.sign(v) * (threshold + (Math.abs(v) - threshold) / ratio);
      }
      out[i] = v;
    }
    
    return out;
  }

  mergePCM(chunks) {
    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Int16Array(total);
    let offset = 0;
    
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    
    return merged;
  }

  floatToPCM16(float32) {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  convertPCM16ToFloat32(byteArray) {
    const view = new DataView(byteArray.buffer);
    const floatBuffer = new Float32Array(byteArray.byteLength / 2);
    
    for (let i = 0; i < floatBuffer.length; i++) {
      floatBuffer[i] = view.getInt16(i * 2, true) / 32768;
    }
    
    return floatBuffer;
  }

  playAudio(byteArray) {
    if (!byteArray || !this.audioContext) return;
    
    const floatArray = this.convertPCM16ToFloat32(byteArray);
    this.bufferQueue.push(floatArray);
    
    if (!this.isPlaying) {
      this.processQueue();
    }
  }

  processQueue() {
    if (this.bufferQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    
    this.isPlaying = true;
    const data = this.bufferQueue.shift();
    
    const audioBuffer = this.audioContext.createBuffer(1, data.length, this.SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.start();
    source.onended = () => this.processQueue();
  }

  stopAudio(audio) {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }
}

// Instancia global
if (typeof window !== "undefined") {
  window.AudioManager = new AudioManager();
  
  // Conectar callbacks de ICE
  if (window.IceDelegate) {
    window.IceDelegate.onAudioReceived = (bytes) => {
      window.AudioManager.playAudio(bytes);
    };
  }
}
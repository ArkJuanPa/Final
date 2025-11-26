// ===================== audio-manager.js (COMPLETO Y CORREGIDO) =====================
class AudioManager {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    
    // Para llamadas en vivo (individual y grupal)
    this.liveProcessor = null;
    this.liveSendBuffer = [];
    
    // Para mensajes de audio (grabar y enviar)
    this.messageStream = null;
    this.messageProcessor = null;
    this.messageBuffer = [];
    
    // Reproducción
    this.bufferQueue = [];
    this.isPlaying = false;
    
    // Estado de llamada
    this.currentCall = null;
    
    // Configuración
    this.SAMPLE_RATE = 44100;
    this.BUFFER_SIZE = 2048;
    this.SEND_THRESHOLD = 8;
  }

  async initAudio() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: this.SAMPLE_RATE
        });
      }

      // No pedir micrófono todavía
      await this.audioContext.resume();

      console.log("[AudioManager] AudioContext inicializado correctamente");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al inicializar AudioContext:", error);
      return false;
    }
  }

  // ==================== MENSAJES DE AUDIO ====================
  async startRecordingMessage() {
    if (!this.audioContext) {
      const hasPermission = await this.initAudio();
      if (!hasPermission) return false;
    }

    try {
      await this.audioContext.resume();

      this.messageStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.SAMPLE_RATE
        }
      });

      const audioInput = this.audioContext.createMediaStreamSource(this.messageStream);
      
      this.messageProcessor = this.audioContext.createScriptProcessor(
        this.BUFFER_SIZE,
        1,
        1
      );

      audioInput.connect(this.messageProcessor);
      this.messageProcessor.connect(this.audioContext.destination);

      this.messageBuffer = [];

      this.messageProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const boosted = this.applySoftCompression(input);
        const pcm16 = this.floatToPCM16(boosted);
        this.messageBuffer.push(pcm16);
      };

      console.log("[AudioManager] Grabación de mensaje iniciada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al iniciar grabación de mensaje:", error);
      return false;
    }
  }

  async stopRecordingMessage() {
    try {
      if (this.messageProcessor) {
        this.messageProcessor.disconnect();
        this.messageProcessor.onaudioprocess = null;
        this.messageProcessor = null;
      }

      if (this.messageStream) {
        this.messageStream.getTracks().forEach(t => t.stop());
        this.messageStream = null;
      }

      const merged = this.mergePCM(this.messageBuffer);
      const uint8 = new Uint8Array(merged.buffer);
      
      const duration = (this.messageBuffer.length * this.BUFFER_SIZE) / this.SAMPLE_RATE;
      
      this.messageBuffer = [];

      console.log("[AudioManager] Grabación de mensaje detenida");
      
      return {
        pcm16: uint8,
        duration: Math.round(duration),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("[AudioManager] Error al detener grabación de mensaje:", error);
      return null;
    }
  }

  cancelRecordingMessage() {
    try {
      if (this.messageProcessor) {
        this.messageProcessor.disconnect();
        this.messageProcessor.onaudioprocess = null;
        this.messageProcessor = null;
      }

      if (this.messageStream) {
        this.messageStream.getTracks().forEach(t => t.stop());
        this.messageStream = null;
      }

      this.messageBuffer = [];
      
      console.log("[AudioManager] Grabación de mensaje cancelada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al cancelar grabación:", error);
      return false;
    }
  }

  // ==================== LLAMADAS EN VIVO ====================
  async startLiveRecording() {
    try {
      if (!this.audioContext) await this.initAudio();

      // Abrir micrófono solo ahora
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: this.SAMPLE_RATE
          }
        });
      }

      const audioInput = this.audioContext.createMediaStreamSource(this.mediaStream);
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = 0.5;

      this.liveProcessor = this.audioContext.createScriptProcessor(
        this.BUFFER_SIZE, 1, 1
      );

      audioInput.connect(gainNode);
      gainNode.connect(this.liveProcessor);
      this.liveProcessor.connect(this.audioContext.destination);

      this.liveSendBuffer = [];

      this.liveProcessor.onaudioprocess = (e) => {
        if (!this.currentCall || !window.IceDelegate) return;

        const input = e.inputBuffer.getChannelData(0);
        const boosted = this.applySoftCompression(input);
        const pcm16 = this.floatToPCM16(boosted);
        this.liveSendBuffer.push(pcm16);

        if (this.liveSendBuffer.length >= this.SEND_THRESHOLD) {
          const merged = this.mergePCM(this.liveSendBuffer);
          this.liveSendBuffer = [];

          const bytes = new Uint8Array(merged.buffer);

          if (this.currentCall.isGroup) {
            window.IceDelegate.sendAudioGroup(this.currentCall.groupId, bytes);
          } else {
            window.IceDelegate.sendAudio(bytes);
          }
        }
      };

      console.log("[AudioManager] Grabación en vivo iniciada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al iniciar grabación en vivo:", error);
      return false;
    }
  }


  stopLiveRecording() {
    try {
      // Enviar buffer restante
      if (this.liveSendBuffer.length > 0 && this.currentCall && window.IceDelegate) {
        const merged = this.mergePCM(this.liveSendBuffer);
        const bytes = new Uint8Array(merged.buffer);

        if (this.currentCall.isGroup) {
          window.IceDelegate.sendAudioGroup(this.currentCall.groupId, bytes);
        } else {
          window.IceDelegate.sendAudio(bytes);
        }

        this.liveSendBuffer = [];
      }

      if (this.liveProcessor) {
        this.liveProcessor.disconnect();
        this.liveProcessor.onaudioprocess = null;
        this.liveProcessor = null;
      }

      // Cerrar micrófono
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
      }

      console.log("[AudioManager] Grabación en vivo detenida");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al detener grabación en vivo:", error);
      return false;
    }
  }


  // ==================== LLAMADAS INDIVIDUALES ====================
  async initiateCall(recipientId, recipientName, isGroup = false) {
    try {
      const hasPermission = await this.initAudio();
      if (!hasPermission) return null;

      const success = await window.IceDelegate.startCall(recipientId);
      
      if (success) {
        this.currentCall = {
          id: `call_${Date.now()}`,
          recipientId,
          recipientName,
          startTime: Date.now(),
          isGroup: false
        };

        console.log("[AudioManager] Llamada individual iniciada con:", recipientName);
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
        console.log("[AudioManager] Llamada individual respondida");
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
      
      console.log("[AudioManager] Llamada individual rechazada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al rechazar llamada:", error);
      return false;
    }
  }

  // ==================== LLAMADAS GRUPALES ====================
  async initiateGroupCall(groupId, members) {
    try {
      const hasPermission = await this.initAudio();
      if (!hasPermission) return null;

      const iceGroupId = await window.IceDelegate.createGroupCall(members);
      
      if (iceGroupId) {
        this.currentCall = {
          id: `group_call_${Date.now()}`,
          groupId: iceGroupId,
          members,
          startTime: Date.now(),
          isGroup: true
        };

        await this.startLiveRecording();

        console.log("[AudioManager] Llamada grupal iniciada:", iceGroupId);
        return this.currentCall;
      }
      
      return null;
    } catch (error) {
      console.error("[AudioManager] Error al iniciar llamada grupal:", error);
      return null;
    }
  }

  async answerGroupCall(groupId) {
    try {
      const hasPermission = await this.initAudio();
      if (!hasPermission) return false;

      await window.IceDelegate.joinGroupCall(groupId);
      
      await this.startLiveRecording();
      
      console.log("[AudioManager] Llamada grupal respondida:", groupId);
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al responder llamada grupal:", error);
      return false;
    }
  }

  async rejectGroupCall(groupId) {
    try {
      if (window.IceDelegate) {
        await window.IceDelegate.leaveGroupCall(groupId);
      }
      
      if (this.currentCall) {
        this.currentCall = null;
      }
      
      console.log("[AudioManager] Llamada grupal rechazada");
      return true;
    } catch (error) {
      console.error("[AudioManager] Error al rechazar llamada grupal:", error);
      return false;
    }
  }

  // ==================== FINALIZAR LLAMADA ====================
  async endCall() {
    if (this.currentCall) {
      const duration = (Date.now() - this.currentCall.startTime) / 1000;
      this.currentCall.duration = duration;

      if (window.IceDelegate) {
        if (this.currentCall.isGroup) {
          // ✅ LLAMADA GRUPAL - usar leaveGroupCall
          await window.IceDelegate.leaveGroupCall(this.currentCall.groupId);
        } else {
          // ✅ LLAMADA INDIVIDUAL - usar colgar (método correcto)
          const target = this.currentCall.recipientId || this.currentCall.callerId;
          if (target) {
            await window.IceDelegate.colgar(target);
          }
        }
      }

      console.log(`[AudioManager] Llamada ${this.currentCall.isGroup ? 'grupal' : 'individual'} finalizada. Duración:`, duration, "segundos");
      this.currentCall = null;
    }

    this.stopLiveRecording();
    this.bufferQueue = [];
    this.isPlaying = false;
  }

  // ==================== PROCESAMIENTO DE AUDIO ====================
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
    console.log(`🎯 [DEBUG] AUDIOMANAGER.PLAYAUDIO EJECUTADO`);
    console.log(`🎯 [DEBUG] Bytes recibidos: ${byteArray?.length || 0}`);
    console.log(`🎯 [DEBUG] AudioContext estado: ${this.audioContext?.state || 'NO INICIALIZADO'}`);
  
    if (!byteArray || !this.audioContext) {
      console.error(`❌ [DEBUG] No hay bytes o AudioContext`);
      return;
    }

    const floatArray = this.convertPCM16ToFloat32(byteArray);
    this.bufferQueue.push(floatArray);

    if (!this.isPlaying) {
      // Reanudar AudioContext si estaba suspendido
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().then(() => this.processQueue());
      } else {
        this.processQueue();
      }
    }
  }

  processQueue() {
    if (this.bufferQueue.length === 0) {
      this.isPlaying = false;

      // Suspender AudioContext cuando no haya audio
      if (this.audioContext.state === "running") {
        this.audioContext.suspend().catch(console.error);
      }

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

}

// Instancia global
if (typeof window !== "undefined") {
  window.AudioManager = new AudioManager();
  
  if (window.IceDelegate) {
    window.IceDelegate.subscribe((bytes) => {
      window.AudioManager.playAudio(bytes);
    });
  }
}
import delegate from "../services/delegate.js";

const Player = () => {
  const container = document.createElement("div");
  container.style.padding = "20px";

  const audioCtx = new AudioContext({ sampleRate: 44100 });
  let currentTarget = null;
  let mediaStream = null;
  let processor = null;
  let sendBuffer = [];
  let bufferQueue = [];
  let isPlaying = false;
  let callState = "idle"; // idle | active | remoteHungUp

  const username = delegate.name;
  if (!username) {
    console.error("delegate.name está vacío");
    return container;
  }

  // ================= PANEL DE LLAMADAS =================
  const incomingCallDiv = document.createElement("div");
  incomingCallDiv.style.marginTop = "10px";

  const callerLabel = document.createElement("span");
  const acceptBtn = document.createElement("button");
  acceptBtn.textContent = "Aceptar";
  acceptBtn.style.marginLeft = "10px";
  const rejectBtn = document.createElement("button");
  rejectBtn.textContent = "Rechazar";
  rejectBtn.style.marginLeft = "5px";

  acceptBtn.onclick = async () => {
    if (!currentTarget) return;
    try {
      await delegate.acceptCall(currentTarget);
      await startRecording();
      incomingCallDiv.style.display = "none";
      hangupBtn.style.display = "inline-block";
      callState = "active";
    } catch (e) {
      console.error("Error al aceptar llamada:", e);
    }
  };

  rejectBtn.onclick = async () => {
    if (!currentTarget) return;
    try {
      await delegate.rejectCall(currentTarget);
      currentTarget = null;
      incomingCallDiv.style.display = "none";
    } catch (e) {
      console.error("Error al rechazar llamada:", e);
    }
  };

  incomingCallDiv.appendChild(callerLabel);
  incomingCallDiv.appendChild(acceptBtn);
  incomingCallDiv.appendChild(rejectBtn);
  incomingCallDiv.style.display = "none";
  container.appendChild(incomingCallDiv);

  // ================= CALLBACKS DE LLAMADAS =================
  delegate.onIncomingCall((fromUser) => {
    currentTarget = fromUser;
    callerLabel.textContent = `${fromUser} te está llamando: `;
    incomingCallDiv.style.display = "block";
  });

  delegate.onCallAccepted(async (byUser) => {
    currentTarget = byUser;
    try {
      await startRecording();
      hangupBtn.style.display = "inline-block";
      callState = "active";
    } catch (e) {
      console.error("Error al iniciar audio:", e);
    }
  });

  delegate.onCallRejected(() => {
    stopRecording();
    hangupBtn.style.display = "none";
    currentTarget = null;
    callState = "idle";
  });

  // ================= CUELGUE REMOTO ======================
  delegate.onCallColgada(async (byUser) => {
    console.log("Llamada colgada por:", byUser);

    stopRecording();
    mediaStream = null;
    processor = null;
    bufferQueue = [];
    isPlaying = false;
    currentTarget = null;
    callState = "remoteHungUp";

    hangupBtn.textContent = `La llamada fue colgada por ${byUser}. ACEPTAR`;
    hangupBtn.style.display = "inline-block";

    hangupBtn.onclick = async () => {
      hangupBtn.style.display = "none";
      hangupBtn.textContent = "Colgar";
      hangupBtn.onclick = colgarLlamada;
      callState = "idle";
    };
  });

  // ================= BOTONES DE USUARIOS =================
  const listBtn = document.createElement("button");
  listBtn.textContent = "Ver usuarios conectados";
  const listDiv = document.createElement("div");

  listBtn.onclick = async () => {
    try {
      const users = await delegate.getUsers();
      listDiv.innerHTML = "<h3>Usuarios conectados:</h3>";

      users.filter(u => u !== username).forEach(u => {
        const userContainer = document.createElement("div");
        userContainer.style.marginBottom = "12px";
        userContainer.style.border = "1px solid #ccc";
        userContainer.style.padding = "10px";
        userContainer.style.borderRadius = "6px";

        const callBtn = document.createElement("button");
        callBtn.textContent = "Llamar a " + u;
        callBtn.onclick = async () => {
          currentTarget = u;
          try {
            await delegate.startCall(u);
            hangupBtn.style.display = "inline-block";
            callState = "active";
          } catch (e) {
            console.error("Error al iniciar llamada:", e);
          }
        };

        // AUDIO MESSAGE
        let audioMsgStream = null;
        let audioMsgProcessor = null;
        let audioMsgBuffer = [];

        const recordBtn = document.createElement("button");
        recordBtn.textContent = "🎤 Grabar audio";
        recordBtn.style.marginLeft = "10px";

        const stopBtn = document.createElement("button");
        stopBtn.textContent = "⏹️ Detener";
        stopBtn.style.display = "none";
        stopBtn.style.marginLeft = "5px";

        const sendBtn = document.createElement("button");
        sendBtn.textContent = "📨 Enviar";
        sendBtn.style.display = "none";
        sendBtn.style.marginLeft = "5px";

        recordBtn.onclick = async () => {
          audioMsgStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioInput = audioCtx.createMediaStreamSource(audioMsgStream);

          audioMsgProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
          audioInput.connect(audioMsgProcessor);
          audioMsgProcessor.connect(audioCtx.destination);

          audioMsgBuffer = [];

          audioMsgProcessor.onaudioprocess = e => {
            const input = e.inputBuffer.getChannelData(0);
            const pcm = floatToPCM16(input);
            audioMsgBuffer.push(pcm);
          };

          recordBtn.style.display = "none";
          stopBtn.style.display = "inline-block";
          sendBtn.style.display = "none";
        };

        stopBtn.onclick = () => {
          if (audioMsgProcessor) audioMsgProcessor.disconnect();
          if (audioMsgStream) audioMsgStream.getTracks().forEach(t => t.stop());
          audioMsgProcessor = null;
          audioMsgStream = null;

          stopBtn.style.display = "none";
          sendBtn.style.display = "inline-block";
        };

        sendBtn.onclick = () => {
          const merged = mergePCM(audioMsgBuffer);
          const uint8 = new Uint8Array(merged.buffer);

          delegate.sendAudioMessage(u, uint8);

          sendBtn.style.display = "none";
          recordBtn.style.display = "inline-block";
        };

        userContainer.appendChild(callBtn);
        userContainer.appendChild(recordBtn);
        userContainer.appendChild(stopBtn);
        userContainer.appendChild(sendBtn);

        listDiv.appendChild(userContainer);
      });

    } catch (e) {
      console.error("Error obteniendo usuarios:", e);
    }
  };

  // BOTÓN LLAMAR MANUAL
  const startCallBtn = document.createElement("button");
  startCallBtn.textContent = "Llamar manualmente";
  startCallBtn.onclick = async () => {
    const target = prompt("¿A quién quieres llamar?");
    if (!target) return;
    currentTarget = target;
    try {
      await delegate.startCall(target);
      hangupBtn.style.display = "inline-block";
      callState = "active";
    } catch (e) {
      console.error("Error al iniciar llamada:", e);
    }
  };

  // ================= BOTÓN COLGAR =================
  const hangupBtn = document.createElement("button");
  hangupBtn.textContent = "Colgar";
  hangupBtn.style.marginLeft = "10px";
  hangupBtn.style.display = "none";

  const colgarLlamada = async () => {
    if (!currentTarget && callState !== "remoteHungUp") return;
    await cerrarConexion(true);
  };

  hangupBtn.onclick = colgarLlamada;

  // ================= CAPTURA Y ENVÍO DE AUDIO =================
  const startRecording = async () => {
    if (mediaStream) return;

    await audioCtx.resume();
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioInput = audioCtx.createMediaStreamSource(mediaStream);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.5;

    processor = audioCtx.createScriptProcessor(2048, 1, 1);
    audioInput.connect(gainNode);
    gainNode.connect(processor);
    processor.connect(audioCtx.destination);

    processor.onaudioprocess = (e) => {
      if (!currentTarget || !mediaStream) return;

      const input = e.inputBuffer.getChannelData(0);
      const boosted = applySoftCompression(input);
      const pcm16 = floatToPCM16(boosted);
      sendBuffer.push(pcm16);

      if (sendBuffer.length >= 8) {
        const merged = mergePCM(sendBuffer);
        sendBuffer = [];
        delegate.sendAudio(new Uint8Array(merged.buffer));
      }
    };
  };

  const stopRecording = () => {
    try {
      if (processor) {
        processor.disconnect();
        processor.onaudioprocess = null;
      }
      processor = null;

      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
      mediaStream = null;

      sendBuffer = [];
    } catch (e) {
      console.error("stopRecording ERROR:", e);
    }
  };

  const cerrarConexion = async (notifyRemote = true) => {
    // Enviar cualquier buffer pendiente
    if (sendBuffer.length > 0 && currentTarget) {
      const merged = mergePCM(sendBuffer);
      delegate.sendAudio(new Uint8Array(merged.buffer));
      sendBuffer = [];
    }

    stopRecording();
    bufferQueue = [];
    isPlaying = false;

    if (notifyRemote && currentTarget) {
      try {
        await delegate.colgar(currentTarget);
      } catch (e) {
        console.error("Error notificando colgado:", e);
      }
    }

    currentTarget = null;
    hangupBtn.style.display = "none";
    callState = "idle";
  };

  // ================= AUDIO =================
  const applySoftCompression = (buffer) => {
    const threshold = 0.65, ratio = 4.0;
    const out = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      let v = buffer[i];
      if (Math.abs(v) > threshold)
        v = Math.sign(v) * (threshold + (Math.abs(v) - threshold) / ratio);
      out[i] = v;
    }
    return out;
  };

  const mergePCM = (chunks) => {
    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Int16Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return merged;
  };

  const floatToPCM16 = (float32) => {
    const pcm16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  };

  const convertPCM16ToFloat32 = (byteArray) => {
    const view = new DataView(byteArray.buffer);
    const floatBuffer = new Float32Array(byteArray.byteLength / 2);
    for (let i = 0; i < floatBuffer.length; i++)
      floatBuffer[i] = view.getInt16(i * 2, true) / 32768;
    return floatBuffer;
  };

  const playAudio = (byteArray) => {
    if (!byteArray) return;
    const floatArray = convertPCM16ToFloat32(byteArray);
    bufferQueue.push(floatArray);
    if (!isPlaying) processQueue();
  };

  const processQueue = () => {
    if (bufferQueue.length === 0) { isPlaying = false; return; }
    isPlaying = true;

    const data = bufferQueue.shift();
    const audioBuffer = audioCtx.createBuffer(1, data.length, 44100);
    audioBuffer.getChannelData(0).set(data);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
    source.onended = processQueue;
  };

  delegate.subscribe(playAudio);

  container.appendChild(listBtn);
  container.appendChild(listDiv);
  container.appendChild(startCallBtn);
  container.appendChild(hangupBtn);

  return container;
};

export default Player;

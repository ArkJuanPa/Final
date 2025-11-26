import Subscriber from "./subscriber.js";

class IceDelegate {
  constructor() {
    this.communicator = null;
    this.subject = null;

    this.name = null;
    this.currentCall = null;

    this.subscriber = null;

    // Callbacks de audio
    this.callbacks = [];             // audio 1–1
    this.groupCallbacks = new Map(); // groupId → callbacks[]

    // Callbacks de llamadas individuales
    this.incomingCallCB = null;
    this.callAcceptedCB = null;
    this.callRejectedCB = null;
    this.callColgadaCB = null;

    // Callbacks de llamadas grupales
    this.incomingGroupCallCB = null;
    this.groupUpdatedCB = null;
    this.groupEndedCB = null;

    this.isInitialized = false;
  }

  // ============================================================
  // INIT
  // ============================================================
  async init(name) {
    this.name = name;

    if (this.isInitialized) {
      console.log("⚠️ IceDelegate ya estaba inicializado");
      return true;
    }

    try {
      console.log("🔌 Inicializando Ice.Communicator...");
      this.communicator = Ice.initialize();

      const proxy = this.communicator.stringToProxy(
        `AudioService:ws -h localhost -p 9099`
      );

      console.log("✨ Casteando a SubjectPrx...");
      this.subject = await Demo.SubjectPrx.checkedCast(proxy);
      if (!this.subject) {
        console.error("❌ No pude castear SubjectPrx");
        return false;
      }

      console.log("📡 Creando adapter...");
      const adapter = await this.communicator.createObjectAdapter("");
      await adapter.activate();

      // Enlazar conexión al adapter
      const conn = this.subject.ice_getCachedConnection();
      conn.setAdapter(adapter);

      console.log("👤 Creando subscriber...");
      this.subscriber = new Subscriber(this);

      const callbackPrx = Demo.ObserverPrx.uncheckedCast(
        adapter.addWithUUID(this.subscriber)
      );

      console.log("📝 Registrando con el servidor...");
      await this.subject.attach(this.name, callbackPrx);

      this.isInitialized = true;
      console.log("✅ ICE Delegate listo como:", this.name);

      this.startHeartbeat();
      return true;
    } catch (error) {
      console.error("❌ Error inicializando IceDelegate:", error);
      return false;
    }
  }

  // ============================================================
  // HEARTBEAT + RECONEXIÓN
  // ============================================================
  startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      if (!this.subject) {
        console.warn("⚠️ Conexión ICE perdida");
        this.reconnect();
        return;
      }

      try {
        await this.subject.ice_ping();
      } catch (error) {
        console.error("❌ Heartbeat falló:", error);
        this.reconnect();
      }
    }, 5000);
  }

  async reconnect() {
    console.log("🔄 Intentando reconectar...");
    clearInterval(this.heartbeatInterval);

    this.isInitialized = false;
    this.subject = null;

    const ok = await this.init(this.name);
    if (ok) {
      console.log("✅ Reconexión exitosa");
      if (window.AppController) window.AppController.setupICECallbacks();
    }
  }

  // ============================================================
  // USUARIOS
  // ============================================================
  async getUsers() {
    if (!this.subject) return [];
    try {
      return await this.subject.getConnectedUsers();
    } catch (e) {
      return [];
    }
  }

  // ============================================================
  // LLAMADAS 1 A 1
  // ============================================================
  async startCall(target) {
    if (!this.subject) return false;
    try {
      await this.subject.startCall(this.name, target);
      this.currentCall = target;
      return true;
    } catch (e) {
      console.error("Error iniciando llamada:", e);
      return false;
    }
  }

  async acceptCall(fromUser) {
    if (!this.subject) return false;
    try {
      await this.subject.acceptCall(fromUser, this.name);
      this.currentCall = fromUser;
      return true;
    } catch (e) {
      console.error("Error aceptando:", e);
      return false;
    }
  }

  async rejectCall(fromUser) {
    if (!this.subject) return false;
    try {
      await this.subject.rejectCall(fromUser, this.name);
      return true;
    } catch (e) {
      console.error("Error rechazando:", e);
      return false;
    }
  }

  async colgar(target) {
    if (!this.subject) return false;
    try {
      await this.subject.colgar(this.name, target);
      if (this.currentCall === target) this.currentCall = null;
      return true;
    } catch (e) {
      console.error("Error colgando:", e);
      return false;
    }
  }

  // ============================================================
  // AUDIO 1 A 1
  // ============================================================
  async sendAudio(byteArray) {
    if (!this.subject) return false;
    try {
      const data = Uint8Array.from(byteArray);
      await this.subject.sendAudio(this.name, data);
      return true;
    } catch (e) {
      console.error("Error sendAudio:", e);
      return false;
    }
  }

  // ============================================================
  // MENSAJE DE AUDIO 1 A 1
  // ============================================================
  async sendAudioMessage(toUser, byteArray) {
    if (!this.subject) return false;
    try {
      const data = Uint8Array.from(byteArray);
      await this.subject.sendAudioMessage(this.name, toUser, data);
      return true;
    } catch (e) {
      console.error("Error sendAudioMessage:", e);
      return false;
    }
  }

  // ============================================================
  // GRUPOS: MENSAJES DE AUDIO
  // ============================================================
  async joinMessagingGroup(groupId, users) {
    if (!this.subject) return false;
    try {
      await this.subject.joinMessagingGroup(groupId, users);
      return true;
    } catch (e) {
      console.error("Error joinMessagingGroup:", e);
      return false;
    }
  }

  async sendAudioMessageGroup(groupId, byteArray) {
    if (!this.subject) return false;
    try {
      const data = Uint8Array.from(byteArray);
      await this.subject.sendAudioMessageGroup(this.name, groupId, data);
      return true;
    } catch (e) {
      console.error("Error sendAudioMessageGroup:", e);
      return false;
    }
  }

  // ============================================================
  // LLAMADAS GRUPALES
  // ============================================================
  async createGroupCall(users) {
    if (!this.subject) return null;
    try {
      return await this.subject.createGroupCall(this.name, users);
    } catch (e) {
      console.error("Error createGroupCall:", e);
      return null;
    }
  }

  async joinGroupCall(groupId) {
    if (!this.subject) return false;
    try {
      await this.subject.joinGroupCall(groupId, this.name);
      return true;
    } catch (e) {
      console.error("Error joinGroupCall:", e);
      return false;
    }
  }

  async leaveGroupCall(groupId) {
    if (!this.subject) return false;
    try {
      await this.subject.leaveGroupCall(groupId, this.name);
      return true;
    } catch (e) {
      console.error("Error leaveGroupCall:", e);
      return false;
    }
  }

  // ============================================================
  // AUDIO DE LLAMADA GRUPAL
  // ============================================================
  async sendAudioGroup(groupId, byteArray) {
    if (!this.subject) return false;
    try {
      const data = Uint8Array.from(byteArray);
      await this.subject.sendAudioGroup(groupId, this.name, data);
      return true;
    } catch (e) {
      console.error("Error sendAudioGroup:", e);
      return false;
    }
  }

  // ============================================================
  // SUBSCRIPCIÓN AUDIO
  // ============================================================
  subscribe(cb) {
    this.callbacks.push(cb);
  }

  notify(bytes) {
    this.callbacks.forEach((cb) => cb(bytes));
  }

  subscribeGroup(groupId, cb) {
    if (!this.groupCallbacks.has(groupId))
      this.groupCallbacks.set(groupId, []);
    this.groupCallbacks.get(groupId).push(cb);
  }

  notifyGroupMessage(groupId, bytes) {
    if (this.groupCallbacks.has(groupId)) {
      this.groupCallbacks.get(groupId).forEach((cb) => cb(bytes));
    }

    if (window.AudioManager?.playAudio) {
      window.AudioManager.playAudio(bytes);
    }
  }

  // ============================================================
  // CALLBACKS LLAMADAS 1–1
  // ============================================================
  onIncomingCall(cb) { this.incomingCallCB = cb; }
  onCallAccepted(cb) { this.callAcceptedCB = cb; }
  onCallRejected(cb) { this.callRejectedCB = cb; }
  onCallEnded(cb) { this.callColgadaCB = cb; }

  notifyIncomingCall(fromUser) {
    this.incomingCallCB?.(fromUser);
  }
  notifyCallAccepted(fromUser) {
    this.callAcceptedCB?.(fromUser);
  }
  notifyCallRejected(fromUser) {
    this.callRejectedCB?.(fromUser);
  }
  notifyCallColgada(fromUser) {
    if (this.currentCall === fromUser) this.currentCall = null;
    this.callColgadaCB?.(fromUser);
  }

  // ============================================================
  // CALLBACKS LLAMADAS GRUPALES
  // ============================================================
  onIncomingGroupCall(cb) { this.incomingGroupCallCB = cb; }
  onGroupUpdated(cb) { this.groupUpdatedCB = cb; }
  onGroupEnded(cb) { this.groupEndedCB = cb; }

  notifyIncomingGroupCall(groupId, fromUser, members) {
    this.incomingGroupCallCB?.(groupId, fromUser, members);
  }
  notifyGroupCallUpdated(groupId, members) {
    this.groupUpdatedCB?.(groupId, members);
  }
  notifyGroupCallEnded(groupId) {
    this.groupEndedCB?.(groupId);
  }
}

// Instancia global
if (typeof window !== "undefined") {
  window.IceDelegate = new IceDelegate();
}

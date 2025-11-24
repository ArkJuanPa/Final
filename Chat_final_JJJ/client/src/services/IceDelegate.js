// ===================== ice-delegate.js =====================
import Subscriber from "./subscriber.js";

class IceDelegate {
  constructor() {
    this.communicator = Ice.initialize();
    this.subject = null;
    this.name = null;
    this.currentCall = null;
    this.subscriber = new Subscriber(this);

    // Callbacks de audio
    this.audioCallbacks = [];
    
    // Callbacks de llamadas
    this.incomingCallCB = null;
    this.callAcceptedCB = null;
    this.callRejectedCB = null;
    this.callColgadaCB = null;
  }

  async init(name) {
    this.name = name;
    if (this.subject) {
      console.log("ICE ya inicializado");
      return true;
    }

    try {
      const hostname = "localhost";
      const proxySubject = this.communicator.stringToProxy(
        `AudioService:ws -h ${hostname} -p 9099`
      );

      this.subject = await Demo.SubjectPrx.checkedCast(proxySubject);
      if (!this.subject) {
        console.error("No pude castear SubjectPrx");
        return false;
      }

      const adapter = await this.communicator.createObjectAdapter("");
      await adapter.activate();

      const conn = this.subject.ice_getCachedConnection();
      conn.setAdapter(adapter);

      const callbackPrx = Demo.ObserverPrx.uncheckedCast(
        adapter.addWithUUID(this.subscriber)
      );

      await this.subject.attach(this.name, callbackPrx);

      console.log("✅ ICE Delegate conectado como:", this.name);
      return true;
    } catch (error) {
      console.error("❌ Error al inicializar ICE:", error);
      return false;
    }
  }

  // ================== Usuarios ==================
  async getUsers() {
    if (!this.subject) {
      console.warn("Subject no inicializado");
      return [];
    }
    try {
      return await this.subject.getConnectedUsers();
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      return [];
    }
  }

  // ================== Llamadas ==================
  async startCall(target) {
    if (!this.subject) {
      console.error("Subject no inicializado");
      return false;
    }
    try {
      await this.subject.startCall(this.name, target);
      this.currentCall = target;
      console.log("📞 Llamada iniciada con:", target);
      return true;
    } catch (error) {
      console.error("Error iniciando llamada:", error);
      return false;
    }
  }

  async acceptCall(fromUser) {
    if (!this.subject) {
      console.error("Subject no inicializado");
      return false;
    }
    try {
      await this.subject.acceptCall(fromUser, this.name);
      this.currentCall = fromUser;
      console.log("✅ Llamada aceptada de:", fromUser);
      return true;
    } catch (error) {
      console.error("Error aceptando llamada:", error);
      return false;
    }
  }

  async rejectCall(fromUser) {
    if (!this.subject) {
      console.error("Subject no inicializado");
      return false;
    }
    try {
      await this.subject.rejectCall(fromUser, this.name);
      console.log("❌ Llamada rechazada de:", fromUser);
      return true;
    } catch (error) {
      console.error("Error rechazando llamada:", error);
      return false;
    }
  }

  async colgar(target) {
    if (!this.subject || !target) {
      console.warn("No hay subject o target para colgar");
      return false;
    }
    try {
      await this.subject.colgar(this.name, target);
      if (this.currentCall === target) {
        this.currentCall = null;
      }
      console.log("📴 Llamada colgada con:", target);
      return true;
    } catch (error) {
      console.error("Error colgando llamada:", error);
      return false;
    }
  }

  // ================== Audio en vivo ==================
  async sendAudio(byteArray) {
    if (!this.subject) {
      console.warn("Subject no inicializado, no se puede enviar audio");
      return false;
    }
    try {
      const data = byteArray instanceof Uint8Array 
        ? byteArray 
        : Uint8Array.from(byteArray);
      await this.subject.sendAudio(this.name, data);
      return true;
    } catch (error) {
      console.error("Error enviando audio:", error);
      return false;
    }
  }

  // ================== Mensajes de audio ==================
  async sendAudioMessage(targetUser, byteArray) {
    if (!this.subject) {
      console.error("Subject no inicializado");
      return false;
    }
    try {
      const data = byteArray instanceof Uint8Array 
        ? byteArray 
        : Uint8Array.from(byteArray);
      await this.subject.sendAudioMessage(this.name, targetUser, data);
      console.log("📨 Mensaje de audio enviado a:", targetUser);
      return true;
    } catch (error) {
      console.error("Error enviando mensaje de audio:", error);
      return false;
    }
  }

  // ================== Subscripción de audio ==================
  subscribe(callback) {
    this.audioCallbacks.push(callback);
  }

  notify(bytes) {
    this.audioCallbacks.forEach(cb => cb(bytes));
  }

  // ================== Callbacks de llamadas ==================
  onIncomingCall(cb) { 
    this.incomingCallCB = cb; 
  }
  
  onCallAccepted(cb) { 
    this.callAcceptedCB = cb; 
  }
  
  onCallRejected(cb) { 
    this.callRejectedCB = cb; 
  }
  
  onCallEnded(cb) { 
    this.callColgadaCB = cb; 
  }

  // ================== Notificaciones internas ==================
  notifyIncomingCall(fromUser) {
    console.log("🔔 Llamada entrante de:", fromUser);
    if (this.incomingCallCB) {
      this.incomingCallCB(fromUser);
    }
  }

  notifyCallAccepted(byUser) {
    console.log("✅ Llamada aceptada por:", byUser);
    if (this.callAcceptedCB) {
      this.callAcceptedCB(byUser);
    }
  }

  notifyCallRejected(byUser) {
    console.log("❌ Llamada rechazada por:", byUser);
    if (this.callRejectedCB) {
      this.callRejectedCB(byUser);
    }
  }

  notifyCallColgada(byUser) {
    console.log("📴 Llamada colgada por:", byUser);
    
    if (this.currentCall === byUser) {
      this.currentCall = null;
    }
    
    if (this.callColgadaCB) {
      this.callColgadaCB(byUser);
    }
  }
}

// Instancia global
const instance = new IceDelegate();

if (typeof window !== "undefined") {
  window.IceDelegate = instance;
}

export default instance;
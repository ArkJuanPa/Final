// ===================== IceDelegate.js =====================
import Subscriber from "./Subscriber.js";


class IceDelegate {
  constructor() {
    this.communicator = Ice.initialize();
    this.subject = null;
    this.name = null;
    this.currentCall = null;
    this.subscriber = new Subscriber(this);

    this.callbacks = [];
    this.incomingCallCB = null;
    this.callAcceptedCB = null;
    this.callRejectedCB = null;
    this.callColgadaCB = null;
  }

  async init(name) {
    this.name = name;
    if (this.subject) return;

    const hostname = "localhost";
    const proxySubject = this.communicator.stringToProxy(
      `AudioService:ws -h ${hostname} -p 9099`
    );

    this.subject = await Demo.SubjectPrx.checkedCast(proxySubject);
    if (!this.subject) return console.error("No pude castear SubjectPrx");

    const adapter = await this.communicator.createObjectAdapter("");
    await adapter.activate();

    const conn = this.subject.ice_getCachedConnection();
    conn.setAdapter(adapter);

    const callbackPrx = Demo.ObserverPrx.uncheckedCast(
      adapter.addWithUUID(this.subscriber)
    );

    await this.subject.attach(this.name, callbackPrx);

    console.log("ICE Delegate listo como:", this.name);
  }

  // ================== Usuarios ==================
  async getUsers() {
    if (!this.subject) return [];
    return await this.subject.getConnectedUsers();
  }

  // ================== Llamadas ==================
  async startCall(target) {
    if (!this.subject) return;
    await this.subject.startCall(this.name, target);
    this.currentCall = target;
  }

  async acceptCall(fromUser) {
    if (!this.subject) return;
    await this.subject.acceptCall(fromUser, this.name);
    this.currentCall = fromUser;
  }

  async rejectCall(fromUser) {
    if (!this.subject) return;
    await this.subject.rejectCall(fromUser, this.name);
  }

  async colgar(target) {
    if (!this.subject || !target) return;
    try {
      await this.subject.colgar(this.name, target);
      if (this.currentCall === target) this.currentCall = null;
    } catch (e) {
      console.error("Error cerrando conexión remota:", e);
    }
  }

  // ================== Audio en vivo ==================
  async sendAudio(byteArray) {
    if (!this.subject) return;
    try {
      const data = byteArray instanceof Uint8Array ? byteArray : Uint8Array.from(byteArray);
      await this.subject.sendAudio(this.name, data);
    } catch (e) {
      console.error("Error enviando audio:", e);
    }
  }

  // ================== Mensajes de audio ==================
  async sendAudioMessage(targetUser, byteArray) {
    if (!this.subject) return;
    try {
      const data = byteArray instanceof Uint8Array ? byteArray : Uint8Array.from(byteArray);
      await this.subject.sendAudioMessage(this.name, targetUser, data);
    } catch (e) {
      console.error("Error enviando mensaje de audio:", e);
    }
  }

  // ================== Subscripción de audio ==================
  subscribe(callback) {
    this.callbacks.push(callback);
  }

  notify(bytes) {
    this.callbacks.forEach(cb => cb(bytes));
  }

  // ================== Callbacks ==================
  onIncomingCall(cb) { this.incomingCallCB = cb; }
  onCallAccepted(cb) { this.callAcceptedCB = cb; }
  onCallRejected(cb) { this.callRejectedCB = cb; }
  onCallColgada(cb) { this.callColgadaCB = cb; }

  // ================== Notificaciones internas ==================
  notifyIncomingCall(fromUser) {
    if (this.incomingCallCB) this.incomingCallCB(fromUser);
  }

  notifyCallAccepted(fromUser) {
    if (this.callAcceptedCB) this.callAcceptedCB(fromUser);
  }

  notifyCallRejected(fromUser) {
    if (this.callRejectedCB) this.callRejectedCB(fromUser);
  }

  notifyCallColgada(byUser) {
    console.log("[Delegate] notifyCallColgada:", byUser);

    // Actualizamos currentCall si coincide
    if (this.currentCall === byUser) this.currentCall = null;

    // Llamamos al callback del Player para actualizar el botón
    if (this.callColgadaCB) this.callColgadaCB(byUser);
  }
}

const instance = new IceDelegate();
export default instance;

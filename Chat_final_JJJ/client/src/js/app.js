// ===================== app.js (Adaptado para ICE) =====================
const AppController = {
  recordingStartTime: null,
  recordingInterval: null,
  callDurationInterval: null,

  async init() {
    console.log("Initializing chat application...");

    window.UI.init();

    // Verificar si usar ICE o HTTP
    const useICE = true; // Cambiar según necesites

    if (useICE) {
      console.log("Modo ICE activado");
      this.setupICECallbacks();
    } else {
      try {
        await window.API.healthCheck();
        console.log("Connected to proxy server");
      } catch (error) {
        console.error("Cannot connect to proxy server:", error);
        alert("No se puede conectar al servidor.");
        return;
      }
    }

    this.setupLoginListeners();
    this.setupChatListeners();
    this.setupModalListeners();
    this.setupAudioListeners();
  },

  setupICECallbacks() {
    // Configurar callbacks de ICE
    window.IceDelegate.onIncomingCall = (fromUser) => {
      console.log("📞 Llamada entrante de:", fromUser);
      
      if (window.UI.callListener) {
        window.UI.callListener({
          type: "incoming",
          callerId: fromUser,
          callerName: fromUser,
          callId: `call_${Date.now()}`
        });
      }

      if (window.AudioManager) {
        window.AudioManager.currentCall = {
          id: `call_${Date.now()}`,
          callerId: fromUser,
          callerName: fromUser,
          startTime: Date.now(),
          type: "incoming"
        };
      }

      window.UI.showIncomingCallModal(fromUser);
    };

    window.IceDelegate.onCallAccepted = async (byUser) => {
      console.log("✅ Llamada aceptada por:", byUser);
      
      if (window.AudioManager) {
        window.AudioManager.currentCall = {
          id: `call_${Date.now()}`,
          recipientId: byUser,
          recipientName: byUser,
          startTime: Date.now()
        };
        
        await window.AudioManager.startLiveRecording();
      }

      window.UI.showActiveCallModal(byUser);
      this.startCallDurationTimer();
    };

    window.IceDelegate.onCallRejected = (byUser) => {
      console.log("❌ Llamada rechazada por:", byUser);
      
      if (window.AudioManager) {
        window.AudioManager.stopLiveRecording();
        window.AudioManager.currentCall = null;
      }

      window.UI.hideActiveCallModal();
      window.UI.hideIncomingCallModal();
    };

    window.IceDelegate.onCallEnded = (byUser) => {
      console.log("📴 Llamada colgada por:", byUser);
      
      if (window.AudioManager) {
        window.AudioManager.stopLiveRecording();
        window.AudioManager.currentCall = null;
      }

      clearInterval(this.callDurationInterval);
      window.UI.hideActiveCallModal();
      
      alert(`La llamada fue terminada por ${byUser}`);
    };

    window.IceDelegate.onAudioReceived = (bytes) => {
      if (window.AudioManager) {
        window.AudioManager.playAudio(bytes);
      }
    };
  },

  setupLoginListeners() {
    window.UI.loginBtn.addEventListener("click", () => this.handleLogin());
    window.UI.registerBtn.addEventListener("click", () => this.handleRegister());

    window.UI.usernameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleLogin();
      }
    });
  },

  setupChatListeners() {
    window.UI.logoutBtn.addEventListener("click", () => this.handleLogout());
    window.UI.sendBtn.addEventListener("click", () => this.handleSendMessage());

    window.UI.messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    const refreshUsersBtn = document.getElementById("refresh-users-btn");
    if (refreshUsersBtn) {
      refreshUsersBtn.addEventListener("click", () => this.loadUsers());
    }

    const createGroupBtn = document.getElementById("create-group-btn");
    if (createGroupBtn) {
      createGroupBtn.addEventListener("click", () => window.UI.showModal());
    }

    const viewHistoryBtn = document.getElementById("view-history-btn");
    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener("click", () => this.handleViewHistory());
    }
  },

  setupAudioListeners() {
    if (window.UI.sendAudioBtn) {
      let isRecording = false;

      window.UI.sendAudioBtn.addEventListener("mousedown", async () => {
        if (isRecording) return;

        const hasPermission = await window.AudioManager.initAudio();
        if (!hasPermission) return;

        isRecording = true;
        this.recordingStartTime = Date.now();
        window.AudioManager.startRecording();
        window.UI.showRecordingIndicator();

        this.recordingInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
          window.UI.updateRecordingTime(elapsed);
        }, 100);
      });

      window.UI.sendAudioBtn.addEventListener("mouseup", async () => {
        if (!isRecording) return;

        isRecording = false;
        clearInterval(this.recordingInterval);
        window.AudioManager.stopRecording();
        window.UI.hideRecordingIndicator();

        // Obtener el audio grabado
        const audioData = await window.AudioManager.handleRecordingStop();
        
        // Enviar mensaje de audio por ICE
        const chat = window.UI.getCurrentChat();
        if (chat.type === "user" && audioData.pcm16) {
          await window.IceDelegate.sendAudioMessage(chat.id, audioData.pcm16);
          console.log("Mensaje de audio enviado");
        }
      });

      window.UI.sendAudioBtn.addEventListener("mouseleave", () => {
        if (isRecording) {
          isRecording = false;
          clearInterval(this.recordingInterval);
          window.AudioManager.stopRecording();
          window.UI.hideRecordingIndicator();
        }
      });
    }

    if (window.UI.callBtn) {
      window.UI.callBtn.addEventListener("click", () => this.handleInitiateCall());
    }

    if (window.UI.rejectCallBtn) {
      window.UI.rejectCallBtn.addEventListener("click", () => this.handleRejectCall());
    }

    if (window.UI.answerCallBtn) {
      window.UI.answerCallBtn.addEventListener("click", () => this.handleAnswerCall());
    }

    if (window.UI.endCallBtn) {
      window.UI.endCallBtn.addEventListener("click", () => this.handleEndCall());
    }

    if (window.UI.muteBtn) {
      window.UI.muteBtn.addEventListener("click", () => this.handleToggleMute());
    }
  },

  async handleInitiateCall() {
    const chat = window.UI.getCurrentChat();

    if (!chat.type || !chat.id) {
      alert("Por favor selecciona un usuario primero para llamar");
      return;
    }

    if (chat.type !== "user") {
      alert("Las llamadas solo están disponibles en chats privados");
      return;
    }

    try {
      const user = window.UI.allUsers.find((u) => u.id === chat.id);
      if (!user) {
        alert("Usuario no encontrado");
        return;
      }

      const call = await window.AudioManager.initiateCall(chat.id, user.username);
      
      if (call) {
        await window.AudioManager.startLiveRecording();
        window.UI.showActiveCallModal(user.username);
        this.startCallDurationTimer();
        console.log("Llamada iniciada con:", user.username);
      }
    } catch (error) {
      console.error("Error al iniciar llamada:", error);
      alert("Error al iniciar la llamada");
    }
  },

  async handleRejectCall() {
    const callerId = window.AudioManager.currentCall?.callerId;
    
    if (callerId) {
      await window.AudioManager.rejectCall(callerId);
    }
    
    window.UI.hideIncomingCallModal();
    console.log("Llamada rechazada");
  },

  async handleAnswerCall() {
    try {
      const callerId = window.AudioManager.currentCall?.callerId;
      
      if (!callerId) {
        alert("No hay llamada entrante");
        return;
      }

      const success = await window.AudioManager.answerCall(callerId);
      
      if (success) {
        window.UI.hideIncomingCallModal();
        window.UI.showActiveCallModal(window.AudioManager.currentCall.callerName);
        this.startCallDurationTimer();
        console.log("Llamada respondida");
      }
    } catch (error) {
      console.error("Error al responder llamada:", error);
      alert("Error al responder la llamada");
    }
  },

  async handleEndCall() {
    clearInterval(this.callDurationInterval);
    await window.AudioManager.endCall();
    window.UI.hideActiveCallModal();
    console.log("Llamada terminada");
  },

  handleToggleMute() {
    if (window.UI.muteBtn && window.AudioManager.stream) {
      const audioTracks = window.AudioManager.stream.getAudioTracks();
      const isMuted = audioTracks[0]?.enabled === false;

      audioTracks.forEach((track) => {
        track.enabled = !isMuted;
      });

      window.UI.muteBtn.style.opacity = isMuted ? "1" : "0.5";
      console.log(isMuted ? "Micrófono activado" : "Micrófono silenciado");
    }
  },

  startCallDurationTimer() {
    let seconds = 0;
    this.callDurationInterval = setInterval(() => {
      seconds++;
      window.UI.updateCallDuration(seconds);
    }, 1000);
  },

  setupModalListeners() {
    window.UI.confirmGroupBtn.addEventListener("click", () => this.handleCreateGroup());
    window.UI.cancelGroupBtn.addEventListener("click", () => window.UI.closeModal());

    window.UI.groupNameInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleCreateGroup();
      }
    });

    window.UI.confirmMembersBtn.addEventListener("click", () => this.handleAddMembers());
    window.UI.cancelMembersBtn.addEventListener("click", () => window.UI.closeAddMembersModal());
  },

  async handleLogin() {
    const username = window.UI.usernameInput.value.trim();

    if (!username) {
      window.UI.showError(window.UI.loginError, "Por favor ingresa un nombre de usuario");
      return;
    }

    try {
      window.UI.loginBtn.disabled = true;
      window.UI.loginBtn.textContent = "Conectando...";

      // Conectar a ICE
      const connected = await window.IceDelegate.init(username);
      
      if (connected) {
        console.log("Conectado al servidor ICE como:", username);
        
        // También conectar al servidor HTTP si es necesario
        const result = await window.API.login(username);
        
        if (result.success) {
          await this.onLoginSuccess();
        }
      } else {
        throw new Error("No se pudo conectar al servidor ICE");
      }
    } catch (error) {
      console.error("Login error:", error);
      window.UI.showError(window.UI.loginError, error.message || "Error al iniciar sesión");
    } finally {
      window.UI.loginBtn.disabled = false;
      window.UI.loginBtn.textContent = "Iniciar Sesión";
    }
  },

  async handleRegister() {
    const username = window.UI.usernameInput.value.trim();

    if (!username) {
      window.UI.showError(window.UI.loginError, "Por favor ingresa un nombre de usuario");
      return;
    }

    try {
      window.UI.registerBtn.disabled = true;
      window.UI.registerBtn.textContent = "Registrando...";

      // Conectar a ICE primero
      const connected = await window.IceDelegate.init(username);
      
      if (connected) {
        const result = await window.API.register(username);

        if (result.success) {
          console.log("Registration successful:", result.user.username);
          await this.onLoginSuccess();
        }
      } else {
        throw new Error("No se pudo conectar al servidor ICE");
      }
    } catch (error) {
      console.error("Registration error:", error);
      window.UI.showError(window.UI.loginError, error.message || "Error al registrarse");
    } finally {
      window.UI.registerBtn.disabled = false;
      window.UI.registerBtn.textContent = "Registrarse";
    }
  },

  async onLoginSuccess() {
    const currentUser = window.API.getCurrentUser();
    window.UI.setCurrentUser(currentUser);
    window.UI.showChatScreen();

    await this.loadUsers();
    await this.loadGroups();
  },

  async handleLogout() {
    try {
      await window.API.logout();
      console.log("Logged out successfully");
      window.UI.showLoginScreen();
    } catch (error) {
      console.error("Logout error:", error);
      window.UI.showLoginScreen();
    }
  },

  async loadUsers() {
    try {
      // Cargar usuarios de ICE
      const iceUsers = await window.IceDelegate.getUsers();
      
      // Cargar usuarios del servidor HTTP
      const result = await window.API.getUsers();

      if (result.success) {
        const currentUser = window.API.getCurrentUser();
        console.log("Users from server:", result.users);
        console.log("Users from ICE:", iceUsers);
        
        window.UI.renderUsers(result.users, currentUser.id);
        console.log("allUsers guardado con", window.UI.allUsers.length, "usuarios");
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  },

  async loadGroups() {
    try {
      const result = await window.API.getGroups();

      if (result.success) {
        window.UI.renderGroups(result.groups);
        console.log("Groups loaded:", result.groups.length);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  },

  async handleCreateGroup() {
    const groupName = window.UI.groupNameInput.value.trim();

    if (!groupName) {
      window.UI.showError(window.UI.groupError, "Por favor ingresa un nombre para el grupo");
      return;
    }

    try {
      window.UI.confirmGroupBtn.disabled = true;
      window.UI.confirmGroupBtn.textContent = "Creando...";

      const result = await window.API.createGroup(groupName);

      if (result.success) {
        console.log("Group created:", result.group.name);
        window.UI.closeModal();
        await this.loadGroups();
      }
    } catch (error) {
      console.error("Error creating group:", error);
      window.UI.showError(window.UI.groupError, error.message || "Error al crear el grupo");
    } finally {
      window.UI.confirmGroupBtn.disabled = false;
      window.UI.confirmGroupBtn.textContent = "Crear Grupo";
    }
  },

  async handleAddMembers() {
    const selectedMembers = window.UI.getSelectedMembers();

    if (selectedMembers.length === 0) {
      window.UI.showError(window.UI.membersError, "Por favor selecciona al menos un usuario");
      return;
    }

    try {
      window.UI.confirmMembersBtn.disabled = true;
      window.UI.confirmMembersBtn.textContent = "Agregando...";
      window.UI.hideError(window.UI.membersError);

      await window.API.addMembersToGroup(window.UI.currentGroup.id, selectedMembers);

      await this.loadGroups();

      if (window.UI.currentChatType === "group" && window.UI.currentChatId === window.UI.currentGroup.id) {
        const groupsData = await window.API.getGroups();
        if (groupsData.success) {
          const updatedGroup = groupsData.groups.find((g) => g.id === window.UI.currentGroup.id);
          if (updatedGroup) {
            window.UI.openGroupChat(updatedGroup);
          }
        }
      }

      window.UI.closeAddMembersModal();
    } catch (error) {
      console.error("Error adding members:", error);
      window.UI.showError(window.UI.membersError, error.message || "Error al agregar miembros");
    } finally {
      window.UI.confirmMembersBtn.disabled = false;
      window.UI.confirmMembersBtn.textContent = "Agregar";
    }
  },

  async handleSendMessage() {
    const content = window.UI.messageInput.value.trim();

    if (!content) {
      return;
    }

    const chat = window.UI.getCurrentChat();

    if (!chat.type || !chat.id) {
      alert("Por favor selecciona un usuario o grupo primero");
      return;
    }

    try {
      window.UI.sendBtn.disabled = true;

      let result;
      if (chat.type === "user") {
        result = await window.API.sendMessage(chat.id, content);
      } else {
        result = await window.API.sendGroupMessage(chat.id, content);
      }

      if (result.success) {
        window.UI.clearMessageInput();
        await this.loadMessages(chat.type, chat.id);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Error al enviar el mensaje: " + error.message);
    } finally {
      window.UI.sendBtn.disabled = false;
    }
  },

  async loadMessages(type, id) {
    try {
      let result;
      if (type === "user") {
        result = await window.API.getHistory(id);
      } else {
        result = await window.API.getGroupMessages(id);
      }

      if (result.success) {
        const currentUser = window.API.getCurrentUser();
        window.UI.renderMessages(result.messages, currentUser.id);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  },

  async handleViewHistory() {
    const chat = window.UI.getCurrentChat();

    if (!chat.type || !chat.id) {
      alert("Por favor selecciona un usuario o grupo primero");
      return;
    }

    try {
      let result;
      let chatName = "";

      if (chat.type === "user") {
        result = await window.API.getHistory(chat.id);
        const user = window.UI.allUsers.find((u) => u.id === chat.id);
        chatName = user ? user.username : "Usuario";
      } else {
        result = await window.API.getGroupMessages(chat.id);
        chatName = window.UI.currentGroup?.groupName || window.UI.currentGroup?.name || "Grupo";
      }

      if (result.success) {
        const currentUser = window.API.getCurrentUser();
        window.UI.showHistoryModal(chat.type, chatName);
        window.UI.renderHistoryMessages(result.messages, currentUser.id, chat.type);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      alert("Error al cargar el historial: " + error.message);
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  AppController.init();
});

document.addEventListener("click", async (e) => {
  const userItem = e.target.closest("#users-list .list-item");
  const groupItem = e.target.closest("#groups-list .list-item");

  if (userItem) {
    const userId = Number.parseInt(userItem.dataset.userId);
    await AppController.loadMessages("user", userId);
  } else if (groupItem) {
    const groupId = Number.parseInt(groupItem.dataset.groupId);
    window.UI.currentChatId = groupId;
    await AppController.loadMessages("group", groupId);
  }
});
// ===================== app.js (COMPLETO Y CORREGIDO) =====================
const AppController = {
  recordingStartTime: null,
  recordingInterval: null,
  callDurationInterval: null,
  iceReady: false,
  isRecordingAudioMessage: false,

  async init() {
    console.log("🚀 Initializing chat application...");

    await this.waitForIceDelegate();

    window.UI.init();

    this.connectICEtoAudioManager();

    this.setupLoginListeners();
    this.setupChatListeners();
    this.setupModalListeners();
    this.setupAudioListeners();
    this.setupICECallbacks();

    console.log("✅ Application initialized");
  },

  async waitForIceDelegate() {
    let attempts = 0;
    while (!window.IceDelegate && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.IceDelegate) {
      console.error("❌ IceDelegate no se pudo cargar");
      alert("Error: No se pudo cargar el sistema de llamadas ICE");
    } else {
      console.log("✅ IceDelegate cargado correctamente");
      this.iceReady = true;
    }
  },

  connectICEtoAudioManager() {
    if (window.IceDelegate && window.AudioManager) {
      window.IceDelegate.subscribe((bytes) => {
        window.AudioManager.playAudio(bytes);
      });
      console.log("✅ ICE conectado con AudioManager");
    }
  },

  setupICECallbacks() {
    if (!window.IceDelegate) {
      console.error("❌ IceDelegate no disponible para callbacks");
      return;
    }

    // Llamada entrante individual
    window.IceDelegate.onIncomingCall((fromUser) => {
      console.log("📞 Llamada individual entrante de:", fromUser);
      
      if (window.AudioManager) {
        window.AudioManager.currentCall = {
          id: `call_${Date.now()}`,
          callerId: fromUser,
          callerName: fromUser,
          startTime: Date.now(),
          type: "incoming",
          isGroup: false
        };
      }

      window.UI.showIncomingCallModal(fromUser, false);
    });

    // Llamada aceptada
    window.IceDelegate.onCallAccepted(async (byUser) => {
      console.log("✅ Llamada aceptada por:", byUser);
      
      if (window.AudioManager) {
        window.AudioManager.currentCall = {
          id: `call_${Date.now()}`,
          recipientId: byUser,
          recipientName: byUser,
          startTime: Date.now(),
          isGroup: false
        };
        
        await window.AudioManager.startLiveRecording();
      }

      window.UI.showActiveCallModal(byUser, false);
      this.startCallDurationTimer();
    });

    // Llamada rechazada
    window.IceDelegate.onCallRejected((byUser) => {
      console.log("❌ Llamada rechazada por:", byUser);
      
      if (window.AudioManager) {
        window.AudioManager.stopLiveRecording();
        window.AudioManager.currentCall = null;
      }

      window.UI.hideActiveCallModal();
      window.UI.hideIncomingCallModal();
      
      alert(`${byUser} rechazó la llamada`);
    });

    // Llamada colgada
    window.IceDelegate.onCallEnded((byUser) => {
      console.log("📴 Llamada colgada por:", byUser);
      
      if (window.AudioManager) {
        window.AudioManager.stopLiveRecording();
        window.AudioManager.currentCall = null;
      }

      clearInterval(this.callDurationInterval);
      window.UI.hideActiveCallModal();
      
      alert(`La llamada fue terminada por ${byUser}`);
    });

    // Llamada grupal entrante
    window.IceDelegate.onIncomingGroupCall((groupId, fromUser, members) => {
      console.log("📞 Llamada grupal entrante:", groupId, "de:", fromUser);
      
      if (window.AudioManager) {
        window.AudioManager.currentCall = {
          id: `group_call_${Date.now()}`,
          groupId: groupId,
          callerId: fromUser,
          callerName: fromUser,
          members: members,
          startTime: Date.now(),
          type: "incoming",
          isGroup: true
        };
      }

      window.UI.showIncomingCallModal(`Grupo (${fromUser})`, true, members);
    });

    // Llamada grupal actualizada
    window.IceDelegate.onGroupUpdated((groupId, members) => {
      console.log("🔄 Grupo actualizado:", groupId, members);
      window.UI.updateGroupCallMembers(members);
    });

    // Llamada grupal terminada
    window.IceDelegate.onGroupEnded((groupId) => {
      console.log("🛑 Llamada grupal terminada:", groupId);
      
      if (window.AudioManager) {
        window.AudioManager.stopLiveRecording();
        window.AudioManager.currentCall = null;
      }

      clearInterval(this.callDurationInterval);
      window.UI.hideActiveCallModal();
      
      alert("La llamada grupal ha terminado");
    });

    console.log("✅ ICE callbacks configurados");
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
  },

  setupAudioListeners() {
    // Botón para grabar mensaje de audio
    if (window.UI.sendAudioBtn) {
      window.UI.sendAudioBtn.addEventListener("click", async () => {
        if (this.isRecordingAudioMessage) return;

        const chat = window.UI.getCurrentChat();
        if (!chat.type || !chat.id) {
          alert("Por favor selecciona un chat primero");
          return;
        }

        const hasPermission = await window.AudioManager.initAudio();
        if (!hasPermission) return;

        this.isRecordingAudioMessage = true;
        this.recordingStartTime = Date.now();
        
        await window.AudioManager.startRecordingMessage();
        
        window.UI.showRecordingModal(chat.type === "group");

        this.recordingInterval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
          window.UI.updateRecordingModalTime(elapsed);
        }, 100);
      });
    }

    const stopRecordingBtn = document.getElementById("stop-recording-btn");
    if (stopRecordingBtn) {
      stopRecordingBtn.addEventListener("click", async () => {
        await this.handleStopRecording();
      });
    }

    const cancelRecordingBtn = document.getElementById("cancel-recording-btn");
    if (cancelRecordingBtn) {
      cancelRecordingBtn.addEventListener("click", () => {
        this.handleCancelRecording();
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

  async handleStopRecording() {
    if (!this.isRecordingAudioMessage) return;

    clearInterval(this.recordingInterval);
    this.isRecordingAudioMessage = false;

    const audioData = await window.AudioManager.stopRecordingMessage();
    window.UI.hideRecordingModal();

    if (!audioData || !audioData.pcm16) {
      alert("Error al grabar audio");
      return;
    }

    const chat = window.UI.getCurrentChat();

    try {
      let success = false;

      if (chat.type === "user") {
        const user = window.UI.allUsers.find(u => u.id === chat.id);
        if (!user) {
          alert("Usuario no encontrado");
          return;
        }
        
        success = await window.IceDelegate.sendAudioMessage(user.username, audioData.pcm16);
        console.log("✅ Mensaje de audio individual enviado a:", user.username);
        
        window.UI.appendAudioMessage({
          senderId: window.API.getCurrentUser().id,
          timestamp: new Date().toISOString(),
          duration: audioData.duration,
          type: 'audio'
        }, window.API.getCurrentUser().id);
        
      } else if (chat.type === "group") {
        const group = window.UI.currentGroup;
        if (!group) {
          alert("Grupo no encontrado");
          return;
        }
        
        const iceGroupId = `group_${group.id}`;
        
        success = await window.IceDelegate.sendAudioMessageGroup(iceGroupId, audioData.pcm16);
        console.log("✅ Mensaje de audio grupal enviado a:", iceGroupId);
        
        window.UI.appendAudioMessage({
          senderId: window.API.getCurrentUser().id,
          timestamp: new Date().toISOString(),
          duration: audioData.duration,
          type: 'audio'
        }, window.API.getCurrentUser().id);
      }

      if (!success) {
        alert("Error al enviar mensaje de audio");
      }
    } catch (error) {
      console.error("Error enviando mensaje de audio:", error);
      alert("Error al enviar mensaje de audio");
    }
  },

  handleCancelRecording() {
    if (!this.isRecordingAudioMessage) return;

    clearInterval(this.recordingInterval);
    this.isRecordingAudioMessage = false;

    window.AudioManager.cancelRecordingMessage();
    window.UI.hideRecordingModal();

    console.log("❌ Grabación cancelada");
  },

  async handleInitiateCall() {
    const chat = window.UI.getCurrentChat();

    if (!chat.type || !chat.id) {
      alert("Por favor selecciona un usuario o grupo primero");
      return;
    }

    try {
      if (chat.type === "user") {
        const user = window.UI.allUsers.find((u) => u.id === chat.id);
        if (!user) {
          alert("Usuario no encontrado");
          return;
        }

        const success = await window.IceDelegate.startCall(user.username);
        
        if (success) {
          window.AudioManager.currentCall = {
            id: `call_${Date.now()}`,
            recipientId: user.username,
            recipientName: user.username,
            startTime: Date.now(),
            isGroup: false
          };
          
          window.UI.showActiveCallModal(user.username, false);
          console.log("✅ Llamada individual iniciada con:", user.username);
        } else {
          alert("No se pudo iniciar la llamada");
        }
      } else if (chat.type === "group") {
        const group = window.UI.currentGroup;
        if (!group) {
          alert("Grupo no encontrado");
          return;
        }

        const memberUsernames = (group.memberIds || group.members || [])
          .map(memberId => {
            const user = window.UI.allUsers.find(u => u.id === memberId);
            return user ? user.username : null;
          })
          .filter(u => u !== null);

        const groupId = await window.IceDelegate.createGroupCall(memberUsernames);
        
        if (groupId) {
          window.AudioManager.currentCall = {
            id: `group_call_${Date.now()}`,
            groupId: groupId,
            members: memberUsernames,
            startTime: Date.now(),
            isGroup: true
          };
          
          await window.AudioManager.startLiveRecording();
          window.UI.showActiveCallModal(group.name || "Grupo", true, memberUsernames);
          console.log("✅ Llamada grupal iniciada:", groupId);
        } else {
          alert("No se pudo iniciar la llamada grupal");
        }
      }
    } catch (error) {
      console.error("Error al iniciar llamada:", error);
      alert("Error al iniciar la llamada");
    }
  },

  async handleRejectCall() {
    const call = window.AudioManager.currentCall;
    
    if (!call) return;

    if (call.isGroup) {
      await window.AudioManager.rejectGroupCall(call.groupId);
    } else {
      await window.AudioManager.rejectCall(call.callerId);
    }
    
    window.UI.hideIncomingCallModal();
    console.log("❌ Llamada rechazada");
  },

  async handleAnswerCall() {
    try {
      const call = window.AudioManager.currentCall;
      
      if (!call) {
        alert("No hay llamada entrante");
        return;
      }

      let success = false;

      if (call.isGroup) {
        success = await window.AudioManager.answerGroupCall(call.groupId);
        
        if (success) {
          window.UI.hideIncomingCallModal();
          window.UI.showActiveCallModal(call.callerName, true, call.members);
          this.startCallDurationTimer();
          console.log("✅ Llamada grupal respondida");
        }
      } else {
        success = await window.AudioManager.answerCall(call.callerId);
        
        if (success) {
          window.UI.hideIncomingCallModal();
          window.UI.showActiveCallModal(call.callerName, false);
          this.startCallDurationTimer();
          console.log("✅ Llamada individual respondida");
        }
      }

      if (!success) {
        alert("No se pudo responder la llamada");
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
    console.log("📴 Llamada terminada");
  },

  handleToggleMute() {
    if (window.UI.muteBtn && window.AudioManager.mediaStream) {
      const audioTracks = window.AudioManager.mediaStream.getAudioTracks();
      const isMuted = audioTracks[0]?.enabled === false;

      audioTracks.forEach((track) => {
        track.enabled = !isMuted;
      });

      window.UI.muteBtn.style.opacity = isMuted ? "1" : "0.5";
      console.log(isMuted ? "🔊 Micrófono activado" : "🔇 Micrófono silenciado");
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

    if (!this.iceReady) {
      window.UI.showError(window.UI.loginError, "Sistema ICE no está listo. Recarga la página.");
      return;
    }

    try {
      window.UI.loginBtn.disabled = true;
      window.UI.loginBtn.textContent = "Conectando...";

      const connected = await window.IceDelegate.init(username);
      
      if (!connected) {
        throw new Error("No se pudo conectar al servidor ICE");
      }

      console.log("✅ Conectado al servidor ICE como:", username);
      
      const result = await window.API.login(username);
      
      if (result.success) {
        await this.onLoginSuccess();
      } else {
        throw new Error(result.error || "Error al iniciar sesión");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
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

    if (!this.iceReady) {
      window.UI.showError(window.UI.loginError, "Sistema ICE no está listo. Recarga la página.");
      return;
    }

    try {
      window.UI.registerBtn.disabled = true;
      window.UI.registerBtn.textContent = "Registrando...";

      const connected = await window.IceDelegate.init(username);
      
      if (!connected) {
        throw new Error("No se pudo conectar al servidor ICE");
      }
      
      const result = await window.API.register(username);

      if (result.success) {
        console.log("✅ Registration successful:", result.user.username);
        await this.onLoginSuccess();
      } else {
        throw new Error(result.error || "Error al registrarse");
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
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
      console.log("✅ Logged out successfully");
      window.UI.showLoginScreen();
    } catch (error) {
      console.error("Logout error:", error);
      window.UI.showLoginScreen();
    }
  },

  async loadUsers() {
    try {
      const result = await window.API.getUsers();

      if (result.success) {
        const currentUser = window.API.getCurrentUser();
        window.UI.renderUsers(result.users, currentUser.id);
        console.log("✅ Usuarios cargados:", window.UI.allUsers.length);
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
        console.log("✅ Grupos cargados:", result.groups.length);
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
        console.log("✅ Group created:", result.group.name);
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
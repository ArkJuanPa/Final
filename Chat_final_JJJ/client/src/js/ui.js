// ===================== ui.js (COMPLETO Y CORREGIDO - PARTE 1) =====================

const UI = {
  // Screen elements
  loginScreen: null,
  chatScreen: null,

  // Login elements
  usernameInput: null,
  loginBtn: null,
  registerBtn: null,
  loginError: null,

  // Chat elements
  currentUsername: null,
  logoutBtn: null,
  usersList: null,
  groupsList: null,
  welcomeScreen: null,
  chatArea: null,
  chatTitle: null,
  chatSubtitle: null,
  messagesContainer: null,
  messageInput: null,
  sendBtn: null,
  searchInput: null,

  // Tab elements
  tabButtons: null,
  chatsTab: null,
  groupsTab: null,

  // Modal elements
  createGroupModal: null,
  groupNameInput: null,
  confirmGroupBtn: null,
  cancelGroupBtn: null,
  groupError: null,
  addMembersModal: null,
  membersListContainer: null,
  confirmMembersBtn: null,
  cancelMembersBtn: null,
  membersError: null,
  historyModal: null,
  historyModalTitle: null,
  historyMessagesContainer: null,
  closeHistoryBtn: null,

  // Audio and Call elements
  recordingModal: null,
  recordingModalTime: null,
  recordingChatType: null,
  stopRecordingBtn: null,
  cancelRecordingBtn: null,
  recordingIndicator: null,
  callBtn: null,
  sendAudioBtn: null,
  incomingCallModal: null,
  activeCallModal: null,
  rejectCallBtn: null,
  answerCallBtn: null,
  endCallBtn: null,
  muteBtn: null,
  callerNameElement: null,
  callTitleElement: null,
  callDurationElement: null,
  callAvatarLargeElement: null,

  // State
  currentChatType: null,
  currentChatId: null,
  currentGroup: null,
  previousGroupId: null, 
  allUsers: [],
  recordingTime: 0,

  init() {
    console.log("🎨 Inicializando UI...")

    // Login screen
    this.loginScreen = document.getElementById("login-screen")
    this.chatScreen = document.getElementById("chat-screen")

    this.usernameInput = document.getElementById("username-input")
    this.loginBtn = document.getElementById("login-btn")
    this.registerBtn = document.getElementById("register-btn")
    this.loginError = document.getElementById("login-error")

    // Chat screen
    this.currentUsername = document.getElementById("current-username")
    this.logoutBtn = document.getElementById("logout-btn")
    this.usersList = document.getElementById("users-list")
    this.groupsList = document.getElementById("groups-list")
    this.welcomeScreen = document.getElementById("welcome-screen")
    this.chatArea = document.getElementById("chat-area")
    this.chatTitle = document.getElementById("chat-title")
    this.chatSubtitle = document.getElementById("chat-subtitle")
    this.messagesContainer = document.getElementById("messages-container")
    this.messageInput = document.getElementById("message-input")
    this.sendBtn = document.getElementById("send-btn")
    this.searchInput = document.getElementById("search-input")

    // Tabs
    this.tabButtons = document.querySelectorAll(".tab-btn")
    this.chatsTab = document.getElementById("chats-tab")
    this.groupsTab = document.getElementById("groups-tab")

    // Modals
    this.createGroupModal = document.getElementById("create-group-modal")
    this.groupNameInput = document.getElementById("group-name-input")
    this.confirmGroupBtn = document.getElementById("confirm-group-btn")
    this.cancelGroupBtn = document.getElementById("cancel-group-btn")
    this.groupError = document.getElementById("group-error")

    this.addMembersModal = document.getElementById("add-members-modal")
    this.membersListContainer = document.getElementById("members-list")
    this.confirmMembersBtn = document.getElementById("confirm-members-btn")
    this.cancelMembersBtn = document.getElementById("cancel-members-btn")
    this.membersError = document.getElementById("members-error")

    this.historyModal = document.getElementById("history-modal")
    this.historyModalTitle = document.getElementById("history-modal-title")
    this.historyMessagesContainer = document.getElementById("history-messages-container")
    this.closeHistoryBtn = document.getElementById("close-history-btn")

    // Audio & Calls
    this.recordingModal = document.getElementById("recording-modal")
    this.recordingModalTime = document.getElementById("recording-modal-time")
    this.recordingChatType = document.getElementById("recording-chat-type")
    this.stopRecordingBtn = document.getElementById("stop-recording-btn")
    this.cancelRecordingBtn = document.getElementById("cancel-recording-btn")

    this.recordingIndicator = document.getElementById("recording-indicator")
    this.callBtn = document.getElementById("call-btn")
    this.sendAudioBtn = document.getElementById("send-audio-btn")
    this.incomingCallModal = document.getElementById("incoming-call-modal")
    this.activeCallModal = document.getElementById("active-call-modal")
    this.rejectCallBtn = document.getElementById("reject-call-btn")
    this.answerCallBtn = document.getElementById("answer-call-btn")
    this.endCallBtn = document.getElementById("end-call-btn")
    this.muteBtn = document.getElementById("mute-btn")
    this.callerNameElement = document.getElementById("caller-name")
    this.callTitleElement = document.getElementById("call-title")
    this.callDurationElement = document.getElementById("call-duration")
    this.callAvatarLargeElement = document.querySelector(".call-avatar-large")

    this.setupTabSwitching()
    this.setupModalClose()

    console.log("✅ UI inicializada correctamente")
  },

  setupTabSwitching() {
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab))
    })
  },

  setupModalClose() {
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.createGroupModal.classList.remove("active")
        this.addMembersModal.classList.remove("active")
        this.historyModal.classList.remove("active")
      })
    })

    if (this.closeHistoryBtn) {
      this.closeHistoryBtn.addEventListener("click", () => {
        this.historyModal.classList.remove("active")
      })
    }
  },

  showLoginScreen() {
    this.loginScreen.classList.add("active")
    this.chatScreen.classList.remove("active")
    this.usernameInput.value = ""
    this.hideError(this.loginError)
  },

  showChatScreen() {
    this.loginScreen.classList.remove("active")
    this.chatScreen.classList.add("active")
  },

  switchTab(tabName) {
    this.tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName)
    })

    this.chatsTab.classList.toggle("active", tabName === "chats")
    this.groupsTab.classList.toggle("active", tabName === "groups")
  },

  setCurrentUser(user) {
    this.currentUsername.textContent = user.username
    const userAvatar = document.querySelector(".user-avatar")
    if (userAvatar) {
      userAvatar.textContent = user.username.charAt(0).toUpperCase()
    }
  },

  renderUsers(users, currentUserId) {
    this.usersList.innerHTML = ""
    this.allUsers = users.map((user) => {
      if (typeof user === "string") {
        return { id: null, username: user }
      }
      return {
        id: user.id,
        username: typeof user.username === "string" ? user.username : user.name || "Usuario",
        online: user.online || false,
      }
    })

    const filteredUsers = this.allUsers.filter((u) => u.id !== currentUserId)

    if (filteredUsers.length === 0) {
      this.usersList.innerHTML = '<div class="empty-state">No hay usuarios disponibles</div>'
      return
    }

    filteredUsers.forEach((user) => {
      const item = document.createElement("div")
      item.className = "list-item"
      item.dataset.userId = user.id

      const avatar = document.createElement("div")
      avatar.className = "item-avatar"
      avatar.textContent = user.username.charAt(0).toUpperCase()

      const info = document.createElement("div")
      info.className = "item-info"

      const name = document.createElement("div")
      name.className = "item-name"
      name.textContent = user.username

      const status = document.createElement("div")
      status.className = "item-status"

      const statusIndicator = document.createElement("span")
      statusIndicator.className = `status-indicator ${user.online ? "online" : ""}`

      const statusText = document.createTextNode(user.online ? "En línea" : "Desconectado")

      status.appendChild(statusIndicator)
      status.appendChild(statusText)
      info.appendChild(name)
      info.appendChild(status)

      item.appendChild(avatar)
      item.appendChild(info)

      item.addEventListener("click", () => this.openUserChat(user))
      this.usersList.appendChild(item)
    })
  },

  renderGroups(groups) {
    this.groupsList.innerHTML = ""

    if (groups.length === 0) {
      this.groupsList.innerHTML = '<div class="empty-state">No tienes grupos aún</div>'
      return
    }

    groups.forEach((group) => {
      const item = document.createElement("div")
      item.className = "list-item"
      item.dataset.groupId = group.id

      const avatar = document.createElement("div")
      avatar.className = "item-avatar"
      const groupName = group.name || group.groupName || "Grupo"
      avatar.textContent = groupName.charAt(0).toUpperCase()

      const info = document.createElement("div")
      info.className = "item-info"

      const name = document.createElement("div")
      name.className = "item-name"
      name.textContent = groupName

      const subtitle = document.createElement("div")
      subtitle.className = "item-subtitle"
      const memberCount = (group.memberIds && group.memberIds.length) || (group.members && group.members.length) || 0
      subtitle.textContent = `${memberCount} miembro${memberCount !== 1 ? "s" : ""}`

      info.appendChild(name)
      info.appendChild(subtitle)

      item.appendChild(avatar)
      item.appendChild(info)

      item.addEventListener("click", () => this.openGroupChat(group))
      this.groupsList.appendChild(item)
    })
  },

  openUserChat(user) {
    const AppController = window.AppController // Declare AppController here
    if (AppController) {
      AppController.openUserChatAndLoadHistory(user)
    } else {
      // Fallback si AppController no está disponible
      this.currentChatType = "user"
      this.currentChatId = user.id
      this.currentGroup = null

      this.welcomeScreen.style.display = "none"
      this.chatArea.classList.remove("hidden")

      this.chatTitle.textContent = user.username
      this.chatSubtitle.textContent = user.online ? "En línea" : "Desconectado"

      const chatAvatar = document.querySelector(".chat-avatar")
      if (chatAvatar) {
        chatAvatar.textContent = user.username.charAt(0).toUpperCase()
      }

      const groupInfoBtn = document.getElementById("group-info-btn")
      if (groupInfoBtn) {
        groupInfoBtn.style.display = "none"
      }

      this.messagesContainer.innerHTML = ""

      document.querySelectorAll("#users-list .list-item").forEach((item) => {
        item.classList.remove("active")
      })
      const activeItem = document.querySelector(`#users-list .list-item[data-user-id="${user.id}"]`)
      if (activeItem) activeItem.classList.add("active")
    }
  },

  openGroupChat(group) {
    const AppController = window.AppController
    if (AppController) {
      // ✅ NUEVO: Guardar grupo anterior antes de cambiar
      if (this.currentGroup && this.currentGroup.id !== group.id) {
        this.previousGroupId = this.currentGroup.id;
        console.log(`[UI] Grupo anterior guardado: ${this.previousGroupId}`);
      }
      AppController.openGroupChatAndLoadHistory(group)
    } else {
      // Fallback si AppController no está disponible
      this.currentChatType = "group"
      this.currentChatId = group.id
      this.currentGroup = group

      this.welcomeScreen.style.display = "none"
      this.chatArea.classList.remove("hidden")

      const groupName = group.name || group.groupName || "Grupo"
      this.chatTitle.textContent = groupName
      const memberCount = (group.memberIds && group.memberIds.length) || (group.members && group.members.length) || 0
      this.chatSubtitle.textContent = `${memberCount} miembro${memberCount !== 1 ? "s" : ""}`

      const chatAvatar = document.querySelector(".chat-avatar")
      if (chatAvatar) {
        chatAvatar.textContent = groupName.charAt(0).toUpperCase()
      }

      const groupInfoBtn = document.getElementById("group-info-btn")
      if (groupInfoBtn) {
        groupInfoBtn.style.display = "flex"
        groupInfoBtn.onclick = () => window.API.showAddMembersModal(group)
      }

      this.messagesContainer.innerHTML = ""

      document.querySelectorAll("#groups-list .list-item").forEach((item) => {
        item.classList.remove("active")
      })
      const activeItem = document.querySelector(`#groups-list .list-item[data-group-id="${group.id}"]`)
      if (activeItem) activeItem.classList.add("active")
    }
  },

  renderMessages(messages, currentUserId) {
    console.log("[v0] renderMessages called with:", {
      messageCount: messages ? messages.length : 0,
      currentUserId,
      messages: messages ? messages.slice(0, 3) : [],
    })

    this.messagesContainer.innerHTML = ""

    if (!messages || messages.length === 0) {
      this.messagesContainer.innerHTML =
        '<div class="empty-state">No hay mensajes aún. ¡Comienza la conversación!</div>'
      return
    }

    // VALIDACIÓN: Solo procesar objetos válidos
    const validMessages = messages.filter(msg => {
      if (typeof msg !== 'object' || msg === null) {
        console.warn('[v0] Mensaje inválido (no es objeto):', msg)
        return false
      }
      if (Array.isArray(msg)) {
        console.warn('[v0] Mensaje inválido (es array):', msg)
        return false
      }
      return true
    })

    validMessages.forEach((msg, index) => {
      console.log(`[v0] Processing message ${index}:`, msg)
      this.appendMessage(msg, currentUserId)
    })

    this.scrollToBottom()
  },

  appendMessage(message, currentUserId) {
  console.log(" appendMessage called with:", { message, currentUserId })

  const isSent = message.senderId === currentUserId
  const messageDiv = document.createElement("div")
  messageDiv.className = `message ${isSent ? "sent" : "received"}`

  const timeValue = message.timestamp || message.startTime
  const time = timeValue
    ? new Date(timeValue).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin hora"

  let senderHtml = ""
  if (!isSent && this.currentChatType === "group") {
    senderHtml = `<div class="message-sender">${message.senderUsername || "Usuario"}</div>`
  }

  let contentHtml = ""

  if (message.type === "AUDIO" || message.type === "audio") {
    contentHtml = `
      <div class="audio-message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <span class="audio-message-text">🎤 Mensaje de voz</span>
      </div>
    `
  } else if (message.type === "CALL" || message.type === "call") {
    const callStatus = message.status || "finalizada"
    const duration = message.durationSeconds 
      ? `${Math.floor(message.durationSeconds / 60)}:${(message.durationSeconds % 60).toString().padStart(2, '0')}`
      : "0:00"
    
    contentHtml = `
      <div class="call-message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2196f3" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
        <div class="call-message-info">
          <span class="call-message-title"> Llamada ${callStatus}</span>
          <span class="call-message-duration">Duración: ${duration}</span>
        </div>
      </div>
    `
  } else {
    contentHtml = `
      <div class="message-content">${this.escapeHtml(message.content || "")}</div>
    `
  }

  messageDiv.innerHTML = `
    ${senderHtml}
    ${contentHtml}
    <div class="message-time">${time}</div>
  `

  this.messagesContainer.appendChild(messageDiv)
},

  // NUEVO: Agregar mensaje de audio en tiempo real
  appendAudioMessage(message, currentUserId) {
    const isSent = message.senderId === currentUserId
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${isSent ? "sent" : "received"}`

    const time = new Date(message.timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })

    let senderHtml = ""
    if (!isSent && this.currentChatType === "group") {
      senderHtml = `<div class="message-sender">${message.senderUsername || "Usuario"}</div>`
    }

    const contentHtml = `
      <div class="audio-message">
        <div class="audio-play-btn playing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
        <span class="audio-duration">${message.duration || "0:00"}s</span>
        <span class="audio-status">Mensaje de audio ${isSent ? "enviado" : "recibido"}</span>
      </div>
    `

    const bubbleDiv = document.createElement("div")
    bubbleDiv.className = "message-bubble"

    const content = document.createElement("div")
    content.innerHTML = `
      ${senderHtml}
      ${contentHtml}
      <div class="message-time">${time}</div>
    `

    bubbleDiv.appendChild(content)
    messageDiv.appendChild(bubbleDiv)
    this.messagesContainer.appendChild(messageDiv)
    this.scrollToBottom()
  },

  playAudioMessage(audioUrl, button) {
    const audio = new Audio(audioUrl)
    audio.play()
    button.disabled = true
    button.style.opacity = "0.5"
    audio.onended = () => {
      button.disabled = false
      button.style.opacity = "1"
    }
  },

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
  },

  clearMessageInput() {
    this.messageInput.value = ""
  },

  showModal() {
    this.createGroupModal.classList.add("active")
    this.groupNameInput.value = ""
    this.hideError(this.groupError)
    this.groupNameInput.focus()
  },

  closeModal() {
    this.createGroupModal.classList.remove("active")
  },

  showAddMembersModal(group) {
    this.addMembersModal.classList.add("active")
    this.hideError(this.membersError)
    this.renderMemberSelection(group)
  },

  closeAddMembersModal() {
    this.addMembersModal.classList.remove("active")
  },

  renderMemberSelection(group) {
    console.log("[UI] renderMemberSelection iniciado")
    this.membersListContainer.innerHTML = ""

    const currentUser = window.API.getCurrentUser()
    if (!currentUser) {
      console.error("[UI] No hay usuario actual")
      this.membersListContainer.innerHTML = '<div class="empty-state">Error: No se encontró usuario actual</div>'
      return
    }

    const groupMemberIds = (group.memberIds || group.members || []).map((m) => {
      if (typeof m === "object" && m.id !== undefined) return m.id
      return Number(m)
    })

    if (!this.allUsers || this.allUsers.length === 0) {
      console.error("[UI] allUsers está vacío")
      this.membersListContainer.innerHTML = '<div class="empty-state">No se pudieron cargar los usuarios</div>'
      return
    }

    const availableUsers = this.allUsers.filter((u) => {
      return u.id !== currentUser.id && !groupMemberIds.includes(u.id)
    })

    if (availableUsers.length === 0) {
      this.membersListContainer.innerHTML = '<div class="empty-state">No hay usuarios disponibles para agregar</div>'
      return
    }

    availableUsers.forEach((user) => {
      const memberItem = document.createElement("div")
      memberItem.className = "member-item"

      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.value = user.id
      checkbox.id = `member-${user.id}`

      const label = document.createElement("label")
      label.htmlFor = `member-${user.id}`
      label.textContent = user.username

      memberItem.appendChild(checkbox)
      memberItem.appendChild(label)
      this.membersListContainer.appendChild(memberItem)
    })
  },

  getSelectedMembers() {
    const checkboxes = document.querySelectorAll("#members-list input[type='checkbox']:checked")
    return Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))
  },

  showError(element, message) {
    if (element) {
      element.textContent = message
      element.classList.add("active")
    }
  },

  hideError(element) {
    if (element) {
      element.textContent = ""
      element.classList.remove("active")
    }
  },

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  },

  getCurrentChat() {
    return {
      type: this.currentChatType,
      id: this.currentChatId,
    }
  },

  // ===================== ui.js (PARTE 2/2 - FUNCIONES DE GRABACIÓN Y LLAMADAS) =====================

  // ========== FUNCIONES DE GRABACIÓN ==========

  showRecordingModal(isGroup) {
    if (this.recordingModal) {
      this.recordingModal.classList.add("active")
      this.recordingModalTime.textContent = "0:00"
      this.recordingChatType.textContent = isGroup ? "Chat grupal" : "Chat individual"
    }
  },

  hideRecordingModal() {
    if (this.recordingModal) {
      this.recordingModal.classList.remove("active")
    }
  },

  updateRecordingModalTime(seconds) {
    if (this.recordingModalTime) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      this.recordingModalTime.textContent = `${mins}:${secs.toString().padStart(2, "0")}`
    }
  },

  showRecordingIndicator() {
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.remove("hidden")
    }
  },

  hideRecordingIndicator() {
    if (this.recordingIndicator) {
      this.recordingIndicator.classList.add("hidden")
    }
  },

  updateRecordingTime(seconds) {
    const recordingTime = document.getElementById("recording-time")
    if (recordingTime) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      recordingTime.textContent = `${mins}:${secs.toString().padStart(2, "0")}`
    }
  },

  // ========== FUNCIONES DE LLAMADAS ==========

  showIncomingCallModal(callerName, isGroup = false, members = []) {
    if (this.callerNameElement) {
      this.callerNameElement.textContent = callerName
    }
    if (this.callAvatarLargeElement) {
      this.callAvatarLargeElement.textContent = callerName.charAt(0).toUpperCase()
    }

    if (isGroup && members.length > 0) {
      this.renderCallMembers(members, this.incomingCallModal)
    }

    if (this.incomingCallModal) {
      this.incomingCallModal.classList.add("active")
    }
  },

  hideIncomingCallModal() {
    if (this.incomingCallModal) {
      this.incomingCallModal.classList.remove("active")
    }
  },

  showActiveCallModal(name, isGroup = false, members = []) {
    if (this.callTitleElement) {
      this.callTitleElement.textContent = isGroup ? `Llamada Grupal: ${name}` : name
    }
    if (this.callAvatarLargeElement) {
      this.callAvatarLargeElement.textContent = name.charAt(0).toUpperCase()
    }

    if (isGroup && members.length > 0) {
      this.renderCallMembers(members, this.activeCallModal)
    }

    if (this.activeCallModal) {
      this.activeCallModal.classList.add("active")
    }
  },

  hideActiveCallModal() {
    if (this.activeCallModal) {
      this.activeCallModal.classList.remove("active")
    }
  },

  updateCallDuration(seconds) {
    if (this.callDurationElement) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      this.callDurationElement.textContent = `${mins}:${secs.toString().padStart(2, "0")}`
    }
  },

  renderCallMembers(members, modalElement) {
    if (!modalElement) return

    let membersContainer = modalElement.querySelector(".call-members-list")

    if (!membersContainer) {
      membersContainer = document.createElement("div")
      membersContainer.className = "call-members-list"

      const modalBody = modalElement.querySelector(".call-modal-body")
      if (modalBody) {
        modalBody.appendChild(membersContainer)
      }
    }

    membersContainer.innerHTML = ""

    members.forEach((member) => {
      const memberItem = document.createElement("div")
      memberItem.className = "call-member-item"

      const avatar = document.createElement("div")
      avatar.className = "call-member-avatar"
      avatar.textContent = member.charAt(0).toUpperCase()

      const name = document.createElement("div")
      name.className = "call-member-name"
      name.textContent = member

      const status = document.createElement("div")
      status.className = "call-member-status"
      status.textContent = "En llamada"

      memberItem.appendChild(avatar)
      memberItem.appendChild(name)
      memberItem.appendChild(status)

      membersContainer.appendChild(memberItem)
    })
  },

  updateGroupCallMembers(members) {
    if (this.activeCallModal && this.activeCallModal.classList.contains("active")) {
      this.renderCallMembers(members, this.activeCallModal)
    }
  },
}

// Exponer globalmente
if (typeof window !== "undefined") {
  window.UI = UI
  console.log("✅ UI registrado globalmente")
} else {
  console.error("❌ Window no está definido")
}

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
  allUsers: [],
  recordingTime: 0,

  init() {
    this.loginScreen = document.getElementById("login-screen")
    this.chatScreen = document.getElementById("chat-screen")

    this.usernameInput = document.getElementById("username-input")
    this.loginBtn = document.getElementById("login-btn")
    this.registerBtn = document.getElementById("register-btn")
    this.loginError = document.getElementById("login-error")

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

    this.tabButtons = document.querySelectorAll(".tab-btn")
    this.chatsTab = document.getElementById("chats-tab")
    this.groupsTab = document.getElementById("groups-tab")

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
    userAvatar.textContent = user.username.charAt(0).toUpperCase()
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
    this.currentChatType = "user"
    this.currentChatId = user.id
    this.currentGroup = null

    this.welcomeScreen.style.display = "none"
    this.chatArea.classList.remove("hidden")

    this.chatTitle.textContent = user.username
    this.chatSubtitle.textContent = user.online ? "En línea" : "Desconectado"

    const chatAvatar = document.querySelector(".chat-avatar")
    chatAvatar.textContent = user.username.charAt(0).toUpperCase()

    document.getElementById("group-info-btn").style.display = "none"
    this.messagesContainer.innerHTML = ""

    document.querySelectorAll("#users-list .list-item").forEach((item) => {
      item.classList.remove("active")
    })
    const activeItem = document.querySelector(`#users-list .list-item[data-user-id="${user.id}"]`)
    if (activeItem) activeItem.classList.add("active")
  },

  openGroupChat(group) {
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
    chatAvatar.textContent = groupName.charAt(0).toUpperCase()

    const groupInfoBtn = document.getElementById("group-info-btn")
    groupInfoBtn.style.display = "flex"

    // CAMBIO IMPORTANTE: Usar API.showAddMembersModal en lugar de this.showAddMembersModal
    groupInfoBtn.onclick = () => window.API.showAddMembersModal(group)

    this.messagesContainer.innerHTML = ""

    document.querySelectorAll("#groups-list .list-item").forEach((item) => {
      item.classList.remove("active")
    })
    const activeItem = document.querySelector(`#groups-list .list-item[data-group-id="${group.id}"]`)
    if (activeItem) activeItem.classList.add("active")
  },

  renderMessages(messages, currentUserId) {
    this.messagesContainer.innerHTML = ""

    if (messages.length === 0) {
      this.messagesContainer.innerHTML =
        '<div class="empty-state">No hay mensajes aún. ¡Comienza la conversación!</div>'
      return
    }

    messages.forEach((msg) => {
      this.appendMessage(msg, currentUserId)
    })

    this.scrollToBottom()
  },

  appendMessage(message, currentUserId) {
    const isSent = message.senderId === currentUserId
    const messageDiv = document.createElement("div")
    messageDiv.className = `message ${isSent ? "sent" : "received"}`

    const time = new Date(message.timestamp).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })

    let senderHtml = ""
    if (!isSent && this.currentChatType === "group") {
      senderHtml = `<div class="message-sender">${message.senderUsername}</div>`
    }

    let contentHtml = ""
    if (message.type === "audio") {
      contentHtml = `
        <div class="audio-message">
          <button class="audio-play-btn" data-audio-url="${this.escapeHtml(message.audioUrl)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <span class="audio-duration" data-duration="${message.duration || "0:00"}">${message.duration || "0:00"}</span>
        </div>
      `
    } else {
      contentHtml = `<div class="message-content">${this.escapeHtml(message.content)}</div>`
    }

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

    if (message.type === "audio") {
      const audioBtn = bubbleDiv.querySelector(".audio-play-btn")
      if (audioBtn) {
        audioBtn.addEventListener("click", () => {
          const audioUrl = audioBtn.dataset.audioUrl
          this.playAudioMessage(audioUrl, audioBtn)
        })
      }
    }

    this.messagesContainer.appendChild(messageDiv)
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
    console.log("[v0] renderMemberSelection iniciado")
    console.log("[v0] Group:", group)
    console.log("[v0] UI.allUsers:", this.allUsers)

    this.membersListContainer.innerHTML = ""

    const currentUser = window.API.getCurrentUser()
    if (!currentUser) {
      console.error("[v0] No hay usuario actual")
      this.membersListContainer.innerHTML = '<div class="empty-state">Error: No se encontró usuario actual</div>'
      return
    }

    console.log("[v0] Current user:", currentUser)

    // Normalizar IDs de miembros del grupo
    const groupMemberIds = (group.memberIds || group.members || []).map((m) => {
      if (typeof m === "object" && m.id !== undefined) return m.id
      return Number(m)
    })

    console.log("[v0] Group member IDs:", groupMemberIds)

    if (!this.allUsers || this.allUsers.length === 0) {
      console.error("[v0] allUsers está vacío:", this.allUsers)
      this.membersListContainer.innerHTML = '<div class="empty-state">No se pudieron cargar los usuarios</div>'
      return
    }

    console.log("[v0] Total usuarios disponibles:", this.allUsers.length)

    const availableUsers = this.allUsers.filter((u) => {
      const isCurrentUser = u.id === currentUser.id
      const isGroupMember = groupMemberIds.includes(u.id)

      console.log(
        `[v0] Usuario ${u.username} (${u.id}): isCurrentUser=${isCurrentUser}, isGroupMember=${isGroupMember}`,
      )

      return !isCurrentUser && !isGroupMember
    })

    console.log("[v0] Usuarios disponibles para agregar:", availableUsers.length, availableUsers)

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

    console.log("[v0] Renderización completada con", availableUsers.length, "usuarios")
  },

  getSelectedMembers() {
    const checkboxes = document.querySelectorAll("#members-list input[type='checkbox']:checked")
    return Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))
  },

  showError(element, message) {
    element.textContent = message
    element.classList.add("active")
  },

  hideError(element) {
    element.textContent = ""
    element.classList.remove("active")
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

  showHistoryModal(chatType, chatName) {
    this.historyModal.classList.add("active")
    const typeText = chatType === "user" ? "Chat con" : "Grupo"
    this.historyModalTitle.textContent = `Historial de ${typeText} ${chatName}`
  },

  closeHistoryModal() {
    this.historyModal.classList.remove("active")
  },

  renderHistoryMessages(messages, currentUserId, chatType) {
    this.historyMessagesContainer.innerHTML = ""

    if (messages.length === 0) {
      this.historyMessagesContainer.innerHTML = `
        <div class="history-empty-state">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>No hay mensajes en el historial</p>
        </div>
      `
      return
    }

    // Agrupar mensajes por fecha
    const messagesByDate = {}
    messages.forEach((msg) => {
      const date = new Date(msg.timestamp)
      const dateKey = date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      if (!messagesByDate[dateKey]) {
        messagesByDate[dateKey] = []
      }
      messagesByDate[dateKey].push(msg)
    })

    // Renderizar mensajes agrupados por fecha
    Object.entries(messagesByDate).forEach(([dateKey, msgs]) => {
      // Añadir divisor de fecha
      const dateDivider = document.createElement("div")
      dateDivider.className = "history-date-divider"
      dateDivider.innerHTML = `<span class="history-date-label">${dateKey}</span>`
      this.historyMessagesContainer.appendChild(dateDivider)

      // Añadir mensajes de ese día
      msgs.forEach((msg) => {
        this.appendHistoryMessage(msg, currentUserId, chatType)
      })
    })

    // Scroll al final
    this.historyMessagesContainer.scrollTop = this.historyMessagesContainer.scrollHeight
  },

  appendHistoryMessage(message, currentUserId, chatType) {
    const isSent = message.senderId === currentUserId
    const messageDiv = document.createElement("div")
    messageDiv.className = `history-message ${isSent ? "sent" : "received"}`

    const date = new Date(message.timestamp)
    const time = date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
    const fullDate = date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    let senderHtml = ""
    if (!isSent && chatType === "group") {
      senderHtml = `<div class="history-message-sender">${message.senderUsername || "Usuario"}</div>`
    }

    const bubbleDiv = document.createElement("div")
    bubbleDiv.className = "history-message-bubble"

    bubbleDiv.innerHTML = `
      ${senderHtml}
      <div class="history-message-content">${this.escapeHtml(message.content)}</div>
      <div class="history-message-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        ${time}
      </div>
    `

    messageDiv.appendChild(bubbleDiv)
    this.historyMessagesContainer.appendChild(messageDiv)
  },

  showRecordingIndicator() {
    this.recordingIndicator.classList.remove("hidden")
    this.updateRecordingTime()
  },

  hideRecordingIndicator() {
    this.recordingIndicator.classList.add("hidden")
  },

  updateRecordingTime(seconds = 0) {
    const recordingTime = document.getElementById("recording-time")
    if (recordingTime) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      recordingTime.textContent = `${mins}:${secs.toString().padStart(2, "0")}`
    }
  },

  showIncomingCallModal(callerName) {
    if (this.callerNameElement) {
      this.callerNameElement.textContent = callerName
    }
    if (this.callAvatarLargeElement) {
      this.callAvatarLargeElement.textContent = callerName.charAt(0).toUpperCase()
    }
    this.incomingCallModal.classList.add("active")
  },

  hideIncomingCallModal() {
    this.incomingCallModal.classList.remove("active")
  },

  showActiveCallModal(name) {
    if (this.callTitleElement) {
      this.callTitleElement.textContent = name
    }
    if (this.callAvatarLargeElement) {
      this.callAvatarLargeElement.textContent = name.charAt(0).toUpperCase()
    }
    this.activeCallModal.classList.add("active")
  },

  hideActiveCallModal() {
    this.activeCallModal.classList.remove("active")
  },

  updateCallDuration(seconds) {
    if (this.callDurationElement) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      this.callDurationElement.textContent = `${mins}:${secs.toString().padStart(2, "0")}`
    }
  },
}

if (typeof window !== "undefined") {
  window.UI = UI
}

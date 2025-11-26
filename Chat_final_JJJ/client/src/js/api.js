const API_BASE_URL = "http://localhost:3001/api"

let sessionId = null
let currentUser = null
let pollingInterval = null

// Configurar axios con interceptores
const axiosInstance = window.axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor para agregar session-id automáticamente
axiosInstance.interceptors.request.use(
  (config) => {
    if (sessionId && !config.skipAuth) {
      config.headers["session-id"] = sessionId
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Interceptor para manejar respuestas
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("Axios error:", error.response?.data || error.message)
    throw new Error(error.response?.data?.error || error.message)
  },
)

const API = {
  async register(username) {
    const data = await axiosInstance.post("/register", { username }, { skipAuth: true })

    if (data.success) {
      sessionId = data.sessionId
      currentUser = data.user
      this.startPolling()
    }

    return data
  },

  async login(username) {
    const data = await axiosInstance.post("/login", { username }, { skipAuth: true })

    if (data.success) {
      sessionId = data.sessionId
      currentUser = data.user
      this.startPolling()
    }

    return data
  },

  async logout() {
    this.stopPolling()

    const data = await axiosInstance.post("/logout", { sessionId })

    sessionId = null
    currentUser = null

    return data
  },

  // Sistema de polling para actualizar mensajes automáticamente
  startPolling() {
    console.log("Iniciando polling de mensajes...")

    this.stopPolling()

    pollingInterval = setInterval(async () => {
      const chat = window.UI.getCurrentChat()

      if (chat.type && chat.id) {
        try {
          let result
          if (chat.type === "user") {
            result = await this.getHistory(chat.id)
          } else {
            result = await this.getGroupMessages(chat.id)
          }

          if (result.success) {
            const currentUserId = result.currentUserId || this.getCurrentUser()?.id
            // result.messages ya contiene mensajes Y llamadas unificados
            window.UI.renderMessages(result.messages, currentUserId)
          }
        } catch (error) {
          console.error("Error en polling:", error)
        }
      }
    }, 2000)
  },

  stopPolling() {
    if (pollingInterval) {
      console.log("Deteniendo polling...")
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  },

  async getUsers() {
    return await axiosInstance.get("/users")
  },

  async loadUsers() {
    try {
      console.log("Iniciando carga de usuarios...")
      const result = await this.getUsers()

      console.log("Respuesta de getUsers():", result)

      if (result.success && result.users) {
        console.log("Usuarios recibidos:", result.users.length, result.users)

        const processedUsers = result.users.map((user) => {
          if (typeof user === "string") {
            console.warn("Usuario recibido como string:", user)
            try {
              const parsed = JSON.parse(user)
              return {
                id: parsed.id || null,
                username: parsed.username || user,
                online: parsed.online || false,
              }
            } catch {
              return { id: null, username: user, online: false }
            }
          }

          return {
            id: user.id,
            username: user.username || user.name || "Usuario",
            online: user.online || false,
          }
        })

        window.UI.allUsers = processedUsers
        console.log("UI.allUsers actualizado con", window.UI.allUsers.length, "usuarios")

        return processedUsers
      } else {
        throw new Error(result.error || "No se recibieron usuarios")
      }
    } catch (error) {
      console.error("Error en loadUsers:", error)
      throw error
    }
  },

  async sendMessage(receiverId, content) {
    console.log("API.sendMessage llamado:", { receiverId, content })
    const result = await axiosInstance.post("/messages/send", {
      sessionId,
      receiverId,
      content,
    })
    console.log("API.sendMessage resultado:", result)
    return result
  },

async getHistory(userId) {
  console.log("API.getHistory llamado para userId:", userId)

  try {
    const result = await axiosInstance.get(`/messages/history/${userId}`)
    console.log("API.getHistory resultado RAW:", result)

    if (!result.success) {
      throw new Error(result.error || "No se pudo obtener el historial")
    }

    const currentUser = this.getCurrentUser()
    
    // CORRECCIÓN CRÍTICA: El proxy puede devolver result.messages como objeto
    let messagesArray = []
    
    if (Array.isArray(result.messages)) {
      messagesArray = result.messages
    } else if (result.messages && typeof result.messages === 'object') {
      // Si es un objeto, convertir sus valores a array
      messagesArray = Object.values(result.messages)
    }

    console.log("API.getHistory messagesArray procesado:", messagesArray)

    return {
      success: true,
      messages: messagesArray,
      currentUserId: currentUser?.id || null
    }
  } catch (error) {
    console.error("Error en getHistory:", error)
    return { success: false, error: error.message, messages: [] }
  }
},

  async createGroup(groupName) {
    return await axiosInstance.post("/groups/create", {
      sessionId,
      groupName,
    })
  },

  async getGroups() {
    return await axiosInstance.get("/groups")
  },

  async sendGroupMessage(groupId, content) {
    console.log("Enviando mensaje de grupo:", { groupId, content })
    return await axiosInstance.post("/messages/send-group", {
      sessionId,
      groupId,
      content,
    })
  },

  async getGroupMessages(groupId) {
    console.log("API.getGroupMessages llamado para groupId:", groupId)
    
    try {
      const result = await axiosInstance.get(`/messages/group/${groupId}`)
      console.log("API.getGroupMessages resultado RAW:", result)

      if (!result.success) {
        throw new Error(result.error || "No se pudo obtener mensajes del grupo")
      }

      const currentUser = this.getCurrentUser()
      
      // CORRECCIÓN: Convertir objeto a array si es necesario
      let messagesArray = []
      
      if (Array.isArray(result.messages)) {
        messagesArray = result.messages
      } else if (result.messages && typeof result.messages === 'object') {
        messagesArray = Object.values(result.messages)
      }

      console.log("API.getGroupMessages messagesArray procesado:", messagesArray)

      return {
        success: true,
        messages: messagesArray,
        currentUserId: currentUser?.id || null
      }
    } catch (error) {
      console.error("Error en getGroupMessages:", error)
      return { success: false, error: error.message, messages: [] }
    }
  },

  async addMemberToGroup(groupId, userId) {
    return await axiosInstance.post("/groups/add-member", {
      sessionId,
      groupId,
      userId,
    })
  },

  async addMembersToGroup(groupId, memberIds) {
    try {
      console.log("Agregando miembros:", memberIds, "al grupo:", groupId)

      // Usar Promise.allSettled para manejar errores individuales
      const results = await Promise.allSettled(memberIds.map((memberId) => this.addMemberToGroup(groupId, memberId)))

      const successful = results.filter((r) => r.status === "fulfilled" && r.value.success)
      const failed = results.filter((r) => r.status === "rejected" || !r.value.success)

      if (successful.length === memberIds.length) {
        console.log("Todos los miembros agregados exitosamente")
        return { success: true }
      } else if (successful.length > 0) {
        console.warn("Algunos miembros no se agregaron:", failed)
        return {
          success: true,
          partial: true,
          message: `${successful.length} de ${memberIds.length} miembros agregados`,
        }
      } else {
        throw new Error("No se pudo agregar ningún miembro")
      }
    } catch (error) {
      console.error("Error agregando miembros:", error)
      throw error
    }
  },

  async showAddMembersModal(group) {
    try {
      console.log("showAddMembersModal llamado para grupo:", group)
      console.log("Estado inicial de UI.allUsers:", window.UI.allUsers?.length || 0)

      console.log("Cargando usuarios...")
      const users = await this.loadUsers()

      console.log("Usuarios cargados exitosamente:", users?.length || 0)

      if (!window.UI.allUsers || window.UI.allUsers.length === 0) {
        throw new Error("No se pudieron cargar los usuarios disponibles")
      }

      window.UI.showAddMembersModal(group)
    } catch (error) {
      console.error("Error en showAddMembersModal:", error)
      alert("Error cargando usuarios disponibles: " + error.message)
    }
  },

  async healthCheck() {
    return await axiosInstance.get("/health", { skipAuth: true })
  },

    async saveAudioMessage(receiverId, duration) {
    console.log("💾 Guardando mensaje de audio en backend:", { receiverId, duration })
    try {
      const result = await axiosInstance.post("/messages/send-audio", {
        sessionId,
        receiverId: parseInt(receiverId),
        duration: parseInt(duration)
      })
      console.log("✅ Audio guardado:", result)
      return result
    } catch (error) {
      console.error("❌ Error guardando audio:", error)
      throw error
    }
  },

  async saveGroupAudioMessage(groupId, duration) {
    console.log("💾 Guardando mensaje de audio grupal en backend:", { groupId, duration })
    try {
      const result = await axiosInstance.post("/messages/send-group-audio", {
        sessionId,
        groupId: parseInt(groupId),
        duration: parseInt(duration)
      })
      console.log("✅ Audio grupal guardado:", result)
      return result
    } catch (error) {
      console.error("❌ Error guardando audio grupal:", error)
      throw error
    }
  },

  async endCall() {
    console.log("📴 Notificando fin de llamada al backend")
    try {
      const result = await axiosInstance.post("/calls/end", {
        sessionId
      })
      console.log("✅ Llamada registrada en backend:", result)
      return result
    } catch (error) {
      console.error("❌ Error registrando llamada:", error)
      throw error
    }
  },
  
  getSessionId() {
    return sessionId
  },

  getCurrentUser() {
    return currentUser
  },
}

if (typeof window !== "undefined") {
  window.API = API
}

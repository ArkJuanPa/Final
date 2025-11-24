const express = require("express")
const net = require("net")
const cors = require("cors")

const app = express()
const PORT = 3001
const TCP_SERVER_HOST = "localhost"
const TCP_SERVER_PORT = 5000

app.use(cors())
app.use(express.json())

// Store active TCP connections per session
const connections = new Map()

// Helper function to create TCP connection
const createTcpConnection = (sessionId) => {
  return new Promise((resolve, reject) => {
    const client = new net.Socket()

    client.connect(TCP_SERVER_PORT, TCP_SERVER_HOST, () => {
      console.log(`TCP connection established for session ${sessionId}`)
      resolve(client)
    })

    client.on("error", (err) => {
      console.error(`TCP connection error for session ${sessionId}:`, err.message)
      reject(err)
    })
  })
}

// Helper function to send command and wait for response
const sendCommand = async (client, command, data = null) => {
  return new Promise((resolve, reject) => {
    const packet = {
      command: command,
      data: data,
    }

    const timeout = setTimeout(() => {
      reject(new Error("TCP response timeout"))
    }, 10000)

    client.once("data", (buffer) => {
      clearTimeout(timeout)
      try {
        const response = JSON.parse(buffer.toString())
        console.log(`Respuesta recibida para ${command}:`, response)
        resolve(response)
      } catch (err) {
        reject(new Error("Invalid JSON response from server"))
      }
    })

    console.log(`Enviando comando ${command} con data:`, data)
    client.write(JSON.stringify(packet) + "\n")
  })
}

// Register endpoint
app.post("/api/register", async (req, res) => {
  const { username } = req.body

  if (!username) {
    return res.status(400).json({ error: "Username is required" })
  }

  let client
  try {
    client = await createTcpConnection("register-" + Date.now())

    const response = await sendCommand(client, "REGISTER", username)

    if (response.command === "SUCCESS") {
      const user = JSON.parse(response.data)
      const sessionId = "session-" + user.id + "-" + Date.now()

      connections.set(sessionId, { client, user })

      res.json({
        success: true,
        sessionId: sessionId,
        user: user,
      })
    } else {
      client.destroy()
      res.status(400).json({
        success: false,
        error: response.error || "Registration failed",
      })
    }
  } catch (err) {
    if (client) client.destroy()
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Login endpoint
app.post("/api/login", async (req, res) => {
  const { username } = req.body

  if (!username) {
    return res.status(400).json({ error: "Username is required" })
  }

  let client
  try {
    client = await createTcpConnection("login-" + Date.now())

    const response = await sendCommand(client, "LOGIN", username)

    if (response.command === "SUCCESS") {
      const user = JSON.parse(response.data)
      const sessionId = "session-" + user.id + "-" + Date.now()

      connections.set(sessionId, { client, user })

      client.on("data", (buffer) => {
        try {
          const notification = JSON.parse(buffer.toString())
          console.log(`Notification received for user ${user.username}:`, notification.command)
        } catch (err) {
          console.error("Error parsing notification:", err.message)
        }
      })

      res.json({
        success: true,
        sessionId: sessionId,
        user: user,
      })
    } else {
      client.destroy()
      res.status(400).json({
        success: false,
        error: response.error || "Login failed",
      })
    }
  } catch (err) {
    if (client) client.destroy()
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Create group endpoint
app.post("/api/groups/create", async (req, res) => {
  const { sessionId, groupName } = req.body

  if (!sessionId || !groupName) {
    return res.status(400).json({ error: "SessionId and groupName are required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    const response = await sendCommand(connection.client, "CREATE_GROUP", groupName)

    if (response.command === "SUCCESS") {
      const group = JSON.parse(response.data)
      res.json({
        success: true,
        group: group,
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to create group",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Get user groups endpoint
app.get("/api/groups", async (req, res) => {
  const sessionId = req.headers["session-id"]

  if (!sessionId) {
    return res.status(400).json({ error: "SessionId is required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    const response = await sendCommand(connection.client, "GET_USER_GROUPS", connection.user.id)

    if (response.command === "SUCCESS") {
      const groups = JSON.parse(response.data)
      res.json({
        success: true,
        groups: groups,
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to get groups",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Send message to user endpoint
app.post("/api/messages/send", async (req, res) => {
  const { sessionId, receiverId, content } = req.body

  if (!sessionId || !receiverId || !content) {
    return res.status(400).json({ error: "SessionId, receiverId, and content are required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    const messageData = JSON.stringify({
      senderId: connection.user.id,
      senderUsername: connection.user.username,
      receiverId: receiverId,
      content: content,
      type: "TEXT",
    })
    const response = await sendCommand(connection.client, "SEND_MESSAGE", messageData)

    if (response.command === "SUCCESS") {
      res.json({
        success: true,
        message: "Message sent successfully",
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to send message",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Send message to group endpoint - CORREGIDO
app.post("/api/messages/send-group", async (req, res) => {
  const { sessionId, groupId, content } = req.body

  console.log('Recibiendo mensaje de grupo:', { sessionId, groupId, content })

  if (!sessionId || !groupId || !content) {
    return res.status(400).json({ error: "SessionId, groupId, and content are required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    // CORREGIDO: Enviar como string JSON al servidor TCP
    const messageData = JSON.stringify({
      senderId: connection.user.id,
      senderUsername: connection.user.username,
      groupId: groupId,
      content: content,
      type: "TEXT",
    })

    console.log('Enviando al servidor TCP:', messageData)

    const response = await sendCommand(connection.client, "SEND_GROUP_MESSAGE", messageData)

    console.log('Respuesta del servidor TCP:', response)

    if (response.command === "SUCCESS") {
      res.json({
        success: true,
        message: "Group message sent successfully",
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to send group message",
      })
    }
  } catch (err) {
    console.error('Error en send-group:', err)
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Get message history with user endpoint
app.get("/api/messages/history/:userId", async (req, res) => {
  const sessionId = req.headers["session-id"]
  const { userId } = req.params

  if (!sessionId) {
    return res.status(400).json({ error: "SessionId is required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    const response = await sendCommand(connection.client, "GET_HISTORY", parseInt(userId))

    if (response.command === "SUCCESS") {
      const messages = JSON.parse(response.data)
      res.json({
        success: true,
        messages: messages,
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to get history",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Get group messages endpoint
app.get("/api/messages/group/:groupId", async (req, res) => {
  const sessionId = req.headers["session-id"]
  const { groupId } = req.params

  if (!sessionId) {
    return res.status(400).json({ error: "SessionId is required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    const response = await sendCommand(connection.client, "GET_GROUP_MESSAGES", parseInt(groupId))

    if (response.command === "SUCCESS") {
      const messages = JSON.parse(response.data)
      res.json({
        success: true,
        messages: messages,
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to get group messages",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Get all users endpoint
app.get("/api/users", async (req, res) => {
  const sessionId = req.headers["session-id"]

  if (!sessionId) {
    return res.status(400).json({ error: "SessionId is required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    const response = await sendCommand(connection.client, "GET_USERS")

    if (response.command === "SUCCESS") {
      const users = JSON.parse(response.data)
      res.json({
        success: true,
        users: users,
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to get users",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})
// Add member to group endpoint
app.post("/api/groups/add-member", async (req, res) => {
  const { sessionId, groupId, userId } = req.body

  if (!sessionId || !groupId || !userId) {
    return res.status(400).json({ error: "SessionId, groupId, and userId are required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    // El servidor espera "groupId,userId"
    const data = `${groupId},${userId}`
    const response = await sendCommand(connection.client, "ADD_TO_GROUP", data)

    if (response.command === "SUCCESS") {
      res.json({
        success: true,
        message: "Member added successfully",
      })
    } else {
      res.status(400).json({
        success: false,
        error: response.error || "Failed to add member to group",
      })
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Logout endpoint
app.post("/api/logout", async (req, res) => {
  const { sessionId } = req.body

  if (!sessionId) {
    return res.status(400).json({ error: "SessionId is required" })
  }

  const connection = connections.get(sessionId)
  if (!connection) {
    return res.status(401).json({ error: "Invalid session" })
  }

  try {
    await sendCommand(connection.client, "LOGOUT")
    connection.client.destroy()
    connections.delete(sessionId)

    res.json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    })
  }
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    activeSessions: connections.size,
  })
})

app.listen(PORT, () => {
  console.log(`========================================`)
  console.log(`     HTTP PROXY SERVER`)
  console.log(`========================================`)
  console.log(`Proxy escuchando en el puerto ${PORT}`)
  console.log(`TCP Server: ${TCP_SERVER_HOST}:${TCP_SERVER_PORT}`)
  console.log(`Listo para aceptar peticiones...`)
  console.log(`========================================\n`)
})
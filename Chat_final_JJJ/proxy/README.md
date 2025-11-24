# Chat Proxy Server

Servidor proxy HTTP que actúa como intermediario entre el cliente web y el servidor TCP de Java.

## Instalación

\`\`\`bash
cd proxy
npm install
\`\`\`

## Configuración

El proxy se conecta por defecto a:
- **Puerto HTTP**: 3001
- **Servidor TCP**: localhost:5000

Para cambiar estos valores, edita las constantes en `server.js`:
\`\`\`javascript
const PORT = 3001;
const TCP_SERVER_HOST = 'localhost';
const TCP_SERVER_PORT = 5000;
\`\`\`

## Uso

### Iniciar el servidor

\`\`\`bash
npm start
\`\`\`

### Modo desarrollo (con auto-reload)

\`\`\`bash
npm run dev
\`\`\`

## Endpoints API

### Autenticación

- **POST** `/api/register` - Registrar nuevo usuario
- **POST** `/api/login` - Iniciar sesión
- **POST** `/api/logout` - Cerrar sesión

### Usuarios

- **GET** `/api/users` - Obtener lista de usuarios

### Mensajes

- **POST** `/api/messages/send` - Enviar mensaje a usuario
- **GET** `/api/messages/history/:userId` - Obtener historial con usuario

### Grupos

- **POST** `/api/groups/create` - Crear nuevo grupo
- **GET** `/api/groups` - Obtener grupos del usuario
- **POST** `/api/messages/send-group` - Enviar mensaje a grupo
- **GET** `/api/messages/group/:groupId` - Obtener mensajes del grupo

### Utilidad

- **GET** `/api/health` - Verificar estado del servidor

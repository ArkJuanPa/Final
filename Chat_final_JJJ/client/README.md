# Chat Client

## Instalación

Ejecuta los siguientes comandos en la carpeta `client`:

1. **Instalar dependencias:**
   \`\`\`bash
   npm install
   \`\`\`

   Esto instalará automáticamente:
   - axios
   - webpack
   - webpack-cli
   - webpack-dev-server
   - style-loader
   - css-loader
   - html-webpack-plugin

## Ejecución

1. **Iniciar el servidor Java (desde la carpeta server):**
   \`\`\`bash
   gradle run
   \`\`\`

2. **Iniciar el proxy (desde la carpeta proxy):**
   \`\`\`bash
   npm start
   \`\`\`

3. **Iniciar el cliente con Webpack Dev Server (desde la carpeta client):**
   \`\`\`bash
   npm start
   \`\`\`
   o
   \`\`\`bash
   npm run dev
   \`\`\`

Esto abrirá automáticamente el navegador en `http://localhost:8080`

## Construcción para producción

Para generar los archivos optimizados:
\`\`\`bash
npm run build
\`\`\`

Los archivos generados estarán en la carpeta `dist/`

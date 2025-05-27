# Usamos una imagen de Node.js versión 18 con Debian Bullseye como base
FROM node:18-bullseye AS build

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de definición de dependencias primero para aprovechar la caché de Docker
COPY package*.json ./

# Instalamos las dependencias del proyecto, incluyendo pm2 globalmente
RUN npm install --only=production
RUN npm install pm2 -g

# Copiamos el resto de los archivos del proyecto al directorio de trabajo
COPY wsp-baileys-server-miguel .

# Opcional: Ejecutar pruebas o cualquier otro paso de preparación aquí

# Etapa de producción
# Podemos usar una imagen más limpia para la producción para hacer el contenedor más ligero
FROM node:18-bullseye-slim

# Copiamos la aplicación construida desde la etapa de construcción
COPY --from=build /app /app

# Copiamos también PM2 desde la etapa de construcción
COPY --from=build /usr/local/lib/node_modules/pm2 /usr/local/lib/node_modules/pm2
COPY --from=build /usr/local/bin/pm2 /usr/local/bin/pm2

# Establecemos el directorio de trabajo en la nueva etapa
WORKDIR /app

# Establecemos variables de entorno que serán utilizadas por nuestra aplicación
#ARG RAILWAY_STATIC_URL
#ARG PUBLIC_URL
#ARG PORT

ENV RAILWAY_STATIC_URL=${RAILWAY_STATIC_URL}
ENV PUBLIC_URL=${PUBLIC_URL}
ENV PORT=${PORT}

# Expone el puerto que va a usar la aplicación
EXPOSE 3000

# Especificamos el comando para iniciar la aplicación usando PM2
RUN npm install -g pm2
CMD ["pm2-runtime", "app.js"]

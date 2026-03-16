FROM node:18-alpine

WORKDIR /app

# Копируем package.json файлы
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Устанавливаем зависимости
RUN npm install --production=false
RUN cd server && npm install --production=false
RUN cd client && npm install --production=false

# Копируем исходный код
COPY . .

# Собираем клиентское приложение
RUN cd client && npm run build

# Открываем порт
EXPOSE 5000

# Запускаем сервер
CMD ["npm", "start"]
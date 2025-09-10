# Começa com uma imagem oficial do Node.js v18
FROM node:18-slim

# Instala o Google Chrome e suas dependências necessárias
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    # Adiciona o repositório oficial do Google Chrome
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    # Instala o Chrome estável e fontes de texto
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    # Limpa o cache para reduzir o tamanho da imagem
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Diz ao Puppeteer para NÃO baixar o Chrome, pois já instalamos manualmente
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Copia os arquivos de dependência primeiro para aproveitar o cache do Docker
COPY package*.json ./
RUN npm install --production

# Copia o resto do código do seu aplicativo
COPY . .

# Expõe a porta que seu aplicativo usa
EXPOSE 3000

# O comando para iniciar seu aplicativo
CMD [ "node", "index.js" ]

FROM gperreymond/node-imagemagick:0.12.9

RUN mkdir /app
WORKDIR /app

COPY package.json /app/package.json
COPY server /app/server
COPY watchers /app/watchers

RUN npm install --production

EXPOSE 80

CMD ["npm", "start"]

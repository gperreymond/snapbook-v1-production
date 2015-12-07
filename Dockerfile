# Pull base image from stock node image.
FROM node:0.12.9

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Add the current working folder as a mapped folder at /app
COPY ./ggv_applications/api.snapbook.io /api.snapbook.io
COPY ./ggv_modules/ggv-opencv /ggv-opencv

# Install all dependencies
RUN npm install -g pm2
RUN npm install -g node-gyp
RUN cd /api.snapbook.io \
	npm install --production
RUN cd /ggv-opencv \
	npm install --production

# Set the current working directory to the new mapped folder.
WORKDIR /api.snapbook.io

# Expose port
EXPOSE 80

# Running
CMD pm2 start pm2.prod.api.json
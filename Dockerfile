# Pull base image from stock node image.
FROM node:0.12.7

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Add the current working folder as a mapped folder at /app
COPY ./ggv_applications/api.snapbook.io /api.snapbook.io
COPY ./ggv_modules/ggv-opencv /ggv-opencv

# Install all dependencies
RUN cd /api.snapbook.io \
	npm install --production \
	cd /ggv-opencv \
	npm install --production

# Set the current working directory to the new mapped folder.
WORKDIR /api.snapbook.io

# Expose port
EXPOSE 80

# Running
CMD pm2 start pm2.prod.api.json
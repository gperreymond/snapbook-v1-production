# Pull base image from stock node image.
FROM node:0.12.9

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Ignore APT warnings about not having a TTY
ENV DEBIAN_FRONTEND noninteractive

# ImageMagick
RUN apt-get update
RUN apt-get install -y \
    libmagick++-dev

# Clean the cache created by package installations
RUN \
  apt-get clean

# Add the current working folder as a mapped folder at /app
COPY ./ggv_applications/api.snapbook.io /app
COPY ./ggv_modules/ggv-opencv /app/node_modules/ggv-opencv

# Install GLOBAL dependencies
# RUN npm install -g pm2
# RUN npm install -g node-gyp

# Install PROJECT dependencies
WORKDIR /app/node_modules/ggv-opencv
RUN npm install
 
# Install PROJECT dependencies
WORKDIR /app
# RUN npm install

# Set the current working directory to the new mapped folder.
# WORKDIR /api.snapbook.io

# Expose port
EXPOSE 80

# Running
CMD node server/api.js
# CMD pm2 start pm2.prod.api.json
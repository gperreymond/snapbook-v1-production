# Pull base image from stock node image.
FROM node:0.12.9

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Ignore APT warnings about not having a TTY
ENV DEBIAN_FRONTEND noninteractive

# ImageMagick
RUN apt-get update
RUN apt-get install -y \
    apt-utils \
    libkrb5-dev \
    graphicsmagick

# Clean the cache created by package installations
RUN \
  apt-get clean

# Add the current working folder as a mapped folder at /app
COPY ./ggv_applications/api.snapbook.io /app
WORKDIR /app
RUN npm install

# Add the ggv opencv modul
COPY ./ggv_modules/ggv-opencv /app/node_modules/ggv-opencv
WORKDIR /app/node_modules/ggv-opencv
RUN npm install

# Set the current working directory to the new mapped folder.
WORKDIR /app

# Expose port
EXPOSE 80

# Running
CMD npm start
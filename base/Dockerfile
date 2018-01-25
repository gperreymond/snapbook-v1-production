FROM node:0.12.9

MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# ImageMagick
RUN apt-get update
RUN apt-get install -y \
    apt-utils \
    libkrb5-dev \
    graphicsmagick

# Clean the cache created by package installations
RUN \
  apt-get clean

RUN npm install -g node-gyp@3.6.2

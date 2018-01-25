# Pull base image from stock node image.
FROM node:0.12.9

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Ignore APT warnings about not having a TTY
ENV DEBIAN_FRONTEND noninteractive

# Install apt-get
RUN apt-get update && apt-get install -y \
    graphicsmagick \
&& apt-get clean \
&& rm -rf /var/lib/apt/lists/*

# Install global npm
RUN npm install -g node-gyp@3.6.2

# Add the current working folder as a mapped folder at /app
RUN mkdir /app
ADD . /app
WORKDIR /app
RUN npm install --production

# Set the current working directory to the new mapped folder.
WORKDIR /app

# Expose port
EXPOSE 80

# Running
CMD npm start

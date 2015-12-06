# Pull base image from stock node image.
FROM node:0.12.7

# Maintainer
MAINTAINER Gilles Perreymond <gperreymond@gmail.com>

# Add the current working folder as a mapped folder at /app
COPY ./ggv_applications/api.snapbook.io ./app

# Set the current working directory to the new mapped folder.
WORKDIR /app

# Install application's dependencies
npm install --production
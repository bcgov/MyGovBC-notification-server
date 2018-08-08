FROM node:10
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
COPY . /usr/src/app
RUN rm -rf node_modules client/node_modules && npm install

CMD [ "npm", "start" ]
EXPOSE 3000

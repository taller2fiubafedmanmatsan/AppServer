FROM node:10.15.3

EXPOSE 3000

# Create app directory
WORKDIR /home/app

COPY package*.json /home/app/

#RUN apt-get -q update && apt-get -qy install netcat

RUN npm install

COPY . /home/app

CMD [ "node", "./index.js" ]

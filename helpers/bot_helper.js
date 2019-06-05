const {User} = require('../models/user');
const http = require('http');

async function addTitoTo(users) {
  const tito = await User.findOne({name: 'Tito'});
  if (tito) users.push(tito);
  return users;
}


function sendRequest(hostname, path, body) {
  const request = new http.ClientRequest({
    hostname: hostname,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  });
  request.end(body);
  request.on('response', (res) => {
    res.on('data', (body) => {
      console.log(body.toString());
    });
  });
}

exports.addTitoTo = addTitoTo;
exports.sendRequest = sendRequest;

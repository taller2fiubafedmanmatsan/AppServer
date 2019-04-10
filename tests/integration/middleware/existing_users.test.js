const request = require('supertest');
const {User} = require('../../../models/user');

let server;

describe('existing_users middleware', ()=> {
  beforeEach(()=> {
    server = require('../../../index');
  });

  afterEach(async ()=> {
    await User.remove({});
    await server.close();
  });

  describe('main function', ()=> {
    const data1 = {name: 'test', email: 'test@testing.com', pass: '123456'};
    const data2 = {name: 'test2', email: 'test2@testing.com', pass: '123456'};
    const data3 = {name: 'test3', email: 'test3@testing.com', pass: '123456'};
    let token;

    function createUser(name, email, pass) {
      return request(server)
          .post('/api/users')
          .send({name: name, email: email, password: pass});
    }

    beforeEach(async ()=> {
      await createUser(data1.name, data1.email, data1.pass);
      await createUser(data2.name, data2.email, data2.pass);

      user = await User.findOne({name: 'test'});
      token = user.getAuthToken();
    });

    const body = {
      creator: data1.email,
      users: [data1.email, data2.email],
      admins: [data1.email, data2.email, data3.email]
    };

    const execute = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send(body);
    };

    it(`should return 404 when a user doesn't exist`, async ()=> {
      const response = await execute();

      expect(response.status).toEqual(404);
      expect(response.text).toEqual('Invalid users.');
    });
  });
});

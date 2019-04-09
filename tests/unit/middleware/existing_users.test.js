
const request = require('supertest');
const {User} = require('../../../models/user');
const eUsers = require('../../../middleware/existing_users');

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

    function createUser(name, email, pass) {
      return request(server)
          .post('/api/users')
          .send({name: name, email: email, password: pass});
    }

    beforeEach(async ()=> {
      await createUser(data1.name, data1.email, data1.pass);
      await createUser(data2.name, data2.email, data2.pass);
      await createUser(data3.name, data3.email, data3.pass);
    });

    it('should call next when all users exist', ()=> {
      const request = {
        body: {
          creator: data1.email,
          users: [data1.email, data2.email, data3.email],
          admins: [data1.email, data2.email, data3.email]
        }
      };
      const next = jest.fn();
      const response = {
        status: jest.fn()
      };
      response.send = jest.fn();
      eUsers(request, response, next);

      expect(next).toHaveBeenCalled();
    });

    it(`should return 400 when a user doesn't exist`, ()=> {
      const request = {
        body: {
          creator: data1.email,
          users: [data1.email, data2.email, data3.email],
          admins: [data1.email, data2.email, data3.email]
        }
      };
      const next = jest.fn();
      const response = {
        status: jest.fn(),
        send: jest.fn()
      };
      eUsers(request, response, next);

      expect(response.status.mock.calls[0][0]).toEqual(400);
    });
  });
});

const request = require('supertest');
const {User} = require('../../../models/user');
const mailer = require('../../../mailer/password_restoration_mail');
const firebase = require('../../../helpers/firebase_helper');

let server;

describe('/api/users', ()=> {
  beforeEach(()=> {
    server = require('../../../index');
  });

  beforeAll(()=> {
    firebase.subscribeToTopic = jest.fn();
  });

  afterEach(async ()=> {
    await User.remove({});
    await server.close();
  });

  describe('GET /me', ()=> {
    let user;
    let name;
    let email;
    let password;
    let token;

    const execute = ()=> {
      return request(server)
          .get('/api/users/me')
          .set('x-auth-token', token)
          .send();
    };

    beforeEach(async ()=> {
      name = 'name';
      email = 'test@test.com';
      password = 'password';
      await request(server)
          .post('/api/users')
          .send({name, email, password});
      user = await User.findOne({name});
      token = user.getAuthToken();
    });

    it('should return 401 if client is not authenticated', async ()=> {
      token = '';
      const response = await execute();
      expect(response.status).toBe(401);
    });

    it('should return the current user', async ()=> {
      const response = await execute();
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(name);
      expect(response.body.email).toBe(email);
    });
  });

  describe('GET /:userName', ()=> {
    let user;
    let name;
    let email;
    let email2;
    let token;

    const execute = ()=> {
      return request(server)
          .get(`/api/users/${email2}`)
          .set('x-auth-token', token)
          .send();
    };

    const createUser = (userEmail)=> {
      return request(server)
          .post('/api/users')
          .send({
            name: 'name', email: userEmail, password: 'password',
            nickname: 'nick', photoUrl: 'https://bit.ly/2LpIl5N'
          });
    };

    beforeEach(async ()=> {
      name = 'name';
      email = 'test@test.com';
      email2 = 'test2@test.com';
      password = 'password';
      await createUser(email);
      await createUser(email2);
      user = await User.findOne({name});
      token = user.getAuthToken();
    });

    it('should return 401 if client is not authenticated', async ()=> {
      token = '';
      const response = await execute();
      expect(response.status).toBe(401);
    });

    it('should return the current user', async ()=> {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(response.body.email).toBe(email2);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            'name', 'email', 'nickname', 'photoUrl'
          ])
      );
    });
  });

  describe('POST /', ()=> {
    let name;
    let email;
    let password;

    const execute = ()=> {
      return request(server)
          .post('/api/users')
          .send({name, email, password});
    };

    beforeEach(async ()=> {
      name = 'name';
      email = 'user@test.com';
      password = 'password';
      await User.remove({});
    });

    it('should return 400 if user name is missing', async ()=> {
      name = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if user name is less than 1 characters', async ()=> {
      name = '';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if user name is more than 50 characters', async ()=> {
      name = new Array(52).join('a');
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if user email is missing', async ()=> {
      email = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if email is less than 5 characters', async ()=> {
      email = 'abc';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if email is more than 50 characters', async ()=> {
      email = new Array(52).join('a');
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if user email is not a valid email', async ()=> {
      email = 'abcdefg';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if user password is missing', async ()=> {
      password = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if password is less than 6 characters', async ()=> {
      password = 'abcde';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if password is more than 255 characters', async ()=> {
      password = new Array(257).join('a');
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if the user is already registered', async ()=> {
      await execute();
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return new user if request is valid', async ()=> {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'email'])
      );
    });
  });

  describe('PUT /me', ()=> {
    let password;
    let email;
    let name;
    let nickname;
    let photoUrl;
    let token;
    let req;
    let user;

    const execute = ()=> {
      return request(server)
          .put('/api/users/me')
          .set('x-auth-token', token)
          .send(req);
    };

    beforeEach(async ()=> {
      name = 'name';
      email = 'test@test.com';
      password = 'password';
      req = {name, email, password, nickname};
      await request(server)
          .post('/api/users')
          .send(req);
      user = await User.findOne({name});
      token = user.getAuthToken();

      nickname = 'generic nick';
      password = 'newpassword';
      photoUrl = 'https://images.app.goo.gl/E9muMqm8TCqtHpA5A';
      req = {nickname, password, photoUrl};
    });

    it('should return 400 if user attempts to change its email', async ()=> {
      email = 'newmail@genericdomain.com';
      req = {email};
      const response = await execute();
      expect(response.status).toBe(400);
    });

    it('should return 400 if user tries to change its admin status',
        async ()=> {
          const isAdmin = true;
          req = {isAdmin};
          const response = await execute();
          expect(response.status).toBe(400);
        });

    it('should return 400 if user tries to change its facebook log ',
        async ()=> {
          const facebookLog = true;
          req = {facebookLog};
          const response = await execute();
          expect(response.status).toBe(400);
        });

    it('should return 400 if user attempts to change its name', async ()=> {
      const name = 'new name';
      req = {name};
      const response = await execute();
      expect(response.status).toBe(400);
    });

    it('should return 400 if nickname is less than 1 character', async ()=> {
      const nickname = '';
      req = {nickname};
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if nickname is more than 50 characters', async ()=> {
      const nickname = new Array(52).join('a');
      req = {nickname};
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if password is less than 6 characters', async ()=> {
      const password = '12345';
      req = {password};
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if password is more than 255 characters', async ()=> {
      const password = new Array(257).join('a');
      req = {password};
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if photoUrl is not a valid URL', async ()=> {
      photoUrl = 'invalidUrl';
      req = {photoUrl};
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return user if request is valid', async ()=> {
      const response = await execute();
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'email', 'nickname', 'photoUrl'])
      );
    });
  });

  describe('POST /restorepassword', ()=> {
    let email;

    const execute = ()=> {
      return request(server)
          .post('/api/users/restorepassword')
          .send({email});
    };

    beforeEach(async ()=> {
      const name = 'name';
      const password = 'password';
      email = 'hypechat.team@gmail.com';
      await request(server)
          .post('/api/users')
          .send({name, email, password});
    });

    it('should return 400 if user email is missing', async ()=> {
      email = null;
      const response = await execute();
      expect(response.status).toBe(400);
    });

    it('should return 400 if user email is not registered', async ()=> {
      email = 'unregisteredmail@genericDomain.com';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 200 if request is valid', async ()=> {
      mailer.sendMail = jest.fn();
      const response = await execute();
      expect(response.status).toBe(200);
      expect(mailer.sendMail).toHaveBeenCalled();
    });
  });
});

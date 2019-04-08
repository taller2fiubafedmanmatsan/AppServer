const request = require('supertest');
const {User} = require('../../../models/user');

let server;

describe('/api/users', ()=> {
  beforeEach(()=> {
    server = require('../../../index');
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

  const execute = (req)=> {
    return request(server)
        .put('/api/users/me')
        .set('x-auth-token', token)
        .send(req);
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

  it('should return 400 if user attempts to change its email', async ()=> {
    email = 'newmail@genericdomain.com';
    req = {email};
    const response = await execute(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 if user attempts to its admin status', async ()=> {
    const isAdmin = true;
    req = {isAdmin};
    const response = await execute(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 if user attempts to its facebook log ', async ()=> {
    const facebookLog = true;
    req = {facebookLog};
    const response = await execute(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 if user attempts to change its name', async ()=> {
    name = 'new name';
    req = {name};
    const response = await execute(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 if nickname is less than 1 character', async ()=> {
    nickname = '';
    req = {nickname};
    const response = await execute(req);

    expect(response.status).toBe(400);
  });

  it('should return 400 if nickname is more than 50 characters', async ()=> {
    nickname = new Array(52).join('a');
    req = {nickname};
    const response = await execute(req);

    expect(response.status).toBe(400);
  });

  it('should return 400 if password is less than 6 characters', async ()=> {
    password = '12345';
    req = {password};
    const response = await execute(req);

    expect(response.status).toBe(400);
  });

  it('should return 400 if password is more than 255 characters', async ()=> {
    password = new Array(257).join('a');
    req = {password};
    const response = await execute(req);

    expect(response.status).toBe(400);
  });

  it('should return 400 if photoUrl is not a valid URL', async ()=> {
    photoUrl = 'invalidUrl';
    req = {photoUrl};
    const response = await execute(req);

    expect(response.status).toBe(400);
  });

  it('should return user if request is valid', async ()=> {
    nickname = 'generic nick';
    password = 'newpassword';
    photoUrl = 'https://images.app.goo.gl/E9muMqm8TCqtHpA5A';
    req = {nickname, password, photoUrl};
    const response = await execute(req);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body)).toEqual(
        expect.arrayContaining(['name', 'email'])
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

  it('should return 400 if user email is not registered', async ()=> {
    email = 'unregisteredmail@genericDomain.com';
    const response = await execute();

    expect(response.status).toBe(400);
  });

  it('should return message if request is valid', async ()=> {
    email = 'hypechat.team@gmail.com';
    const response = await execute();

    expect(response.status).toBe(200);
  });
});

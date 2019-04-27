const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');

let server;

describe('/api/workspaces', ()=> {
  let token;
  const userEmail = 'user@test.com';
  let user;

  const createUser = ()=> {
    return request(server)
        .post('/api/users')
        .send({name: 'name', email: userEmail, password: 'password'});
  };

  beforeAll(async ()=> {
    server = require('../../../index');
    await createUser();
    user = await User.findOne({email: userEmail});
    token = user.getAuthToken();
  });

  afterAll(async ()=> {
    await User.remove({});
    await server.close();
  });

  describe('POST /', ()=> {
    let name;
    let creator;
    let users;
    let admins;
    let description;
    let welcomeMessage;

    const execute = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name, creator, users, admins,
            description, welcomeMessage
          });
    };

    beforeEach(async ()=> {
      name = 'WSname';
      creator = userEmail;
      users = [userEmail];
      admins = [userEmail];
      description = 'a';
      welcomeMessage = 'a';
      await Workspace.remove({});
    });

    it('should return new workspace if request is valid', async ()=> {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            'name', 'creator', 'description',
            'welcomeMessage', 'channels', 'users', 'admins'
          ])
      );
    });

    it('should return 400 if name is missing', async ()=> {
      name = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if name is less than 1 characters', async ()=> {
      name = '';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if name is more than 250 characters', async ()=> {
      name = new Array(252).join('a');
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if creator is missing', async ()=> {
      creator = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it(`should return 400 if creator doesn't exists`, async ()=> {
      creator = 'changos@gmail.com';
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if there are no users', async ()=> {
      users = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 400 if there are no admins', async ()=> {
      admins = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });
  });
});

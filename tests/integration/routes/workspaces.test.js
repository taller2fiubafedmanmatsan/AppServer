const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');

let server;

describe('/api/workspaces', ()=> {
  let token;
  let secondToken;
  const userEmail = 'user@test.com';
  const secondUserEmail = 'seconduser@test.com';
  let user;
  let secondUser;

  const createUser = (userEmail)=> {
    return request(server)
        .post('/api/users')
        .send({name: 'name', email: userEmail, password: 'password'});
  };

  beforeAll(async ()=> {
    server = require('../../../index');
    await createUser(userEmail);
    user = await User.findOne({email: userEmail});
    token = user.getAuthToken();
    await createUser(secondUserEmail);
    secondUser = await User.findOne({email: secondUserEmail});
    secondToken = secondUser.getAuthToken();
  });

  afterAll(async ()=> {
    await User.remove({});
    await server.close();
  });

  describe('GET /:wsname', () => {
    const name = 'WSname';
    const creator = userEmail;
    const users = [userEmail];
    const admins = [userEmail];
    const description = 'a';
    const welcomeMessage = 'a';

    beforeAll(async ()=> {
      await request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name, creator, users, admins,
            description, welcomeMessage
          });
    });

    afterAll(async ()=> {
      await Workspace.remove({});
    });

    const execute = ()=> {
      return request(server)
          .get('/api/workspaces/' + name)
          .set('x-auth-token', token);
    };

    it('should return the asked workspace', async () => {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            'name', 'creator', 'description',
            'welcomeMessage', 'channels', 'users', 'admins'
          ])
      );
    });
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

    it('should return 404 if creator is missing', async ()=> {
      creator = null;
      const response = await execute();

      expect(response.status).toBe(404);
      expect(response.text).toEqual('Invalid users.');
    });

    it(`should return 404 if creator doesn't exists`, async ()=> {
      creator = 'changos@gmail.com';
      const response = await execute();

      expect(response.status).toBe(404);
      expect(response.text).toEqual('Invalid users.');
    });

    it('should return 404 if there are no users', async ()=> {
      users = null;
      const response = await execute();

      expect(response.status).toBe(404);
      expect(response.text).toEqual('Invalid users.');
    });

    it('should return 404 if there are no admins', async ()=> {
      admins = null;
      const response = await execute();

      expect(response.status).toBe(404);
      expect(response.text).toEqual('Invalid users.');
    });
  });

  describe('PATCH /:wsname', ()=> {
    let name;
    let myWorkspace;

    const createWorkspace = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name: name, creator: userEmail, admins: [userEmail],
            users: [userEmail], description: 'a', welcomeMessage: 'a'
          });
    };

    beforeEach(async ()=> {
      name = 'workspaceName';
      await createWorkspace();
      myWorkspace = await Workspace.findOne({name: name});
    });

    afterAll(async ()=> {
      await Workspace.remove({});
      await User.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .patch(`/api/workspaces/${myWorkspace.name}`)
          .set('x-auth-token', token)
          .send();
    };

    it('should add the new user to the workspace', async () => {
      const response = await execute(secondToken);

      const updatedWorkspace = await Workspace.findOne({name: myWorkspace.name})
          .populate('users', 'email');
      expect(response.status).toBe(200);
      const usersEmails = updatedWorkspace.users.map((user) => {
        return user.email;
      });
      console.log(usersEmails);
      expect(usersEmails.includes(secondUserEmail)).toBe(true);
    });

    it('should return 404 if workspace is invalid', async () => {
      myWorkspace.name = null;
      const response = await execute(token);
      expect(response.status).toBe(404);
      expect(response.text).toEqual('Workspace not found.');
    });
  });
});

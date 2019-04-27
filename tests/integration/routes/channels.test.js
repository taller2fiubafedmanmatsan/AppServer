const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');
const {Channel} = require('../../../models/channel');

let server;

describe('/api/workspaces/channels', ()=> {
  let token;
  const userEmail = 'user@test.com';
  let user;
  let workspace;

  const createUser = ()=> {
    return request(server)
        .post('/api/users')
        .send({name: 'name', email: userEmail, password: 'password'});
  };

  const createWorkspace = ()=> {
    return request(server)
        .post('/api/workspaces')
        .set('x-auth-token', token)
        .send({
          name: 'WSname', creator: userEmail, admins: [userEmail],
          users: [userEmail], description: 'a', welcomeMessage: 'a'
        });
  };

  beforeAll(async ()=> {
    server = require('../../../index');
    await createUser();
    user = await User.findOne({email: userEmail});
    token = user.getAuthToken();
    await createWorkspace();
    workspace = await Workspace.findOne({name: 'WSname'});
  });

  afterAll(async ()=> {
    await User.remove({});
    await Workspace.remove({});
    await server.close();
  });

  describe('POST /', ()=> {
    let name;
    let creator;
    let users;
    let isPrivate;
    // let admins;
    let description;
    let welcomeMessage;
    let workspaceId;

    beforeEach(async ()=> {
      name = 'channelName';
      creator = userEmail;
      users = [userEmail];
      // admins = [userEmail];
      isPrivate = true;
      description = 'a';
      welcomeMessage = 'a';
      workspaceId = workspace._id;
      await Channel.remove({});
    });

    const execute = ()=> {
      return request(server)
          .post('/api/workspaces/channels')
          .set('x-auth-token', token)
          .send({
            name, creator, users, isPrivate,
            description, welcomeMessage, workspaceId
          });
    };

    it('should return new channel if request is valid', async ()=> {
      const response = await execute();

      console.log(response.text);
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            'name', 'welcomeMessage', 'description'
          ])
      );
    });

    // it('should return 400 if name is missing', async ()=> {
    //   name = null;
    //   const response = await execute();

    //   expect(response.status).toBe(400);
    // });

    // it('should return 400 if name is less than 1 characters', async ()=> {
    //   name = '';
    //   const response = await execute();

    //   expect(response.status).toBe(400);
    // });

    // it('should return 400 if name is more than 250 characters', async ()=> {
    //   name = new Array(252).join('a');
    //   const response = await execute();

    //   expect(response.status).toBe(400);
    // });

    // it('should return 404 if creator is missing', async ()=> {
    //   creator = null;
    //   const response = await execute();

    //   expect(response.status).toBe(404);
    //   expect(response.text).toEqual('Invalid users.');
    // });

    // it(`should return 404 if creator doesn't exists`, async ()=> {
    //   creator = 'changos@gmail.com';
    //   const response = await execute();

    //   expect(response.status).toBe(404);
    //   expect(response.text).toEqual('Invalid users.');
    // });

    // it('should return 404 if there are no users', async ()=> {
    //   users = null;
    //   const response = await execute();

    //   expect(response.status).toBe(404);
    //   expect(response.text).toEqual('Invalid users.');
    // });

    // it('should return 404 if there are no admins', async ()=> {
    //   admins = null;
    //   const response = await execute();

    //   expect(response.status).toBe(404);
    //   expect(response.text).toEqual('Invalid users.');
    // });
  });
});

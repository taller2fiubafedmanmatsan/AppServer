const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');
const {Channel} = require('../../../models/channel');
const {Page} = require('../../../models/page');
const firebase = require('../../../helpers/firebase_helper');

let server;

describe('/api/channels', ()=> {
  let token;
  const userEmail = 'user@test.com';
  let user;
  let workspace;
  let workspaceName;

  const createUser = (userEmail)=> {
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
    await createUser(userEmail);
    user = await User.findOne({email: userEmail});
    token = user.getAuthToken();
    await createWorkspace();
    workspace = await Workspace.findOne({name: 'WSname'});
    firebase.subscribeToTopic = jest.fn();
  });

  afterAll(async ()=> {
    await User.remove({});
    await Workspace.remove({});
    await Page.remove({});
    await Channel.remove({});
    await server.close();
  });

  afterEach(async ()=> {
    await Channel.remove({});
    workspace = await Workspace.findByIdAndUpdate(workspace._id,
        {channels: []},
        {new: true});
  });

  describe('POST /workspace/:workspaceName', () => {
    let name;
    let creator;
    let users;
    let isPrivate;
    let description;
    let welcomeMessage;

    beforeEach(async ()=> {
      name = 'channelName';
      creator = userEmail;
      users = [userEmail];
      isPrivate = true;
      description = 'a';
      welcomeMessage = 'a';
      workspaceName = workspace.name;
    });

    afterEach(async ()=> {
      await Channel.remove({});
      workspace = await Workspace.findByIdAndUpdate(workspace._id,
          {channels: []},
          {new: true});
    });

    const execute = ()=> {
      return request(server)
          .post(`/api/channels/workspace/${workspaceName}`)
          .set('x-auth-token', token)
          .send({
            name, creator, users, isPrivate,
            description, welcomeMessage
          });
    };

    it('should return new channel if request is valid', async ()=> {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            '_id', 'name', 'welcomeMessage', 'description', 'isPrivate'
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
  });

  describe('GET /:channelName/workspace/:workspaceName', () => {
    let name;
    let creator;
    let users;
    let isPrivate;
    let description;
    let welcomeMessage;
    let myChannel;

    const createChannel = ()=> {
      return request(server)
          .post(`/api/channels/workspace/${workspaceName}`)
          .set('x-auth-token', token)
          .send({
            name, creator, users, isPrivate,
            description, welcomeMessage
          });
    };

    beforeEach(async ()=> {
      name = 'channelName';
      creator = userEmail;
      users = [userEmail];
      isPrivate = true;
      description = 'a';
      welcomeMessage = 'a';
      workspaceName = workspace.name;
      await createChannel();
      myChannel = await Channel.findOne({name: 'channelName'});
    });

    afterEach(async ()=> {
      await Channel.remove({});
    });

    const execute = ()=> {
      return request(server)
          .get(`/api/channels/${myChannel.name}/workspace/${workspaceName}`)
          .set('x-auth-token', token);
    };

    it('should return the channel is request is valid', async () => {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            '_id', 'name', 'welcomeMessage', 'description', 'users',
            'isPrivate', 'creator'
          ])
      );
    });
  });

  describe('GET /workspace/:workspaceName', () => {
    let name;
    let creator;
    let users;
    let isPrivate;
    let description;
    let welcomeMessage;
    let myChannel;

    const createChannel = ()=> {
      return request(server)
          .post(`/api/channels/workspace/${workspaceName}`)
          .set('x-auth-token', token)
          .send({
            name, creator, users, isPrivate,
            description, welcomeMessage
          });
    };

    beforeEach(async ()=> {
      name = 'channelName2';
      creator = userEmail;
      users = [userEmail];
      isPrivate = true;
      description = 'a2';
      welcomeMessage = 'a2';
      workspaceName = workspace.name;
      await createChannel();
      myChannel = await Channel.findOne({name: 'channelName2'});
    });

    const execute = ()=> {
      return request(server)
          .get(`/api/channels/workspace/${workspaceName}`)
          .set('x-auth-token', token);
    };

    it('should return the channel is request is valid', async () => {
      const chName = myChannel.name;
      const response = await execute();

      expect(response.status).toBe(200);
      expect(response.body[0].name).toEqual(chName);
    });
  });

  describe('PATCH /:channelName/workspace/:workspaceName/addUsers', () => {
    let name;
    let creator;
    let users;
    let isPrivate;
    let description;
    let welcomeMessage;
    let myChannel;
    const userEmail2 = 'user2@test.com';
    const userEmail3 = 'user3@test.com';
    let user2;
    let user3;

    const createChannel = ()=> {
      return request(server)
          .post(`/api/channels/workspace/${workspaceName}`)
          .set('x-auth-token', token)
          .send({
            name, creator, users, isPrivate,
            description, welcomeMessage
          });
    };

    beforeEach(async ()=> {
      name = 'channelName';
      creator = userEmail;
      users = [userEmail];
      isPrivate = true;
      description = 'a';
      welcomeMessage = 'a';
      workspaceName = workspace.name;
      await createChannel();
      myChannel = await Channel.findOne({name: 'channelName'});
      await createUser(userEmail2);
      user2 = await User.findOne({email: userEmail2});
      await createUser(userEmail3);
      user3 = await User.findOne({email: userEmail3});
    });

    afterEach(async ()=> {
      await Channel.remove({});
      await User.remove({});
    });

    const execute = ()=> {
      const chUrl = `channels/${myChannel.name}`;
      const wsUrl = `workspace/${workspaceName}`;
      return request(server)
          .patch(`/api/${chUrl}/${wsUrl}/addUsers`)
          .set('x-auth-token', token)
          .send({creator, users});
    };

    it('should add the new users to the channel', async () => {
      users = [user2.email, user3.email];
      const response = await execute();

      console.log(response.text);
      const updatedChannel = await Channel.findOne({name: myChannel.name})
          .populate('users', 'email');
      expect(response.status).toBe(200);

      const usersEmails = updatedChannel.users.map((user) => {
        return user.email;
      });
      users.push(userEmail);
      expect(usersEmails).toEqual(expect.arrayContaining(users));
    });
  });
});

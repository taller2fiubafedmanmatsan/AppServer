const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');
const {Channel} = require('../../../models/channel');
const {Page} = require('../../../models/page');
const {Message} = require('../../../models/message');

let server;

describe('/api/messages', ()=> {
  let token;
  const userEmail = 'user@test.com';
  const secondUserEmail = 'seconduser@test.com';
  let user;
  let secondUser;
  let workspace;
  let channel;

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

  const createChannel = ()=> {
    return request(server)
        .post(`/api/channels/workspace/${workspace.name}`)
        .set('x-auth-token', token)
        .send({
          name: 'channelName', creator: userEmail, users: [userEmail],
          isPrivate: true, description: 'a', welcomeMessage: 'a'
        });
  };

  beforeEach(async () => {
    server = require('../../../index');
    await createUser(userEmail);
    user = await User.findOne({email: userEmail});
    token = user.getAuthToken();
    await createUser(secondUserEmail);
    secondUser = await User.findOne({email: secondUserEmail});
    secondToken = secondUser.getAuthToken();
    await createWorkspace();
    workspace = await Workspace.findOne({name: 'WSname'});
    await createChannel();
    channel = await Channel.findOne({name: 'channelName'});
  });

  afterAll(async ()=> {
    await User.remove({});
    await Workspace.remove({});
    await Channel.remove({});
    await Page.remove({});
    await Message.remove({});
    await server.close();
  });

  // afterEach(async ()=> {
  //   await Channel.remove({});
  //   workspace = await Workspace.findByIdAndUpdate(workspace._id,
  //       {channels: []},
  //       {new: true});
  // });

  describe('POST /workspace/:workspaceName/channel/:channelName', () => {
    let creator;
    let text;

    beforeEach(()=> {
      creator = userEmail;
      text = 'my first message';
    });

    afterEach(async ()=> {
      await Page.findByIdAndUpdate(channel.pages[0]._id,
          {messages: []},
          {new: true});
      await Message.remove({});
    });

    const execute = () => {
      const chUrl = `channel/${channel.name}`;
      const wsUrl = `workspace/${workspace.name}`;
      return request(server)
          .post(`/api/messages/${wsUrl}/${chUrl}`)
          .set('x-auth-token', token)
          .send({creator, text});
    };

    it('should return the message if the request is valid', async () => {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            '_id', 'text', 'creator', 'dateTime'
          ])
      );
    });

    it('should return 400 if text is less than 1 characters', async ()=> {
      text = '';
      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('should return 400 if text is missing', async ()=> {
      text = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 403 if the user is not in the channel', async ()=> {
      text = null;
      const response = await execute(secondToken);

      expect(response.status).toBe(400);
    });
  });
});

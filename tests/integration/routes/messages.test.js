
const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');
const {Channel} = require('../../../models/channel');
const {Message} = require('../../../models/message');

let server;

describe('/api/workspaces/channels/messages', ()=> {
  let token;
  const userEmail = 'user@test.com';
  const workspaceName = 'wsName';
  const channelName = 'channelNam';
  let user;
  let channel;
  let workspace;
  // let channelId;

  const createUser = ()=> {
    return request(server)
        .post('/api/users')
        .send({name: 'name', email: userEmail, password: 'password'});
  };

  const createWorkspace = ()=> {
    return request(server)
        .post('/api/workspaces')
        .send({name: workspaceName, creator: userEmail,
          users: [userEmail], admins: [userEmail]});
  };

  const createChannel = (wsId)=> {
    return request(server)
        .post('/api/workspaces/channels')
        .send({name: channelName, users: [userEmail], workspaceId: wsId});
  };

  beforeAll(async ()=> {
    server = require('../../../index');
    await createUser();
    user = await User.findOne({email: userEmail});
    workspace = await createWorkspace();
    user = await User.findOne({name: workspaceName});
    channel = await createChannel(workspace._id);
    channelId = channel._id;
    token = user.getAuthToken();
  });

  afterAll(async ()=> {
    await User.remove({});
    await Workspace.remove({});
    await Channel.remove({});
    await server.close();
  });

  describe('POST /', ()=> {
    let text;

    const execute = ()=> {
      return request(server)
          .post('/api/workspaces/channels/messages')
          .set('x-auth-token', token)
          .send({text: text, channelId: channelId});
    };

    beforeEach(async ()=> {
      text = 'Generic text';
      await Message.remove({});
    });

    it('should return new message if request is valid', async ()=> {
      const response = await execute();

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining([
            '_id', 'text', 'dateTime', 'user'
          ])
      );
    });

    it('should return 400 if text is missing', async ()=> {
      text = null;
      const response = await execute();

      expect(response.status).toBe(400);
    });

    it('should return 404 if channel does not exist', async ()=> {
      channelId = null;
      const response = await execute();

      expect(response.status).toBe(404);
      expect(response.text).toEqual('Invalid channel.');
    });
  });
});

const request = require('supertest');
const {User} = require('../../../models/user');
const {Workspace} = require('../../../models/workspace');

let server;

describe('/api/workspaces', ()=> {
  let token;
  let secondToken;
  let thirdToken;
  const userEmail = 'user@test.com';
  const secondUserEmail = 'seconduser@test.com';
  const thirdUserEmail = 'thirduser@test.com';
  let user;
  let secondUser;
  let thirdUser;

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
    await createUser(thirdUserEmail);
    thirdUser = await User.findOne({email: thirdUserEmail});
    thirdToken = thirdUser.getAuthToken();
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
      expect(usersEmails.includes(secondUserEmail)).toBe(true);
      // expect(usersEmails).toEqual(expect.arrayContaining(users));
    });

    it('should return 404 if workspace is invalid', async () => {
      myWorkspace.name = null;
      const response = await execute(token);
      expect(response.status).toBe(404);
      expect(response.text).toEqual('Workspace not found.');
    });
  });

  describe('PATCH /:wsname/fields', ()=> {
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

    afterEach(async ()=> {
      await Workspace.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .patch(`/api/workspaces/${myWorkspace.name}/fields`)
          .set('x-auth-token', token)
          .send({name, description, imageUrl, location, welcomeMessage});
    };

    it('should let the creator change channel fields', async () => {
      name = 'new name';
      description = 'new description';
      imageUrl = 'https://www.allacronyms.com/127021hipster.png';
      location = 'new location';
      description = 'new description';
      welcomeMessage = 'new messsage';

      const response = await execute(token);

      const updatedWorkspace = await Workspace.
          findOne({name: name});
      expect(response.status).toBe(200);
      expect(updatedWorkspace.name).toEqual(name);
      expect(updatedWorkspace.description).toEqual(description);
      expect(updatedWorkspace.location).toEqual(location);
      expect(updatedWorkspace.welcomeMessage).toEqual(welcomeMessage);
    });

    it('should not let non-owner member change workspace fields', async () => {
      name = 'new name';
      description = 'new description';
      imageUrl = 'https://www.allacronyms.com/127021hipster.png';
      location = 'new location';
      description = 'new description';
      welcomeMessage = 'new messsage';
      const response = await execute(secondToken);

      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name});
      expect(updatedWorkspace.name).not.toEqual(name);
      expect(updatedWorkspace.description).not.toEqual(description);
      expect(updatedWorkspace.location).not.toEqual(location);
      expect(updatedWorkspace.welcomeMessage).not.toEqual(welcomeMessage);
      expect(response.status).toBe(403);
    });

    it('return 400 if the name is shorter than 1 character', async () => {
      name = '';

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if the name is longer than 250 characters', async () => {
      name = new Array(252).join('a');

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if the new name already exists', async () => {
      name = 'workspaceName';

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if the welcomeMessage is shorter than 1 char', async () => {
      welcomeMessage = '';

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if the welcomeMessage is longer than 250', async () => {
      welcomeMessage = new Array(252).join('a');

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if the description is shorter than 1 char', async () => {
      description = '';

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if the description is longer than 250 char', async () => {
      description = new Array(252).join('a');

      const response = await execute(token);
      expect(response.status).toBe(400);
    });

    it('return 400 if imageUrl is not a valid image', async () => {
      imageUrl = 'a';

      const response = await execute(token);
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /:wsname', ()=> {
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

    afterEach(async ()=> {
      await Workspace.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .delete(`/api/workspaces/${myWorkspace.name}`)
          .set('x-auth-token', token)
          .send({name, description, imageUrl, location, welcomeMessage});
    };

    it('should let the creator delete the workspace', async () => {
      const response = await execute(token);

      expect(await Workspace.findOne({name: name})).toBe(null);
      expect(response.status).toBe(200);
    });

    it('should not let non-owner delete the workspace', async () => {
      const response = await execute(secondToken);

      const workspace = await Workspace.findOne({name: name});
      expect(workspace.name).toBe(name);
      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /:wsname/addAdmins', ()=> {
    let name;
    let myWorkspace;
    let admins;

    const createWorkspace = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name: name, creator: userEmail, admins: admins,
            users: [userEmail, secondUserEmail], description: 'a',
            welcomeMessage: 'a'
          });
    };

    beforeEach(async ()=> {
      name = 'workspaceName';
      admins = [userEmail];
      await createWorkspace();
      myWorkspace = await Workspace.findOne({name: name});
    });

    afterEach(async ()=> {
      await Workspace.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .patch(`/api/workspaces/${myWorkspace.name}/addAdmins`)
          .set('x-auth-token', token)
          .send({admins: admins});
    };

    it('should add the second user to admin list', async () => {
      admins = [secondUserEmail];
      const response = await execute(token);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('admins', 'email');
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'admins']));

      const adminsEmails = updatedWorkspace.admins.map((admin) => {
        return admin.email;
      });
      admins.push(userEmail);
      expect(adminsEmails).toEqual(expect.arrayContaining(admins));
    });

    it('should not add the same user twice in the admin list', async () => {
      const response = await execute(token);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('admins', 'email');
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'admins']));

      expect(updatedWorkspace.admins.length).toEqual(1);
    });

    it(`should return 403 if user doesn't belong to workspace`, async () => {
      const response = await execute(thirdToken);

      expect(response.status).toBe(403);
      let msg = '';
      msg = `You have no permissions to modify ${myWorkspace.name} workspace`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 404 if workspace doesn't exist`, async () => {
      myWorkspace.name = 'a';
      const response = await execute(token);

      expect(response.status).toBe(404);
      const msg = 'Workspace not found.';
      expect(response.text).toEqual(msg);
    });

    it(`should return 400 if no admins were specified`, async () => {
      admins = null;
      const response = await execute(token);

      expect(response.status).toBe(400);
      const msg = 'No new admins were specified.';
      expect(response.text).toEqual(msg);
    });
  });

  describe('PATCH /:wsname/removeAdmins', ()=> {
    let name;
    let myWorkspace;
    let admins;

    const createWorkspace = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name: name, creator: userEmail, admins: admins,
            users: [userEmail, secondUserEmail], description: 'a',
            welcomeMessage: 'a'
          });
    };

    beforeEach(async ()=> {
      name = 'workspaceName';
      admins = [userEmail, secondUserEmail];
      await createWorkspace();
      myWorkspace = await Workspace.findOne({name: name});
    });

    afterEach(async ()=> {
      await Workspace.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .patch(`/api/workspaces/${myWorkspace.name}/removeAdmins`)
          .set('x-auth-token', token)
          .send({admins: admins});
    };

    it('should remove the second user from admin list', async () => {
      admins = [secondUserEmail];
      const response = await execute(token);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('admins', 'email');
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'admins']));

      const adminsEmails = updatedWorkspace.admins.map((admin) => {
        return admin.email;
      });
      admins.push(userEmail);
      expect(adminsEmails).toEqual(expect.not.arrayContaining(admins));
      expect(adminsEmails).toEqual(expect.arrayContaining([userEmail]));
    });

    it('should not allow the removal of the workspace creator', async () => {
      admins = [userEmail];
      const response = await execute(token);
      expect(response.status).toBe(403);
      msg = `Workspace creator cannot be removed from moderators list.`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 403 if user doesn't own the workspace`, async () => {
      const response = await execute(secondToken);

      expect(response.status).toBe(403);
      let msg = '';
      msg = `You have no permissions to modify ${myWorkspace.name} workspace`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 403 if user doesn't belong to workspace`, async () => {
      const response = await execute(thirdToken);

      expect(response.status).toBe(403);
      let msg = '';
      msg = `You have no permissions to modify ${myWorkspace.name} workspace`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 404 if workspace doesn't exist`, async () => {
      myWorkspace.name = 'a';
      const response = await execute(token);

      expect(response.status).toBe(404);
      const msg = 'Workspace not found.';
      expect(response.text).toEqual(msg);
    });
  });

  describe('PATCH /:wsname/addUsers', ()=> {
    let name;
    let myWorkspace;
    let users;

    const createWorkspace = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name: name, creator: userEmail,
            admins: [userEmail, secondUserEmail], users: users,
            description: 'a', welcomeMessage: 'a'
          });
    };

    beforeEach(async ()=> {
      name = 'workspaceName';
      users = [userEmail, secondUserEmail];
      await createWorkspace();
      myWorkspace = await Workspace.findOne({name: name});
    });

    afterEach(async ()=> {
      await Workspace.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .patch(`/api/workspaces/${myWorkspace.name}/addUsers`)
          .set('x-auth-token', token)
          .send({users: users});
    };

    it('should let creator add the second user to user list', async () => {
      users = [thirdUserEmail];
      const response = await execute(token);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('users', 'email');
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'users']));

      const usersEmails = updatedWorkspace.users.map((user) => {
        return user.email;
      });
      users.push(userEmail);
      expect(usersEmails).toEqual(expect.arrayContaining(users));
    });

    it('should let admin add the second user to user list', async () => {
      users = [thirdUserEmail];
      const response = await execute(secondToken);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('users', 'email');
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'users']));

      const usersEmails = updatedWorkspace.users.map((user) => {
        return user.email;
      });
      users.push(userEmail);
      expect(usersEmails).toEqual(expect.arrayContaining(users));
    });

    it('should not add the same user twice in the user list', async () => {
      const response = await execute(token);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('users', 'email');
      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(
          expect.arrayContaining(['name', 'users']));

      expect(updatedWorkspace.users.length).toEqual(2);
    });

    it(`should return 403 if user doesn't belong to workspace`, async () => {
      const response = await execute(thirdToken);

      expect(response.status).toBe(403);
      let msg = '';
      msg = `You have no permissions to modify ${myWorkspace.name}`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 404 if workspace doesn't exist`, async () => {
      myWorkspace.name = 'a';
      const response = await execute(token);

      expect(response.status).toBe(404);
      const msg = 'Workspace not found.';
      expect(response.text).toEqual(msg);
    });

    it(`should return 400 if no users were specified`, async () => {
      users = null;
      const response = await execute(token);

      expect(response.status).toBe(400);
      const msg = 'No new users were specified.';
      expect(response.text).toEqual(msg);
    });
  });

  describe('PATCH /:wsname/removeUsers', ()=> {
    let name;
    let myWorkspace;
    let users;

    const createWorkspace = ()=> {
      return request(server)
          .post('/api/workspaces')
          .set('x-auth-token', token)
          .send({
            name: name, creator: userEmail, admins: [userEmail],
            users: users, description: 'a',
            welcomeMessage: 'a'
          });
    };

    beforeEach(async ()=> {
      name = 'workspaceName';
      users = [userEmail, secondUserEmail];
      await createWorkspace();
      myWorkspace = await Workspace.findOne({name: name});
    });

    afterEach(async ()=> {
      await Workspace.remove({});
    });

    const execute = (token)=> {
      return request(server)
          .patch(`/api/workspaces/${myWorkspace.name}/removeUsers`)
          .set('x-auth-token', token)
          .send({users: users});
    };

    it('should remove the second user from admin list', async () => {
      users = [secondUserEmail];
      const response = await execute(token);
      const updatedWorkspace = await Workspace.
          findOne({name: myWorkspace.name}).populate('users', 'email');
      expect(response.status).toBe(200);

      const usersEmails = updatedWorkspace.users.map((admin) => {
        return admin.email;
      });
      users.push(userEmail);
      expect(usersEmails).toEqual(expect.not.arrayContaining(users));
      expect(usersEmails).toEqual(expect.arrayContaining([userEmail]));
    });

    it('should not allow the removal of the workspace creator', async () => {
      users = [userEmail];
      const response = await execute(token);
      expect(response.status).toBe(403);
      msg = `Workspace creator cannot be removed from users list.`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 403 if user doesn't own the workspace`, async () => {
      const response = await execute(secondToken);

      expect(response.status).toBe(403);
      let msg = '';
      msg = `You have no permissions to modify ${myWorkspace.name}`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 403 if user doesn't belong to workspace`, async () => {
      const response = await execute(thirdToken);

      expect(response.status).toBe(403);
      let msg = '';
      msg = `You have no permissions to modify ${myWorkspace.name}`;
      expect(response.text).toEqual(msg);
    });

    it(`should return 404 if workspace doesn't exist`, async () => {
      myWorkspace.name = 'a';
      const response = await execute(token);

      expect(response.status).toBe(404);
      const msg = 'Workspace not found.';
      expect(response.text).toEqual(msg);
    });
  });
});

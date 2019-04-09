const eUsers = require('../../../middleware/existing_users');
const {User} = require('../../../models/user');

describe('existing_users middleware', () => {
  let user1;
  let user2;
  let user3;

  const createUser = async (name, email, password)=> {
    const user = new User({name, email, password});
    await user.save();
    return user;
  };

  beforeEach(async ()=> {
    user1 = createUser('test', 'test@testing.com', '123456');
    user2 = createUser('test2', 'test2@testing.com', '123456');
    user3 = createUser('test3', 'test3@testing.com', '123456');
  });

  afterEach(async ()=> {
    await User.remove({});
  });

  it('should check if all user exist', () => {
    console.log(user1);
    const request = {
      body: {
        creator: user1.email,
        users: [user1.email, user2.email, user3.email],
        admins: [user1.email, user2.email, user3.email]
      }
    };
    const next = jest.fn();
    const response = {};
    eUsers(request, response, next);

    expect(next).toHaveBeenCalled();
  });
});

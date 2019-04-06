const {User} = require('../../../models/user');
const jwt = require('jsonwebtoken');
const config = require('config');


describe('getAuthToken', () => {
  it('Should call the jwt sign method', () => {
    jwt.sign = jest.fn();
    config.get = jest.fn().mockReturnValue('jwt_key');

    const user = new User({
      name: 'test',
      email: 'example@somthing.com',
      password: 'password'
    });

    user.getAuthToken();

    expect(jwt.sign).toHaveBeenCalled();
    expect(jwt.sign.mock.calls[0][0]).toEqual({_id: user._id});
    expect(jwt.sign.mock.calls[0][1]).toMatch(/jwt_key/);
  });
});

const {Bot} = require('../../../models/bot');
const jwt = require('jsonwebtoken');
const config = require('config');


describe('getAuthToken (bot)', () => {
  it('Should call the jwt sign method', () => {
    jwt.sign = jest.fn();
    config.get = jest.fn().mockReturnValue('jwt_key');

    const bot = new Bot({
      name: 'test',
      url: 'https://testurl.com'
    });

    bot.getAuthToken();

    expect(jwt.sign).toHaveBeenCalled();
    expect(jwt.sign.mock.calls[0][0]).toEqual({_id: bot._id});
    expect(jwt.sign.mock.calls[0][1]).toMatch(/jwt_key/);
  });
});

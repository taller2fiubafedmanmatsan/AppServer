const botHelper = require('../../helpers/bot_helper');

describe('Url parsing', () => {
  const url = 'https://testUrl.com/test/this/is/a/long/path';

  it('Should return only the domain of an url', () => {
    const result = botHelper.parseUrl(url);
    expect(result).toEqual('testUrl.com');
  });

  it('Should return the path of the url', () => {
    const result = botHelper.parsePath(url);
    expect(result).toEqual('/test/this/is/a/long/path');
  });

  it('Should extract the bot command', () => {
    const message = 'Hola @Tito welcome';
    const result = botHelper.parseBotCommand(message, 'Tito');
    expect(result).toEqual('welcome');
  });
});

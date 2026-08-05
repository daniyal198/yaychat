import {classifyChatLink, extractFirstUrl} from '../src/yaychat/screens/chats/linkCards';

describe('chat link cards', () => {
  it('extracts the first URL without trailing punctuation', () => {
    expect(extractFirstUrl('Read https://www.bitcoinyay.com/mining.')).toBe(
      'https://www.bitcoinyay.com/mining',
    );
    expect(extractFirstUrl('Read [https://example.com/yaysapp-offer].')).toBe(
      'https://example.com/yaysapp-offer',
    );
  });

  it('classifies Indexx ecosystem links as action cards', () => {
    expect(classifyChatLink('Try https://academy.indexx.ai/course/intro')).toMatchObject({
      type: 'action',
      host: 'academy.indexx.ai',
      productName: 'Indexx',
    });
    expect(classifyChatLink('Open https://aiainai.com/tasks')).toMatchObject({
      type: 'action',
      productName: 'aiainai',
    });
  });

  it('classifies non-ecosystem links as external warnings', () => {
    expect(classifyChatLink('Offer: https://example.com/yaysapp')).toEqual({
      type: 'warning',
      url: 'https://example.com/yaysapp',
      host: 'example.com',
    });
    expect(classifyChatLink('Offer: https://www.example.com/yaysapp-offer]')).toEqual({
      type: 'warning',
      url: 'https://www.example.com/yaysapp-offer',
      host: 'example.com',
    });
  });

  it('ignores messages without valid web URLs', () => {
    expect(classifyChatLink('No link in this message')).toBeNull();
  });
});

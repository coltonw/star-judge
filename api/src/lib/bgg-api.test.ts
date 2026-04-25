import { describe, expect, it } from 'vitest';
import { parseXmlCollection } from './bgg-api';

describe('parseXmlCollection', () => {
  it('decodes HTML entities in names and thumbnails', () => {
    const xml = `
      <items>
        <item objectid="1">
          <name sortindex="1">Wits &amp; Wagers: It&#039;s Vegas, Baby!</name>
          <thumbnail>https://example.com/x.jpg?a=1&amp;b=2</thumbnail>
        </item>
        <item objectid="2">
          <name sortindex="1">Trick&#039;n Trouble</name>
        </item>
        <item objectid="3">
          <name sortindex="1">&#x26;mpersand &#60;tag&#62;</name>
        </item>
      </items>
    `;

    const result = parseXmlCollection(xml);
    const byId = Object.fromEntries(result.map((r) => [r.id, r]));

    expect(byId['1'].name).toBe("Wits & Wagers: It's Vegas, Baby!");
    expect(byId['1'].bggThumbnailUrl).toBe('https://example.com/x.jpg?a=1&b=2');
    expect(byId['2'].name).toBe("Trick'n Trouble");
    expect(byId['3'].name).toBe('&mpersand <tag>');
  });

  it('leaves plain names untouched', () => {
    const xml = `
      <items>
        <item objectid="42">
          <name sortindex="1">Catan</name>
          <thumbnail>https://example.com/c.jpg</thumbnail>
        </item>
      </items>
    `;
    const [c] = parseXmlCollection(xml);
    expect(c.name).toBe('Catan');
    expect(c.bggThumbnailUrl).toBe('https://example.com/c.jpg');
  });
});

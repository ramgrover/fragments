const { Fragment } = require('../../src/model/fragment');

// Wait for a certain number of ms (default 50). Feel free to change this value
// if it isn't long enough for your test runs. Returns a Promise.
const wait = async (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

const validTypes = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json'
];

describe('Fragment class', () => {
  test('common formats are supported', () => {
    validTypes.forEach((format) => expect(Fragment.isSupportedType(format)).toBe(true));
  });

  describe('Fragment()', () => {
    test('ownerId and type are required', () => {
      expect(() => new Fragment({})).toThrow();
    });

    test('ownerId is required', () => {
      expect(() => new Fragment({ type: 'text/plain', size: 1 })).toThrow();
    });

    test('type is required', () => {
      expect(() => new Fragment({ ownerId: '1234', size: 1 })).toThrow();
    });

    test('type can be a simple media type', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      expect(fragment.type).toEqual('text/plain');
    });

    test('type can include a charset', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.type).toEqual('text/plain; charset=utf-8');
    });

    test('size gets set to 0 if missing', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain' });
      expect(fragment.size).toBe(0);
    });

    test('size must be a number', () => {
      expect(() => new Fragment({ ownerId: '1234', type: 'text/plain', size: '1' })).toThrow();
    });

    test('size can be 0', () => {
      expect(() => new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 })).not.toThrow();
    });

    test('size cannot be negative', () => {
      expect(() => new Fragment({ ownerId: '1234', type: 'text/plain', size: -1 })).toThrow();
    });

    test('invalid types throw', () => {
      expect(
        () => new Fragment({ ownerId: '1234', type: 'application/msword', size: 1 })
      ).toThrow();
    });

    test('valid types can be set', () => {
      validTypes.forEach((format) => {
        const fragment = new Fragment({ ownerId: '1234', type: format, size: 1 });
        expect(fragment.type).toEqual(format);
      });
    });

    test('fragments have an id', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 1 });
      expect(fragment.id).toMatch(
        /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/
      );
    });

    test('fragments use id passed in if present', () => {
      const fragment = new Fragment({
        id: 'id',
        ownerId: '1234',
        type: 'text/plain',
        size: 1,
      });
      expect(fragment.id).toEqual('id');
    });

    test('fragments get a created datetime string', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 1,
      });
      expect(Date.parse(fragment.created)).not.toBeNaN();
    });

    test('fragments get an updated datetime string', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 1,
      });
      expect(Date.parse(fragment.updated)).not.toBeNaN();
    });
  });

  describe('isSupportedType()', () => {
    test('common text types are supported, with and without charset', () => {
      expect(Fragment.isSupportedType('text/plain')).toBe(true);
      expect(Fragment.isSupportedType('text/plain; charset=utf-8')).toBe(true);
    });

    test('other types are not supported', () => {
      expect(Fragment.isSupportedType('application/octet-stream')).toBe(false);
      expect(Fragment.isSupportedType('application/msword')).toBe(false);
      expect(Fragment.isSupportedType('audio/webm')).toBe(false);
      expect(Fragment.isSupportedType('video/ogg')).toBe(false);
    });
  });

  describe('mimeType, isText', () => {
    test('mimeType returns the mime type without charset', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.type).toEqual('text/plain; charset=utf-8');
      expect(fragment.mimeType).toEqual('text/plain');
    });

    test('mimeType returns the mime type if charset is missing', () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      expect(fragment.type).toEqual('text/plain');
      expect(fragment.mimeType).toEqual('text/plain');
    });

    test('isText return expected results', () => {
      // Text fragment
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain; charset=utf-8',
        size: 0,
      });
      expect(fragment.isText).toBe(true);
    });
  });

  describe('formats', () => {
    test('formats returns the expected result for plain text', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 0,
      });
      expect(fragment.formats).toEqual(['text/plain']);
    });

    test('formats returns the expected formats for text/markdown', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/markdown',
        size: 0,
      });
      expect(fragment.formats).toEqual(['text/markdown', 'text/plain', 'text/html']);
    });

    test('formats returns the expected formats for text/html', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/html',
        size: 0,
      });
      expect(fragment.formats).toEqual(['text/html', 'text/plain']);
    });

    test('formats returns the expected formats for application/json', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/json',
        size: 0,
      });
      expect(fragment.formats).toEqual(['application/json', 'text/plain', 'application/yaml', 'application/x-yaml']);
    });

    test('formats returns the expected formats for text/csv', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/csv',
        size: 0,
      });
      expect(fragment.formats).toEqual(['text/csv', 'text/plain', 'application/json']);
    });

    test('formats returns the expected formats for application/yaml', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/yaml',
        size: 0,
      });
      expect(fragment.formats).toEqual(['application/yaml', 'text/plain', 'application/json']);
    });

    test('formats returns the expected formats for application/x-yaml', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/x-yaml',
        size: 0,
      });
      expect(fragment.formats).toEqual(['application/x-yaml', 'text/plain', 'application/json']);
    });
  });

  describe('isImage', () => {
    test('isImage returns true for image types', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'image/png',
        size: 0,
      });
      expect(fragment.isImage).toBe(true);
    });

    test('isImage returns false for non-image types', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 0,
      });
      expect(fragment.isImage).toBe(false);
    });
  });

  describe('convertData()', () => {
    test('returns the original data when source and target types are the same', async () => {
      const data = Buffer.from('test data');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: data.length });
      const result = await fragment.convertData(data, 'text/plain');
      expect(result).toEqual(data);
    });

    test('converts HTML to plain text', async () => {
      const data = Buffer.from('<p>Hello <strong>World</strong></p>');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/html', size: data.length });
      const result = await fragment.convertData(data, 'text/plain');
      expect(result.toString()).toEqual('Hello World');
    });

    test('converts Markdown to plain text', async () => {
      const data = Buffer.from('# Heading\n\n**Bold** *italic* ~~strikethrough~~ `code`\n> Quote\n- List item');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/markdown', size: data.length });
      const result = await fragment.convertData(data, 'text/plain');
      expect(result.toString()).not.toContain('#');
      expect(result.toString()).not.toContain('**');
      expect(result.toString()).not.toContain('*');
      expect(result.toString()).not.toContain('~~');
      expect(result.toString()).not.toContain('`');
      expect(result.toString()).not.toContain('>');
      expect(result.toString()).not.toContain('-');
    });

    test('converts JSON to plain text', async () => {
      const data = Buffer.from('{"name":"test","value":123}');
      const fragment = new Fragment({ ownerId: '1234', type: 'application/json', size: data.length });
      const result = await fragment.convertData(data, 'text/plain');
      expect(result.toString()).toContain('{\n  "name": "test",\n  "value": 123\n}');
    });

    test('returns CSV as plain text without changes', async () => {
      const data = Buffer.from('header1,header2\nvalue1,value2');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/csv', size: data.length });
      const result = await fragment.convertData(data, 'text/plain');
      expect(result).toEqual(data);
    });

    test('returns YAML as plain text without changes', async () => {
      const data = Buffer.from('name: test\nvalue: 123');
      const fragment = new Fragment({ ownerId: '1234', type: 'application/yaml', size: data.length });
      const result = await fragment.convertData(data, 'text/plain');
      expect(result).toEqual(data);
    });

    test('converts Markdown to HTML', async () => {
      const data = Buffer.from('# Hello World');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/markdown', size: data.length });
      const result = await fragment.convertData(data, 'text/html');
      expect(result.toString()).toContain('<h1>Hello World</h1>');
    });

    test('converts CSV to JSON', async () => {
      const data = Buffer.from('name,age\nJohn,30\nJane,25');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/csv', size: data.length });
      const result = await fragment.convertData(data, 'application/json');
      const parsed = JSON.parse(result.toString());
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('John');
      expect(parsed[0].age).toBe('30');
      expect(parsed[1].name).toBe('Jane');
      expect(parsed[1].age).toBe('25');
    });

    test('converts JSON to YAML', async () => {
      const data = Buffer.from('{"name":"test","value":123}');
      const fragment = new Fragment({ ownerId: '1234', type: 'application/json', size: data.length });
      const result = await fragment.convertData(data, 'application/yaml');
      expect(result.toString()).toContain('name: test');
      expect(result.toString()).toContain('value: 123');
    });

    test('converts YAML to JSON', async () => {
      const data = Buffer.from('name: test\nvalue: 123');
      const fragment = new Fragment({ ownerId: '1234', type: 'application/yaml', size: data.length });
      const result = await fragment.convertData(data, 'application/json');
      const parsed = JSON.parse(result.toString());
      expect(parsed.name).toBe('test');
      expect(parsed.value).toBe(123);
    });

    test('throws error for unsupported conversion', async () => {
      const data = Buffer.from('test data');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: data.length });
      await expect(fragment.convertData(data, 'image/png')).rejects.toThrow(
        'Conversion from text/plain to image/png is not implemented'
      );
    });
  });

  describe('save(), getData(), setData(), byId(), byUser(), delete()', () => {
    test('byUser() returns an empty array if there are no fragments for this user', async () => {
      expect(await Fragment.byUser('1234')).toEqual([]);
    });

    test('a fragment can be created and save() stores a fragment for the user', async () => {
      const data = Buffer.from('hello');
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(data);

      const fragment2 = await Fragment.byId('1234', fragment.id);
      expect(fragment2).toEqual(fragment);
      expect(await fragment2.getData()).toEqual(data);
    });

    test('save() updates the updated date/time of a fragment', async () => {
      const ownerId = '7777';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      const modified1 = fragment.updated;
      await wait();
      await fragment.save();
      const fragment2 = await Fragment.byId(ownerId, fragment.id);
      expect(Date.parse(fragment2.updated)).toBeGreaterThan(Date.parse(modified1));
    });

    test('setData() updates the updated date/time of a fragment', async () => {
      const data = Buffer.from('hello');
      const ownerId = '7777';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      await fragment.save();
      const modified1 = fragment.updated;
      await wait();
      await fragment.setData(data);
      await wait();
      const fragment2 = await Fragment.byId(ownerId, fragment.id);
      expect(Date.parse(fragment2.updated)).toBeGreaterThan(Date.parse(modified1));
    });

    test("a fragment is added to the list of a user's fragments", async () => {
      const data = Buffer.from('hello');
      const ownerId = '5555';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(data);

      expect(await Fragment.byUser(ownerId)).toEqual([fragment.id]);
    });

    test('full fragments are returned when requested for a user', async () => {
      const data = Buffer.from('hello');
      const ownerId = '6666';
      const fragment = new Fragment({ ownerId, type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(data);

      expect(await Fragment.byUser(ownerId, true)).toEqual([fragment]);
    });

    test('setData() throws if not give a Buffer', () => {
      const fragment = new Fragment({ ownerId: '123', type: 'text/plain', size: 0 });
      expect(() => fragment.setData()).rejects.toThrow();
    });

    test('setData() updates the fragment size', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(Buffer.from('a'));
      expect(fragment.size).toBe(1);

      await fragment.setData(Buffer.from('aa'));
      const { size } = await Fragment.byId('1234', fragment.id);
      expect(size).toBe(2);
    });

    test('a fragment can be deleted', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/plain', size: 0 });
      await fragment.save();
      await fragment.setData(Buffer.from('a'));

      await Fragment.delete('1234', fragment.id);
      expect(() => Fragment.byId('1234', fragment.id)).rejects.toThrow();
    });

    test('setData() validates HTML content', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/html', size: 0 });
      await fragment.save();

      // Should fail without HTML tags
      await expect(fragment.setData(Buffer.from('Hello World')))
        .rejects
        .toThrow('Invalid HTML format: missing HTML tags');

      // Should succeed with HTML tags
      await expect(fragment.setData(Buffer.from('<p>Hello World</p>')))
        .resolves
        .not.toThrow();
    });

    test('setData() validates JSON content', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'application/json', size: 0 });
      await fragment.save();

      // Should fail with invalid JSON
      await expect(fragment.setData(Buffer.from('invalid json')))
        .rejects
        .toThrow('Invalid JSON format');

      // Should succeed with valid JSON
      await expect(fragment.setData(Buffer.from('{"key": "value"}')))
        .resolves
        .not.toThrow();
    });

    test('setData() validates CSV content', async () => {
      const fragment = new Fragment({ ownerId: '1234', type: 'text/csv', size: 0 });
      await fragment.save();

      // Should fail without comma-separated values
      await expect(fragment.setData(Buffer.from('not a csv')))
        .rejects
        .toThrow('Invalid CSV format');

      // Should succeed with valid CSV
      await expect(fragment.setData(Buffer.from('header1,header2\nvalue1,value2')))
        .resolves
        .not.toThrow();
    });
  });

  describe('static methods and utilities', () => {
    test('validateHtml handles self-closing tags correctly', () => {
      // Create a new fragment instance with HTML type
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/html',
        size: 0
      });

      // Test with self-closing tags
      const htmlWithSelfClosing = '<div><img src="test.jpg"/><br/></div>';
      expect(fragment.setData(Buffer.from(htmlWithSelfClosing))).resolves.not.toThrow();
    });

    test('validateHtml detects mismatched tags', async () => {
      // Create a fragment instance with HTML type
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/html',
        size: 0
      });
      await fragment.save();

      // This HTML has mismatched tags (<div> closed with </span>)
      const invalidHtml = '<div>test</span>';
      await expect(fragment.setData(Buffer.from(invalidHtml))).rejects.toThrow('Invalid HTML format');
    });

    test('byUser throws if ownerId is missing', async () => {
      await expect(Fragment.byUser()).rejects.toThrow('ownerId is required');
    });

    test('getExtensionForMimeType returns correct extension', () => {
      expect(Fragment.getExtensionForMimeType('text/plain')).toBe('.txt');
      expect(Fragment.getExtensionForMimeType('text/markdown')).toBe('.md');
      expect(Fragment.getExtensionForMimeType('text/html')).toBe('.html');
      expect(Fragment.getExtensionForMimeType('text/csv')).toBe('.csv');
      expect(Fragment.getExtensionForMimeType('application/json')).toBe('.json');
      expect(Fragment.getExtensionForMimeType('application/yaml')).toBe('.yaml');
      expect(Fragment.getExtensionForMimeType('application/x-yaml')).toBe('.yaml');
    });

    test('getExtensionForMimeType returns empty string for unknown mime types', () => {
      expect(Fragment.getExtensionForMimeType('unknown/type')).toBe('');
    });

    test('extensionToMimeType returns correct mime type for extensions', () => {
      const extensionMap = Fragment.extensionToMimeType;
      expect(extensionMap['.txt']).toBe('text/plain');
      expect(extensionMap['.md']).toBe('text/markdown');
      expect(extensionMap['.html']).toBe('text/html');
      expect(extensionMap['.csv']).toBe('text/csv');
      expect(extensionMap['.json']).toBe('application/json');
      expect(extensionMap['.yaml']).toBe('application/yaml');
      expect(extensionMap['.yml']).toBe('application/yaml');
    });
  });
});
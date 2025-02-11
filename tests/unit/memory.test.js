const {
    writeFragment,
    readFragment,
    writeFragmentData,
    readFragmentData,
    //listFragments,
    //deleteFragment,
  } = require('../../src/model/data/memory');
  
  const MemoryDB = require('../../src/model/data/memory/memory-db');
  
  // Mock the MemoryDB used in the actual implementation
  jest.mock('../../src/model/data/memory/memory-db', () => {
    return jest.fn().mockImplementation(() => {
      const db = {};
      return {
        put: jest.fn((ownerId, id, value) => {
          db[`${ownerId}:${id}`] = value;
          return Promise.resolve();
        }),
        get: jest.fn((ownerId, id) => {
          return Promise.resolve(db[`${ownerId}:${id}`] || null);
        }),
        del: jest.fn((ownerId, id) => {
          delete db[`${ownerId}:${id}`];
          return Promise.resolve();
        }),
        query: jest.fn((ownerId) => {
          const results = Object.keys(db)
            .filter(key => key.startsWith(`${ownerId}:`))
            .map(key => db[key]);
          return Promise.resolve(results);
        }),
        clear: jest.fn(() => {
          Object.keys(db).forEach(key => delete db[key]);
          return Promise.resolve();
        }),
      };
    });
  });
  
  
  // Create an in-memory database for testing
  const data = new MemoryDB();
  
  describe('In-Memory Fragment Database', () => {
    const fragment = {
      id: 'fragment1',
      ownerId: 'owner123',
      type: 'text/plain',
    };
  
    const buffer = Buffer.from('Some fragment data');
  
    beforeEach(async () => {
      // Clear the in-memory database before each test
      await data.clear();
    });
  
    // Test writing a fragment and verifying it can be read back
    test('should write a fragment and read it back', async () => {
      await writeFragment(fragment); // Write the fragment
      const result = await readFragment(fragment.ownerId, fragment.id); // Read the fragment
      expect(result).toEqual(fragment); // Check if the read result matches the written fragment
    });
  
    // Test writing fragment data and verifying it can be read back
    test('should write fragment data and read it back', async () => {
      await writeFragmentData(fragment.ownerId, fragment.id, buffer); // Write fragment data
      const result = await readFragmentData(fragment.ownerId, fragment.id); // Read the fragment data
      expect(result).toEqual(buffer); // Check if the read data matches the written buffer
    });
    // Test reading non-existent fragment metadata
    test('should return null for non-existent fragment metadata', async () => {
      const result = await readFragment('nonexistentOwner', 'nonexistentId');
      expect(result).toBeNull();
    });
  
    // Test reading non-existent fragment data
    test('should return null for non-existent fragment data', async () => {
      const result = await readFragmentData('nonexistentOwner', 'nonexistentId');
      expect(result).toBeNull();
    });
  
    // Test listing fragments
    // test('should list fragments for an owner', async () => {
    //   await writeFragment(fragment);
    //   const result = await listFragments(fragment.ownerId);
    //   expect(result).toEqual([fragment.id]); // Expecting an array of IDs
    // });
  
  
    // Test deleting a fragment
    // test('should delete a fragment and its data', async () => {
    //   await writeFragment(fragment);
    //   await writeFragmentData(fragment.ownerId, fragment.id, buffer);
  
    //   await deleteFragment(fragment.ownerId, fragment.id);
  
    //   const metadata = await readFragment(fragment.ownerId, fragment.id);
    //   const data = await readFragmentData(fragment.ownerId, fragment.id);
  
    //   expect(metadata).toBeNull();
    //   expect(data).toBeNull();
    // });
  
  });
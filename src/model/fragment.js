const { randomUUID } = require('crypto');
const contentType = require('content-type');
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,  // Make sure listFragments is implemented
  deleteFragment,  // Make sure deleteFragment is implemented
} = require('./data/memory');

class Fragment {
  constructor({ id = randomUUID(), ownerId, created = new Date().toISOString(), updated = new Date().toISOString(), type, size = 0 }) {
    if (!ownerId || !type) {
      throw new Error('ownerId and type are required');
    }
    if (typeof size !== 'number') {
      throw new Error('size must be a number');
    }
    if (size < 0) {
      throw new Error('size cannot be negative');
    }
    if (!Fragment.isSupportedType(type)) {
      throw new Error('Invalid type');
    }

    this.id = id;
    this.ownerId = ownerId;
    this.created = created;
    this.updated = updated;
    this.type = type;
    this.size = size;
  }

  static async byId(ownerId, id) {
    const metadata = await readFragment(ownerId, id);
    if (!metadata) throw new Error('Fragment not found');
    return new Fragment(metadata);
  }

  static async byUser(ownerId, expand = false) {
    const fragmentList = await listFragments(ownerId);
    if (!expand) return fragmentList;
    return Promise.all(fragmentList.map(id => Fragment.byId(ownerId, id)));
  }

  async save() {
    this.updated = new Date().toISOString();
    await writeFragment(this);
  }

  async getData() {
    return await readFragmentData(this.ownerId, this.id);
  }

  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('Data must be a buffer');
    }
    this.size = Buffer.byteLength(data);
    this.updated = new Date().toISOString();
    await writeFragmentData(this.ownerId, this.id, data);
    await this.save();
  }

  get mimeType() {
    return contentType.parse(this.type).type;
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  get formats() {
    return ['text/plain'];  // Only return 'text/plain' for now
  }

  static isSupportedType(value) {
    const { type } = contentType.parse(value);
    return ['text/plain', 'application/json'].includes(type);
  }

  static async delete(ownerId, id) {
    await deleteFragment(ownerId, id);  // Delete logic here
  }
}

module.exports.Fragment = Fragment;

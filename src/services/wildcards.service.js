const mongoose = require('mongoose');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const getCollection = (collectionName) => {
  return mongoose.connection.db.collection(collectionName);
};

const getCollections = async (prefix) => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name);
  if (prefix) {
    return names.filter(name => name.startsWith(prefix));
  }
  return names;
};

const createRecord = async (collectionName, body) => {
  const collection = getCollection(collectionName);
  const result = await collection.insertOne(body);
  return { _id: result.insertedId, ...body };
};

const bulkUpsert = async (collectionName, records, primaryKey) => {
  const collection = getCollection(collectionName);
  if (!records || records.length === 0) return { upsertedCount: 0 };
  
  const bulkOps = records.map(record => {
    const filter = {};
    if (primaryKey) {
      if (typeof primaryKey === 'string' && primaryKey.includes(',')) {
        const keys = primaryKey.split(',').map(k => k.trim());
        let hasAllKeys = true;
        keys.forEach(k => {
          if (record[k] !== undefined && record[k] !== null) {
            filter[k] = record[k];
          } else {
            hasAllKeys = false;
          }
        });
        if (!hasAllKeys) {
          return { insertOne: { document: { ...record, _syncedAt: new Date() } } };
        }
      } else if (record[primaryKey] !== undefined && record[primaryKey] !== null) {
        filter[primaryKey] = record[primaryKey];
      } else {
        return { insertOne: { document: { ...record, _syncedAt: new Date() } } };
      }
    } else if (record._id) {
      filter._id = new mongoose.Types.ObjectId(record._id);
    } else {
      return { insertOne: { document: { ...record, _syncedAt: new Date() } } };
    }
    
    return {
      updateOne: {
        filter,
        update: { $set: { ...record, _syncedAt: new Date() } },
        upsert: true
      }
    };
  });
  
  const result = await collection.bulkWrite(bulkOps);
  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
    insertedCount: result.insertedCount
  };
};

const getRecords = async (collectionName, query = {}, projection = {}, options = {}) => {
  const collection = getCollection(collectionName);
  
  // 如果传入了 limit 参数则分页, 否则返回全部记录（用于树状图等场景）
  const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
  const limit = hasLimit ? parseInt(options.limit, 10) : 0;
  const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
  const skip = hasLimit ? (page - 1) * limit : 0;

  let cursor = collection.find(query);

  if (options.sort && Object.keys(options.sort).length > 0) {
    cursor = cursor.sort(options.sort);
  }
  
  if (projection && Object.keys(projection).length > 0) {
    cursor = cursor.project(projection);
  }
  
  if (hasLimit) {
    cursor = cursor.skip(skip).limit(limit);
  }

  const records = await cursor.toArray();
  const totalResults = await collection.countDocuments(query);
  const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;
  
  return {
    results: records,
    page,
    limit: hasLimit ? limit : totalResults,
    totalPages,
    totalResults
  };
};

const getRecordById = async (collectionName, id) => {
  const collection = getCollection(collectionName);
  const record = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
  if (!record) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Record not found');
  }
  return record;
};

const updateRecordById = async (collectionName, id, updateBody) => {
  const collection = getCollection(collectionName);
  const result = await collection.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    { $set: updateBody }
  );
  
  if (result.matchedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Record not found');
  }
  
  return getRecordById(collectionName, id);
};

const deleteRecordById = async (collectionName, id) => {
  const collection = getCollection(collectionName);
  const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
  
  if (result.deletedCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Record not found');
  }
};

module.exports = {
  getCollections,
  createRecord,
  bulkUpsert,
  getRecords,
  getRecordById,
  updateRecordById,
  deleteRecordById,
};

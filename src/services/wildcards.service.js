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

const bulkUpsert = async (collectionName, records, primaryKey, clear = false) => {
  const collection = getCollection(collectionName);
  if (clear) {
    await collection.deleteMany({});
  }
  if (!records || records.length === 0) return { upsertedCount: 0, updatedKeys: [], uniqueCount: 0 };

  // 统计主键去重唯一数
  const uniqueKeysMap = new Set();
  if (primaryKey) {
    records.forEach(r => {
      const keys = typeof primaryKey === 'string' ? primaryKey.split(',').map(k => k.trim()) : [primaryKey];
      const keyVal = keys.map(k => String(r[k])).join('||');
      uniqueKeysMap.add(keyVal);
    });
    console.log(`📡 [bulkUpsert] 写入集合: ${collectionName} | 传入原始记录数: ${records.length} | 按主键去重后的唯一记录数: ${uniqueKeysMap.size}`);
  }

  // 自动创建复合索引以极大提升 upsert 匹配效率，解决海量数据导入时的超时 408 问题
  if (primaryKey) {
    const keys = typeof primaryKey === 'string' ? primaryKey.split(',').map(k => k.trim()) : [primaryKey];
    const indexSpec = {};
    keys.forEach(k => {
      indexSpec[k] = 1;
    });
    try {
      await collection.createIndex(indexSpec, { background: true });
      console.log(`🔑 [MongoDB] 复合索引自动确认/创建成功:`, indexSpec);
    } catch (idxErr) {
      console.warn(`⚠️ [MongoDB] 复合索引自动创建提示:`, idxErr.message);
    }
  }

  const bulkOps = [];

  records.forEach((record) => {
    const filter = {};
    let isUpdate = false;

    if (primaryKey) {
      if (typeof primaryKey === 'string' && primaryKey.includes(',')) {
        const keys = primaryKey.split(',').map(k => k.trim());
        // 允许值为 null，只要不是 undefined 即可作为主键进行 upsert
        const hasAllKeys = keys.every(k => record[k] !== undefined);
        if (hasAllKeys) {
          keys.forEach(k => filter[k] = record[k]);
          isUpdate = true;
        }
      } else if (record[primaryKey] !== undefined) {
        filter[primaryKey] = record[primaryKey];
        isUpdate = true;
      }
    } else if (record._id) {
      filter._id = new mongoose.Types.ObjectId(record._id);
      isUpdate = true;
    }

    if (isUpdate) {
      bulkOps.push({
        updateOne: {
          filter,
          update: { $set: { ...record, _syncedAt: new Date() } },
          upsert: true
        }
      });
    } else {
      bulkOps.push({
        insertOne: { document: { ...record, _syncedAt: new Date() } }
      });
    }
  });

  const result = await collection.bulkWrite(bulkOps);

  const updatedKeys = [];
  bulkOps.forEach((op, index) => {
    const record = records[index];
    const isUpsert = result.upsertedIds[index] !== undefined;
    const isInsert = op.insertOne !== undefined;

    if (!isUpsert && !isInsert) {
      if (primaryKey) {
        const keys = typeof primaryKey === 'string' ? primaryKey.split(',').map(k => k.trim()) : [primaryKey];
        updatedKeys.push(keys.reduce((acc, key) => ({ ...acc, [key]: record[key] }), {}));
      } else {
        updatedKeys.push(record._id);
      }
    }
  });

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    upsertedCount: result.upsertedCount,
    insertedCount: result.insertedCount,
    uniqueCount: primaryKey ? uniqueKeysMap.size : records.length,
    updatedKeys
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

const deleteRecords = async (collectionName, query = {}) => {
  const collection = getCollection(collectionName);
  
  // 支持自定义 deleteRange 条件，避开 mongoSanitize 的 $ 过滤
  if (query.deleteRange) {
    const { field, gte, lte } = query.deleteRange;
    if (field) {
      const condition = {};
      if (gte !== undefined || lte !== undefined) {
        condition[field] = {};
        if (gte !== undefined) condition[field]['$gte'] = gte;
        if (lte !== undefined) condition[field]['$lte'] = lte;
      }
      query = condition;
    }
  }
  
  const result = await collection.deleteMany(query);
  return { deletedCount: result.deletedCount };
};

module.exports = {
  getCollections,
  createRecord,
  bulkUpsert,
  getRecords,
  getRecordById,
  updateRecordById,
  deleteRecordById,
  deleteRecords,
};

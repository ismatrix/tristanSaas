const httpStatus = require('http-status');
const { Order } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * 创建订单
 * @param {Object} orderBody
 * @returns {Promise<Order>}
 */
const createOrder = async (orderBody) => {
  if (await Order.findOne({ requireCode: orderBody.requireCode })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'requireCode already exists');
  }
  return Order.create(orderBody);
};

/**
 * 分页查询订单列表
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const queryOrders = async (filter, options) => {
  const orders = await Order.paginate(filter, options);
  const OrderDetail = require('../models/orderDetail.model');

  // 若返回成功且包含结果，首先将所有 mongoose 实体全部强转为原生 JS Object
  if (orders && orders.results && orders.results.length > 0) {
    orders.results = orders.results.map(o => o.toJSON ? o.toJSON() : o);

    // Now undefined handleId problem is completely resolved
    const handleIds = orders.results.map(o => o.handleId).filter(Boolean);
    const unitIds = orders.results.map(o => o.custManagerSalesUnitId).filter(Boolean);
    
    // 1. 联表 OrderDetail
    if (handleIds.length > 0) {
      const details = await OrderDetail.find({ handleId: { $in: handleIds } }).lean();
      const detailsMap = details.reduce((acc, detail) => {
        acc[detail.handleId] = detail;
        return acc;
      }, {});
      
      orders.results.forEach(order => {
        if (order.handleId && detailsMap[order.handleId]) {
          order.orderDetail = detailsMap[order.handleId];
        }
      });
    }

    // 2. 联表 CmiBranch
    if (unitIds.length > 0) {
      const { CmiBranch } = require('../models');
      const branches = await CmiBranch.find({ columnValue: { $in: unitIds } }).lean();
      const branchesMap = branches.reduce((acc, branch) => {
        acc[branch.columnValue] = branch;
        return acc;
      }, {});

      orders.results.forEach(order => {
        if (order.custManagerSalesUnitId && branchesMap[order.custManagerSalesUnitId]) {
          order.branchInfo = branchesMap[order.custManagerSalesUnitId];
        }
      });
    }

    // 3. 联表 ContractDetail（双策略：handleId→profitAnalysisTable 优先，servNbr→circuitId 兜底）
    if (handleIds.length > 0) {
      const { Contract, ContractDetail } = require('../models');

      // 拉取所有合同详情，只取需要的字段路径
      const contractDetails = await ContractDetail.find({}).lean();

      // 策略A: 通过 profitAnalysisTable[].handleId 匹配 → 同一 contractDetail 的 ContractProcessInfo
      const handleIdToCdMap = {};
      contractDetails.forEach(cd => {
        const table = cd?.contractTab?.tabPane4?.dictContractCard?.profitAnalysis?.profitAnalysisTable;
        if (Array.isArray(table)) {
          table.forEach(row => {
            if (row.handleId) {
              const key = String(row.handleId);
              if (!handleIdToCdMap[key]) {
                handleIdToCdMap[key] = cd;
              }
            }
          });
        }
      });

      // 策略B: servNbr→contract.circuitId→uuid→contractDetail（兜底）
      const servNbrs = orders.results.map(o => o.servNbr).filter(Boolean);
      const servNbrToCdMap = {};
      if (servNbrs.length > 0) {
        const contracts = await Contract.find({ circuitId: { $in: servNbrs } }).lean();
        // 构建 servNbr → 最新合同 uuid
        const contractMap = {};
        contracts.forEach(c => {
          const key = c.circuitId;
          if (!key) return;
          if (!contractMap[key] || new Date(c.updatedAt) > new Date(contractMap[key].updatedAt)) {
            contractMap[key] = c;
          }
        });
        // uuid → contractDetail 映射
        const cdByUuid = {};
        contractDetails.forEach(cd => { if (cd.uuid) cdByUuid[cd.uuid] = cd; });
        Object.entries(contractMap).forEach(([servNbr, contract]) => {
          if (contract.uuid && cdByUuid[contract.uuid]) {
            servNbrToCdMap[servNbr] = cdByUuid[contract.uuid];
          }
        });
      }

      // 合并：handleId 优先，servNbr 兜底
      orders.results.forEach(order => {
        const cd = handleIdToCdMap[String(order.handleId)] || servNbrToCdMap[order.servNbr];
        if (!cd) return;

        const processInfo = cd?.contractTab?.tabPane4?.dictContractCard?.ContractProcessInfo;
        if (processInfo) {
          order.contractProfit = {
            costTotal: processInfo.costTotal,
            incomeTotal: processInfo.incomeTotal,
            totalGrossMarginRateProject: processInfo.totalGrossMarginRateProject,
            orderApprovalTitle: processInfo.orderApprovalTitle,
            backgroundInfo: processInfo.backgroundInfo,
          };
        }
      });
    }
  }

  return orders;
};

/**
 * 通过id获取订单
 * @param {ObjectId} id
 * @returns {Promise<Order>}
 */
const getOrderById = async (id) => {
  return Order.findById(id);
};

/**
 * 通过id更新订单
 * @param {ObjectId} orderId
 * @param {Object} updateBody
 * @returns {Promise<Order>}
 */
const updateOrderById = async (orderId, updateBody) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  if (updateBody.requireCode && (await Order.findOne({ requireCode: updateBody.requireCode, _id: { $ne: orderId } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'requireCode already exists');
  }
  Object.assign(order, updateBody);
  await order.save();
  return order;
};

/**
 * 批量插入或更新订单
 * 依据 requireCode，如果存在就更新（upsert=true），如果不存在就插入。
 * 返回成功的统计信息。
 * @param {Array<Object>} ordersArray - 前端传入的订单对象数组
 * @returns {Promise<Object>}
 */
const bulkUpsertOrders = async (ordersArray) => {
  if (!ordersArray || !ordersArray.length) {
    return { nUpserted: 0, nModified: 0 };
  }

  const bulkOps = ordersArray.map(order => ({
    updateOne: {
      filter: { requireCode: order.requireCode },
      update: { $set: order },
      upsert: true
    }
  }));

  const result = await Order.bulkWrite(bulkOps);
  
  return {
    nUpserted: result.upsertedCount,
    nModified: result.modifiedCount,
    nMatched: result.matchedCount,
  };
};

/**
 * 通过id删除订单
 * @param {ObjectId} orderId
 * @returns {Promise<Order>}
 */
const deleteOrderById = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }
  await order.remove();
  return order;
};

module.exports = {
  createOrder,
  queryOrders,
  getOrderById,
  updateOrderById,
  deleteOrderById,
  bulkUpsertOrders,
};

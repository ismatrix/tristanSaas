const express = require('express');
const dataGovernanceLogController = require('../../controllers/dataGovernanceLog.controller');

const router = express.Router();

router
  .route('/')
  .post(dataGovernanceLogController.upsertGovernanceLog)
  .get(dataGovernanceLogController.getGovernanceLogs)
  .delete(dataGovernanceLogController.deleteGovernanceLog);

module.exports = router;

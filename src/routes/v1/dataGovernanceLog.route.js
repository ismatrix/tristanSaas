const express = require('express');
const auth = require('../../middlewares/auth');
const dataGovernanceLogController = require('../../controllers/dataGovernanceLog.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('editData'), dataGovernanceLogController.upsertGovernanceLog)
  .get(auth(), dataGovernanceLogController.getGovernanceLogs)
  .delete(auth('editData'), dataGovernanceLogController.deleteGovernanceLog);

module.exports = router;

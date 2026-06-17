const express = require('express');
const router = express.Router();
const {
  getAllConsumptions,
  createConsumption,
  updateConsumption,
  deleteConsumption
} = require('../controllers/consumptionController');

router.get('/', getAllConsumptions);
router.post('/', createConsumption);
router.put('/:id', updateConsumption);
router.delete('/:id', deleteConsumption);

module.exports = router;

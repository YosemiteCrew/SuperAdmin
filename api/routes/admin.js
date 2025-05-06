const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');


// router.get('/assessments', verifyToken, assessmentsController.getAssessments);
// router.put('/assessments', verifyToken, assessmentsController.getAssessments);

// GET /example
router.get('/', verifyToken, (req, res) => {
  res.send('GET request to /example');
});

// POST /example
router.post('/', verifyToken, (req, res) => {
  res.send('POST request to /example');
});

// GET /example/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  res.send(`GET request to /example/${id}`);
});

// PUT /example/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  res.send(`PUT request to /example/${id}`);
});

// DELETE /example/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  res.send(`DELETE request to /example/${id}`);
});

module.exports = router;
const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Display feedback form
router.get('/feedback', feedbackController.showFeedbackForm);

// Handle feedback submission
router.post('/submit-feedback', feedbackController.submitFeedback);

// Success page
router.get('/success', feedbackController.showSuccessPage);

module.exports = router;
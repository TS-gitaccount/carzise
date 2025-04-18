const Feedback = require('../models/Feedback');

exports.showFeedbackForm = (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - Feedback',
    messages: req.flash() 
  });
};



exports.submitFeedback = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    await Feedback.create({
      name,
      email,
      phone: phone || null,
      subject,
      message,
      created_at: new Date()
    });

    req.flash('success', 'Thank you for your feedback! We will get back to you soon.');
    res.redirect('/success');
  } catch (error) {
    console.error('Error submitting feedback:', error);
    req.flash('error', 'There was an error submitting your feedback. Please try again.');
    res.redirect('/feedback');
  }
};

exports.showSuccessPage = (req, res) => {
  res.render('success', { 
    title: 'Thank You',
    messages: req.flash() 
  });
};
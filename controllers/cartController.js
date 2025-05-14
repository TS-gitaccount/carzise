const db = require('../db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');


exports.checkoutCart = async (req, res) => {
  try {
    const { cart } = req.body;
    const customerId = req.session.customerId;

    if (!customerId) {
      return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    if (!cart || cart.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }

    // Save each service to database
    for (let item of cart) {
      await db.query(
        "INSERT INTO cart(customer_id, service_name, service_price) VALUES (?, ?, ?)",
        [customerId, item.name, item.price]
      );
    }

    res.json({ success: true, message: 'Cart saved successfully!' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


// controllers/cartController.js

exports.getCartHistory = async (req, res) => {
  try {
    const customerId = req.session.customerId; // customer login ID
    if (!customerId) {
      return res.status(401).json({ success: false, message: 'User not logged in.' });
    }

    // Fetch all cart services by customer
    const [cartHistory] = await db.query(
      "SELECT * FROM cart WHERE customer_id = ? ORDER BY created_at DESC",
      [customerId]
    );
    

    res.json({ success: true, cartHistory });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

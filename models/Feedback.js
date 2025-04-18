const pool = require('../db');

class Feedback {
  static async create(feedbackData) {
    const [result] = await pool.query(
      'INSERT INTO feedbacks SET ?', 
      feedbackData
    );
    return result.insertId;
  }

  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM feedbacks');
    return rows;
  }
}

module.exports = Feedback;
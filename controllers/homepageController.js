const path = require("path");
const pool = require("../db");
const fs = require('fs');

exports.getDashboard = async (req, res) => {
    try {
        const queries = {
            admins: "SELECT COUNT(*) AS count FROM admin",
            customers: "SELECT COUNT(*) AS count FROM customers",
            feedbacks: "SELECT COUNT(*) AS count FROM feedbacks",
            getfeedback: "SELECT c.customer_name, f.feedback_text, c.customer_photo, f.rating FROM feedbacks f JOIN customers c ON f.customer_id = c.customer_id WHERE f.rating >= 3 ORDER BY f.rating DESC LIMIT 4 ",
            customerGrowthQuery: "WITH RECURSIVE date_series AS (SELECT CURDATE() - INTERVAL 29 DAY AS day UNION ALL SELECT day + INTERVAL 1 DAY FROM date_series WHERE day < CURDATE()) SELECT ds.day, COALESCE(COUNT(c.customer_id), 0) AS new_customers FROM date_series ds LEFT JOIN customers c ON DATE(c.customer_created_at) = ds.day GROUP BY ds.day ORDER BY ds.day ASC ",
            newCustomersQuery: "SELECT COUNT(*) AS newCustomers FROM customers WHERE MONTH(customer_created_at) = MONTH(CURRENT_DATE()) AND YEAR(customer_created_at) = YEAR(CURRENT_DATE())"
        };

        const faqs = [
            { question: "How to place an order?", answer: "You can order via our website or contact customer support." },
            { question: "What payment methods are available?", answer: "We accept credit cards, UPI, and net banking." },
            { question: "What should I do if I receive the wrong medication?", answer: "If you receive the wrong medication, please contact our support team immediately. You can initiate a return or exchange request through the pharmacy portal." },
            { question: "Are prescriptions required to purchase medication?", answer: "Yes, for certain medications, a valid prescription from a licensed healthcare provider is required." },
            { question: "Is my personal data secure?", answer: "Yes, your personal data is protected with strong encryption methods and follows industry best practices." }
        ];

        // Execute all queries in parallel
        const [admins, customers, feedbacks, getfeedback, customerGrowth, newCustomers] = await Promise.all([
            pool.query(queries.admins),
            pool.query(queries.customers),
            pool.query(queries.feedbacks),
            pool.query(queries.getfeedback),
            pool.query(queries.customerGrowthQuery),
            pool.query(queries.newCustomersQuery)
        ]);

        const customerGrowthData = customerGrowth[0] || [];
        const days = customerGrowthData.map(row => new Date(row.day).toISOString().split('T')[0]);
        const customerData = customerGrowthData.map(row => row.new_customers || 0);

        const feedbackWithImages = getfeedback[0].map(fb => ({
            customer_name: fb.customer_name,
            feedback_text: fb.feedback_text,
            rating: fb.rating,
            customer_photo: fb.customer_photo
                ? `data:image/jpeg;base64,${fb.customer_photo.toString('base64')}`
                : '/img/defaultPhoto.jpg'
        }));

        res.render("dashboard", {
            admins: admins[0][0].count,
            customers: customers[0][0].count,
            feedbacks: feedbacks[0][0].count,
            getfeedbacks: feedbackWithImages,
            newCustomers: newCustomers[0][0]?.newCustomers || 0,
            customerGrowth: customerGrowthData,
            days,
            customerData,
            faqs,
            profile: req.session.user?.role,
            username: req.session.user?.username,
            pagetitle: 'Home',
        });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).render('500', {
            profile: req.session.user?.role,
            username: req.session.user?.username,
            pagetitle: 'Internal Server Error',
            error: err.message
        });
    }
};

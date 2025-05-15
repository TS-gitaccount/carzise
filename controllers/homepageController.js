const path = require("path");
const pool = require("../db");
const fs = require('fs');
const nodemailer = require('nodemailer');

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

exports.submitFeedback = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Create a transporter
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL_USER, // Replace with your email
                pass: process.env.EMAIL_PASS // Replace with your email password or app password
            }
        });

        // Email options
        const mailOptions = {
            from: email,
            to: process.env.EMAIL_USER, // Replace with the email where you want to receive feedback
            subject: `Feedback: ${subject}`,
            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.render("success", {
            pdfName: null,
            username: req.session.user?.username,
            profile: req.session.user?.role,
            pagetitle: "Success",
            message: "Your feedback has been sent successfully!"
        });

    } catch (error) {
        console.error('Error sending feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to send feedback.' });
    }
};

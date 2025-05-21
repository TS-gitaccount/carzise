const pool = require('../db');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed!"), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login');
    }
    next();
};

// ✅ Admin Dashboard Route
exports.getAdminDashboard = [isAdmin, async (req, res) => {
    try {
        const admin_username = req.session.user?.username;
        if (!admin_username) {
            return res.status(400).render("400", {
                username: null,
                profile: "admin",
                pagetitle: "Unauthorized",
                error: "User not logged in."
            });
        }

        const [customersQuery] = await pool.query(`
        SELECT c.customer_id, c.customer_created_at, c.customer_name, c.customer_email, 
        c.customer_ph_no, c.customer_balance_amt, c.customer_photo, 
        ca.address_id, ca.address_type, ca.street, ca.city, ca.state, ca.zip_code, 
        f.feedback_id, f.rating, f.feedback_text, f.feedback_date
        FROM customers c
        LEFT JOIN customer_addresses ca ON c.customer_id = ca.customer_id
        LEFT JOIN feedbacks f ON c.customer_id = f.customer_id
        ORDER BY c.customer_id, ca.address_id, f.feedback_id;
    `);

        let customers = {};
        customersQuery.forEach(row => {
            if (!customers[row.customer_id]) {
                customers[row.customer_id] = {
                    customer_id: row.customer_id,
                    customer_created_at: row.customer_created_at,
                    customer_name: row.customer_name,
                    customer_email: row.customer_email,
                    customer_ph_no: row.customer_ph_no,
                    customer_balance_amt: row.customer_balance_amt,
                    customer_photo: row.customer_photo
                        ? `data:image/jpeg;base64,${row.customer_photo.toString('base64')}`
                        : '/img/defaultPhoto.jpg',
                    addresses: [],
                    feedbacks: []
                };
            }

            if (row.address_id) {
                customers[row.customer_id].addresses.push({
                    address_id: row.address_id,
                    street: row.street,
                    city: row.city,
                    state: row.state,
                    zip_code: row.zip_code,
                    address_type: row.address_type
                });
            }

            if (row.feedback_id) {
                customers[row.customer_id].feedbacks.push({
                    feedback_id: row.feedback_id,
                    rating: row.rating,
                    feedback_text: row.feedback_text,
                    feedback_date: row.feedback_date
                });
            }
        });
        const [feedbacksQuery] = await pool.query(`
            SELECT f.*, c.customer_name 
            FROM feedbacks f
            JOIN customers c ON f.customer_id = c.customer_id
        `);
        const [cartItems] = await pool.query(' SELECT ct.*, c.customer_name FROM cart_items ct JOIN customers c ON ct.customer_id = c.customer_id ');
        const [servicesQuery] = await pool.query(`SELECT * FROM service`);
        const [categoriesResult] = await pool.query('SELECT DISTINCT category FROM service');

        const categories = Array.isArray(categoriesResult) ? categoriesResult.map(row => row.category) : [];

        // Render EJS page with data
        res.render('adminDashboard', {
            pagetitle: `Admin Panel - ${req.session.user.username}`,
            username: req.session.user.username,
            profile: "admin",
            customers: Object.values(customers),
            cartItems,
            feedbacksQuery,
            servicesQuery,
            categories
        });

    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).render("500", {
            username: req.session.user?.username,
            profile: "admin",
            pagetitle: "Internal Server Error",
            error: err.message
        });
    }
}];

// ✅ Edit or Delete Customer (Supports Image Update)
exports.deleteOrEditCustomer = [isAdmin, async (req, res) => {
    try {

        // Upload customer photo (if provided)
        await new Promise((resolve, reject) => {
            upload.single("customer_photo")(req, res, (err) => {
                if (err) {
                    return reject(res.status(500).render("500", {
                        username: req.session.user?.username,
                        profile: "admin",
                        pagetitle: "Internal Server Error",
                        error: "File upload error"
                    }));
                }
                resolve();
            });
        });

        const { action, customer_id, customer_name, customer_email, customer_ph_no, customer_balance_amt, address_id, street, city, state, zip_code, address_type, feedback_id, rating, feedback_text } = req.body;
        let customer_photo = req.file ? req.file.buffer : null;

        if (!customer_id) {
            return res.status(400).render("400", {
                username: req.session.user?.username,
                profile: "admin",
                pagetitle: "Bad Request",
                error: "Customer ID is required."
            });
        }

        if (action === "delete") {
            const [deleteResult] = await pool.query('DELETE FROM customers WHERE customer_id = ?', [customer_id]);
            if (deleteResult.affectedRows === 0) {
                return res.status(404).render("404", {
                    username: req.session.user?.username,
                    profile: "admin",
                    pagetitle: "Not Found",
                    error: "Customer not found or already deleted."
                });
            }
            return res.render("success", {
                username: req.session.user?.username,
                profile: "admin",
                pagetitle: "Success",
                message: "Customer deleted successfully!"
            });
        } else if (action === "edit") {
            if (!customer_name || !customer_email || !customer_ph_no || !customer_balance_amt) {
                return res.status(400).render("400", {
                    username: req.session.user?.username,
                    profile: "admin",
                    pagetitle: "Bad Request",
                    error: "All fields must be provided for editing."
                });
            }

            // Update customer info
            await pool.query(
                `UPDATE customers SET customer_name=?, customer_email=?, customer_ph_no=?, 
                 customer_balance_amt=? ${customer_photo ? ', customer_photo=?' : ''} WHERE customer_id=?`,
                customer_photo ? [customer_name, customer_email, customer_ph_no, customer_balance_amt, customer_photo, customer_id]
                    : [customer_name, customer_email, customer_ph_no, customer_balance_amt, customer_id]
            );

            return res.render("success", {
                username: req.session.user?.username,
                profile: "admin",
                pagetitle: "Success",
                message: "Customer details updated successfully!"
            });
        } else if (action === "editAddress") {
            if (!street || !city || !state || !zip_code) {
                return res.status(400).render("400", {
                    username: req.session.user?.username,
                    profile: "admin",
                    pagetitle: "Bad Request",
                    error: "All fields must be provided for editing."
                });
            }

            // Update address
            await pool.execute(
                `UPDATE customer_addresses SET street=?, city=?, state=?, zip_code=?, address_type=? 
                 WHERE customer_id=? AND address_id=?`,
                [street, city, state, zip_code, address_type, customer_id, address_id]
            );

            return res.render("success", {
                username: req.session.user?.username,
                profile: "admin",
                pagetitle: "Success",
                message: "Customer details updated successfully!"
            });
        } else if (action === "editFeedback") {
            if (!rating || !feedback_text) {
                return res.status(400).render("400", {
                    username: req.session.user?.username,
                    profile: "admin",
                    pagetitle: "Bad Request",
                    error: "All fields must be provided for editing."
                });
            }

            // Update feedback
            await pool.execute(
                `UPDATE feedbacks SET rating=?, feedback_text=?, feedback_date=CURRENT_TIMESTAMP 
                 WHERE customer_id=? AND feedback_id=?`,
                [rating, feedback_text, customer_id, feedback_id]
            );

            return res.render("success", {
                username: req.session.user?.username,
                profile: "admin",
                pagetitle: "Success",
                message: "Customer details updated successfully!"
            });
        }

        return res.status(400).render("400", {
            username: req.session.user?.username,
            profile: "customer",
            pagetitle: "Bad Request",
            error: "Invalid action provided."
        });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).render("500", {
            username: req.session.user?.username,
            profile: "admin",
            pagetitle: "Internal Server Error",
            error: err.message
        });
    }
}];

// ✅ Reply to Feedback
exports.replyToFeedback = async (req, res) => {
    try {
        const { feedback_id, reply } = req.body;

        if (!feedback_id || !reply) {
            return res.status(400).json({ success: false, message: 'Feedback ID and reply are required.' });
        }

        await pool.query('UPDATE feedbacks SET admin_reply = ? WHERE feedback_id = ?', [reply, feedback_id]);

        res.redirect('/admin/adminDashboard');
    } catch (error) {
        console.error('Error replying to feedback:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ✅ Add Service
exports.addService = async (req, res) => {
    try {
        const { service_name, service_price, service_category } = req.body;

        if (!service_name || !service_price || !service_category) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        await pool.query('INSERT INTO service (name, price, category) VALUES (?, ?, ?)', [service_name, service_price, service_category]);

        res.redirect('/admin/adminDashboard');
    } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ✅ Delete Service
exports.deleteService = async (req, res) => {
    try {
        const { service_id } = req.body;

        if (!service_id) {
            return res.status(400).json({ success: false, message: 'Service ID is required.' });
        }

        await pool.query('DELETE FROM service WHERE service_id = ?', [service_id]);

        res.redirect('/admin/adminDashboard');
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};
// BACKEND CODE
exports.editService = async (req, res) => {
    try {
        const { service_id, name, category, price } = req.body;
        
        // Enhanced input validation
        if (!service_id) {
            return res.status(400).json({ success: false, message: 'Service ID is required.' });
        }
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Service name is required.' });
        }
        
        if (!category || category.trim() === '') {
            return res.status(400).json({ success: false, message: 'Service category is required.' });
        }
        
        if (price === undefined || price === null || isNaN(price) || price < 0) {
            return res.status(400).json({ success: false, message: 'Valid service price is required.' });
        }
        
        // Check if service exists before updating
        const [serviceExists] = await pool.query(
            'SELECT * FROM service WHERE service_id = ?',
            [service_id]
        );
        
        if (serviceExists.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        
        // Update the service
        await pool.query(
            'UPDATE service SET name = ?, category = ?, price = ?, updated_at = NOW() WHERE service_id = ?',
            [name.trim(), category.trim(), parseFloat(price), service_id]
        );
        
        res.status(200).json({ 
            success: true, 
            message: 'Service updated successfully.',
            service: {
                service_id,
                name: name.trim(),
                category: category.trim(),
                price: parseFloat(price)
            }
        });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
    }
};

// New endpoint to get all services for refreshing the list
exports.getServices = async (req, res) => {
    try {
        const [services] = await pool.query('SELECT * FROM service ORDER BY category, name');
        res.status(200).json({ success: true, services });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};



// BACKEND CODE
exports.deleteService = async (req, res) => {
    try {
        const { service_id } = req.body;
        
        // Input validation
        if (!service_id) {
            return res.status(400).json({ success: false, message: 'Service ID is required.' });
        }
        
        // Check if service exists before deleting
        const [serviceExists] = await pool.query(
            'SELECT * FROM service WHERE service_id = ?',
            [service_id]
        );
        
        if (serviceExists.length === 0) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        
        // Check if service is being used in any appointments or other related tables
        // This is optional but recommended to prevent orphaned records
        // Example:
        // const [serviceUsage] = await pool.query(
        //     'SELECT COUNT(*) as count FROM appointment WHERE service_id = ?',
        //     [service_id]
        // );
        // 
        // if (serviceUsage[0].count > 0) {
        //     return res.status(400).json({ 
        //         success: false, 
        //         message: 'Cannot delete service as it is associated with existing appointments.' 
        //     });
        // }
        
        // Delete the service
        await pool.query(
            'DELETE FROM service WHERE service_id = ?',
            [service_id]
        );
        
        res.status(200).json({ 
            success: true, 
            message: 'Service deleted successfully.'
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
    }
};





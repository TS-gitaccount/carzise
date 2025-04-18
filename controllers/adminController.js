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
            SELECT 
                c.customer_id, c.customer_created_at, c.customer_name, c.customer_email, 
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

       
        // Render EJS page with data
        res.render('adminDashboard', {
            pagetitle: `Admin Panel - ${req.session.user.username}`,
            username: req.session.user.username,
            profile: "admin",
            customers: Object.values(customers)
            
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
        } else if (action === "editAddress"){
            if (!street || !city || !state || !zip_code ) {
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
        } else if (action === "editFeedback"){
            if (!rating || !feedback_text ) {
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




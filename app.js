const express = require('express');
const path = require('path');
const pool = require('./db');
const flash = require('connect-flash');
const session = require('express-session');
const rateLimit = require("express-rate-limit");
require('dotenv').config();
const feedbackRoutes = require('./routes/feedbackRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();

//link to other webpages

app.get('/carzise_about', (req, res) => {
    res.render('carzise_about');
});


app.get('/carzise_service', (req, res) => {
    res.render('carzise_service');
});

app.get('/carzise_contact', (req, res) => {
    res.render('carzise_contact');
});

app.get('/carzise_service', (req, res) => {
    res.render('carzise_service');
});


app.get('/carserv_index', (req, res) => {
    res.render('carserv_index');
});

app.get('/carwash_index', (req, res) => {
    res.render('carwash_index');
});

app.get('/royalcar_index', (req, res) => {
    res.render('royalcar_index');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

app.get('/AutoNova_index', (req, res) => {
    res.render('AutoNova_index');
});

//carzise home feedback form

// Sign and encrypt session data
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000 // 1 day expiry
    }
}));

// Middleware

// Rate limiting configuration
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true, // Send rate limit info in `RateLimit-*` headers
    legacyHeaders: false,  // Disable `X-RateLimit-*` headers (deprecated)
});

// Apply middleware
app.use(apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/chartjs', express.static(path.join(__dirname, 'node_modules/chart.js/dist')));
app.use('/fontawesome', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free'));
app.use(flash());

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Use Routes
const routes = require('./routes/indexRoutes');
app.use(routes);
app.use('/', feedbackRoutes);

// Render Error Pages
function renderErrorPage(res, statusCode, template, pagetitle, session) {
    return res.status(statusCode).render(template, {
        profile: session?.user?.role,
        username: session?.user?.username,
        pagetitle
    });
}

// Handle 404 Not Found
app.use((req, res) => renderErrorPage(res, 404, "404", "Page Not Found", req.session || {}));

// Handle Other Errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    const template = status === 400 ? "400" : "500";
    const pagetitle = status === 400 ? "Bad Request" : "Internal Server Error";
    
    return renderErrorPage(res, status, template, pagetitle, req.session || {});
});

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port http://localhost:${PORT}`);
});

// Test MySQL Connection
pool.query('SELECT 1')
    .then(() => console.log('✅ MySQL Connection Successful'))
    .catch(err => console.error('❌ MySQL Connection Error:', err));

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
}

// Handle termination signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));  // Ctrl + C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));  // Deployment shutdown



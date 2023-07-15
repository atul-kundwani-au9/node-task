const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const app = express();
app.use(express.json());

const SECRET_KEY = 'your_secret_key'; // Secret key for JWT

// Database configuration
const db = mysql.createConnection({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'your_database_name',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

const superAdmin = {
    name: 'Super Admin',
    role: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'superadminpassword',
  };

  const createUserQuery = 'INSERT INTO User (name, role, email, password) VALUES (?, ?, ?, ?)';
  db.query(createUserQuery, [superAdmin.name, superAdmin.role, superAdmin.email, superAdmin.password], (err, result) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('Super-admin user created');
  });


// Create User table
db.query(`
  CREATE TABLE IF NOT EXISTS User (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
  )
`);

// Create Feed table
db.query(`
  CREATE TABLE IF NOT EXISTS Feed (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    description TEXT
  )
`);

// Middleware for user authentication
function authenticateUser(req, res, next) {
  const token = req.headers.authorization; // Assuming the token is sent in the Authorization header

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Logging function
function logOperation(user, operation) {
  const logsDirectory = path.join(__dirname, 'logs');
  const currentMinute = moment().startOf('minute').format('YYYYMMDDHHmm');
  const logFile = path.join(logsDirectory, `${currentMinute}.log`);

  const logEntry = `[${moment().format('YYYY-MM-DD HH:mm:ss')}] User '${user}' performed '${operation}' operation\n`;

  fs.appendFileSync(logFile, logEntry);
}

// Create a new user (super-admin)
app.post('/users', async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, role, email, password } = req.body;

    const createUserQuery = 'INSERT INTO User (name, role, email, password) VALUES (?, ?, ?, ?)';
    db.query(createUserQuery, [name, role, email, password], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error creating user' });
      }

      const newUser = {
        id: result.insertId,
        name,
        role,
        email,
      };

      logOperation(req.user.name, 'create user');

      res.status(201).json(newUser);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Create a new user (admin)
app.post('/users/admin', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, role, email, password } = req.body;

    const createUserQuery = 'INSERT INTO User (name, role, email, password) VALUES (?, ?, ?, ?)';
    db.query(createUserQuery, [name, role, email, password], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error creating admin user' });
      }

      const newAdmin = {
        id: result.insertId,
        name,
        role,
        email,
      };

      logOperation(req.user.name, 'create admin');

      res.status(201).json(newAdmin);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating admin user' });
  }
});

// Create a new user (basic)
app.post('/users/basic', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin or admin user
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, role, email, password } = req.body;

    const createUserQuery = 'INSERT INTO User (name, role, email, password) VALUES (?, ?, ?, ?)';
    db.query(createUserQuery, [name, role, email, password], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error creating basic user' });
      }

      const newBasicUser = {
        id: result.insertId,
        name,
        role,
        email,
      };

      logOperation(req.user.name, 'create basic user');

      res.status(201).json(newBasicUser);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating basic user' });
  }
});

// Update a user's role
app.put('/users/:id/role', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;
    const { role } = req.body;

    const updateUserQuery = 'UPDATE User SET role = ? WHERE id = ?';
    db.query(updateUserQuery, [role, id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating user role' });
      }

      logOperation(req.user.name, 'update user role');

      res.json({ message: 'User role updated' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// Delete a user
app.delete('/users/:id', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;

    const deleteUserQuery = 'DELETE FROM User WHERE id = ?';
    db.query(deleteUserQuery, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error deleting user' });
      }

      logOperation(req.user.name, 'delete user');

      res.json({ message: 'User deleted' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Create a new feed
app.post('/feeds', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { name, url, description } = req.body;

    const createFeedQuery = 'INSERT INTO Feed (name, url, description) VALUES (?, ?, ?)';
    db.query(createFeedQuery, [name, url, description], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error creating feed' });
      }

      const newFeed = {
        id: result.insertId,
        name,
        url,
        description,
      };

      logOperation(req.user.name, 'create feed');

      res.status(201).json(newFeed);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating feed' });
  }
});

// Update a feed
app.put('/feeds/:id', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user or an admin user with access to the feed
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;
    const { name, url, description } = req.body;

    const updateFeedQuery = 'UPDATE Feed SET name = ?, url = ?, description = ? WHERE id = ?';
    db.query(updateFeedQuery, [name, url, description, id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error updating feed' });
      }

      logOperation(req.user.name, 'update feed');

      res.json({ message: 'Feed updated' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating feed' });
  }
});

// Delete a feed
app.delete('/feeds/:id', authenticateUser, async (req, res) => {
  try {
    // Check if the request is coming from a super-admin user or an admin user with access to delete the feed
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { id } = req.params;

    const deleteFeedQuery = 'DELETE FROM Feed WHERE id = ?';
    db.query(deleteFeedQuery, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error deleting feed' });
      }

      logOperation(req.user.name, 'delete feed');

      res.json({ message: 'Feed deleted' });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting feed' });
  }
});

// Get logs (accessible only to super-admin)
app.get('/logs', authenticateUser, (req, res) => {
  try {
    // Check if the request is coming from a super-admin user
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const logsDirectory = path.join(__dirname, 'logs');

    fs.readdir(logsDirectory, (err, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error reading logs' });
      }

      const currentMinute = moment().startOf('minute').format('YYYYMMDDHHmm');
      const logFile = path.join(logsDirectory, `${currentMinute}.log`);

      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf8');
        res.send(logContent);
      } else {
        res.send('No logs available for the current minute');
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error getting logs' });
  }
});

// Automatically delete log files older than 30 minutes
setInterval(() => {
  const logsDirectory = path.join(__dirname, 'logs');
  const thirtyMinutesAgo = moment().subtract(30, 'minutes').valueOf();

  fs.readdir(logsDirectory, (err, files) => {
    if (err) {
      console.error(err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(logsDirectory, file);
      const fileStats = fs.statSync(filePath);
      const fileModifiedTime = moment(fileStats.mtime).valueOf();

      if (fileModifiedTime < thirtyMinutesAgo) {
        fs.unlinkSync(filePath); // Delete the log file
      }
    });
  });
}, 5 * 60 * 1000); // Run every 5 minutes

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

const crypto = require('crypto');
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 3000;
const scrypt = promisify(crypto.scrypt);
const COOKIE_NAME = 'petcare_session';
const SESSION_LIFETIME = 7 * 24 * 60 * 60;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
let sessionStaffByName = false;
let userSchemaReady = false;
const adminRecordTables = {
    pets: {
        table: 'PETS',
        primaryKey: 'Pet_Id',
        fields: ['PetOwner_Id', 'Pet_Name', 'Pet_Type']
    },
    groomingRequests: {
        table: 'Grooming_Request',
        primaryKey: 'Appointment_Id',
        fields: ['ContactPhone', 'Pet_Id']
    },
    sessions: {
        table: 'Session_',
        primaryKey: 'Session_Id',
        fields: ['Session_name', 'Session_No', 'Pet_Id']
    },
    reports: {
        table: 'REPORT',
        primaryKey: 'Report_ID',
        fields: ['Session_ID', 'Report_Date', 'Report_Description']
    },
    medications: {
        table: 'Medication_Log',
        primaryKey: 'Medication_Id',
        fields: ['Medication_Name', 'Dosage', 'Pet_Id']
    },
    staff: {
        table: 'Staff',
        primaryKey: 'Staff_Id',
        fields: ['Staff_Name', 'Staff_Type']
    },
    users: {
        table: 'Users',
        primaryKey: 'User_Id',
        fields: ['Username']
    },
    payments: {
        table: 'Payment',
        primaryKey: 'Payment_Id',
        fields: ['Payment_Type', 'Payment_Amount', 'Pet_Id']
    }
};
const numericRecordFields = new Set([
    'PetOwner_Id', 'Pet_Id', 'Session_No', 'Staff_Id', 'Session_ID', 'Payment_Amount'
]);
const recordFieldLengths = {
    Pet_Name: 50,
    Pet_Type: 10,
    ContactPhone: 15,
    Session_name: 50,
    Report_Description: 100,
    Medication_Name: 20,
    Dosage: 30,
    Staff_Name: 50,
    Staff_Type: 30,
    Username: 50,
    Payment_Type: 20
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Pets_DES'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        console.error('Check that MySQL is running and the DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME values in .env are correct.');
        return;
    }
    console.log(`Connected to MySQL Database: ${process.env.DB_NAME || 'Pets_DES'}`);
    initializeUserSchema()
        .then(() => {
            userSchemaReady = true;
            console.log('User registration and password storage are ready.');
        })
        .catch((schemaError) => {
            console.error('Unable to prepare the Users table:', schemaError.message);
            console.error('Check for duplicate usernames, then restart the app.');
        });
    db.query('SHOW COLUMNS FROM Session_', (schemaError, columns) => {
        if (schemaError) {
            console.error('Unable to inspect Session_ columns:', schemaError.message);
            return;
        }
        const columnNames = columns.map((column) => column.Field);
        if (!columnNames.includes('Staff_Id') && columnNames.includes('Staff_Name')) {
            sessionStaffByName = true;
            console.warn('Using the existing Session_.Staff_Name relationship; the supplied SQL defines Staff_Id.');
        } else if (!columnNames.includes('Staff_Id')) {
            console.error('Session_ must include Staff_Id to support session booking.');
        }
    });
});

function query(sql, values = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, values, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

async function initializeUserSchema() {
    await query(
        'ALTER TABLE Users MODIFY User_Id INT NOT NULL AUTO_INCREMENT, MODIFY Username VARCHAR(50) NOT NULL, MODIFY Password VARCHAR(255) NOT NULL'
    );
    const uniqueUsernameIndexes = await query(
        `SELECT INDEX_NAME
         FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Users'
         GROUP BY INDEX_NAME
         HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME = 'Username') = 1 AND MAX(NON_UNIQUE) = 0`
    );
    if (!uniqueUsernameIndexes.length) {
        await query('ALTER TABLE Users ADD UNIQUE KEY uq_users_username (Username)');
    }
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const derivedKey = await scrypt(password, salt, 64);
    return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedPassword) {
    if (typeof storedPassword !== 'string') return false;
    if (!storedPassword.startsWith('scrypt$')) return password === storedPassword;

    const [algorithm, saltHex, keyHex, extra] = storedPassword.split('$');
    if (algorithm !== 'scrypt' || !saltHex || !keyHex || extra !== undefined
        || !/^[a-f\d]{32}$/i.test(saltHex) || !/^[a-f\d]{128}$/i.test(keyHex)) {
        return false;
    }

    const expectedKey = Buffer.from(keyHex, 'hex');
    const actualKey = await scrypt(password, Buffer.from(saltHex, 'hex'), expectedKey.length);
    return crypto.timingSafeEqual(expectedKey, actualKey);
}

function sign(value) {
    return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken(userId) {
    const payload = `${userId}.${Math.floor(Date.now() / 1000) + SESSION_LIFETIME}`;
    return `${payload}.${sign(payload)}`;
}

function getAuthenticatedUserId(req) {
    const cookies = (req.headers.cookie || '').split(';').map((cookie) => cookie.trim());
    const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
    if (!sessionCookie) return null;

    const token = sessionCookie.slice(COOKIE_NAME.length + 1);
    const [userId, expiresAt, signature, extra] = token.split('.');
    if (!userId || !expiresAt || !signature || extra !== undefined || !/^\d+$/.test(userId)) return null;

    const payload = `${userId}.${expiresAt}`;
    const expected = Buffer.from(sign(payload), 'hex');
    const actual = Buffer.from(signature, 'hex');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000)) return null;

    const numericUserId = Number(userId);
    return Number.isSafeInteger(numericUserId) ? numericUserId : null;
}

function requireUser(req, res, next) {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Please sign in to continue.' });
    }
    req.userId = userId;
    next();
}

async function requireAdmin(req, res, next) {
    try {
        const users = await query('SELECT Username FROM Users WHERE User_Id = ? LIMIT 1', [req.userId]);
        if (!users.length) {
            return res.status(401).json({ message: 'Please sign in again.' });
        }
        if (users[0].Username.toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Administrator access is required.' });
        }
        return next();
    } catch (error) {
        console.error('Admin authorization failed:', error.message);
        return res.status(500).json({ message: 'Unable to verify administrator access.' });
    }
}

function setSessionCookie(res, userId, req) {
    const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader('Set-Cookie', [
        `${COOKIE_NAME}=${encodeURIComponent(createSessionToken(userId))}`,
        'Path=/',
        `Max-Age=${SESSION_LIFETIME}`,
        'HttpOnly',
        'SameSite=Lax',
        ...(secure ? ['Secure'] : [])
    ].join('; '));
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return res.status(400).json({ message: 'Enter your username and password.' });
    }
    if (!userSchemaReady) {
        return res.status(503).json({ message: 'Sign-in is unavailable until the user database is ready.' });
    }

    try {
        const users = await query(
            'SELECT User_Id, Username, Password FROM Users WHERE Username = ? LIMIT 1',
            [username.trim()]
        );
        if (!users.length || !await verifyPassword(password, users[0].Password)) {
            return res.status(401).json({ message: 'That username and password do not match.' });
        }

        if (!users[0].Password.startsWith('scrypt$')) {
            await query('UPDATE Users SET Password = ? WHERE User_Id = ?', [
                await hashPassword(password),
                users[0].User_Id
            ]);
        }
        setSessionCookie(res, users[0].User_Id, req);
        return res.json({ success: true, username: users[0].Username });
    } catch (error) {
        console.error('Login query failed:', error.message);
        return res.status(500).json({ message: 'Unable to sign in right now. Please try again.' });
    }
});

app.post('/api/register', async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!userSchemaReady) {
        return res.status(503).json({ message: 'Registration is unavailable until the user database is ready.' });
    }
    if (!/^[A-Za-z0-9_.-]{3,50}$/.test(username)) {
        return res.status(400).json({ message: 'Choose a username of 3–50 letters, numbers, dots, dashes, or underscores.' });
    }
    if (username.toLowerCase() === 'admin') {
        return res.status(400).json({ message: 'That username is reserved.' });
    }
    if (password.length < 8 || password.length > 128) {
        return res.status(400).json({ message: 'Choose a password between 8 and 128 characters.' });
    }

    try {
        const existingUsers = await query('SELECT User_Id FROM Users WHERE Username = ? LIMIT 1', [username]);
        if (existingUsers.length) {
            return res.status(409).json({ message: 'That username is already taken.' });
        }
        const passwordHash = await hashPassword(password);
        const result = await query('INSERT INTO Users (Username, Password) VALUES (?, ?)', [username, passwordHash]);
        setSessionCookie(res, result.insertId, req);
        return res.status(201).json({ success: true, username });
    } catch (error) {
        console.error('Account registration failed:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'That username is already taken.' });
        }
        return res.status(500).json({ message: 'Unable to create your account right now. Please try again.' });
    }
});

app.post('/api/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
    res.json({ success: true });
});

app.get('/api/dashboard', requireUser, async (req, res) => {
    try {
        const userRows = await query('SELECT User_Id, Username FROM Users WHERE User_Id = ? LIMIT 1', [req.userId]);
        if (!userRows.length) {
            res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
            return res.status(401).json({ message: 'Your account could not be found. Please sign in again.' });
        }

        const isAdmin = userRows[0].Username.toLowerCase() === 'admin';
        const ownerWhere = isAdmin ? '' : ' WHERE PetOwner_Id = ?';
        const ownerParams = isAdmin ? [] : [req.userId];
        const ownerJoinWhere = isAdmin ? '' : ' WHERE p.PetOwner_Id = ?';
        const ownerJoinParams = isAdmin ? [] : [req.userId];
        const [pets, staff, sessions, reports, payments, medications, groomingRequests] = await Promise.all([
            query(`SELECT Pet_Id, PetOwner_Id, Pet_Name, Pet_Type FROM PETS${ownerWhere} ORDER BY Pet_Name`, ownerParams),
            query('SELECT Staff_Id, Staff_Name, Staff_Type FROM Staff ORDER BY Staff_Name'),
            query(
                `SELECT s.Session_Id, s.Session_name, s.Session_No, s.Pet_Id, p.Pet_Name,
                        st.Staff_Id, st.Staff_Name, st.Staff_Type
                 FROM Session_ s
                 JOIN PETS p ON p.Pet_Id = s.Pet_Id
                 JOIN Staff st ON st.${sessionStaffByName ? 'Staff_Name = s.Staff_Name' : 'Staff_Id = s.Staff_Id'}
                 ${ownerJoinWhere}
                 ORDER BY s.Session_Id DESC`,
                ownerJoinParams
            ),
            query(
                `SELECT r.Report_ID, r.Session_ID, DATE_FORMAT(r.Report_Date, '%Y-%m-%d') AS Report_Date,
                        r.Report_Description, s.Session_name, p.Pet_Id, p.Pet_Name
                 FROM REPORT r
                 JOIN Session_ s ON s.Session_Id = r.Session_ID
                 JOIN PETS p ON p.Pet_Id = s.Pet_Id
                 ${ownerJoinWhere}
                 ORDER BY r.Report_Date DESC, r.Report_ID DESC`,
                ownerJoinParams
            ),
            query(
                `SELECT pay.Payment_Id, pay.Payment_Type, pay.Payment_Amount, pay.Pet_Id, p.Pet_Name
                 FROM Payment pay
                 JOIN PETS p ON p.Pet_Id = pay.Pet_Id
                 ${ownerJoinWhere}
                 ORDER BY pay.Payment_Id DESC`,
                ownerJoinParams
            ),
            query(
                `SELECT m.Medication_Id, m.Medication_Name, m.Dosage, m.Pet_Id, p.Pet_Name
                 FROM Medication_Log m
                 JOIN PETS p ON p.Pet_Id = m.Pet_Id
                 ${ownerJoinWhere}
                 ORDER BY m.Medication_Id DESC`,
                ownerJoinParams
            ),
            query(
                `SELECT g.Appointment_Id, g.ContactPhone, g.Pet_Id, p.Pet_Name
                 FROM Grooming_Request g
                 JOIN PETS p ON p.Pet_Id = g.Pet_Id
                 ${ownerJoinWhere}
                 ORDER BY g.Appointment_Id DESC`,
                ownerJoinParams
            )
        ]);

        const response = {
            user: userRows[0],
            isAdmin,
            pets,
            staff,
            sessions,
            reports,
            payments,
            medications
        };
        if (isAdmin) {
            response.adminRecords = {
                pets,
                groomingRequests,
                sessions,
                reports,
                medications,
                staff,
                users: await query('SELECT User_Id, Username FROM Users ORDER BY User_Id'),
                payments
            };
            response.adminRecords.sessionStaffColumn = sessionStaffByName ? 'Staff_Name' : 'Staff_Id';
        }
        return res.json(response);
    } catch (error) {
        console.error('Dashboard query failed:', error.message);
        return res.status(500).json({ message: 'Unable to load your dashboard. Please try again.' });
    }
});

app.get('/api/health', (req, res) => {
    db.query('SELECT 1 AS databaseConnected', (error) => {
        if (error || !userSchemaReady) {
            return res.status(503).json({
                status: 'error',
                database: error ? 'disconnected' : 'connected',
                userSchema: userSchemaReady ? 'ready' : 'not-ready'
            });
        }
        return res.json({ status: 'ok', database: 'connected', userSchema: 'ready' });
    });
});

app.post('/api/sessions', requireUser, async (req, res) => {
    const petId = Number(req.body && req.body.petId);
    const staffId = Number(req.body && req.body.staffId);
    const sessionName = typeof (req.body && req.body.sessionName) === 'string'
        ? req.body.sessionName.trim()
        : '';

    if (!Number.isSafeInteger(petId) || petId <= 0
        || !Number.isSafeInteger(staffId) || staffId <= 0
        || !sessionName || sessionName.length > 50) {
        return res.status(400).json({ message: 'Choose a pet, a team member, and a session name (up to 50 characters).' });
    }

    try {
        const [users, pets, staff] = await Promise.all([
            query('SELECT Username FROM Users WHERE User_Id = ? LIMIT 1', [req.userId]),
            query('SELECT Pet_Id FROM PETS WHERE Pet_Id = ? LIMIT 1', [petId]),
            query('SELECT Staff_Id, Staff_Name FROM Staff WHERE Staff_Id = ? LIMIT 1', [staffId])
        ]);

        if (!users.length) {
            return res.status(401).json({ message: 'Please sign in to continue.' });
        }
        const isAdmin = users[0].Username.toLowerCase() === 'admin';
        const canAccessPet = isAdmin || (await query(
            'SELECT Pet_Id FROM PETS WHERE Pet_Id = ? AND PetOwner_Id = ? LIMIT 1',
            [petId, req.userId]
        )).length > 0;
        if (!pets.length || !canAccessPet) {
            return res.status(403).json({ message: 'You can only book sessions for pets in your account.' });
        }
        if (!staff.length) {
            return res.status(400).json({ message: 'That team member is not available. Refresh and try again.' });
        }

        const [sessionIds, sessionNumbers] = await Promise.all([
            query('SELECT COALESCE(MAX(Session_Id), 0) + 1 AS nextId FROM Session_'),
            query('SELECT COALESCE(MAX(Session_No), 0) + 1 AS nextNo FROM Session_')
        ]);
        const sessionId = Number(sessionIds[0].nextId);
        const sessionNo = Number(sessionNumbers[0].nextNo);

        const staffColumn = sessionStaffByName ? 'Staff_Name' : 'Staff_Id';
        const staffValue = sessionStaffByName ? staff[0].Staff_Name : staffId;
        await query(
            `INSERT INTO Session_ (Session_Id, Session_name, Session_No, Pet_Id, ${staffColumn}) VALUES (?, ?, ?, ?, ?)`,
            [sessionId, sessionName, sessionNo, petId, staffValue]
        );

        return res.status(201).json({
            success: true,
            message: 'Your session has been booked.',
            session: { Session_Id: sessionId, Session_No: sessionNo }
        });
    } catch (error) {
        console.error('Session booking failed:', error.message);
        const conflict = error.code === 'ER_DUP_ENTRY';
        return res.status(conflict ? 409 : 500).json({
            message: conflict
                ? 'Another session was booked at the same time. Please try booking again.'
                : 'Unable to book this session right now. Please try again.'
        });
    }
});

app.get('/api/reports', requireUser, async (req, res) => {
    try {
        const users = await query('SELECT Username FROM Users WHERE User_Id = ? LIMIT 1', [req.userId]);
        if (!users.length) return res.status(401).json({ message: 'Please sign in to continue.' });
        const isAdmin = users[0].Username.toLowerCase() === 'admin';
        const reports = await query(
            `SELECT r.Report_ID, r.Session_ID, DATE_FORMAT(r.Report_Date, '%Y-%m-%d') AS Report_Date,
                    r.Report_Description,
                    s.Session_name, p.Pet_Name
             FROM REPORT r
             JOIN Session_ s ON s.Session_Id = r.Session_ID
             JOIN PETS p ON p.Pet_Id = s.Pet_Id
             ${isAdmin ? '' : 'WHERE p.PetOwner_Id = ?'}
             ORDER BY r.Report_Date DESC, r.Report_ID DESC`,
            isAdmin ? [] : [req.userId]
        );
        return res.json({ reports });
    } catch (error) {
        console.error('Report query failed:', error.message);
        return res.status(500).json({ message: 'Unable to load your reports. Please try again.' });
    }
});

app.post('/api/payments', requireUser, async (req, res) => {
    const petId = Number(req.body && req.body.petId);
    const amount = Number(req.body && req.body.amount);
    const paymentType = typeof (req.body && req.body.paymentType) === 'string'
        ? req.body.paymentType.trim()
        : '';
    const supportedTypes = ['Cash', 'Card', 'M-Pesa'];

    if (!Number.isSafeInteger(petId) || petId <= 0
        || !Number.isSafeInteger(amount) || amount <= 0
        || !supportedTypes.includes(paymentType)) {
        return res.status(400).json({ message: 'Choose a pet, a payment method, and a positive whole-number amount.' });
    }

    try {
        const [users, pets, paymentIds] = await Promise.all([
            query('SELECT Username FROM Users WHERE User_Id = ? LIMIT 1', [req.userId]),
            query('SELECT Pet_Id FROM PETS WHERE Pet_Id = ? LIMIT 1', [petId]),
            query('SELECT COALESCE(MAX(Payment_Id), 0) + 1 AS nextId FROM Payment')
        ]);
        if (!users.length) return res.status(401).json({ message: 'Please sign in to continue.' });
        const isAdmin = users[0].Username.toLowerCase() === 'admin';
        const canAccessPet = isAdmin || (await query(
            'SELECT Pet_Id FROM PETS WHERE Pet_Id = ? AND PetOwner_Id = ? LIMIT 1',
            [petId, req.userId]
        )).length > 0;
        if (!pets.length || !canAccessPet) {
            return res.status(403).json({ message: 'You can only make payments for pets in your account.' });
        }

        const paymentId = Number(paymentIds[0].nextId);
        await query(
            'INSERT INTO Payment (Payment_Id, Payment_Type, Payment_Amount, Pet_Id) VALUES (?, ?, ?, ?)',
            [paymentId, paymentType, amount, petId]
        );
        return res.status(201).json({ success: true, message: 'Your payment has been recorded.' });
    } catch (error) {
        console.error('Payment recording failed:', error.message);
        const conflict = error.code === 'ER_DUP_ENTRY';
        return res.status(conflict ? 409 : 500).json({
            message: conflict
                ? 'Another payment was recorded at the same time. Please try again.'
                : 'Unable to record this payment right now. Please try again.'
        });
    }
});

app.patch('/api/admin/records/:table/:id', requireUser, requireAdmin, async (req, res) => {
    const config = adminRecordTables[req.params.table];
    const recordId = Number(req.params.id);
    const changes = req.body && req.body.changes;

    if (!config) return res.status(404).json({ message: 'That record type cannot be edited.' });
    if (!Number.isSafeInteger(recordId) || recordId <= 0) {
        return res.status(400).json({ message: 'The record ID is invalid.' });
    }
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        return res.status(400).json({ message: 'Provide the fields to update.' });
    }

    const allowedFields = [...config.fields];
    if (req.params.table === 'sessions') {
        allowedFields.push(sessionStaffByName ? 'Staff_Name' : 'Staff_Id');
    }
    const entries = Object.entries(changes);
    if (!entries.length || entries.some(([field, value]) => (
        !allowedFields.includes(field)
        || (numericRecordFields.has(field) && (!Number.isSafeInteger(value) || value <= 0))
        || (field === 'Report_Date' && value !== null && (
            typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
        ))
        || (!numericRecordFields.has(field) && field !== 'Report_Date' && value !== null && typeof value !== 'string')
        || (typeof value === 'string' && value.length > (recordFieldLengths[field] || 2000))
    ))) {
        return res.status(400).json({ message: 'One or more fields are not editable or contain invalid values.' });
    }
    const fieldNames = entries.map(([field]) => `\`${field}\``);
    const values = entries.map(([, value]) => value);
    values.push(recordId);
    try {
        if (req.params.table === 'users' && Object.hasOwn(changes, 'Username')) {
            if (typeof changes.Username !== 'string' || !changes.Username.trim()) {
                return res.status(400).json({ message: 'Username cannot be empty.' });
            }
            const target = await query('SELECT Username FROM Users WHERE User_Id = ? LIMIT 1', [recordId]);
            if (target.length && target[0].Username.toLowerCase() === 'admin'
                && changes.Username.trim() !== target[0].Username) {
                return res.status(400).json({ message: 'The administrator account cannot be renamed.' });
            }
            if (changes.Username.trim().toLowerCase() === 'admin') {
                if (target.length && target[0].Username.toLowerCase() !== 'admin') {
                    return res.status(400).json({ message: 'A user cannot be promoted to administrator by changing their username.' });
                }
            }
            if (req.params.table === 'pets' && Object.hasOwn(changes, 'PetOwner_Id')) {
                const owners = await query('SELECT User_Id FROM Users WHERE User_Id = ? LIMIT 1', [changes.PetOwner_Id]);
                if (!owners.length) return res.status(400).json({ message: 'Choose an existing account as the pet owner.' });
            }
            if (req.params.table === 'sessions' && sessionStaffByName && Object.hasOwn(changes, 'Staff_Name')) {
                const staff = await query('SELECT Staff_Id FROM Staff WHERE Staff_Name = ? LIMIT 1', [changes.Staff_Name]);
                if (!staff.length) return res.status(400).json({ message: 'Choose an existing staff member.' });
            }
        }
        const result = await query(
            `UPDATE \`${config.table}\` SET ${fieldNames.map((field) => `${field} = ?`).join(', ')} WHERE \`${config.primaryKey}\` = ?`,
            values
        );
        if (!result.affectedRows) {
            const exists = await query(
                `SELECT \`${config.primaryKey}\` FROM \`${config.table}\` WHERE \`${config.primaryKey}\` = ? LIMIT 1`,
                [recordId]
            );
            if (!exists.length) return res.status(404).json({ message: 'That record no longer exists.' });
        }
        return res.json({ success: true, message: 'Record updated.' });
    } catch (error) {
        console.error(`Admin update failed for ${config.table}:`, error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'That value is already in use. Check the record and try again.' });
        }
        if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_BAD_NULL_ERROR' || error.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
            return res.status(400).json({ message: 'The updated values do not meet this record’s database requirements.' });
        }
        return res.status(500).json({ message: 'Unable to update this record. Please try again.' });
    }
});

app.delete('/api/admin/records/:table/:id', requireUser, requireAdmin, async (req, res) => {
    const config = adminRecordTables[req.params.table];
    const recordId = Number(req.params.id);
    if (!config) return res.status(404).json({ message: 'That record type cannot be deleted.' });
    if (!Number.isSafeInteger(recordId) || recordId <= 0) {
        return res.status(400).json({ message: 'The record ID is invalid.' });
    }

    try {
        if (req.params.table === 'users' && recordId === req.userId) {
            return res.status(400).json({ message: 'You cannot delete the administrator account currently in use.' });
        }
        if (req.params.table === 'users') {
            const target = await query('SELECT Username FROM Users WHERE User_Id = ? LIMIT 1', [recordId]);
            if (target.length && target[0].Username.toLowerCase() === 'admin') {
                return res.status(400).json({ message: 'The administrator account cannot be deleted.' });
            }
            const ownedPets = await query('SELECT Pet_Id FROM PETS WHERE PetOwner_Id = ? LIMIT 1', [recordId]);
            if (ownedPets.length) {
                return res.status(409).json({ message: 'This account still owns pets. Reassign or delete those pets before deleting the account.' });
            }
        }
        const result = await query(
            `DELETE FROM \`${config.table}\` WHERE \`${config.primaryKey}\` = ?`,
            [recordId]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'That record no longer exists.' });
        return res.json({ success: true, message: 'Record deleted.' });
    } catch (error) {
        console.error(`Admin delete failed for ${config.table}:`, error.message);
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                message: 'This record is still used by other records. Remove or update those linked records first.'
            });
        }
        return res.status(500).json({ message: 'Unable to delete this record. Please try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

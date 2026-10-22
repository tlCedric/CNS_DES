const crypto = require("node:crypto");
const express = require("express");
const mysql = require("mysql2/promise");
require("dotenv").config();

const app = express();
const port = Number(process.env.PORT || 3000);
const sessionCookie = "kinyozi_staff";
const sessionSeconds = 8 * 60 * 60;
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const database = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Kinyozi_DES",
  waitForConnections: true,
  connectionLimit: 10,
});

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));
app.use(express.static(__dirname, { index: "index.html" }));

function sendError(res, error, message = "The request could not be completed.") {
  console.error(message, error);
  res.status(500).json({ message });
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function dateAndTimeToUtc(date, time) {
  return Date.parse(`${date}T${time}:00+03:00`);
}

function formatTime(value) {
  return String(value).slice(0, 5);
}

function sign(payload) {
  return crypto.createHmac("sha256", sessionSecret).update(payload).digest("hex");
}

function setStaffCookie(res, username) {
  const expires = Math.floor(Date.now() / 1000) + sessionSeconds;
  const payload = `${username}.${expires}`;
  res.cookie(sessionCookie, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionSeconds * 1000,
    path: "/",
  });
}

function getSessionUsername(req) {
  const token = req.cookies?.[sessionCookie];
  if (typeof token !== "string") return null;
  const [username, expires, signature, extra] = token.split(".");
  if (!username || !/^\d+$/.test(expires || "") || !signature || extra !== undefined) return null;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return null;

  const expected = Buffer.from(sign(`${username}.${expires}`), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  return username;
}

app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie || "";
  req.cookies = Object.fromEntries(cookieHeader.split(";").map((cookie) => {
    const separator = cookie.indexOf("=");
    if (separator < 0) return ["", ""];
    const name = cookie.slice(0, separator).trim();
    try {
      return [name, decodeURIComponent(cookie.slice(separator + 1).trim())];
    } catch {
      return [name, ""];
    }
  }).filter(([name]) => name));
  next();
});

async function requireStaff(req, res, next) {
  const username = getSessionUsername(req);
  if (!username) return res.status(401).json({ message: "Please sign in to continue." });

  try {
    const [accounts] = await database.execute(
      `SELECT Username, Staff_Name, Barber_Id
       FROM Staff_Account WHERE Username = ? LIMIT 1`,
      [username],
    );
    if (!accounts.length) return res.status(401).json({ message: "Please sign in again." });
    req.staff = accounts[0];
    return next();
  } catch (error) {
    return sendError(res, error, "Could not verify staff access.");
  }
}

function kenyaWeekday(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

async function getAvailableSlots(styleId, date, executor = database, lockRows = false) {
  const weekday = kenyaWeekday(date);
  const [barbers] = await executor.execute(
    `SELECT B.Barber_Id, B.Barber_Name, V.Opens_At, V.Closes_At
     FROM Barber B
     JOIN Barber_Styles BS ON BS.Barber_Id = B.Barber_Id
     JOIN Barber_Availability V ON V.Barber_Id = B.Barber_Id AND V.Day_Of_Week = ?
     WHERE BS.Style_Id = ?
     ORDER BY B.Barber_Id${lockRows ? " FOR UPDATE" : ""}`,
    [weekday, styleId],
  );

  if (!barbers.length) return [];
  const [bookings] = await executor.execute(
    `SELECT B.Barber_Id, DATE_FORMAT(B.Booking_Date, '%H:%i') AS Start_Time
     FROM Booking B
     LEFT JOIN Booking_Status S ON S.Booking_Id = B.Booking_Id
     WHERE DATE(B.Booking_Date) = ? AND COALESCE(S.Status_Name, 'Pending') <> 'Cancelled'
     ${lockRows ? "FOR UPDATE" : ""}`,
    [date],
  );
  const busySlots = new Set(bookings.map((booking) => `${booking.Barber_Id}|${booking.Start_Time}`));
  const counts = new Map(barbers.map((barber) => [barber.Barber_Id, 0]));
  const slots = [];

  for (let minutes = 9 * 60; minutes + 30 <= 18 * 60; minutes += 30) {
    const start = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
    const endMinutes = minutes + 30;
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    if (dateAndTimeToUtc(date, start) <= Date.now()) continue;

    const availableBarbers = barbers
      .filter((barber) => start >= formatTime(barber.Opens_At)
        && end <= formatTime(barber.Closes_At)
        && !busySlots.has(`${barber.Barber_Id}|${start}`))
      .sort((a, b) => counts.get(a.Barber_Id) - counts.get(b.Barber_Id)
        || a.Barber_Id.localeCompare(b.Barber_Id));
    const selected = availableBarbers[0];
    if (!selected) continue;

    counts.set(selected.Barber_Id, counts.get(selected.Barber_Id) + 1);
    slots.push({
      barberId: selected.Barber_Id,
      barberName: selected.Barber_Name,
      start,
      end,
    });
  }
  return slots;
}

app.get("/api/styles", async (_req, res) => {
  try {
    const [styles] = await database.execute(
      "SELECT Style_Id AS id, Style_Name AS name, Style_Description AS description, Price AS price FROM Styles ORDER BY Style_Id",
    );
    res.json({ styles });
  } catch (error) {
    sendError(res, error, "Could not load styles from the database.");
  }
});

app.get("/api/availability", async (req, res) => {
  const { styleId, date } = req.query;
  if (typeof styleId !== "string" || !/^STY[A-Z0-9]{3,9}$/.test(styleId) || !validDate(date)) {
    return res.status(400).json({ message: "Choose a valid style and appointment date." });
  }

  try {
    const slots = await getAvailableSlots(styleId, date);
    res.json({ available: slots.length > 0 });
  } catch (error) {
    sendError(res, error, "Could not check barber availability.");
  }
});

app.post("/api/bookings", async (req, res) => {
  const { name, phone, styleId, date, notes = "" } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 40
    || typeof phone !== "string" || !/^[+0-9 ()-]{7,15}$/.test(phone.trim())
    || typeof styleId !== "string" || !/^STY[A-Z0-9]{3,9}$/.test(styleId)
    || !validDate(date)
    || typeof notes !== "string" || notes.length > 100) {
    return res.status(400).json({ message: "Check your details and choose a valid appointment date." });
  }
  if (dateAndTimeToUtc(date, "23:59") <= Date.now()) {
    return res.status(400).json({ message: "Choose a future appointment date." });
  }

  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const slots = await getAvailableSlots(styleId, date, connection, true);
    const slot = slots[0];
    if (!slot) {
      await connection.rollback();
      return res.status(409).json({ message: "No appointments are available on this date. Please choose another date." });
    }

    const bookingDate = `${date} ${slot.start}:00`;

    const [customers] = await connection.execute(
      "SELECT Customer_Id FROM Customer WHERE Phone_No = ? LIMIT 1 FOR UPDATE",
      [phone.trim()],
    );
    const customerId = customers[0]?.Customer_Id || `CUS${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    if (!customers.length) {
      await connection.execute(
        "INSERT INTO Customer (Customer_Id, Customer_Name, Phone_No) VALUES (?, ?, ?)",
        [customerId, name.trim(), phone.trim()],
      );
    } else {
      await connection.execute(
        "UPDATE Customer SET Customer_Name = ? WHERE Customer_Id = ?",
        [name.trim(), customerId],
      );
    }

    const bookingId = `BOOK${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    await connection.execute(
      `INSERT INTO Booking (Booking_Id, Customer_Id, Barber_Id, Style_Id, Booking_Date, Notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [bookingId, customerId, slot.barberId, styleId, bookingDate, notes.trim() || null],
    );
    await connection.execute(
      "INSERT INTO Booking_Status (Booking_Id, Status_Name) VALUES (?, 'Pending')",
      [bookingId],
    );
    await connection.commit();

    res.status(201).json({
      date,
      time: slot.start,
      barberName: slot.barberName,
    });
  } catch (error) {
    await connection.rollback();
    sendError(res, error, "Could not save the appointment.");
  } finally {
    connection.release();
  }
});

app.post("/api/staff/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || !username.trim()
    || typeof password !== "string" || !password || password.length > 128) {
    return res.status(400).json({ message: "Enter your username and password." });
  }

  try {
    const [accounts] = await database.execute(
      `SELECT Username, Password
       FROM Staff_Account WHERE Username = ? LIMIT 1`,
      [username.trim()],
    );
    if (!accounts.length || password !== accounts[0].Password) {
      return res.status(401).json({ message: "The username or password is incorrect." });
    }
    setStaffCookie(res, accounts[0].Username);
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, "Could not sign you in.");
  }
});

app.post("/api/staff/logout", (_req, res) => {
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "strict", path: "/" });
  res.json({ message: "Signed out." });
});

app.get("/api/staff/me", requireStaff, async (req, res) => {
  try {
    const [accounts] = await database.execute(
      "SELECT Barber_Name FROM Barber WHERE Barber_Id = ?",
      [req.staff.Barber_Id],
    );
    const [availability] = await database.execute(
      `SELECT Day_Of_Week, TIME_FORMAT(Opens_At, '%H:%i') AS Opens_At,
              TIME_FORMAT(Closes_At, '%H:%i') AS Closes_At
       FROM Barber_Availability WHERE Barber_Id = ? ORDER BY Day_Of_Week`,
      [req.staff.Barber_Id],
    );
    res.json({
      username: req.staff.Username,
      staffName: req.staff.Staff_Name,
      barberId: req.staff.Barber_Id,
      barberName: accounts[0]?.Barber_Name,
      availability,
    });
  } catch (error) {
    sendError(res, error, "Could not load staff details.");
  }
});

app.get("/api/staff/bookings", requireStaff, async (req, res) => {
  try {
    const [bookings] = await database.execute(
      `SELECT B.Booking_Id AS id, C.Customer_Name AS customerName, C.Phone_No AS phone,
              S.Style_Name AS style, DATE_FORMAT(B.Booking_Date, '%Y-%m-%d %H:%i') AS dateTime,
              COALESCE(BS.Status_Name, 'Pending') AS status
       FROM Booking B
       JOIN Customer C ON C.Customer_Id = B.Customer_Id
       JOIN Styles S ON S.Style_Id = B.Style_Id
       LEFT JOIN Booking_Status BS ON BS.Booking_Id = B.Booking_Id
       WHERE B.Barber_Id = ?
       ORDER BY B.Booking_Date`,
      [req.staff.Barber_Id],
    );
    res.json({ bookings });
  } catch (error) {
    sendError(res, error, "Could not load this barber’s appointments.");
  }
});

app.patch("/api/staff/bookings/:bookingId/status", requireStaff, async (req, res) => {
  const allowedStatuses = new Set(["Confirmed", "Completed", "Cancelled"]);
  const status = req.body?.status;
  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ message: "Choose a valid appointment status." });
  }

  try {
    const [result] = await database.execute(
      `INSERT INTO Booking_Status (Booking_Id, Status_Name)
       SELECT Booking_Id, ? FROM Booking
       WHERE Booking_Id = ? AND Barber_Id = ?
       ON DUPLICATE KEY UPDATE Status_Name = VALUES(Status_Name)`,
      [status, req.params.bookingId, req.staff.Barber_Id],
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Appointment not found." });
    res.json({ message: "Appointment status updated." });
  } catch (error) {
    sendError(res, error, "Could not update appointment status.");
  }
});

async function start() {
  await database.query("SELECT 1");

  await database.query(
    `CREATE TABLE IF NOT EXISTS Booking_Status (
       Booking_Id VARCHAR(12) NOT NULL,
       Status_Name VARCHAR(20) NOT NULL DEFAULT 'Pending',
       PRIMARY KEY (Booking_Id),
       FOREIGN KEY (Booking_Id) REFERENCES Booking(Booking_Id)
     )`,
  );
  await database.query(
    `CREATE TABLE IF NOT EXISTS Barber_Styles (
       Barber_Id VARCHAR(12) NOT NULL,
       Style_Id VARCHAR(12) NOT NULL,
       PRIMARY KEY (Barber_Id, Style_Id),
       FOREIGN KEY (Barber_Id) REFERENCES Barber(Barber_Id),
       FOREIGN KEY (Style_Id) REFERENCES Styles(Style_Id)
     )`,
  );
  await database.query(
    `CREATE TABLE IF NOT EXISTS Barber_Availability (
       Barber_Id VARCHAR(12) NOT NULL,
       Day_Of_Week TINYINT NOT NULL,
       Opens_At TIME NOT NULL,
       Closes_At TIME NOT NULL,
       PRIMARY KEY (Barber_Id, Day_Of_Week),
       FOREIGN KEY (Barber_Id) REFERENCES Barber(Barber_Id)
     )`,
  );
  await database.query(
    `INSERT IGNORE INTO Barber_Styles (Barber_Id, Style_Id)
     SELECT B.Barber_Id, S.Style_Id
     FROM Barber B CROSS JOIN Styles S`,
  );
  await database.query(
    `INSERT IGNORE INTO Barber_Availability
       (Barber_Id, Day_Of_Week, Opens_At, Closes_At)
     SELECT B.Barber_Id, D.Day_Of_Week, '09:00:00', '18:00:00'
     FROM Barber B
     CROSS JOIN (
       SELECT 1 AS Day_Of_Week UNION ALL SELECT 2 UNION ALL SELECT 3
       UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     ) D`,
  );
  await database.query(
    `INSERT IGNORE INTO Booking_Status (Booking_Id, Status_Name)
     SELECT Booking_Id, 'Pending' FROM Booking`,
  );
  const [barbers] = await database.execute("SELECT Barber_Id, Barber_Name FROM Barber ORDER BY Barber_Id");
  for (const barber of barbers) {
    const nameParts = String(barber.Barber_Name || "").trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.at(-1);
    if (!firstName || !lastName || firstName.length > 40 || lastName.length > 12) {
      throw new Error(`Barber ${barber.Barber_Id} needs a first and last name of at most 12 password characters.`);
    }
    await database.execute(
      `UPDATE Staff_Account
       SET Username = ?, Password = ?, Staff_Role = 'barber', Staff_Name = ?
       WHERE Barber_Id = ? AND Username = ?`,
      [firstName, lastName, barber.Barber_Name, barber.Barber_Id, barber.Barber_Id],
    );
    await database.execute(
      `INSERT INTO Staff_Account
       (Username, Password, Staff_Role, Staff_Name, Barber_Id)
       VALUES (?, ?, 'barber', ?, ?)
       ON DUPLICATE KEY UPDATE Password = VALUES(Password),
         Staff_Role = VALUES(Staff_Role), Staff_Name = VALUES(Staff_Name),
         Barber_Id = VALUES(Barber_Id)`,
      [firstName, lastName, barber.Barber_Name, barber.Barber_Id],
    );
  }

  app.listen(port, "127.0.0.1", () => {
    console.log(`Kinyozi is running at http://127.0.0.1:${port}`);
    console.log("Staff sign in with their first name as username and last name as password.");
  });
}

start().catch((error) => {
  console.error("Kinyozi could not start. Check that the database schema is ready and configure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in a local .env file.", error);
  process.exitCode = 1;
});

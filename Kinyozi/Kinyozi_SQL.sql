CREATE DATABASE IF NOT EXISTS Kinyozi_DES;
USE Kinyozi_DES;

CREATE TABLE IF NOT EXISTS Customer(
Customer_Id VARCHAR(12) NOT NULL,
Customer_Name VARCHAR(40),
Phone_No VARCHAR(15),
PRIMARY KEY (Customer_Id)
);

CREATE TABLE IF NOT EXISTS Barber(
Barber_Id VARCHAR(12) NOT NULL,
Barber_Name VARCHAR(40),
Phone_No VARCHAR(15),
PRIMARY KEY (Barber_Id)
);

CREATE TABLE IF NOT EXISTS Styles(
Style_Id VARCHAR(12) NOT NULL,
Style_Name VARCHAR(30),
Style_Description VARCHAR(100),
Price INT,
PRIMARY KEY (Style_Id)
);

CREATE TABLE IF NOT EXISTS Booking(
Booking_Id VARCHAR(12) NOT NULL,
Customer_Id VARCHAR(12) NOT NULL,
Barber_Id VARCHAR(12) NOT NULL,
Style_Id VARCHAR(12) NOT NULL,
Booking_Date DATETIME,
Notes VARCHAR(100),
PRIMARY KEY (Booking_Id),
FOREIGN KEY (Customer_Id) REFERENCES Customer(Customer_Id),
FOREIGN KEY (Barber_Id) REFERENCES Barber(Barber_Id),
FOREIGN KEY (Style_Id) REFERENCES Styles(Style_Id)
);

CREATE TABLE IF NOT EXISTS Booking_Status(
Booking_Id VARCHAR(12) NOT NULL,
Status_Name VARCHAR(20) NOT NULL DEFAULT 'Pending',
PRIMARY KEY (Booking_Id),
FOREIGN KEY (Booking_Id) REFERENCES Booking(Booking_Id)
);

CREATE TABLE IF NOT EXISTS Staff_Account(
Username VARCHAR(40) NOT NULL,
`Password` VARCHAR(12) NOT NULL,
Staff_Role VARCHAR(12) NOT NULL,
Staff_Name VARCHAR(50) NOT NULL,
Barber_Id VARCHAR(12) NOT NULL,
PRIMARY KEY (Username),
FOREIGN KEY (Barber_Id) REFERENCES Barber(Barber_Id)
);

ALTER TABLE Staff_Account
ADD COLUMN IF NOT EXISTS Staff_Role VARCHAR(12) NOT NULL DEFAULT 'barber';

CREATE TABLE IF NOT EXISTS Payment(
Payment_Id VARCHAR(12) NOT NULL,
Booking_Id VARCHAR(12) NOT NULL,
Payment_Method VARCHAR(15),
Amount_Paid INT,
PRIMARY KEY (Payment_Id),
FOREIGN KEY (Booking_Id) REFERENCES Booking(Booking_Id)
);

INSERT INTO Customer (Customer_Id, Customer_Name, Phone_No)
VALUES
('CUS001', 'Alex Kimani', '0712345678'),
('CUS002', 'Sam Wanjiku', '0723456789'),
('CUS003', 'John Doe', '0734567890'),
('CUS004', 'Jane Smith', '0745678901'),
('CUS005', 'Michael Johnson', '0756789012')
ON DUPLICATE KEY UPDATE
Customer_Name = VALUES(Customer_Name),
Phone_No = VALUES(Phone_No);

INSERT INTO Barber (Barber_Id, Barber_Name, Phone_No)
VALUES
('BAR001', 'Peter Mwangi', '0701111114'),
('BAR002', 'Kevin Otieno', '0702222256'),
('BAR003', 'Daniel Kariuki', '0703333345'),
('BAR004', 'James Mwangi', '0704444456'),
('BAR005', 'David Njoroge', '0705555567')
ON DUPLICATE KEY UPDATE
Barber_Name = VALUES(Barber_Name),
Phone_No = VALUES(Phone_No);

INSERT INTO Styles (Style_Id, Style_Name, Style_Description, Price)
VALUES
('STY001', 'Classic Cut', 'A traditional haircut that is timeless and versatile.', 300),
('STY002', 'Fade', 'A gradual transition from a longer to a shorter length.', 350),
('STY003', 'Dreadlocks Maintenance', 'Regular upkeep for dreadlocked hair.', 500),
('STY004', 'Cornrows', 'Tight braids styled close to the scalp.', 600),
('STY005', 'Beard Trim', 'Precision trimming of facial hair.', 150),
('STY006', 'Hair Wash', 'Professional hair cleaning service.', 200),
('STY007', 'Hair Coloring', 'Color treatment for hair.', 800),
('STY008', 'Taper', 'A neat, graduated cut with a clean finish.', 900)
ON DUPLICATE KEY UPDATE
Style_Name = VALUES(Style_Name),
Style_Description = VALUES(Style_Description),
Price = VALUES(Price);

INSERT INTO Staff_Account (Username, `Password`, Staff_Role, Staff_Name, Barber_Id)
VALUES
('Peter', 'Mwangi', 'barber', 'Peter Mwangi', 'BAR001'),
('Kevin', 'Otieno', 'barber', 'Kevin Otieno', 'BAR002'),
('Daniel', 'Kariuki', 'barber', 'Daniel Kariuki', 'BAR003'),
('James', 'Mwangi', 'barber', 'James Mwangi', 'BAR004'),
('David', 'Njoroge', 'barber', 'David Njoroge', 'BAR005')
ON DUPLICATE KEY UPDATE
`Password` = VALUES(`Password`),
Staff_Role = VALUES(Staff_Role),
Staff_Name = VALUES(Staff_Name),
Barber_Id = VALUES(Barber_Id);

INSERT INTO Booking (Booking_Id, Customer_Id, Barber_Id, Style_Id, Booking_Date, Notes)
VALUES
('BOOK001', 'CUS001', 'BAR001', 'STY001', '2024-06-01 10:00:00', 'No special requests.'),
('BOOK002', 'CUS002', 'BAR002', 'STY002', '2024-06-02 11:30:00', 'Please use a fade style.'),
('BOOK003', 'CUS003', 'BAR003', 'STY003', '2024-06-03 14:00:00', 'Dreadlocks maintenance needed.'),
('BOOK004', 'CUS004', 'BAR001', 'STY004', '2024-06-04 09:30:00', 'Cornrows for a special event.'),
('BOOK005', 'CUS005', 'BAR002', 'STY005', '2024-06-05 15:00:00', 'Beard trim only.'),
('BOOK006', 'CUS001', 'BAR003', 'STY006', '2024-06-06 13:00:00', 'Hair wash before styling.'),
('BOOK007', 'CUS002', 'BAR001', 'STY007', '2024-06-07 12:30:00', 'Hair coloring for a new look.')
ON DUPLICATE KEY UPDATE
Customer_Id = VALUES(Customer_Id),
Barber_Id = VALUES(Barber_Id),
Style_Id = VALUES(Style_Id),
Booking_Date = VALUES(Booking_Date),
Notes = VALUES(Notes);

INSERT INTO Payment (Payment_Id, Booking_Id, Payment_Method, Amount_Paid)
VALUES
('PAY001', 'BOOK001', 'M-Pesa', 300),
('PAY002', 'BOOK002', 'Cash', 350),
('PAY003', 'BOOK003', 'M-Pesa', 500),
('PAY004', 'BOOK004', 'Cash', 600),
('PAY005', 'BOOK005', 'M-Pesa', 150),
('PAY006', 'BOOK006', 'Cash', 200),
('PAY007', 'BOOK007', 'M-Pesa', 800)
ON DUPLICATE KEY UPDATE
Booking_Id = VALUES(Booking_Id),
Payment_Method = VALUES(Payment_Method),
Amount_Paid = VALUES(Amount_Paid);

SELECT * FROM Payment;


SELECT Payment_Id, Payment_Method, Amount_Paid
FROM Payment
WHERE Amount_Paid >= 300 ;
CREATE SCHEMA IF NOT EXISTS Pets_DES;
USE Pets_DES;

CREATE TABLE IF NOT EXISTS PETS(
Pet_Id INT NOT NULL,
PetOwner_Id INT NOT NULL,
Pet_Name VARCHAR(50),
Pet_Type VARCHAR(10),
PRIMARY KEY(Pet_Id)
);

CREATE TABLE IF NOT EXISTS Grooming_Request(
Appointment_Id INT NOT NULL,
ContactPhone VARCHAR(15),
Pet_Id INT NOT NULL,
PRIMARY KEY (Appointment_Id),
FOREIGN KEY (Pet_Id) REFERENCES PETS(Pet_Id)
);


CREATE TABLE IF NOT EXISTS Staff(
Staff_Id INT NOT NULL,
Staff_Name VARCHAR(50),
Staff_Type VARCHAR(30),
PRIMARY KEY(Staff_Id)
);


CREATE TABLE IF NOT EXISTS Session_(
Session_Id INT NOT NULL,
Session_name VARCHAR(50),
Session_No INT NOT NULL,
Pet_Id INT NOT NULL,
Staff_Id INT NOT NULL,
PRIMARY KEY(Session_Id),
FOREIGN KEY (Pet_Id) REFERENCES PETS(Pet_Id),
FOREIGN KEY (Staff_Id) REFERENCES Staff(Staff_Id)
);


CREATE TABLE IF NOT EXISTS REPORT(
Session_ID INT NOT NULL UNIQUE,
Report_ID INT NOT NULL,
Report_Date DATE,
Report_Description VARCHAR(100),
PRIMARY KEY(Report_Id),
FOREIGN KEY (Session_Id) REFERENCES Session_(Session_Id)
);

CREATE TABLE IF NOT EXISTS Medication_Log(
Medication_Id INT NOT NULL,
Medication_Name VARCHAR(20),
Dosage VARCHAR(30),
Pet_Id INT NOT NULL,
PRIMARY KEY(Medication_Id),
FOREIGN KEY (Pet_Id) REFERENCES PETS(Pet_Id)
);

CREATE TABLE IF NOT EXISTS Users(
User_Id INT NOT NULL,
Username VARCHAR(50),
Password VARCHAR(40),
PRIMARY KEY (User_Id)
);

CREATE TABLE IF NOT EXISTS Payment(
Payment_Id INT NOT NULL,
Payment_Type VARCHAR(20),
Payment_Amount INT CHECK (Payment_Amount > 0),
Pet_Id INT NOT NULL,
PRIMARY KEY(Payment_Id),
FOREIGN KEY (Pet_Id) REFERENCES PETS(Pet_Id)
);



INSERT INTO Users(User_Id, Username, Password)
VALUES
('1230', 'admin', 'admin'),
('2310', 'Emilia', 'Clark'),
('1090', 'Alex', 'Turner'),
('4560', 'John', 'Doe'),
('7890', 'Jane', 'Smith')
ON DUPLICATE KEY UPDATE Username = VALUES(Username), Password = VALUES(Password);

INSERT INTO Staff(Staff_Id, Staff_Name, Staff_Type)
VALUES
('1', 'Alice', 'Groomer'),
('2', 'Bob', 'Veterinarian'),
('3', 'Charlie', 'Receptionist'),
('4', 'David', 'Trainer'),
('5', 'Eve', 'Groomer')
ON DUPLICATE KEY UPDATE Staff_Name = VALUES(Staff_Name), Staff_Type = VALUES(Staff_Type);

INSERT INTO `PETS`(`Pet_Id`, `PetOwner_Id`, `Pet_Name`, `Pet_Type`)
VALUES
('1', '1230', 'Buddy', 'Dog'),
('2', '2310', 'Whiskers', 'Cat'),
('3', '1090', 'Rex', 'Dog'),
('4', '4560', 'Luna', 'Cat'),
('5', '7890', 'Max', 'Dog')
ON DUPLICATE KEY UPDATE PetOwner_Id = VALUES(PetOwner_Id), Pet_Name = VALUES(Pet_Name), Pet_Type = VALUES(Pet_Type);

INSERT INTO `Grooming_Request`(`Appointment_Id`, `ContactPhone`, `Pet_Id`)
VALUES
('1', '1234567890', '1'),
('2', '0987654321', '2'),
('3', '5555555555', '3'),
('4', '1111111111', '4'),
('5', '2222222222', '5')
ON DUPLICATE KEY UPDATE ContactPhone = VALUES(ContactPhone), Pet_Id = VALUES(Pet_Id);


INSERT INTO `Session_`(`Session_Id`, `Session_name`, `Session_No`, `Pet_Id`, `Staff_Id`)
VALUES
('1', 'Grooming Session', '101', '1', '1'),
('2', 'Veterinary Checkup', '102', '2', '2'),
('3', 'Grooming Session', '103', '3', '5'),
('4', 'Grooming Session', '104', '4', '1'),
('5', 'Veterinary Checkup', '105', '5', '2')
ON DUPLICATE KEY UPDATE Session_name = VALUES(Session_name), Session_No = VALUES(Session_No), Pet_Id = VALUES(Pet_Id), Staff_Id = VALUES(Staff_Id);


INSERT INTO `REPORT`(`Session_ID`, `Report_ID`, `Report_Date`, `Report_Description`)
VALUES
('1', '1', '2023-01-01', 'Grooming completed successfully.'),
('2', '2', '2023-01-02', 'Vaccination administered.'),
('3', '3', '2023-01-03', 'Grooming completed successfully.'),
('4', '4', '2023-01-04', 'Grooming completed successfully.'),
('5', '5', '2023-01-05', 'Veterinary checkup completed.')
ON DUPLICATE KEY UPDATE Session_ID = VALUES(Session_ID), Report_Date = VALUES(Report_Date), Report_Description = VALUES(Report_Description);

INSERT INTO `Medication_Log`(`Medication_Id`, `Medication_Name`, `Dosage`, `Pet_Id`)
VALUES
('1', 'Flea Treatment', '2 drops', '1'),
('2', 'Heartworm Prevention', '1 pill', '2'),
('3', 'Antibiotics', '1 tablet', '3'),
('4', 'Pain Relief', '1 injection', '4'),
('5', 'Deworming', '1 chewable', '5')
ON DUPLICATE KEY UPDATE Medication_Name = VALUES(Medication_Name), Dosage = VALUES(Dosage), Pet_Id = VALUES(Pet_Id);

INSERT INTO Payment(Payment_Id, Payment_Type, Payment_Amount, Pet_Id)
VALUES
('1', 'Cash', '45', '1'),
('2', 'Card', '60', '2'),
('3', 'Cash', '30', '3'),
('4', 'Card', '75', '4'),
('5', 'Cash', '50', '5')
ON DUPLICATE KEY UPDATE Payment_Type = VALUES(Payment_Type), Payment_Amount = VALUES(Payment_Amount), Pet_Id = VALUES(Pet_Id);


USE Pets_DES;
SELECT * FROM PETS;
SELECT * FROM Grooming_Request;
SELECT * FROM Session_;
SELECT * FROM REPORT;
SELECT * FROM Medication_Log;
SELECT * FROM Staff;
SELECT * FROM Users;
SELECT * FROM Payment;
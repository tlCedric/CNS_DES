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
ContactPhone INT,
PRIMARY KEY (Appointment_Id)
);

CREATE TABLE IF NOT EXISTS Session_(
Staff_Name INT NOT NULL,
Session_Id INT NOT NULL,
Session_name VARCHAR(50),
Session_No INT NOT NULL,
Pet_Id INT NOT NULL,
PRIMARY KEY(Session_Id)

);


CREATE TABLE IF NOT EXISTS REPORT(
Session_ID INT NOT NULL, 
Report_ID INT NOT NULL,
Report_Date INT,
Report_Description VARCHAR (100),
PRIMARY KEY(Report_Id)
);

CREATE TABLE IF NOT EXISTS Medication_Log(
Medication_Id INT NOT NULL,
Medication_Name VARCHAR(20),
Dosage CHAR, 
Pet_Id INT NOT NULL,
PRIMARY KEY(Medication_Id)
);

CREATE TABLE IF NOT EXISTS Staff(
Staff_Id INT NOT NULL,
Staff_Name VARCHAR(50),
Staff_Type VARCHAR(10)

);

CREATE TABLE IF NOT EXISTS Users(
User_Id INT NOT NULL,
Username VARCHAR(50),
Password VARCHAR(40),
PRIMARY KEY (User_Id)
);

INSERT IGNORE INTO Users(User_Id, Username, Password )
VALUES
('1230', 'admin', 'admin'),
('2310', 'Emilia', 'Clark'),
('1090', 'Alex', 'Turner');

USE Pets_DES;
SELECT * FROM Users;
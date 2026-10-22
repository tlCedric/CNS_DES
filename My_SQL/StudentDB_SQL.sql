CREATE DATABASE IF NOT EXISTS StudentDB;
USE StudentDB;

CREATE TABLE IF NOT EXISTS students (
    student_id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    enrollment_date DATE NOT NULL,
    PRIMARY KEY (student_id)
);

CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(3) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    credits INT NOT NULL,
    PRIMARY KEY (course_id)
);

ALTER TABLE courses
MODIFY course_id VARCHAR(3) NOT NULL;

INSERT INTO students (first_name, last_name, email, enrollment_date)
VALUES
('John', 'Doe', 'john.doe@example.com', '2018-09-01'),
('Jane', 'Smith', 'jane.smith@example.com', '2026-09-02'),
('Alex', 'Jones', 'alex.j@example.com', '1990-09-05'),
('Emilia', 'Clark', 'emilia.clark@example.com', '2006-09-06'),
('Alex', 'Turner', 'alex.turner@example.com', '2015-09-07'),
('Michael', 'Brown', 'michael.brown@example.com', '2020-09-08'),
('Sarah', 'Johnson', 'sarah.johnson@example.com', '2026-09-09'),
('Sophia', 'Williams', 'sophia.williams@example.com', '2026-09-10');

INSERT INTO courses (course_id,course_name, credits)
VALUES
('17','Introduction to Computer Science', 4),
('18','Database Management Systems', 3),
('19','Discrete Mathematics', 3),
('20','Data Structures and Algorithms', 4),
('21','Operating Systems', 2),
('22','Computer Networks', 3),
('23','Software Engineering', 3),
('24','Artificial Intelligence', 5),
('25','Machine Learning', 4);


USE StudentDB;
SELECT *
FROM courses;

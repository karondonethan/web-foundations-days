-- Day 6 assignment: school database (SQLite)
-- Tables: students, courses, enrolments (join table)

PRAGMA foreign_keys = ON;

-- Re-runnable: drop in child-first order
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ---------------------------------------------------------
-- 1. CREATE TABLE statements
-- ---------------------------------------------------------
CREATE TABLE students (
    student_id  INTEGER PRIMARY KEY,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id   INTEGER PRIMARY KEY,
    code        TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    credits     INTEGER NOT NULL CHECK (credits > 0)
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id   INTEGER NOT NULL,
    course_id    INTEGER NOT NULL,
    enrolled_on  TEXT NOT NULL DEFAULT CURRENT_DATE,
    grade        INTEGER CHECK (grade BETWEEN 0 AND 100),  -- NULL = not graded yet
    FOREIGN KEY (student_id) REFERENCES students (student_id),
    FOREIGN KEY (course_id)  REFERENCES courses (course_id),
    UNIQUE (student_id, course_id)  -- same student cannot enrol on the same course twice
);

-- ---------------------------------------------------------
-- 2. Sample data
-- ---------------------------------------------------------
INSERT INTO students (student_id, first_name, last_name, email) VALUES
    (1, 'Amina',  'Wanjiku', 'amina.wanjiku@example.com'),
    (2, 'Brian',  'Otieno',  'brian.otieno@example.com'),
    (3, 'Cynthia','Achieng', 'cynthia.achieng@example.com'),
    (4, 'David',  'Mwangi',  'david.mwangi@example.com');   -- will have no enrolments

INSERT INTO courses (course_id, code, title, credits) VALUES
    (1, 'STA101', 'Introduction to Statistics', 3),
    (2, 'WEB101', 'Web Foundations',            4),
    (3, 'DB101',  'Databases',                  3);

INSERT INTO enrolments (enrolment_id, student_id, course_id, enrolled_on, grade) VALUES
    (1, 1, 1, '2026-09-01', 78),
    (2, 1, 2, '2026-09-01', 85),
    (3, 2, 2, '2026-09-02', 64),
    (4, 3, 2, '2026-09-02', NULL),
    (5, 3, 3, '2026-09-03', 91),
    (6, 2, 3, '2026-09-03', NULL);

-- ---------------------------------------------------------
-- 3. Queries
-- ---------------------------------------------------------

-- Q1: All courses for one student (by name)
SELECT c.code, c.title, e.grade
FROM students s
JOIN enrolments e ON e.student_id = s.student_id
JOIN courses c    ON c.course_id  = e.course_id
WHERE s.first_name = 'Amina' AND s.last_name = 'Wanjiku';

-- Q2: All students on one course
SELECT s.first_name, s.last_name, s.email, e.grade
FROM courses c
JOIN enrolments e ON e.course_id  = c.course_id
JOIN students s   ON s.student_id = e.student_id
WHERE c.code = 'WEB101';

-- Q3: Number of students per course (includes courses with 0 students)
SELECT c.code, c.title, COUNT(e.enrolment_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.code, c.title;

-- Q4: Students who have no enrolments
SELECT s.student_id, s.first_name, s.last_name
FROM students s
LEFT JOIN enrolments e ON e.student_id = s.student_id
WHERE e.enrolment_id IS NULL;

-- Q5: Update one enrolment's grade (Cynthia, WEB101), then show the result
UPDATE enrolments
SET grade = 72
WHERE student_id = 3 AND course_id = 2;

SELECT s.first_name, c.code, e.grade
FROM enrolments e
JOIN students s ON s.student_id = e.student_id
JOIN courses c  ON c.course_id  = e.course_id
WHERE e.student_id = 3 AND e.course_id = 2;
# School Database Design

## Tables

**students** stores one row per person who studies at the school: `student_id` (primary key), `first_name`, `last_name` and `email`. The email is `NOT NULL` and `UNIQUE`, so no two students can share an address and each student can be identified by it.

**courses** stores one row per course offered: `course_id` (primary key), `code` (unique, e.g. WEB101), `title` and `credits`. A course exists whether or not anyone has enrolled yet.

**enrolments** records the fact that a particular student is taking a particular course: `enrolment_id` (primary key), `student_id` and `course_id` (both foreign keys, both `NOT NULL`), `enrolled_on` and `grade`. The grade lives here, not in `students` or `courses`, because it belongs to the *pair*: Amina's grade in Web Foundations is neither a property of Amina nor of Web Foundations alone. The grade is nullable because a student is enrolled before they are graded. A `UNIQUE (student_id, course_id)` constraint stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments: one-to-many.** One student can have many enrolments, but each enrolment row belongs to exactly one student.
- **courses to enrolments: one-to-many.** One course can have many enrolments, but each enrolment row belongs to exactly one course.
- **students to courses: many-to-many.** A student can take many courses, and a course has many students.

A relational table cannot store a many-to-many relationship directly. Putting a list of course ids in one student column would break first normal form (several values in one cell), make joins and counts awkward, and make it impossible to enforce foreign keys. Putting a student id in `courses` would limit each course to one student. The join table `enrolments` solves this by turning one many-to-many relationship into two one-to-many relationships, with one row per student-course pair. It also gives a natural home for data about the relationship itself (grade, enrolment date).

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

Queries such as "all students on one course" and "students per course" filter or join on `course_id`. The `UNIQUE (student_id, course_id)` constraint already creates an index that helps lookups starting with `student_id`, but it cannot be used efficiently to search by `course_id` alone. Without the new index, SQLite would scan the whole enrolments table as it grows; with it, it jumps straight to the matching rows.

## SQL or NoSQL?

I would choose SQL for this system. The data is highly structured and relational: students, courses and enrolments have a fixed shape and clear relationships, and the many-to-many link is exactly what a relational database with joins is designed for. The system also needs integrity rules that SQL enforces for free, such as unique emails, foreign keys that stop enrolments pointing at students or courses that do not exist, and the rule against duplicate enrolments. Queries like "students with no enrolments" or "number of students per course" are simple with JOIN and GROUP BY, and grade updates should be consistent and transactional. A NoSQL document store would be a better fit if the data were unstructured, changed shape constantly, or had to scale across many servers with simple lookups, but none of that applies to a school records system.
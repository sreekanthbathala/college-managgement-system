# 🎓 Excel University - College Management System (CMS)

A professional, high-fidelity **College Management System (CMS) ERP** built with Django and MySQL. It features role-based portal desks for Administrative Directors (HODs), Faculty Instructors, and Enrolled Students, styled with modern visual aesthetics including HSL-tailored slate layouts, glassmorphic components, and color-coded metrics.

---

## 🚀 Key Feature Portals

### 1. 👑 Administrator (HOD) Control Panel
- **Status Dashboard Overview:** Displays live institution metrics (Courses, Subjects, active Session Cohorts, Faculty Staff, Registered Students) using interactive stats cards.
- **Academic Programs (Courses) CRUD:** Configure, register, and maintain academic programs (e.g. *Computer Science Engineering*).
- **Curriculum Disciplines (Subjects) CRUD:** Build specific subjects, associate them with parent programs, and assign specific faculty instructors as the course lecturers.
- **Session Timeline Batches CRUD:** Establish start/end ranges for cohorts (e.g. *2024 to 2028 batch*).
- **Faculty Onboarding & Directories:** Onboard lecturers, configure their credentials, and view their teaching courses.
- **Student Onboarding & Directories:** Register students, assign them registration IDs, pick their enrolled courses, and bind them to active session batches.

### 2. 👨‍🏫 Faculty/Lecturer ERP Desk
- **Curriculum Overview Dashboard:** Lists assigned teaching courses and summary counts of roll-call records and graded scorecards.
- **Interactive Daily Attendance Logs:** Fetch the active class roster for a subject and batch cohort, select the roll date, and save daily presence checklists with "Mark All" helpers.
- **Subject Grade-Sheet Evaluations:** View passing and distinction stats and enter numerical exam marks (0 - 100) on a spreadsheet-like grid with automated validations.

### 3. 🎓 Student ERP Console
- **Aggregate Attendance Gauge:** Computes total presence parameters and displays a color-coded satisfaction badge (Regular status vs Shortage warnings) relative to the institutional 75% standard.
- **Subject Attendance Roster:** Breaks down classes held, attended, and computes attendance rates with colored progress bars.
- **Academic Transcript Report:** Displays published term exam marks and grading badges (Distinction, Pass, or Fail).

---

## 🛠️ Technology Stack & Visuals
- **Framework Core:** Python, Django 6.0
- **Database Engine:** MySQL Database Server (relational schema with cascading safety nets)
- **Styling UI:** Vanilla CSS, Bootstrap 5.3, Google Fonts (`Plus Jakarta Sans`)
- **Theme Accents:** Dark Slate (`#0f172a`), Deep Navy Indigo (`#1e1b4b`), soft Glass borders (`rgba(255,255,255,0.85)`), and vibrant status colors (Teal for success, Rose/Amber for alerts).

---

## 📦 Local Installation & Setup

Ensure you have Python 3.10+ and a local MySQL server running.

1. **Activate the Virtual Environment:**
   ```powershell
   # On Windows PowerShell
   .\venv\Scripts\Activate.ps1
   ```
2. **Install Environment Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Navigate to the Django Application Directory:**
   ```powershell
   cd college
   ```
4. **Configure Local Database Settings:**
   Open `college/college/settings.py` and ensure the `DATABASES` block matches your local MySQL server hostname and database credentials (default is `college_db` on `localhost`).
5. **Run Django Database Migrations:**
   ```bash
   python manage.py migrate
   ```
6. **Seed Initial Demo Data:**
   Re-populate tables and set up verified test accounts:
   ```bash
   python seed_data.py
   ```
7. **Launch the Web App:**
   ```bash
   python manage.py runserver
   ```
   Open `http://127.0.0.1:8000/` in your browser.

---

## 🔑 Operational Seed Credentials

You can immediately log in as any of the three user roles to explore their respective portals:

| Account Role | Username | Password | Key Actions |
| :--- | :--- | :--- | :--- |
| **HOD Administrator** | `admin` | `admin123` | Program CRUDs, Sessions CRUDs, Student/Faculty onboarding. |
| **Faculty Instructor** | `prof_alan` | `staff123` | Mark daily roll-call attendance, submit evaluation scores. |
| **College Student** | `student_alice` | `student123` | Check attendance progress bars, warnings, academic transcript. |

---

## 🧪 Automated Testing & Auditing

We have built a robust suite of unit and integration tests inside `core/tests.py` verifying:
- Authentication roles & redirects.
- Access control safeguards (security guards block students from HOD panels).
- Admin Program/Session CRUD parameters.
- Faculty roll-call logging and grade-sheet entries.
- Student metrics calculations.

To run the automated tests, navigate to the `college` folder and execute:
```bash
python manage.py test
```

### Manual Visual Session Audit
To run a local simulated HOD Admin session check that logs in, fetches the dashboard context, and prints the roster from the database:
```bash
python test_login.py
```

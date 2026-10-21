function toggleForgotPass(showForgot) {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    const registerForm = document.getElementById('registerForm');
    if (!loginForm || !forgotForm || !registerForm) return;

    loginForm.hidden = showForgot;
    forgotForm.hidden = !showForgot;
    if (registerForm) registerForm.hidden = true;
}

function toggleRegister(showRegister) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotForm = document.getElementById('forgotForm');
    if (!loginForm || !registerForm || !forgotForm) return;

    loginForm.hidden = showRegister;
    registerForm.hidden = !showRegister;
    forgotForm.hidden = true;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[<>&"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    const result = await response.json();
    if (!response.ok) {
        const error = new Error(result.message || 'Something went wrong. Please try again.');
        error.status = response.status;
        throw error;
    }
    return result;
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = loginForm.querySelector('[type="submit"]');
        const status = document.getElementById('loginMessage');
        submit.disabled = true;
        status.textContent = 'Signing you in…';
        status.className = 'form-message';

        try {
            await requestJson('/api/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            });
            window.location.href = 'dashboard.html';
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('is-error');
            submit.disabled = false;
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = registerForm.querySelector('[type="submit"]');
        const status = document.getElementById('registerMessage');
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            status.textContent = 'The passwords do not match.';
            status.className = 'form-message is-error';
            return;
        }

        submit.disabled = true;
        status.textContent = 'Creating your account…';
        status.className = 'form-message';

        try {
            await requestJson('/api/register', {
                method: 'POST',
                body: JSON.stringify({
                    username: document.getElementById('registerUsername').value,
                    password
                })
            });
            window.location.href = 'dashboard.html';
        } catch (error) {
            status.textContent = error.message;
            status.classList.add('is-error');
            submit.disabled = false;
        }
    });
}

const passwordInput = document.getElementById('password');
const togglePasswordButton = document.getElementById('togglePassword');
if (passwordInput && togglePasswordButton) {
    togglePasswordButton.addEventListener('click', () => {
        const showPassword = passwordInput.type === 'password';
        passwordInput.type = showPassword ? 'text' : 'password';
        togglePasswordButton.textContent = showPassword ? 'Hide password' : 'Show password';
        togglePasswordButton.setAttribute('aria-pressed', String(showPassword));
    });
}

const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const status = document.getElementById('resetMessage');
        status.textContent = 'Password reset is not available because this account database has no email or reset fields.';
        status.classList.add('is-error');
    });
}

const dashboard = document.querySelector('.dashboard-page');
if (dashboard) {
    const alertBox = document.getElementById('dashboardAlert');
    const bookingForm = document.getElementById('bookingForm');
    const petSelect = document.getElementById('bookingPet');
    const staffSelect = document.getElementById('bookingStaff');
    const bookingSubmit = document.getElementById('bookingSubmit');
    const bookingMessage = document.getElementById('bookingMessage');
    const paymentForm = document.getElementById('paymentForm');
    const paymentPetSelect = document.getElementById('paymentPet');
    const paymentSubmit = document.getElementById('paymentSubmit');
    const paymentMessage = document.getElementById('paymentMessage');
    const adminRecordsGrid = document.getElementById('adminRecordsGrid');
    let currentDashboardData = null;

    function showDashboardError(message) {
        alertBox.textContent = message;
        alertBox.classList.remove('is-success');
        alertBox.hidden = false;
    }

    function showDashboardSuccess(message) {
        alertBox.textContent = message;
        alertBox.classList.add('is-success');
        alertBox.hidden = false;
    }

    function setBookingAvailability() {
        const canBook = petSelect.options.length > 1 && staffSelect.options.length > 1;
        petSelect.disabled = petSelect.options.length <= 1;
        staffSelect.disabled = staffSelect.options.length <= 1;
        bookingSubmit.disabled = !canBook;
        paymentPetSelect.disabled = paymentPetSelect.options.length <= 1;
        paymentSubmit.disabled = paymentPetSelect.options.length <= 1;
        if (!petSelect.options.length || petSelect.options.length === 1) {
            petSelect.innerHTML = '<option value="">No pets in your account yet</option>';
        }
        if (!staffSelect.options.length || staffSelect.options.length === 1) {
            staffSelect.innerHTML = '<option value="">No team members available</option>';
        }
        if (!paymentPetSelect.options.length || paymentPetSelect.options.length === 1) {
            paymentPetSelect.innerHTML = '<option value="">No pets in your account yet</option>';
        }
    }

    function formatReportDate(value) {
        if (!value) return 'Date not recorded';
        return String(value).slice(0, 10);
    }

    function renderDashboard(data) {
        currentDashboardData = data;
        const pets = data.pets || [];
        const staff = data.staff || [];
        const sessions = data.sessions || [];
        const reports = data.reports || [];
        const payments = data.payments || [];
        const medications = data.medications || [];
        const username = data.user?.Username || 'Pet parent';
        const adminOnlySections = document.querySelectorAll('.admin-only');

        document.getElementById('userName').textContent = username;
        document.getElementById('userAvatar').textContent = username.charAt(0).toUpperCase();
        document.getElementById('welcomeHeading').innerHTML = `Welcome back, ${escapeHtml(username)}<span class="brand-period">.</span>`;
        document.querySelector('.breadcrumb').innerHTML = data.isAdmin ? 'ADMINISTRATOR <span>/</span> ALL RECORDS' : 'YOUR ACCOUNT <span>/</span> OVERVIEW';
        adminOnlySections.forEach((section) => { section.hidden = !data.isAdmin; });
        document.getElementById('bookingHeading').textContent = data.isAdmin ? 'Book a session for any pet' : 'Book a session';
        document.getElementById('paymentHeading').textContent = data.isAdmin ? 'Record a payment for any pet' : 'Record a payment';
        document.getElementById('petCount').textContent = pets.length;
        document.getElementById('sessionCount').textContent = sessions.length;
        document.getElementById('reportCount').textContent = reports.length;
        document.getElementById('paymentTotal').textContent = payments.reduce((total, payment) => total + Number(payment.Payment_Amount || 0), 0).toLocaleString();
        document.getElementById('petsPanelCount').textContent = `${pets.length} ${pets.length === 1 ? 'PET' : 'PETS'}`;
        document.getElementById('reportsPanelCount').textContent = `${reports.length} ${reports.length === 1 ? 'REPORT' : 'REPORTS'}`;
        document.getElementById('medicationsPanelCount').textContent = `${medications.length} ${medications.length === 1 ? 'ITEM' : 'ITEMS'}`;

        const petOptions = ['<option value="">Select a pet</option>']
            .concat(pets.map((pet) => `<option value="${pet.Pet_Id}">${escapeHtml(pet.Pet_Name)} (${escapeHtml(pet.Pet_Type)})</option>`))
            .join('');
        petSelect.innerHTML = petOptions;
        staffSelect.innerHTML = ['<option value="">Select a team member</option>']
            .concat(staff.map((member) => `<option value="${member.Staff_Id}">${escapeHtml(member.Staff_Name)} (${escapeHtml(member.Staff_Type)})</option>`))
            .join('');
        paymentPetSelect.innerHTML = ['<option value="">Select a pet</option>']
            .concat(pets.map((pet) => `<option value="${pet.Pet_Id}">${escapeHtml(pet.Pet_Name)}</option>))
            .join('');
        setBookingAvailability();

        const petList = document.getElementById('petList');
        petList.innerHTML = pets.length
            ? pets.map((pet) => `
                <article class="pet-card">
                    <div>
                        <h3>${escapeHtml(pet.Pet_Name)}</h3>
                        <p>${escapeHtml(pet.Pet_Type)}</p>
                    </div>
                    <span class="pet-chip">#${pet.Pet_Id}</span>
                </article>
            `).join('')
            : '<p class="empty-state">No pets yet.</p>';

        const sessionList = document.getElementById('sessionList');
        sessionList.innerHTML = sessions.length
            ? sessions.map((session) => `
                <article class="session-card">
                    <div>
                        <h3>${escapeHtml(session.Session_name)}</h3>
                        <p>Pet #${session.Pet_Id} • Team #${session.Staff_Id}</p>
                    </div>
                    <span class="badge">#${session.Session_No}</span>
                </article>
            `).join('')
            : '<p class="empty-state">No sessions yet.</p>';

        const reportList = document.getElementById('reportList');
        reportList.innerHTML = reports.length
            ? reports.map((report) => `
                <article class="report-card">
                    <h3>Report #${report.Report_ID}</h3>
                    <p>${escapeHtml(report.Report_Description || 'No notes provided.')}</p>
                    <span>${formatReportDate(report.Report_Date)}</span>
                </article>
            `).join('')
            : '<p class="empty-state">No care reports yet.</p>';

        const medicationList = document.getElementById('medicationList');
        medicationList.innerHTML = medications.length
            ? medications.map((medication) => `
                <article class="medication-card">
                    <h3>${escapeHtml(medication.Medication_Name)}</h3>
                    <p>${escapeHtml(medication.Dosage)}</p>
                </article>
            `).join('')
            : '<p class="empty-state">No medication logs.</p>';

        const paymentHistory = document.getElementById('paymentHistory');
        paymentHistory.innerHTML = payments.length
            ? payments.map((payment) => `
                <div class="payment-item">
                    <span>${escapeHtml(payment.Payment_Type)}</span>
                    <strong>${Number(payment.Payment_Amount || 0).toLocaleString()}</strong>
                </div>
            `).join('')
            : '<p class="empty-state">No payment history.</p>';

        if (data.isAdmin) {
            const adminValues = [];
            for (const table of ['pets', 'sessions', 'reports', 'medications', 'staff', 'users', 'payments']) {
                const items = data[table] || [];
                adminValues.push(`
                    <div class="admin-record-card">
                        <h3>${table.toUpperCase()}</h3>
                        <p>${items.length} records</p>
                    </div>
                `);
            }
            adminRecordsGrid.innerHTML = adminValues.join('');
        }
    }

    async function loadDashboard() {
        try {
            const data = await requestJson('/api/dashboard');
            renderDashboard(data);
        } catch (error) {
            showDashboardError(error.message || 'Unable to load your dashboard.');
        }
    }

    bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!petSelect.value || !staffSelect.value || !bookingForm.querySelector('[name="sessionName"]').value.trim()) {
            bookingMessage.textContent = 'Please choose a pet, team member, and session name.';
            bookingMessage.classList.add('is-error');
            return;
        }

        bookingSubmit.disabled = true;
        bookingMessage.textContent = 'Booking your session…';
        bookingMessage.classList.remove('is-error');

        try {
            const response = await requestJson('/api/book-session', {
                method: 'POST',
                body: JSON.stringify({
                    petId: petSelect.value,
                    staffId: staffSelect.value,
                    sessionName: bookingForm.querySelector('[name="sessionName"]').value.trim()
                })
            });
            showDashboardSuccess(response.message || 'Session booked successfully.');
            bookingForm.reset();
            await loadDashboard();
        } catch (error) {
            bookingMessage.textContent = error.message;
            bookingMessage.classList.add('is-error');
        } finally {
            bookingSubmit.disabled = false;
        }
    });

    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!paymentPetSelect.value || !paymentForm.querySelector('[name="paymentType"]').value || !paymentForm.querySelector('[name="amount"]').value) {
            paymentMessage.textContent = 'Please choose a pet, payment type, and amount.';
            paymentMessage.classList.add('is-error');
            return;
        }

        paymentSubmit.disabled = true;
        paymentMessage.textContent = 'Saving payment…';
        paymentMessage.classList.remove('is-error');

        try {
            const response = await requestJson('/api/payment', {
                method: 'POST',
                body: JSON.stringify({
                    petId: paymentPetSelect.value,
                    paymentType: paymentForm.querySelector('[name="paymentType"]').value,
                    amount: paymentForm.querySelector('[name="amount"]').value
                })
            });
            showDashboardSuccess(response.message || 'Payment saved successfully.');
            paymentForm.reset();
            await loadDashboard();
        } catch (error) {
            paymentMessage.textContent = error.message;
            paymentMessage.classList.add('is-error');
        } finally {
            paymentSubmit.disabled = false;
        }
    });

    document.getElementById('signOutButton').addEventListener('click', async () => {
        try {
            await requestJson('/api/logout', { method: 'POST' });
            window.location.href = 'index.html';
        } catch (error) {
            showDashboardError(error.message || 'Unable to sign out.');
        }
    });

    loadDashboard();
}

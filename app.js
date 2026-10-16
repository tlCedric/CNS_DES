function toggleForgotPass(showForgot) {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    if (!loginForm || !forgotForm) return;

    loginForm.hidden = showForgot;
    forgotForm.hidden = !showForgot;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
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
        paymentSubmit.disabled = paymentPetSelect.disabled;
        if (!petSelect.options.length || petSelect.options.length === 1) {
            petSelect.innerHTML = '<option value="">No pets in your account yet</option>';
        }
        if (!paymentPetSelect.options.length || paymentPetSelect.options.length === 1) {
            paymentPetSelect.innerHTML = '<option value="">No pets in your account yet</option>';
        }
        if (!staffSelect.options.length || staffSelect.options.length === 1) {
            staffSelect.innerHTML = '<option value="">No team members available</option>';
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
        document.querySelector('.breadcrumb').innerHTML = data.isAdmin
            ? 'ADMINISTRATION <span>/</span> ALL RECORDS'
            : 'YOUR ACCOUNT <span>/</span> OVERVIEW';
        adminOnlySections.forEach((section) => { section.hidden = !data.isAdmin; });
        document.getElementById('bookingHeading').textContent = data.isAdmin ? 'Book a session for any pet' : 'Book a session';
        document.getElementById('paymentHeading').textContent = data.isAdmin
            ? 'Record a payment for any pet'
            : 'Record a payment';
        document.getElementById('petCount').textContent = pets.length;
        document.getElementById('sessionCount').textContent = sessions.length;
        document.getElementById('reportCount').textContent = reports.length;
        document.getElementById('paymentTotal').textContent = payments
            .reduce((total, payment) => total + Number(payment.Payment_Amount || 0), 0)
            .toLocaleString();
        document.getElementById('petsPanelCount').textContent = `${pets.length} ${pets.length === 1 ? 'PET' : 'PETS'}`;
        document.getElementById('reportsPanelCount').textContent = `${reports.length} ${reports.length === 1 ? 'REPORT' : 'REPORTS'}`;
        document.getElementById('medicationsPanelCount').textContent = `${medications.length} ${medications.length === 1 ? 'RECORD' : 'RECORDS'}`;

        const petOptions = '<option value="">Choose a pet</option>' + pets.map((pet) =>
            `<option value="${escapeHtml(pet.Pet_Id)}">${escapeHtml(pet.Pet_Name)} · ${escapeHtml(pet.Pet_Type)}</option>`
        ).join('');
        petSelect.innerHTML = petOptions;
        paymentPetSelect.innerHTML = petOptions;
        staffSelect.innerHTML = '<option value="">Choose a team member</option>' + staff.map((member) =>
            `<option value="${escapeHtml(member.Staff_Id)}">${escapeHtml(member.Staff_Name)} · ${escapeHtml(member.Staff_Type)}</option>`
        ).join('');
        setBookingAvailability();

        document.getElementById('petList').innerHTML = pets.length
            ? pets.map((pet, index) => `
                <article class="pet-row">
                    <span class="pet-avatar pet-avatar-${index % 4}" aria-hidden="true">${escapeHtml((pet.Pet_Name || '?').charAt(0).toUpperCase())}</span>
                    <span class="pet-details"><strong>${escapeHtml(pet.Pet_Name)}</strong><small>${escapeHtml(pet.Pet_Type)} · Pet #${escapeHtml(pet.Pet_Id)}</small></span>
                    <span class="pet-heart" aria-hidden="true">♡</span>
                </article>`).join('')
            : '<p class="empty-state">No pets are linked to your account yet.</p>';

        document.getElementById('sessionList').innerHTML = sessions.length
            ? sessions.slice(0, 5).map((session) => `
                <article class="session-row">
                    <span class="session-icon" aria-hidden="true">♡</span>
                    <span class="session-details"><strong>${escapeHtml(session.Session_name)}</strong><small>${escapeHtml(session.Pet_Name)} · ${escapeHtml(session.Staff_Name)} (${escapeHtml(session.Staff_Type)})</small></span>
                    <span class="session-number">#${escapeHtml(session.Session_No)}</span>
                </article>`).join('')
            : '<p class="empty-state">No sessions yet. Book your pet’s first visit above.</p>';

        document.getElementById('reportList').innerHTML = reports.length
            ? reports.map((report) => `
                <article class="report-row">
                    <span class="report-mark" aria-hidden="true">▤</span>
                    <div class="report-details">
                        <div class="report-meta"><strong>${escapeHtml(report.Pet_Name)}</strong><time>${escapeHtml(formatReportDate(report.Report_Date))}</time></div>
                        <p>${escapeHtml(report.Report_Description || 'No description provided.')}</p>
                        <small>${escapeHtml(report.Session_name)}</small>
                    </div>
                </article>`).join('')
            : '<p class="empty-state">Care reports for your pets will appear here.</p>';

        document.getElementById('medicationList').innerHTML = medications.length
            ? medications.map((medication) => `
                <article class="medication-row">
                    <span class="medication-mark" aria-hidden="true">✚</span>
                    <div class="medication-details">
                        <strong>${escapeHtml(medication.Medication_Name)}</strong>
                        <span>${escapeHtml(medication.Dosage)}</span>
                        <small>${escapeHtml(medication.Pet_Name)}</small>
                    </div>
                </article>`).join('')
            : '<p class="empty-state">Medication records for your pets will appear here.</p>';

        document.getElementById('paymentHistory').innerHTML = payments.length
            ? `<p class="payment-history-title">RECENT PAYMENTS</p>${payments.slice(0, 4).map((payment) => `
                <article class="payment-history-row">
                    <span>${escapeHtml(payment.Pet_Name)} · ${escapeHtml(payment.Payment_Type)}</span>
                    <strong>${escapeHtml(Number(payment.Payment_Amount).toLocaleString())}</strong>
                </article>`).join('')}`
            : '<p class="payment-history-title">No payments recorded yet.</p>';

        if (data.isAdmin) renderAdminRecords(data.adminRecords || {});
    }

    function renderAdminRecords(records) {
        const tables = {
            pets: {
                label: 'Pets',
                primaryKey: 'Pet_Id',
                columns: ['Pet_Id', 'PetOwner_Id', 'Pet_Name', 'Pet_Type'],
                editable: ['PetOwner_Id', 'Pet_Name', 'Pet_Type']
            },
            groomingRequests: {
                label: 'Grooming requests',
                primaryKey: 'Appointment_Id',
                columns: ['Appointment_Id', 'ContactPhone', 'Pet_Id', 'Pet_Name'],
                editable: ['ContactPhone', 'Pet_Id']
            },
            sessions: {
                label: 'Sessions',
                primaryKey: 'Session_Id',
                columns: ['Session_Id', 'Session_name', 'Session_No', 'Pet_Id', 'Pet_Name', 'Staff_Id', 'Staff_Name', 'Staff_Type'],
                editable: ['Session_name', 'Session_No', 'Pet_Id', records.sessionStaffColumn]
            },
            reports: {
                label: 'Reports',
                primaryKey: 'Report_ID',
                columns: ['Report_ID', 'Session_ID', 'Report_Date', 'Report_Description', 'Session_name', 'Pet_Id', 'Pet_Name'],
                editable: ['Session_ID', 'Report_Date', 'Report_Description']
            },
            medications: {
                label: 'Medication log',
                primaryKey: 'Medication_Id',
                columns: ['Medication_Id', 'Medication_Name', 'Dosage', 'Pet_Id', 'Pet_Name'],
                editable: ['Medication_Name', 'Dosage', 'Pet_Id']
            },
            staff: {
                label: 'Staff',
                primaryKey: 'Staff_Id',
                columns: ['Staff_Id', 'Staff_Name', 'Staff_Type'],
                editable: ['Staff_Name', 'Staff_Type']
            },
            users: {
                label: 'Users',
                primaryKey: 'User_Id',
                columns: ['User_Id', 'Username'],
                editable: ['Username']
            },
            payments: {
                label: 'Payments',
                primaryKey: 'Payment_Id',
                columns: ['Payment_Id', 'Payment_Type', 'Payment_Amount', 'Pet_Id', 'Pet_Name'],
                editable: ['Payment_Type', 'Payment_Amount', 'Pet_Id']
            }
        };
        const numericFields = new Set(['Pet_Id', 'PetOwner_Id', 'Appointment_Id', 'Session_Id', 'Session_No', 'Staff_Id', 'Report_ID', 'Session_ID', 'Medication_Id', 'User_Id', 'Payment_Id', 'Payment_Amount']);

        adminRecordsGrid.innerHTML = Object.entries(tables).map(([key, config]) => {
            const rows = records[key] || [];
            const columns = config.columns.filter((column) => (
                key !== 'sessions' || (column !== 'Staff_Id' && column !== 'Staff_Name') || column === records.sessionStaffColumn
            ));
            const table = rows.length
                ? `<div class="admin-table-scroll"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.replaceAll('_', ' '))}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.map((row) => {
                    const id = row[config.primaryKey];
                    return `<tr data-record-table="${key}" data-record-id="${escapeHtml(id)}">${columns.map((column) => {
                        const editable = config.editable.includes(column);
                        const value = row[column] ?? '';
                        return `<td data-field="${escapeHtml(column)}" data-value="${escapeHtml(value)}" data-editable="${editable}">${escapeHtml(value || '—')}</td>`;
                    }).join('')}<td class="admin-row-actions"><button type="button" class="admin-action-button" data-action="edit">Edit</button><button type="button" class="admin-action-button is-danger" data-action="delete">Delete</button></td></tr>`;
                }).join('')}</tbody></table></div>`
                : '<p class="empty-state">No records.</p>';
            return `<section class="admin-data-card" data-record-set="${key}"><h3>${escapeHtml(config.label)}<span>${rows.length}</span></h3>${table}</section>`;
        }).join('');
    }

    adminRecordsGrid.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const row = button.closest('tr[data-record-table]');
        if (!row) return;

        const action = button.dataset.action;
        if (action === 'edit') {
            if (row.dataset.editing === 'true') return;
            row.dataset.editing = 'true';
            row.querySelectorAll('td[data-editable="true"]').forEach((cell) => {
                const field = cell.dataset.field;
                const value = cell.dataset.value;
                const type = field === 'Report_Date' ? 'date' : (
                    ['Pet_Id', 'PetOwner_Id', 'Session_No', 'Staff_Id', 'Session_ID', 'Payment_Amount'].includes(field)
                        ? 'number'
                        : 'text'
                );
                cell.innerHTML = `<input class="admin-edit-input" type="${type}" data-edit-field="${escapeHtml(field)}" value="${escapeHtml(value)}" required>`;
            });
            button.textContent = 'Save';
            button.dataset.action = 'save';
            const cancel = document.createElement('button');
            cancel.type = 'button';
            cancel.className = 'admin-action-button';
            cancel.dataset.action = 'cancel';
            cancel.textContent = 'Cancel';
            button.after(cancel);
            row.querySelector('[data-action="delete"]').hidden = true;
            return;
        }

        if (action === 'cancel') {
            renderDashboard(currentDashboardData);
            return;
        }

        if (action === 'delete') {
            const tableName = row.dataset.recordTable;
            const recordId = row.dataset.recordId;
            if (!window.confirm(`Delete this ${tableName} record (#${recordId})? This cannot be undone.`)) return;
            button.disabled = true;
            try {
                const result = await requestJson(`/api/admin/records/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`, {
                    method: 'DELETE'
                });
                const scrollPosition = window.scrollY;
                renderDashboard(await requestJson('/api/dashboard'));
                window.scrollTo(0, scrollPosition);
                showDashboardSuccess(result.message);
            } catch (error) {
                showDashboardError(error.message);
                button.disabled = false;
            }
            return;
        }

        if (action === 'save') {
            const inputs = [...row.querySelectorAll('input[data-edit-field]')];
            if (inputs.some((input) => !input.reportValidity())) return;
            const changes = Object.fromEntries(inputs.map((input) => {
                const value = input.value;
                return [input.dataset.editField, input.type === 'number' ? Number(value) : (value || null)];
            }));
            button.disabled = true;
            try {
                const result = await requestJson(`/api/admin/records/${encodeURIComponent(row.dataset.recordTable)}/${encodeURIComponent(row.dataset.recordId)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ changes })
                });
                const scrollPosition = window.scrollY;
                renderDashboard(await requestJson('/api/dashboard'));
                window.scrollTo(0, scrollPosition);
                showDashboardSuccess(result.message);
            } catch (error) {
                showDashboardError(error.message);
                button.disabled = false;
            }
        }
    });

    requestJson('/api/dashboard')
        .then(renderDashboard)
        .catch((error) => {
            if (error.status === 401) {
                window.location.replace('index.html');
                return;
            }
            showDashboardError(error.message);
            document.getElementById('petList').innerHTML = '<p class="empty-state">Your pet details could not be loaded.</p>';
            document.getElementById('sessionList').innerHTML = '<p class="empty-state">Your sessions could not be loaded.</p>';
            document.getElementById('reportList').innerHTML = '<p class="empty-state">Your reports could not be loaded.</p>';
            document.getElementById('medicationList').innerHTML = '<p class="empty-state">Your medication records could not be loaded.</p>';
            petSelect.innerHTML = '<option value="">Unable to load pets</option>';
            paymentPetSelect.innerHTML = '<option value="">Unable to load pets</option>';
            staffSelect.innerHTML = '<option value="">Unable to load team</option>';
            setBookingAvailability();
        });

    bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        bookingSubmit.disabled = true;
        bookingMessage.textContent = 'Booking your session…';
        bookingMessage.className = 'form-message';
        try {
            const result = await requestJson('/api/sessions', {
                method: 'POST',
                body: JSON.stringify({
                    petId: petSelect.value,
                    sessionName: document.getElementById('bookingName').value,
                    staffId: staffSelect.value
                })
            });
            bookingMessage.textContent = `${result.message} Session #${result.session.Session_No}.`;
            bookingMessage.classList.add('is-success');
            bookingForm.reset();
            const data = await requestJson('/api/dashboard');
            renderDashboard(data);
        } catch (error) {
            bookingMessage.textContent = error.message;
            bookingMessage.classList.add('is-error');
            if (error.status === 401) window.location.replace('index.html');
        } finally {
            bookingSubmit.disabled = petSelect.options.length <= 1 || staffSelect.options.length <= 1;
        }
    });

    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        paymentSubmit.disabled = true;
        paymentMessage.textContent = 'Recording payment…';
        paymentMessage.className = 'form-message';
        try {
            const result = await requestJson('/api/payments', {
                method: 'POST',
                body: JSON.stringify({
                    petId: paymentPetSelect.value,
                    paymentType: document.getElementById('paymentMethod').value,
                    amount: document.getElementById('paymentAmount').value
                })
            });
            paymentMessage.textContent = result.message;
            paymentMessage.classList.add('is-success');
            paymentForm.reset();
            renderDashboard(await requestJson('/api/dashboard'));
        } catch (error) {
            paymentMessage.textContent = error.message;
            paymentMessage.classList.add('is-error');
            if (error.status === 401) window.location.replace('index.html');
        } finally {
            paymentSubmit.disabled = paymentPetSelect.options.length <= 1;
        }
    });

    document.getElementById('signOutButton').addEventListener('click', async () => {
        try {
            await requestJson('/api/logout', { method: 'POST', body: '{}' });
        } catch (error) {
            showDashboardError(error.message);
        }
        window.location.replace('index.html');
    });
}

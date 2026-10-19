const loginForm = document.getElementById("login-form");
const page = document.body.dataset.page;

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text || "";
  return cell;
}

function renderAvailability(rows) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const byDay = new Map(rows.map((row) => [Number(row.Day_Of_Week), row]));
  const fragment = document.createDocumentFragment();

  for (let day = 1; day <= 7; day += 1) {
    const card = document.createElement("article");
    card.className = "availability-day";
    const name = document.createElement("strong");
    name.textContent = days[day - 1] || "Sunday";
    const hours = document.createElement("span");
    const availability = byDay.get(day);
    hours.textContent = availability
      ? `${availability.Opens_At}–${availability.Closes_At}`
      : "Closed";
    card.append(name, hours);
    fragment.append(card);
  }
  document.getElementById("availability-list").replaceChildren(fragment);
}

function renderBookings(bookings) {
  const tbody = document.getElementById("staff-bookings");
  const fragment = document.createDocumentFragment();

  for (const booking of bookings) {
    const row = document.createElement("tr");
    const customer = document.createElement("td");
    const customerName = document.createElement("strong");
    customerName.textContent = booking.customerName;
    const phone = document.createElement("small");
    phone.textContent = booking.phone || "";
    customer.append(customerName, phone);

    const time = new Date(`${booking.dateTime.replace(" ", "T")}:00+03:00`);
    const timeText = Number.isNaN(time.getTime())
      ? booking.dateTime
      : new Intl.DateTimeFormat("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Nairobi",
      }).format(time);

    row.append(customer, makeCell(booking.style), makeCell(timeText), makeCell(booking.status));

    const actionCell = document.createElement("td");
    if (booking.status !== "Cancelled" && booking.status !== "Completed") {
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Update appointment for ${booking.customerName}`);
      const statuses = booking.status === "Pending"
        ? ["Pending", "Confirmed", "Cancelled"]
        : ["Confirmed", "Completed", "Cancelled"];
      for (const status of statuses) select.append(new Option(status, status));
      select.value = booking.status;
      select.dataset.bookingId = booking.id;
      actionCell.append(select);

      const update = document.createElement("button");
      update.className = "action-button";
      update.type = "button";
      update.textContent = "Save";
      update.dataset.bookingId = booking.id;
      actionCell.append(update);
    } else {
      actionCell.textContent = "—";
    }
    row.append(actionCell);
    fragment.append(row);
  }

  tbody.replaceChildren(fragment);
  document.getElementById("staff-empty").hidden = bookings.length > 0;
}

async function loadDashboard() {
  try {
    const [profile, bookingResult] = await Promise.all([
      requestJson("/api/staff/me"),
      requestJson("/api/staff/bookings"),
    ]);
    document.getElementById("staff-name").textContent = profile.staffName;
    document.getElementById("staff-role").textContent = "Barber";
    document.getElementById("staff-pairing").textContent = `Barber: ${profile.barberName}.`;
    renderAvailability(profile.availability);
    renderBookings(bookingResult.bookings);
  } catch (error) {
    if (error.status === 401) {
      window.location.replace("staff-login.html");
      return;
    }
    setMessage(document.getElementById("dashboard-message"), error.message, true);
    console.error("Could not load staff dashboard:", error);
  }
}

if (page === "login") {
  document.getElementById("current-year").textContent = String(new Date().getFullYear());
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("login-message");
    const button = loginForm.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const formData = new FormData(loginForm);
      await requestJson("/api/staff/login", {
        method: "POST",
        body: JSON.stringify({
          username: String(formData.get("username")).trim(),
          password: String(formData.get("password")),
        }),
      });
      window.location.replace("staff-dashboard.html");
    } catch (error) {
      setMessage(message, error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

if (page === "dashboard") {
  document.getElementById("current-year").textContent = String(new Date().getFullYear());
  document.getElementById("sign-out-button").addEventListener("click", async () => {
    try {
      await requestJson("/api/staff/logout", { method: "POST" });
    } catch (error) {
      console.error("Could not sign out:", error);
    }
    window.location.replace("staff-login.html");
  });

  document.getElementById("staff-bookings").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-booking-id]");
    if (!button) return;
    const select = document.querySelector(`select[data-booking-id="${CSS.escape(button.dataset.bookingId)}"]`);
    if (!select || select.value === "Pending") return;

    button.disabled = true;
    try {
      await requestJson(`/api/staff/bookings/${encodeURIComponent(button.dataset.bookingId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      });
      setMessage(document.getElementById("dashboard-message"), "Appointment updated.");
      await loadDashboard();
    } catch (error) {
      setMessage(document.getElementById("dashboard-message"), error.message, true);
      console.error("Could not update appointment:", error);
    } finally {
      button.disabled = false;
    }
  });

  loadDashboard();
}

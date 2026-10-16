const STORAGE_KEY = "kinyozi-bookings";
const BARBERS = [
  { id: "BAR001", name: "Peter Mwangi" },
  { id: "BAR002", name: "Kevin Otieno" },
  { id: "BAR003", name: "Daniel Kariuki" },
];
const bookingForm = document.getElementById("booking-form");
const bookingMessage = document.getElementById("booking-message");
const appointmentList = document.getElementById("appointment-list");
const emptyState = document.getElementById("empty-state");

let bookings = [];
let storageReady = true;

function showMessage(message, isError = false) {
  bookingMessage.textContent = message;
  bookingMessage.classList.toggle("is-error", isError);
}

function loadBookings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) return [];

  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed)) {
    throw new Error("Saved bookings are not in the expected format.");
  }
  return parsed;
}

function saveBookings(nextBookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBookings));
  bookings = nextBookings;
}

function makeCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function makeBarberCell(booking) {
  const cell = document.createElement("td");
  const select = document.createElement("select");
  select.className = "barber-select";
  select.setAttribute("aria-label", `Assign barber to ${booking.name}`);
  select.dataset.bookingId = booking.id;

  const unassigned = document.createElement("option");
  unassigned.value = "";
  unassigned.textContent = "Choose barber";
  select.append(unassigned);

  for (const barber of BARBERS) {
    const option = document.createElement("option");
    option.value = barber.id;
    option.textContent = barber.name;
    select.append(option);
  }

  select.value = BARBERS.some((barber) => barber.id === booking.barberId)
    ? booking.barberId
    : "";
  cell.append(select);
  return cell;
}

function renderBookings() {
  appointmentList.replaceChildren();

  const sorted = [...bookings].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  for (const booking of sorted) {
    const row = document.createElement("tr");

    const customerCell = document.createElement("td");
    const customerName = document.createElement("span");
    customerName.className = "customer-name";
    customerName.textContent = booking.name;
    const customerPhone = document.createElement("span");
    customerPhone.className = "customer-phone";
    customerPhone.textContent = booking.phone;
    customerCell.append(customerName, customerPhone);

    const appointmentTime = new Date(booking.dateTime);
    const formattedTime = Number.isNaN(appointmentTime.getTime())
      ? booking.dateTime
      : appointmentTime.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `status status-${booking.status.toLowerCase()}`;
    status.textContent = booking.status;
    statusCell.append(status);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "action-group";
    const options = booking.status === "Pending"
      ? [["Confirmed", "Confirm"], ["Cancelled", "Cancel"]]
      : booking.status === "Confirmed"
        ? [["Completed", "Complete"], ["Cancelled", "Cancel"]]
        : [];

    for (const [newStatus, label] of options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `action-button${newStatus === "Cancelled" ? " cancel" : ""}`;
      button.textContent = label;
      button.dataset.bookingId = booking.id;
      button.dataset.status = newStatus;
      actions.append(button);
    }
    actionsCell.append(actions);

    row.append(
      customerCell,
      makeCell(booking.style),
      makeCell(formattedTime),
      makeBarberCell(booking),
      statusCell,
      actionsCell,
    );
    appointmentList.append(row);
  }

  const now = Date.now();
  document.getElementById("total-count").textContent = String(bookings.length);
  document.getElementById("upcoming-count").textContent = String(
    bookings.filter((booking) => new Date(booking.dateTime).getTime() >= now
      && booking.status !== "Cancelled"
      && booking.status !== "Completed").length,
  );
  document.getElementById("pending-count").textContent = String(
    bookings.filter((booking) => booking.status === "Pending").length,
  );
  emptyState.hidden = bookings.length > 0;
}

function selectView(view) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  document.querySelectorAll(".nav-button").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (view === "barber") renderBookings();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

try {
  bookings = loadBookings();
  renderBookings();
} catch (error) {
  storageReady = false;
  bookingForm.querySelectorAll("input, select, textarea, button").forEach((field) => {
    field.disabled = true;
  });
  showMessage("Bookings could not be loaded from this browser. Check that local storage is enabled and the saved booking data is valid.", true);
  console.error("Could not load Kinyozi bookings:", error);
}

const dateInput = document.getElementById("appointment-date");
const today = new Date();
dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
document.getElementById("current-year").textContent = String(today.getFullYear());

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => selectView(button.dataset.view));
});
document.getElementById("back-to-booking").addEventListener("click", () => selectView("booking"));

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!storageReady) return;

  const formData = new FormData(bookingForm);
  const dateTime = `${formData.get("date")}T${formData.get("time")}`;
  if (new Date(dateTime).getTime() <= Date.now()) {
    showMessage("Choose a future date and time for your appointment.", true);
    return;
  }

  const booking = {
    id: crypto.randomUUID(),
    name: String(formData.get("name")).trim(),
    phone: String(formData.get("phone")).trim(),
    style: String(formData.get("style")),
    dateTime,
    notes: String(formData.get("notes")).trim(),
    barberId: "",
    status: "Pending",
  };

  try {
    saveBookings([...bookings, booking]);
    bookingForm.reset();
    dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    showMessage("You're booked! Your barber can see this appointment in the dashboard.");
    renderBookings();
  } catch (error) {
    showMessage("Your booking could not be saved. Check browser storage and try again.", true);
    console.error("Could not save Kinyozi booking:", error);
  }
});

appointmentList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-booking-id]");
  if (!button || !storageReady) return;

  const nextBookings = bookings.map((booking) => (
    booking.id === button.dataset.bookingId
      ? { ...booking, status: button.dataset.status }
      : booking
  ));

  try {
    saveBookings(nextBookings);
    renderBookings();
  } catch (error) {
    console.error("Could not update Kinyozi booking:", error);
    window.alert("The booking status could not be saved. Check browser storage and try again.");
  }
});

appointmentList.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-booking-id]");
  if (!select || !storageReady) return;

  const barberId = select.value;
  if (barberId && !BARBERS.some((barber) => barber.id === barberId)) {
    showMessage("Choose a barber from the available list.", true);
    renderBookings();
    return;
  }

  const nextBookings = bookings.map((booking) => (
    booking.id === select.dataset.bookingId
      ? { ...booking, barberId }
      : booking
  ));

  try {
    saveBookings(nextBookings);
    showMessage("Barber assignment saved.");
  } catch (error) {
    console.error("Could not save Kinyozi barber assignment:", error);
    showMessage("The barber assignment could not be saved. Check browser storage and try again.", true);
    renderBookings();
  }
});

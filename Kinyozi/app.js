const bookingForm = document.getElementById("booking-form");
const bookingMessage = document.getElementById("booking-message");
const stylesList = document.getElementById("styles-list");
const styleSelect = bookingForm.querySelector('select[name="style"]');
const dateInput = document.getElementById("appointment-date");

function showBookingMessage(message, isError = false) {
  bookingMessage.textContent = message;
  bookingMessage.classList.toggle("is-error", isError);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "The request could not be completed.");
  return result;
}

function renderStyles(styles) {
  const cards = document.createDocumentFragment();
  const options = [new Option("Select a style", "", true, true)];
  options[0].disabled = true;

  for (const style of styles) {
    const card = document.createElement("article");
    card.className = "style-card";

    const name = document.createElement("h3");
    name.textContent = style.name;

    const description = document.createElement("p");
    description.textContent = style.description || "";

    const price = document.createElement("span");
    price.className = "style-price";
    price.textContent = `KSh ${Number(style.price).toLocaleString("en-KE")}`;

    card.append(name, description, price);
    cards.append(card);
    options.push(new Option(`${style.name} - KSh ${Number(style.price).toLocaleString("en-KE")}`, style.id));
  }

  stylesList.replaceChildren(cards);
  styleSelect.replaceChildren(...options);
}

async function loadStyles() {
  try {
    const { styles } = await requestJson("/api/styles");
    renderStyles(styles);
  } catch (error) {
    showBookingMessage("Styles could not be loaded. Please refresh the page or contact the shop.", true);
    bookingForm.querySelectorAll("input, select, textarea, button").forEach((field) => {
      field.disabled = true;
    });
    console.error("Could not load Kinyozi styles:", error);
  }
}

async function loadAvailability() {
  if (!styleSelect.value || !dateInput.value) {
    return;
  }

  showBookingMessage("Checking this date…");
  try {
    const params = new URLSearchParams({
      styleId: styleSelect.value,
      date: dateInput.value,
    });
    const { available } = await requestJson(`/api/availability?${params}`);

    if (!available) {
      showBookingMessage("No appointments are available on this date. Choose another date.", true);
      return;
    }

    showBookingMessage("Appointments are available. Your time and barber will be assigned when you book.");
  } catch (error) {
    showBookingMessage(error.message, true);
    console.error("Could not load Kinyozi availability:", error);
  }
}

function setDateMinimum() {
  const today = new Date();
  dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  document.getElementById("current-year").textContent = String(today.getFullYear());
}

setDateMinimum();
styleSelect.addEventListener("change", loadAvailability);
dateInput.addEventListener("change", loadAvailability);

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!bookingForm.reportValidity()) return;
  if (!styleSelect.value || !dateInput.value) {
    showBookingMessage("Choose a style and date for your booking.", true);
    return;
  }

  const submitButton = bookingForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  showBookingMessage("Booking your appointment…");

  try {
    const formData = new FormData(bookingForm);
    const result = await requestJson("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        name: String(formData.get("name")).trim(),
        phone: String(formData.get("phone")).trim(),
        styleId: String(formData.get("style")),
        date: String(formData.get("date")),
        notes: String(formData.get("notes")).trim(),
      }),
    });
    bookingForm.reset();
    setDateMinimum();
    showBookingMessage(
      `You're booked for ${result.time} on ${result.date} with ${result.barberName}.`,
    );
  } catch (error) {
    showBookingMessage(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

loadStyles();

  // Minimal logout: clear auth info and redirect to auth page
      function logout() {
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('username');
        window.location.href = 'auth.html';
      }     
      // JavaScript to handle form submission and book management will go here
      function addBook() {
        const title = document.getElementById("book-title").value;
        const author = document.getElementById("book-author").value;
        const readStatus = document.getElementById("book-status").value;
        const genre = document.getElementById("book-genre").value;

        const token = localStorage.getItem("jwtToken"); // 👈 retrieve token

        // Build payload and add timestamps for started/completed when appropriate
        const payload = { title, author, readStatus, genre };
        if (readStatus === "currently-reading") {
          payload.startedAt = new Date().toISOString();
        }
        if (readStatus === "completed") {
          payload.completedAt = new Date().toISOString();
        }

        fetch("/api/books", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`, // 👈 send token
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              showToast(`❌ Error: ${data.error}`);
              return;
            }
            showToast(`Book "${title}" added to library`);
            document.getElementById("add-book-form").reset();
            loadCurrentlyReading(); // Refresh currently reading display
          })
          .catch((error) => {
            showToast(`Something went wrong. Please try again.`);
            console.error("Add book error:", error);
          });
      }


      function showToast(message) {
        document.getElementById("toastMessage").textContent = message;
        const toast = new bootstrap.Toast(document.getElementById("bookToast"));
        toast.show();
      }

      // Load currently reading book
      function loadCurrentlyReading() {
        const token = localStorage.getItem("jwtToken"); // 👈 get token saved at login

        fetch("/api/books", {headers: {"Authorization": `Bearer ${token}`, "Content-Type": "application/json"}})
          .then((res) => res.json())
          .then((books) => {
            const currentlyReading = books.filter(
              (book) => book.readStatus === "currently-reading"
            );
            const currentReadElement = document.getElementById("current-read");

            if (currentlyReading.length > 0) {
              currentReadElement.innerHTML = currentlyReading
                .map(
                  (book) => `
                            <div class="card mb-2">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <h6 class="card-title mb-1">"${
                                              book.title
                                            }"</h6>
                                            <p class="card-text mb-1">by ${
                                              book.author
                                            }</p>
                                            <small class="text-muted">Genre: ${
                                              book.genre || "Not specified"
                                            }</small>
                                        </div>
                                        <div>
                                            <button class="btn btn-sm btn-warning edit-btn me-2" 
                                                    data-id="${book._id}" 
                                                    data-title="${book.title}" 
                                                    data-author="${
                                                      book.author
                                                    }" 
                                                    data-genre="${book.genre}" 
                                                    data-status="${
                                                      book.readStatus
                                                    }"
                                                    data-started="${book.startedAt || ''}"
                                                    data-completed="${book.completedAt || ''}">
                                                Edit
                                            </button>
                                            <button class="btn btn-sm btn-danger delete-btn" 
                                                    data-id="${book._id}" 
                                                    data-title="${book.title}">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `
          )
          .join("");
      } else {
        currentReadElement.textContent = "No book currently being read.";
      }
    })
    .catch((error) => {
      console.error("Error loading currently read book:", error);
      document.getElementById("current-read").textContent =
        "Error loading currently read book.";
    });
}

// Edit book function - opens modal with book data
function editBook(id, title, author, genre, readStatus, started, completed) {
  console.log("editBook called with:", {
    id,
    title,
    author,
    genre,
    readStatus
  });

  // Fill the form fields
  document.getElementById("edit-book-id").value = id;
  document.getElementById("edit-book-title").value = title;
  document.getElementById("edit-book-author").value = author;
  document.getElementById("edit-book-genre").value = genre;
  document.getElementById("edit-book-status").value = readStatus;
  // also set hidden timestamp fields (if function called with them)
  const startedInput = document.getElementById("edit-book-started");
  const completedInput = document.getElementById("edit-book-completed");
  if (startedInput) startedInput.value = started || "";
  if (completedInput) completedInput.value = completed || "";

  // Show the modal
  const modalElement = document.getElementById("editBookModal");
  console.log("Modal element found:", modalElement);

  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    console.log("Modal should be showing now");
  } else {
    console.error("Modal element not found!");
  }
}

// Update book function - sends PUT request to API
function updateBook() {
  const id = document.getElementById("edit-book-id").value;
  const title = document.getElementById("edit-book-title").value;
  const author = document.getElementById("edit-book-author").value;
  const genre = document.getElementById("edit-book-genre").value;
  const readStatus = document.getElementById("edit-book-status").value;
  // Build payload and include timestamps if appropriate
  const payload = { title, author, genre, readStatus };
  const existingStarted = document.getElementById("edit-book-started")?.value;
  const existingCompleted = document.getElementById("edit-book-completed")?.value;

  // If user marks completed now and there is no completed timestamp, set it
  if (readStatus === "completed" && !existingCompleted) {
    payload.completedAt = new Date().toISOString();
  }
  // If user marks currently-reading and there's no started timestamp, set it
  if (readStatus === "currently-reading" && !existingStarted) {
    payload.startedAt = new Date().toISOString();
  }

  const token = localStorage.getItem("jwtToken");
  fetch(`/api/books/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
    .then((res) => res.json())
    .then((data) => {
      showToast(`Book "${title}" updated successfully`);

      // Close the modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editBookModal")
      );
      modal.hide();

      // Refresh the displays
      loadCurrentlyReading();

      // Refresh the current tab if it's completed or to-read
      const activeTab = document.querySelector(".tab-content:not(.d-none)");
      if (activeTab && activeTab.id === "completed-tab") {
        loadCompletedBooks();
      } else if (activeTab && activeTab.id === "toread-tab") {
        loadToReadBooks();
      }
    })
    .catch((error) => {
      console.error("Update book error:", error);
      showToast("Error updating book. Please try again.");
    });
}

// Handle form submission
document
  .getElementById("add-book-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    addBook();
  });

// Tab switching function
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.add("d-none");
  });

  // Remove active class from all nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  // Show selected tab
  document.getElementById(tabName + "-tab").classList.remove("d-none");

  // Add active class to clicked nav link
  event.target.closest(".nav-link").classList.add("active");

  // Load data for specific tabs
  if (tabName === "completed") {
    loadCompletedBooks();
  } else if (tabName === "toread") {
    loadToReadBooks();
  } else if (tabName === "friends") {
    loadFriendsList();   
  } else if (tabName === "stats") {
    loadStats();
  }
}

// Load completed books
function loadCompletedBooks() {
  const token = localStorage.getItem("jwtToken"); // 👈 get token saved at login
  fetch("/api/books", {
    headers: {
      "Authorization": `Bearer ${token}`, // 👈 send token
      "Content-Type": "application/json"
    }
  })
    .then((res) => res.json())
    .then((books) => {
      const completedBooks = books.filter(
        (book) => book.readStatus === "completed"
      );
      const container = document.getElementById("completed-books-list");

      if (completedBooks.length === 0) {
        container.innerHTML =
          '<p class="text-muted">No completed books yet.</p>';
      } else {
        container.innerHTML = completedBooks
          .map((book) => `
            <div class="card mb-2">
              <div class="card-body">
                <h6 class="card-title">${book.title}</h6>
                <p class="card-text">by ${book.author}</p>
                <small class="text-muted">Genre: ${book.genre || "Not specified"}</small>
                <div class="mt-2">
                  <button class="btn btn-sm btn-warning edit-btn me-2"
                          data-id="${book._id}"
                          data-title="${book.title}"
                          data-author="${book.author}"
                          data-genre="${book.genre}"
                          data-status="${book.readStatus}"
                          data-started="${book.startedAt || ''}"
                          data-completed="${book.completedAt || ''}">
                    Edit
                  </button>
                  <button class="btn btn-sm btn-danger delete-btn"
                          data-id="${book._id}"
                          data-title="${book.title}">
                    Delete
                  </button>
                </div>
              </div>
            </div>`)
          .join("");
      }
    })
    .catch((error) => {
      showToast("Error loading completed books.");
    });
}

// Load to-read books
function loadToReadBooks() {
  const token = localStorage.getItem("jwtToken"); // 👈 get token saved at login
  fetch("/api/books", {
    headers: {
      "Authorization": `Bearer ${token}`, // 👈 send token
      "Content-Type": "application/json"
    }
  })
    .then((res) => res.json())
    .then((books) => {
      console.log("Books from API:", books.map(b => b.readStatus));
      console.log("Statuses:", books.map(b => b.readStatus));
      const toReadBooks = books.filter((book) => book.readStatus === "to-read");
      const container = document.getElementById("toread-books-list");

      if (toReadBooks.length === 0) {
        container.innerHTML =
          '<p class="text-muted">No books in your reading list yet.</p>';
      } else {
        container.innerHTML = toReadBooks
          .map(
            (book) =>
              `<div class="card mb-2">
                                <div class="card-body">
                                    <h6 class="card-title">${book.title}</h6>
                                    <p class="card-text">by ${book.author}</p>
                                    <small class="text-muted">Genre: ${
                                      book.genre || "Not specified"
                                    }</small>
                                    <div class="mt-2">
                                        <button class="btn btn-sm btn-warning edit-btn me-2" 
                                                data-id="${book._id}" 
                                                data-title="${book.title}" 
                                                data-author="${book.author}" 
                                                data-genre="${book.genre}" 
                                                data-status="${
                                                  book.readStatus
                                                }"
                                                data-started="${book.startedAt || ''}"
                                                data-completed="${book.completedAt || ''}">
                                            Edit
                                        </button>
                                        <button class="btn btn-sm btn-danger delete-btn" 
                                                data-id="${book._id}" 
                                                data-title="${book.title}">
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>`
          )
          .join("");
      }
    })
    .catch((error) => {
      showToast("Error loading to-read books.");
    });
}

// Load currently reading book when page loads
window.addEventListener("load", function () {
  loadCurrentlyReading();
});

// Handle edit button clicks with event delegation (like your example)
document.addEventListener("click", function (e) {
  console.log("Click detected on element:", e.target);
  console.log("Element classes:", e.target.className);

  if (e.target.classList.contains("edit-btn")) {
    console.log("Edit button clicked!");

    // Get book data from the button
    const bookId = e.target.getAttribute("data-id");
    const bookTitle = e.target.getAttribute("data-title");
    const bookAuthor = e.target.getAttribute("data-author");
    const bookGenre = e.target.getAttribute("data-genre");
    const bookStatus = e.target.getAttribute("data-status");

    console.log("Book data:", {
      bookId,
      bookTitle,
      bookAuthor,
      bookGenre,
      bookStatus
    });

    // Fill the modal form
    document.getElementById("edit-book-id").value = bookId;
    document.getElementById("edit-book-title").value = bookTitle;
    document.getElementById("edit-book-author").value = bookAuthor;
    document.getElementById("edit-book-genre").value = bookGenre;
    document.getElementById("edit-book-status").value = bookStatus;
    // Fill hidden timestamp fields if present
    const bookStarted = e.target.getAttribute("data-started");
    const bookCompleted = e.target.getAttribute("data-completed");
    const startedInput = document.getElementById("edit-book-started");
    const completedInput = document.getElementById("edit-book-completed");
    if (startedInput) startedInput.value = bookStarted || "";
    if (completedInput) completedInput.value = bookCompleted || "";

    console.log("Form filled, attempting to show modal...");

    // Check if bootstrap is available
    if (typeof bootstrap !== "undefined") {
      console.log("Bootstrap is available");
      const modalElement = document.getElementById("editBookModal");
      console.log("Modal element:", modalElement);

      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      console.log("Modal show() called");
    } else {
      console.error("Bootstrap is not available!");
      alert("Bootstrap not loaded - modal cannot be shown");
    }
  }

  // Handle delete button clicks
  if (e.target.classList.contains("delete-btn")) {
    console.log("Delete button clicked!");

    // Store delete info globally for confirmation
    window.deleteBookId = e.target.getAttribute("data-id");
    window.deleteBookTitle = e.target.getAttribute("data-title");

    // Show book title in confirmation modal
    document.getElementById("delete-book-title").textContent =
      window.deleteBookTitle;

    // Show the confirmation modal
    const modal = new bootstrap.Modal(
      document.getElementById("deleteConfirmationModal")
    );
    modal.show();
  }
});

function confirmDelete() {
  const id = window.deleteBookId;
  const title = window.deleteBookTitle;
  const token = localStorage.getItem("jwtToken");

  fetch(`/api/books/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({})); // 👈 avoid JSON parse errors
      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }
      return data;
    })
    .then((data) => {
      showToast(`Book "${title}" deleted successfully`);

      // Close the modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("deleteConfirmationModal")
      );
      modal.hide();

      // Refresh all lists
      loadCurrentlyReading();
      loadToReadBooks();
      loadCompletedBooks();
    })
    .catch((error) => {
      console.error("Delete error:", error);
      showToast("Error deleting book. Please try again.");
    });
}

// Friends functionality
async function sendFriendRequest() {
  const username = document
    .getElementById("friend-username-input")
    .value.trim();
  if (!username) return showToast("Enter a username");
  const token = localStorage.getItem("jwtToken");
  const res = await fetch(`/api/friends/request/${username}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  showToast(data.message || data.error);
  if (res.ok) {
    document.getElementById("friend-username-input").value = "";
    loadFriendsList();
  }
}

async function respondFriendRequest(fromUserId, action) {
  const token = localStorage.getItem("jwtToken");
  const res = await fetch("/api/friends/respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ fromUserId, action })
  });
  const data = await res.json();
  showToast(data.message || data.error);
  loadFriendsList();
}

async function loadFriendsList() {
  const token = localStorage.getItem("jwtToken");
  const resFriends = await fetch("/api/friends/list", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataFriends = await resFriends.json();
  const resRequests = await fetch("/api/friends/requests", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const dataRequests = await resRequests.json();
  const container = document.getElementById("friends-list");

  let html = '<h5 style="margin-bottom: 10px;">Send Friend Request</h5>';
  html +=
    '<div style="display: flex; gap: 10px; margin-bottom: 20px;">';
  html +=
    '<input id="friend-username-input" class="form-control" placeholder="Enter username" style="max-width: 250px;" />';
  html +=
    '<button class="btn btn-dark" onclick="sendFriendRequest()">Send</button>';
  html += "</div>";

  if (dataRequests.requests && dataRequests.requests.length > 0) {
    html +=
      '<h5 style="margin-top: 20px; margin-bottom: 10px;">Incoming Requests</h5>';
    html += dataRequests.requests
      .map(
        (u) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px; background: #f9f9f9; border-radius: 3px;">
              <span>${u.username}</span>
              <div style="display: flex; gap: 5px;">
                <button class="btn btn-sm btn-success" onclick="respondFriendRequest('${u._id}', 'accept')">Accept</button>
                <button class="btn btn-sm btn-danger" onclick="respondFriendRequest('${u._id}', 'reject')">Reject</button>
              </div>
            </div>
          `
      )
      .join("");
  }

  if (!dataFriends.friends || dataFriends.friends.length === 0) {
    html +=
      '<h5 style="margin-top: 20px; margin-bottom: 10px;">My Friends</h5>';
    html += '<p style="color: #999;">No friends yet</p>';
  } else {
    html +=
      '<h5 style="margin-top: 20px; margin-bottom: 10px;">My Friends (' +
      dataFriends.friends.length +
      ")</h5>";
    html += dataFriends.friends
      .map(
        (f) => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 8px; background: #f9f9f9; border-radius: 3px;">
              <span>${f.username}</span>
              <div style="display: flex; gap: 5px;">
                <button class="btn btn-sm btn-primary" onclick="viewFriendProfile('${f.username}')">View</button>
                <button class="btn btn-sm btn-outline-danger" onclick="unfriend('${f._id}')">Remove</button>
              </div>
            </div>
          `
      )
      .join("");
  }

  container.innerHTML = html;
}

async function unfriend(friendId) {
  const token = localStorage.getItem("jwtToken");
  const res = await fetch(`/api/friends/delete/${friendId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  showToast(data.message || data.error);
  loadFriendsList();
}

async function viewFriendProfile(username) {
  const token = localStorage.getItem("jwtToken");
  const res = await fetch(
    `/api/friends/${encodeURIComponent(username)}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  const data = await res.json();
  const books = data.books || {};
  const friendsList = document.getElementById("friends-list");

  friendsList.innerHTML = `
          <div style="margin-bottom: 15px;">
            <button class="btn btn-secondary btn-sm" onclick="loadFriendsList()">← Back to Friends</button>
          </div>
          <h5 style="margin-bottom: 15px; color: #4f5743;">${data.user.username}'s Books</h5>
          <div style="margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 4px;">
            <h6 style="margin-bottom: 10px; color: #6B7460;">Currently Reading</h6>
            ${renderBookList(books['currently-reading'])}
          </div>
          <div style="margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 4px;">
            <h6 style="margin-bottom: 10px; color: #6B7460;">To Be Read</h6>
            ${renderBookList(books['to-read'])}
          </div>
          <div style="padding: 12px; background: #f9f9f9; border-radius: 4px;">
            <h6 style="margin-bottom: 10px; color: #6B7460;">Completed</h6>
            ${renderBookList(books['completed'])}
          </div>
        `;
}

function backToFriendsPanel() {
  loadFriendsList();
}

function renderBookList(list) {
  if (!list || list.length === 0)
    return '<p style="margin-left: 15px; color: #999;">None</p>';
  return (
    '<ul style="margin-left: 20px;">' +
    list
      .map((b) => `<li>${b.title} by ${b.author}</li>`)
      .join("") +
    "</ul>"
  );
}

// ----------------- Stats / Charts -----------------
async function loadStats() {
  const token = localStorage.getItem("jwtToken");
  try {
    const res = await fetch("/api/books", {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    const books = await res.json();
    renderStats(books || []);
  } catch (err) {
    console.error("Error loading stats:", err);
    document.getElementById("stats-tab").innerHTML = '<div class="alert alert-danger">Error loading stats.</div>';
  }
}

function renderStats(books) {
  // Top genres
  const genreCounts = {};
  // Exclude 'to-read' books from top-genres (per requirements)
  books.forEach((b) => {
    if (b.readStatus === 'to-read') return;
    const g = (b.genre || "Unknown").trim() || "Unknown";
    genreCounts[g] = (genreCounts[g] || 0) + 1;
  });
  const genres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
  const genreData = genres.map((g) => genreCounts[g]);

  // Books per month (past 12 months) - use completedAt or createdAt
  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleString(undefined, { month: "short", year: "numeric" }), year: d.getFullYear(), month: d.getMonth() });
  }
  const monthCounts = new Array(12).fill(0);
  // Only count books that have a completion timestamp (completed books)
  books.forEach((b) => {
    const dateStr = b.completedAt;
    if (!dateStr) return;
    const dt = new Date(dateStr);
    if (isNaN(dt)) return;
    const idx = months.findIndex((m) => m.year === dt.getFullYear() && m.month === dt.getMonth());
    if (idx >= 0) monthCounts[idx]++;
  });

  // Reading time per book for books completed in the past 30 days
  const recentCompleted = [];
  const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
  books.forEach((b) => {
    const end = b.completedAt || b.completedDate || b.endDate;
    if (!end) return;
    const e = new Date(end);
    if (isNaN(e)) return;
    // Only include books completed within the last 30 days
    if (now - e > THIRTY_DAYS_MS) return;

    // Determine start date (prefer startedAt, fallback to createdAt)
    const start = b.startedAt || b.startDate || b.createdAt || b.createdAt;
    if (!start) return;
    const s = new Date(start);
    if (isNaN(s)) return;

    const days = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
    recentCompleted.push({ title: b.title || 'Untitled', author: b.author || '', days, completedAt: e });
  });

  // Sort recent completed by completion date (newest first)
  recentCompleted.sort((a, b) => b.completedAt - a.completedAt);
  const readingLabels = recentCompleted.map((r) => (r.author ? `${r.title} — ${r.author}` : r.title));
  const readingDurations = recentCompleted.map((r) => r.days);

  // Render charts (defensive if Chart not present)
  if (typeof Chart === "undefined") {
    const msg = 'Chart.js not loaded. Include Chart.js to view stats.';
    console.warn(msg);
    document.getElementById("stats-tab").insertAdjacentHTML('beforeend', `<div class="alert alert-warning mt-3">${msg}</div>`);
    return;
  }

  // Top genres pie/doughnut
  const genresCtx = document.getElementById("top-genres-chart").getContext("2d");
  try {
    new Chart(genresCtx, {
      type: "doughnut",
      data: {
        labels: genres,
        datasets: [{ data: genreData, backgroundColor: genres.map((_, i) => `hsl(${(i * 55) % 360} 60% 55%)`) }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  } catch (err) {
    console.error("Error rendering top genres chart", err);
  }

  // Books per month bar
  const monthsCtx = document.getElementById("books-month-chart").getContext("2d");
  try {
    const maxCount = monthCounts.length ? Math.max(...monthCounts) : 0;
    new Chart(monthsCtx, {
      type: "bar",
      data: { labels: months.map((m) => m.label), datasets: [{ label: "Books", data: monthCounts, backgroundColor: 'rgba(75, 108, 89, 0.7)' }] },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            },
            suggestedMax: Math.max(1, maxCount + 1)
          }
        }
      }
    });
  } catch (err) {
    console.error("Error rendering months chart", err);
  }

  // Reading time chart (if we have any)
  const rtCtxEl = document.getElementById("reading-time-chart");
  if (readingLabels.length > 0 && rtCtxEl) {
    const rtCtx = rtCtxEl.getContext("2d");
    try {
      const maxDur = readingDurations.length ? Math.max(...readingDurations) : 0;
      new Chart(rtCtx, {
        type: "bar",
        data: { labels: readingLabels, datasets: [{ label: "Days to complete", data: readingDurations, backgroundColor: 'rgba(99, 102, 241, 0.7)' }] },
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }, suggestedMax: Math.max(1, maxDur + 1) } } }
      });
    } catch (err) {
      console.error("Error rendering reading time chart", err);
    }
  } else if (rtCtxEl) {
    // No data for reading time in past 30 days
    document.getElementById("reading-time-note").textContent = "No books completed in the past 30 days.";
  }

  // Bookshelf chart: stacked bars per genre showing counts by status
  try {
    const shelfCtxEl = document.getElementById('bookshelf-chart');
    if (shelfCtxEl && typeof Chart !== 'undefined') {
      // Build genre list (include all books, even to-read)
      const shelfCounts = {}; // { genre: { completed: n, 'currently-reading': m, 'to-read': k } }
      books.forEach((b) => {
        const g = (b.genre || 'Unknown').trim() || 'Unknown';
        if (!shelfCounts[g]) shelfCounts[g] = { completed: 0, 'currently-reading': 0, 'to-read': 0 };
        const s = b.readStatus || 'to-read';
        if (!shelfCounts[g][s]) shelfCounts[g][s] = 0;
        shelfCounts[g][s]++;
      });

      // Sort genres by total count and limit to top N for readability
      const GENRE_LIMIT = 10;
      const genreEntries = Object.keys(shelfCounts)
        .map((g) => ({ genre: g, total: Object.values(shelfCounts[g]).reduce((a, b) => a + b, 0) }))
        .sort((a, b) => b.total - a.total);
      const chosenGenres = genreEntries.slice(0, GENRE_LIMIT).map((e) => e.genre);

      const statuses = ['completed', 'currently-reading', 'to-read'];
      const statusColors = {
        completed: 'rgba(75, 192, 192, 0.8)',
        'currently-reading': 'rgba(255, 205, 86, 0.85)',
        'to-read': 'rgba(201, 203, 207, 0.9)'
      };

      const datasets = statuses.map((st) => ({
        label: st.replace(/-/g, ' '),
        data: chosenGenres.map((g) => shelfCounts[g] ? (shelfCounts[g][st] || 0) : 0),
        backgroundColor: statusColors[st]
      }));

      // Use grouped bars (separate bars per status) rather than stacked
      new Chart(shelfCtxEl.getContext('2d'), {
        type: 'bar',
        data: { labels: chosenGenres, datasets },
        options: {
          responsive: true,
          scales: {
            x: { stacked: false },
            y: { stacked: false, beginAtZero: true, ticks: { stepSize: 1 } }
          },
          plugins: { legend: { position: 'bottom' } },
          // Slightly tighten grouping for readability
          datasets: { barPercentage: 0.7, categoryPercentage: 0.7 }
        }
      });
    }
  } catch (err) {
    console.error('Error rendering bookshelf chart', err);
  }
}

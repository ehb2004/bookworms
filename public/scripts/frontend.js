      // JavaScript to handle form submission and book management will go here
      function addBook() {
        const title = document.getElementById("book-title").value;
        const author = document.getElementById("book-author").value;
        const readStatus = document.getElementById("book-status").value;
        const genre = document.getElementById("book-genre").value;

        fetch("/api/books", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author, readStatus, genre }),
        })
          .then((res) => res.json())
          .then((data) => {
            showToast(`Book "${title}" added to library`);
            document.getElementById("add-book-form").reset();
            loadCurrentlyReading(); // Refresh currently reading display
          })
          .catch((error) => {
            showToast(`Something went wrong. Please try again.`);
          });
      }

      function showToast(message) {
        document.getElementById("toastMessage").textContent = message;
        const toast = new bootstrap.Toast(document.getElementById("bookToast"));
        toast.show();
      }

      // Load currently reading book
      function loadCurrentlyReading() {
        fetch("/api/books")
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
                                                    }">
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
            console.error("Error loading currently reading book:", error);
            document.getElementById("current-read").textContent =
              "Error loading currently reading book.";
          });
      }

      // Edit book function - opens modal with book data
      function editBook(id, title, author, genre, readStatus) {
        console.log("editBook called with:", {
          id,
          title,
          author,
          genre,
          readStatus,
        });

        // Fill the form fields
        document.getElementById("edit-book-id").value = id;
        document.getElementById("edit-book-title").value = title;
        document.getElementById("edit-book-author").value = author;
        document.getElementById("edit-book-genre").value = genre;
        document.getElementById("edit-book-status").value = readStatus;

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

        fetch(`/api/books/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author, genre, readStatus }),
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
            const activeTab = document.querySelector(
              ".tab-content:not(.d-none)"
            );
            if (activeTab.id === "completed-tab") {
              loadCompletedBooks();
            } else if (activeTab.id === "toread-tab") {
              loadToReadBooks();
            }
          })
          .catch((error) => {
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
        }
      }

      // Load completed books
      function loadCompletedBooks() {
        fetch("/api/books")
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
                                                }">
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
            showToast("Error loading completed books.");
          });
      }

      // Load to-read books
      function loadToReadBooks() {
        fetch("/api/books")
          .then((res) => res.json())
          .then((books) => {
            const toReadBooks = books.filter(
              (book) => book.readStatus === "to-read"
            );
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
                                                }">
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
            bookStatus,
          });

          // Fill the modal form
          document.getElementById("edit-book-id").value = bookId;
          document.getElementById("edit-book-title").value = bookTitle;
          document.getElementById("edit-book-author").value = bookAuthor;
          document.getElementById("edit-book-genre").value = bookGenre;
          document.getElementById("edit-book-status").value = bookStatus;

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

      // Confirm delete function
      function confirmDelete() {
        const id = window.deleteBookId;
        const title = window.deleteBookTitle;

        fetch(`/api/books/${id}`, {
          method: "DELETE",
        })
          .then((res) => res.json())
          .then((data) => {
            showToast(`Book "${title}" deleted successfully`);

            // Close the modal
            const modal = bootstrap.Modal.getInstance(
              document.getElementById("deleteConfirmationModal")
            );
            modal.hide();

            // Refresh displays
            loadCurrentlyReading();

            // Refresh the current tab if it's completed or to-read
            const activeTab = document.querySelector(
              ".tab-content:not(.d-none)"
            );
            if (activeTab.id === "completed-tab") {
              loadCompletedBooks();
            } else if (activeTab.id === "toread-tab") {
              loadToReadBooks();
            }
          })
          .catch((error) => {
            showToast("Error deleting book. Please try again.");
          });
      }
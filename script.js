// Global state
let booksData = [];
let userBookData = {};
let currentBook = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    await loadBooks();
    loadUserData();
    populateThemeFilter();
    renderBooks();
    updateStats();
    setupEventListeners();
});

// Load books from JSON file
async function loadBooks() {
    try {
        const response = await fetch('books.json');
        booksData = await response.json();
    } catch (error) {
        console.error('Error loading books:', error);
        document.getElementById('bookGrid').innerHTML = `
            <div class="empty-state">
                <h2>Error loading books</h2>
                <p>Please make sure books.json is in the same directory.</p>
            </div>
        `;
    }
}

// Load user data from localStorage
function loadUserData() {
    const stored = localStorage.getItem('fantasyBookTracker');
    if (stored) {
        userBookData = JSON.parse(stored);
    }
}

// Save user data to localStorage
function saveUserData() {
    localStorage.setItem('fantasyBookTracker', JSON.stringify(userBookData));
}

// Get user data for a specific book
function getUserBookData(bookId) {
    return userBookData[bookId] || { rating: 0, isRead: false };
}

// Set user data for a specific book
function setUserBookData(bookId, data) {
    userBookData[bookId] = { ...getUserBookData(bookId), ...data };
    saveUserData();
    updateStats();
}

// Populate theme filter dropdown
function populateThemeFilter() {
    const themes = new Set();
    booksData.forEach(book => {
        book.themes.forEach(theme => themes.add(theme));
    });

    const themeFilter = document.getElementById('themeFilter');
    const sortedThemes = Array.from(themes).sort();

    sortedThemes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme;
        option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
        themeFilter.appendChild(option);
    });
}

// Filter and sort books based on current selections
function getFilteredBooks() {
    let filtered = [...booksData];

    // Search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(book =>
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm)
        );
    }

    // Status filter
    const statusFilter = document.getElementById('statusFilter').value;
    if (statusFilter !== 'all') {
        filtered = filtered.filter(book => {
            const userData = getUserBookData(book.id);
            if (statusFilter === 'read') return userData.isRead;
            if (statusFilter === 'unread') return !userData.isRead;
            if (statusFilter === 'rated') return userData.rating > 0;
            return true;
        });
    }

    // Theme filter
    const themeFilter = document.getElementById('themeFilter').value;
    if (themeFilter !== 'all') {
        filtered = filtered.filter(book => book.themes.includes(themeFilter));
    }

    // Sorting
    const sortBy = document.getElementById('sortBy').value;
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'author':
                return a.author.localeCompare(b.author);
            case 'year-asc':
                return a.year - b.year;
            case 'year-desc':
                return b.year - a.year;
            case 'rating':
                const ratingA = getUserBookData(a.id).rating || 0;
                const ratingB = getUserBookData(b.id).rating || 0;
                return ratingB - ratingA;
            default:
                return 0;
        }
    });

    return filtered;
}

// Render books to the grid
function renderBooks() {
    const bookGrid = document.getElementById('bookGrid');
    const filtered = getFilteredBooks();

    if (filtered.length === 0) {
        bookGrid.innerHTML = `
            <div class="empty-state">
                <h2>No books found</h2>
                <p>Try adjusting your filters or search terms.</p>
            </div>
        `;
        return;
    }

    bookGrid.innerHTML = filtered.map(book => createBookCard(book)).join('');

    // Add click listeners to book cards
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', () => {
            const bookId = parseInt(card.dataset.bookId);
            openBookModal(bookId);
        });
    });
}

// Create HTML for a book card
function createBookCard(book) {
    const userData = getUserBookData(book.id);
    const readClass = userData.isRead ? 'read' : '';

    return `
        <div class="book-card ${readClass}" data-book-id="${book.id}">
            <div class="book-title">${book.title}</div>
            <div class="book-author">by ${book.author}</div>
            <div class="book-year">Published: ${book.year}</div>
            <div class="theme-tags">
                ${book.themes.slice(0, 3).map(theme =>
                    `<span class="theme-tag">${theme}</span>`
                ).join('')}
                ${book.themes.length > 3 ? `<span class="theme-tag">+${book.themes.length - 3}</span>` : ''}
            </div>
            ${userData.rating > 0 ? `
                <div class="book-rating">
                    ${createStarDisplay(userData.rating)}
                </div>
            ` : ''}
            ${userData.isRead ? '<span class="read-status">Read</span>' : ''}
        </div>
    `;
}

// Create star display for ratings
function createStarDisplay(rating) {
    return Array.from({ length: 5 }, (_, i) => {
        const filled = i < rating ? 'filled' : '';
        return `<span class="star ${filled}">&#9733;</span>`;
    }).join('');
}

// Open book modal
function openBookModal(bookId) {
    const book = booksData.find(b => b.id === bookId);
    if (!book) return;

    currentBook = book;
    const userData = getUserBookData(bookId);

    // Populate modal content
    document.getElementById('modalTitle').textContent = book.title;
    document.getElementById('modalAuthor').textContent = `by ${book.author}`;
    document.getElementById('modalYear').textContent = `Published: ${book.year}`;

    const themesContainer = document.getElementById('modalThemes');
    themesContainer.innerHTML = book.themes.map(theme =>
        `<span class="theme-tag">${theme}</span>`
    ).join('');

    // Set up rating stars
    const modalRating = document.getElementById('modalRating');
    modalRating.innerHTML = Array.from({ length: 5 }, (_, i) => {
        const filled = i < userData.rating ? 'filled' : '';
        return `<span class="star ${filled}" data-rating="${i + 1}">&#9733;</span>`;
    }).join('');

    // Add star click listeners
    modalRating.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            setRating(bookId, rating);
        });
    });

    // Update read button
    const markReadBtn = document.getElementById('markReadBtn');
    markReadBtn.textContent = userData.isRead ? 'Mark as Unread' : 'Mark as Read';
    markReadBtn.onclick = () => toggleReadStatus(bookId);

    // Show modal
    document.getElementById('bookModal').style.display = 'block';
}

// Set rating for a book
function setRating(bookId, rating) {
    setUserBookData(bookId, { rating, isRead: true });

    // Update modal stars
    const stars = document.querySelectorAll('#modalRating .star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });

    renderBooks();
    updateRecommendations();
}

// Toggle read status
function toggleReadStatus(bookId) {
    const userData = getUserBookData(bookId);
    const newReadStatus = !userData.isRead;

    setUserBookData(bookId, { isRead: newReadStatus });

    const markReadBtn = document.getElementById('markReadBtn');
    markReadBtn.textContent = newReadStatus ? 'Mark as Unread' : 'Mark as Read';

    renderBooks();
    updateRecommendations();
}

// Clear rating
function clearRating() {
    if (!currentBook) return;

    setUserBookData(currentBook.id, { rating: 0 });

    // Update modal stars
    document.querySelectorAll('#modalRating .star').forEach(star => {
        star.classList.remove('filled');
    });

    renderBooks();
    updateRecommendations();
}

// Update statistics
function updateStats() {
    const totalBooks = booksData.length;
    let readBooks = 0;
    let totalRating = 0;
    let ratedBooks = 0;

    booksData.forEach(book => {
        const userData = getUserBookData(book.id);
        if (userData.isRead) readBooks++;
        if (userData.rating > 0) {
            totalRating += userData.rating;
            ratedBooks++;
        }
    });

    const avgRating = ratedBooks > 0 ? (totalRating / ratedBooks).toFixed(1) : '0';

    document.getElementById('totalBooks').textContent = totalBooks;
    document.getElementById('readBooks').textContent = readBooks;
    document.getElementById('avgRating').textContent = avgRating;

    // Update recommendations
    updateRecommendations();
}

// Generate book recommendations based on user ratings
function getRecommendations() {
    // Find highly-rated books (4-5 stars)
    const highlyRatedBooks = booksData.filter(book => {
        const userData = getUserBookData(book.id);
        return userData.rating >= 4;
    });

    // If user hasn't rated any books highly, return empty
    if (highlyRatedBooks.length === 0) {
        return [];
    }

    // Collect themes from highly-rated books with weights
    const themeWeights = {};
    highlyRatedBooks.forEach(book => {
        const rating = getUserBookData(book.id).rating;
        book.themes.forEach(theme => {
            // Weight themes by rating (5-star books have more influence than 4-star)
            themeWeights[theme] = (themeWeights[theme] || 0) + rating;
        });
    });

    // Score unread books based on theme overlap
    const unreadBooks = booksData.filter(book => {
        const userData = getUserBookData(book.id);
        return !userData.isRead;
    });

    const scoredBooks = unreadBooks.map(book => {
        let score = 0;
        let matchingThemes = [];

        book.themes.forEach(theme => {
            if (themeWeights[theme]) {
                score += themeWeights[theme];
                matchingThemes.push(theme);
            }
        });

        // Calculate match percentage
        const matchPercentage = Math.min(100, Math.round((matchingThemes.length / book.themes.length) * 100));

        return {
            book,
            score,
            matchingThemes,
            matchPercentage
        };
    });

    // Sort by score and return top 6
    return scoredBooks
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
}

// Update recommendations display
function updateRecommendations() {
    const recommendations = getRecommendations();
    const section = document.getElementById('recommendationsSection');
    const grid = document.getElementById('recommendationsGrid');

    // Hide section if no recommendations
    if (recommendations.length === 0) {
        section.style.display = 'none';
        return;
    }

    // Show section and render recommendations
    section.style.display = 'block';
    grid.innerHTML = recommendations.map(item => createRecommendationCard(item)).join('');

    // Add click listeners
    document.querySelectorAll('.recommendation-card').forEach(card => {
        card.addEventListener('click', () => {
            const bookId = parseInt(card.dataset.bookId);
            openBookModal(bookId);
        });
    });
}

// Create HTML for a recommendation card
function createRecommendationCard(item) {
    const { book, matchingThemes, matchPercentage } = item;

    return `
        <div class="recommendation-card" data-book-id="${book.id}">
            <span class="recommendation-badge">Recommended</span>
            <div class="book-title">${book.title}</div>
            <div class="book-author">by ${book.author}</div>
            <div class="book-year">Published: ${book.year}</div>
            <div class="theme-tags">
                ${matchingThemes.slice(0, 3).map(theme =>
                    `<span class="theme-tag">${theme}</span>`
                ).join('')}
                ${matchingThemes.length > 3 ? `<span class="theme-tag">+${matchingThemes.length - 3}</span>` : ''}
            </div>
            <div class="match-info">
                <span class="match-percentage">${matchPercentage}% match</span>
                <span>• ${matchingThemes.length} shared theme${matchingThemes.length !== 1 ? 's' : ''}</span>
            </div>
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', renderBooks);

    // Filter dropdowns
    document.getElementById('statusFilter').addEventListener('change', renderBooks);
    document.getElementById('themeFilter').addEventListener('change', renderBooks);
    document.getElementById('sortBy').addEventListener('change', renderBooks);

    // Modal close button
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('bookModal').style.display = 'none';
    });

    // Clear rating button
    document.getElementById('clearRatingBtn').addEventListener('click', clearRating);

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('bookModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.getElementById('bookModal').style.display = 'none';
        }
    });
}

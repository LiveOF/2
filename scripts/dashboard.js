// Dashboard client-side logic
// Fetches aggregated feedback data and displays it

(function () {
  // Set to '' if serving API on the same origin as dashboard.html
  // Otherwise, set to your API base (e.g., 'http://localhost:4000')
  const API_BASE = 'http://localhost:4000';

  const loadingEl = document.getElementById('loading');
  const noDataEl = document.getElementById('no-data');
  const dashboardContentEl = document.getElementById('dashboard-content');
  const subjectsContainerEl = document.getElementById('subjects-container');

  // Determine grade class based on average
  function getGradeClass(average) {
    if (average >= 4.5) return 'grade-excellent';
    if (average >= 3.5) return 'grade-good';
    if (average >= 2.5) return 'grade-average';
    return 'grade-poor';
  }

  // Format date for display
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Create a card for a subject
  function createSubjectCard(subject) {
    const gradeClass = getGradeClass(subject.averageGrade);
    
    // Build comments HTML
    let commentsHtml = '';
    if (subject.comments && subject.comments.length > 0) {
      const validComments = subject.comments.filter(c => c && c.comment);
      const displayedComments = validComments.slice(0, 5); // Show last 5 comments
      
      commentsHtml = displayedComments
        .map(c => `
          <div class="comment-item">
            <p class="comment-text mb-1">${escapeHtml(c.comment)}</p>
            <small class="comment-date">${formatDate(c.timestamp)}</small>
          </div>
        `)
        .join('');
      
      if (validComments.length > 5) {
        commentsHtml += `<p class="text-muted small mt-2">... and ${validComments.length - 5} more comments</p>`;
      }
    }

    if (!commentsHtml) {
      commentsHtml = '<p class="no-comments">No comments yet</p>';
    }

    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4';
    col.innerHTML = `
      <div class="card subject-card h-100 shadow-sm">
        <div class="card-body">
          <div class="grade-badge ${gradeClass}">
            ${subject.averageGrade.toFixed(1)}
          </div>
          <h5 class="card-title text-center">${escapeHtml(subject.subject)}</h5>
          <p class="responses-count text-center mb-3">
            Based on ${subject.totalResponses} response${subject.totalResponses !== 1 ? 's' : ''}
          </p>
          <hr />
          <h6 class="mb-3">Recent Comments</h6>
          <div class="comments-list">
            ${commentsHtml}
          </div>
        </div>
      </div>
    `;

    return col;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Fetch and render dashboard data
  async function loadDashboard() {
    try {
      loadingEl.classList.remove('d-none');
      noDataEl.classList.add('d-none');
      dashboardContentEl.classList.add('d-none');

      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();

      loadingEl.classList.add('d-none');

      if (!data || data.length === 0) {
        noDataEl.classList.remove('d-none');
        return;
      }

      // Clear and populate the container
      subjectsContainerEl.innerHTML = '';
      data.forEach(subject => {
        subjectsContainerEl.appendChild(createSubjectCard(subject));
      });

      dashboardContentEl.classList.remove('d-none');
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      loadingEl.classList.add('d-none');
      noDataEl.textContent = 'Failed to load dashboard data. Please try again later.';
      noDataEl.classList.remove('d-none');
    }
  }

  // Export for use by other scripts
  window.refreshDashboard = loadDashboard;

  // Listen for cross-tab updates when feedback is submitted
  window.addEventListener('storage', (event) => {
    if (event.key === 'feedbackSubmitted') {
      loadDashboard();
    }
  });

  // Initial load
  loadDashboard();
})();

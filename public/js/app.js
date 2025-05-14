// Main application code for Andromeda Loans Dashboard
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const leadsTableBody = document.getElementById('leads-table-body');
  const loadingIndicator = document.getElementById('loading-indicator');
  const noResults = document.getElementById('no-results');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  const applyFiltersBtn = document.getElementById('apply-filters');
  const resetFiltersBtn = document.getElementById('reset-filters');
  const categoryFilter = document.getElementById('category-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const refreshBtn = document.getElementById('refresh-btn');
  const errorToast = document.getElementById('error-toast');
  const errorMessage = document.getElementById('error-message');
  const closeToastBtn = document.querySelector('.close-toast');
  const leadDetailsModal = document.getElementById('lead-details-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  
  // Stats elements
  const loansCount = document.getElementById('loans-count');
  const insuranceCount = document.getElementById('insurance-count');
  const mutualFundsCount = document.getElementById('mutual-funds-count');
  const totalCount = document.getElementById('total-count');
  
  // Detail elements
  const detailName = document.getElementById('detail-name');
  const detailContact = document.getElementById('detail-contact');
  const detailCategory = document.getElementById('detail-category');
  const detailSubcategory = document.getElementById('detail-subcategory');
  const detailDate = document.getElementById('detail-date');
  const detailStatus = document.getElementById('detail-status');
  
  // State
  let currentPage = 1;
  let totalPages = 1;
  let currentFilters = {
    category: '',
    status: '',
    search: ''
  };
  
  // Initialize the dashboard
  init();
  
  // Event Listeners
  applyFiltersBtn.addEventListener('click', applyFilters);
  resetFiltersBtn.addEventListener('click', resetFilters);
  prevPageBtn.addEventListener('click', goToPrevPage);
  nextPageBtn.addEventListener('click', goToNextPage);
  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
  refreshBtn.addEventListener('click', refreshData);
  closeToastBtn.addEventListener('click', hideErrorToast);
  closeModalBtn.addEventListener('click', closeModal);
  
  // Initialize dashboard
  function init() {
    fetchLeads();
    fetchStats();
  }
  
  // Fetch leads with current filters and pagination
  async function fetchLeads() {
    showLoading();
    
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: CONFIG.PAGINATION.ITEMS_PER_PAGE
      });
      
      // Add filters if they exist
      if (currentFilters.category) params.append('category', currentFilters.category);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.search) params.append('search', currentFilters.search);
      
      const response = await fetch(`${CONFIG.API_URL}${CONFIG.ENDPOINTS.LEADS}?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch leads data');
      }
      
      const data = await response.json();
      
      // Update pagination info
      totalPages = Math.ceil(data.total / CONFIG.PAGINATION.ITEMS_PER_PAGE) || 1;
      updatePaginationControls();
      
      // Render the leads
      renderLeads(data.leads);
    } catch (error) {
      showError(error.message);
      hideLoading();
      showNoResults();
    }
  }
  
  // Fetch statistics for the dashboard
  async function fetchStats() {
    try {
      const response = await fetch(`${CONFIG.API_URL}${CONFIG.ENDPOINTS.STATS}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }
      
      const data = await response.json();
      
      // Update stats display
      loansCount.textContent = data.loans || 0;
      insuranceCount.textContent = data.insurance || 0;
      mutualFundsCount.textContent = data.mutualFunds || 0;
      totalCount.textContent = data.total || 0;
    } catch (error) {
      showError(error.message);
    }
  }
  
  // Render leads in the table
  function renderLeads(leads) {
    hideLoading();
    
    if (!leads || leads.length === 0) {
      showNoResults();
      return;
    }
    
    hideNoResults();
    leadsTableBody.innerHTML = '';
    
    leads.forEach(lead => {
      const row = document.createElement('tr');
      row.classList.add('lead-row');
      row.dataset.id = lead.id;
      
      // Format the date for better readability
      const createdDate = new Date(lead.created_at);
      const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      row.innerHTML = `
        <td>${lead.name || ''}</td>
        <td>${lead.contact || ''}</td>
        <td>${lead.category || ''}</td>
        <td>${lead.subcategory || ''}</td>
        <td>${formattedDate}</td>
        <td>
          <span class="status-badge ${CONFIG.STATUS_CLASSES[lead.status] || ''}">
            ${CONFIG.STATUS_TEXT[lead.status] || lead.status}
          </span>
        </td>
      `;
      
      leadsTableBody.appendChild(row);
    });
    
    // Add event listeners to table rows
    document.querySelectorAll('.lead-row').forEach(row => {
      row.addEventListener('click', () => viewLeadDetails(row.dataset.id));
      
      // Add hover effect for better UX
      row.style.cursor = 'pointer';
    });
  }
  
  // View lead details in modal
  async function viewLeadDetails(leadId) {
    showLoading();
    
    try {
      const response = await fetch(`${CONFIG.API_URL}${CONFIG.ENDPOINTS.LEADS}/${leadId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch lead details');
      }
      
      const lead = await response.json();
      
      // Format date
      const createdDate = new Date(lead.created_at);
      const formattedDate = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Populate modal
      detailName.textContent = lead.name || 'N/A';
      detailContact.textContent = lead.contact || 'N/A';
      detailCategory.textContent = lead.category || 'N/A';
      detailSubcategory.textContent = lead.subcategory || 'N/A';
      detailDate.textContent = formattedDate;
      detailStatus.textContent = CONFIG.STATUS_TEXT[lead.status] || lead.status;
      detailStatus.className = 'detail-value';
      detailStatus.classList.add(CONFIG.STATUS_CLASSES[lead.status] || '');
      
      hideLoading();
      openModal();
    } catch (error) {
      hideLoading();
      showError(error.message);
    }
  }
  
  // Apply selected filters
  function applyFilters() {
    currentPage = 1;
    currentFilters = {
      category: categoryFilter.value,
      status: statusFilter.value,
      search: searchInput.value.trim()
    };
    
    fetchLeads();
  }
  
  // Reset all filters to default
  function resetFilters() {
    currentPage = 1;
    currentFilters = {
      category: '',
      status: '',
      search: ''
    };
    
    // Reset form values
    categoryFilter.value = '';
    statusFilter.value = '';
    searchInput.value = '';
    
    fetchLeads();
  }
  
  // Perform search based on input
  function performSearch() {
    currentPage = 1;
    currentFilters.search = searchInput.value.trim();
    fetchLeads();
  }
  
  // Refresh data
  function refreshData() {
    fetchLeads();
    fetchStats();
  }
  
  // Pagination Controls
  function updatePaginationControls() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }
  
  function goToPrevPage() {
    if (currentPage > 1) {
      currentPage--;
      fetchLeads();
    }
  }
  
  function goToNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      fetchLeads();
    }
  }
  
  // UI Helpers
  function showLoading() {
    loadingIndicator.classList.remove('hidden');
  }
  
  function hideLoading() {
    loadingIndicator.classList.add('hidden');
  }
  
  function showNoResults() {
    noResults.classList.remove('hidden');
  }
  
  function hideNoResults() {
    noResults.classList.add('hidden');
  }
  
  function showError(message) {
    errorMessage.textContent = message || 'An error occurred';
    errorToast.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(hideErrorToast, 5000);
  }
  
  function hideErrorToast() {
    errorToast.classList.add('hidden');
  }
  
  function openModal() {
    leadDetailsModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  }
  
  function closeModal() {
    leadDetailsModal.classList.add('hidden');
    document.body.style.overflow = ''; // Re-enable scrolling
  }
  
  // Close modal when clicking outside
  leadDetailsModal.addEventListener('click', (e) => {
    if (e.target === leadDetailsModal) {
      closeModal();
    }
  });
}); 
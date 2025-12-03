// CareerOS Extension Popup Script

const API_URL = 'https://app-bedjzilj.fly.dev';

// DOM Elements
let loginForm, jobCapture, emailInput, passwordInput, loginBtn;
let userEmailSpan, logoutBtn, jobLoading, noJob, jobForm;
let jobTitleInput, jobCompanyInput, jobLocationInput, jobNotesInput;
let jobUrlInput, jobDescriptionInput, saveBtn, messageContainer;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Get DOM elements
  loginForm = document.getElementById('login-form');
  jobCapture = document.getElementById('job-capture');
  emailInput = document.getElementById('email');
  passwordInput = document.getElementById('password');
  loginBtn = document.getElementById('login-btn');
  userEmailSpan = document.getElementById('user-email');
  logoutBtn = document.getElementById('logout-btn');
  jobLoading = document.getElementById('job-loading');
  noJob = document.getElementById('no-job');
  jobForm = document.getElementById('job-form');
  jobTitleInput = document.getElementById('job-title');
  jobCompanyInput = document.getElementById('job-company');
  jobLocationInput = document.getElementById('job-location');
  jobNotesInput = document.getElementById('job-notes');
  jobUrlInput = document.getElementById('job-url');
  jobDescriptionInput = document.getElementById('job-description');
  saveBtn = document.getElementById('save-btn');
  messageContainer = document.getElementById('message-container');

  // Add event listeners
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  saveBtn.addEventListener('click', handleSaveJob);

  // Allow Enter key to submit login
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  // Check if user is logged in
  const auth = await getAuth();
  if (auth && auth.token) {
    showJobCapture(auth.email);
    extractJobFromPage();
  } else {
    showLoginForm();
  }
}

// Storage helpers
async function getAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['token', 'email'], (result) => {
      resolve(result);
    });
  });
}

async function setAuth(token, email) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ token, email }, resolve);
  });
}

async function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['token', 'email'], resolve);
  });
}

// UI helpers
function showLoginForm() {
  loginForm.classList.add('active');
  jobCapture.classList.remove('active');
}

function showJobCapture(email) {
  loginForm.classList.remove('active');
  jobCapture.classList.add('active');
  userEmailSpan.textContent = email || 'Logged in';
}

function showMessage(text, type = 'info') {
  messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
  setTimeout(() => {
    messageContainer.innerHTML = '';
  }, 5000);
}

function showJobLoading() {
  jobLoading.style.display = 'block';
  noJob.style.display = 'none';
  jobForm.style.display = 'none';
}

function showNoJob() {
  jobLoading.style.display = 'none';
  noJob.style.display = 'block';
  jobForm.style.display = 'none';
}

function showJobForm(jobData) {
  jobLoading.style.display = 'none';
  noJob.style.display = 'none';
  jobForm.style.display = 'block';
  
  jobTitleInput.value = jobData.job_title || '';
  jobCompanyInput.value = jobData.company || '';
  jobLocationInput.value = jobData.location || '';
  jobUrlInput.value = jobData.job_url || '';
  jobDescriptionInput.value = jobData.job_description || '';
}

// Login handler
async function handleLogin() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('Please enter email and password', 'error');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    await setAuth(data.access_token, email);
    
    showMessage('Logged in successfully!', 'success');
    showJobCapture(email);
    extractJobFromPage();
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

// Logout handler
async function handleLogout() {
  await clearAuth();
  showLoginForm();
  showMessage('Logged out', 'info');
}

// Extract job data from current page
async function extractJobFromPage() {
  showJobLoading();

  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      showNoJob();
      return;
    }

    // Check if we're on a supported site
    if (!tab.url.includes('hiring.cafe')) {
      showNoJob();
      return;
    }

    // Try to inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['contentScript.js']
      });
    } catch (e) {
      // Script might already be injected, continue
    }

    // Small delay to ensure content script is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showNoJob();
        return;
      }

      if (response && response.success && response.job) {
        const job = response.job;
        // Check if we got meaningful data
        if (job.job_title || job.company || (job.job_description && job.job_description.length > 200)) {
          showJobForm(job);
        } else {
          showNoJob();
        }
      } else {
        showNoJob();
      }
    });
  } catch (error) {
    console.error('Error extracting job:', error);
    showNoJob();
  }
}

// Save job handler
async function handleSaveJob() {
  const auth = await getAuth();
  
  if (!auth || !auth.token) {
    showMessage('Please log in first', 'error');
    showLoginForm();
    return;
  }

  const jobData = {
    job_title: jobTitleInput.value.trim() || null,
    company: jobCompanyInput.value.trim() || null,
    job_url: jobUrlInput.value || null,
    job_description: jobDescriptionInput.value || null,
    status: 'saved',
    notes: jobNotesInput.value.trim() || `Captured from hiring.cafe on ${new Date().toLocaleDateString()}`
  };

  if (!jobData.job_title && !jobData.company) {
    showMessage('Please enter at least a job title or company', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const response = await fetch(`${API_URL}/api/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`,
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        await clearAuth();
        showLoginForm();
        throw new Error('Session expired. Please log in again.');
      }
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save job');
    }

    showMessage('Job saved to CareerOS!', 'success');
    
    // Clear the form
    jobNotesInput.value = '';
    
    // Change button to indicate success
    saveBtn.textContent = 'Saved!';
    saveBtn.classList.remove('btn-success');
    saveBtn.classList.add('btn-primary');
    
    setTimeout(() => {
      saveBtn.textContent = 'Save to CareerOS';
      saveBtn.classList.remove('btn-primary');
      saveBtn.classList.add('btn-success');
      saveBtn.disabled = false;
    }, 2000);
  } catch (error) {
    showMessage(error.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to CareerOS';
  }
}

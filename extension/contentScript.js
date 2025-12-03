// CareerOS Content Script for hiring.cafe
// This script extracts job information from job listing pages

function extractJobData() {
  const jobData = {
    job_title: null,
    company: null,
    location: null,
    job_url: window.location.href,
    job_description: null,
    salary: null
  };

  // Try to extract job title - common patterns
  const titleSelectors = [
    'h1',
    '[data-testid="job-title"]',
    '.job-title',
    '[class*="JobTitle"]',
    '[class*="job-title"]'
  ];
  
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      jobData.job_title = el.innerText.trim();
      break;
    }
  }

  // Try to extract company name
  const companySelectors = [
    '[data-testid="company-name"]',
    '.company-name',
    '[class*="CompanyName"]',
    '[class*="company-name"]',
    'a[href*="/company/"]',
    '[class*="employer"]'
  ];
  
  for (const selector of companySelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      jobData.company = el.innerText.trim();
      break;
    }
  }

  // Try to extract location
  const locationSelectors = [
    '[data-testid="job-location"]',
    '.job-location',
    '[class*="Location"]',
    '[class*="location"]'
  ];
  
  for (const selector of locationSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      jobData.location = el.innerText.trim();
      break;
    }
  }

  // Try to extract job description
  const descriptionSelectors = [
    '[data-testid="job-description"]',
    '.job-description',
    '[class*="JobDescription"]',
    '[class*="job-description"]',
    '[class*="description"]',
    'article',
    'main'
  ];
  
  for (const selector of descriptionSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim().length > 100) {
      jobData.job_description = el.innerText.trim().substring(0, 5000); // Limit to 5000 chars
      break;
    }
  }

  // If we couldn't find structured data, try to extract from page text
  if (!jobData.job_title || !jobData.company) {
    const pageText = document.body.innerText;
    
    // Try to find company and title from common patterns
    if (!jobData.job_title) {
      const h1 = document.querySelector('h1');
      if (h1) {
        jobData.job_title = h1.innerText.trim();
      }
    }
  }

  // Fallback: get full page text as description if nothing else worked
  if (!jobData.job_description) {
    jobData.job_description = document.body.innerText.substring(0, 5000);
  }

  return jobData;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_JOB_DATA') {
    const jobData = extractJobData();
    sendResponse({ success: true, job: jobData });
  }
  return true; // Keep the message channel open for async response
});

// Log that content script is loaded
console.log('CareerOS content script loaded on:', window.location.href);

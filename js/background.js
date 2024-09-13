// Fetch the mappings from the JSON file
let cssMappings = [];
let injectedCSSFiles = {}; // To track injected CSS per tab

fetch(chrome.runtime.getURL("mappings.json"))
  .then((response) => response.json())
  .then((data) => {
    cssMappings = data.mappings;
  })
  .catch((error) => console.error("Error loading JSON mappings:", error));

// Function to inject CSS based on URL
function injectCSS(tabId, url) {
  // Clear any previously injected CSS for this tab
  clearCSS(tabId);

  let injectedFiles = [];

  // Loop through the mappings and check for URL matches using regex
  cssMappings.forEach((mapping) => {
    mapping.urlPatterns.forEach((urlRegexStr) => {
      const regex = new RegExp(urlRegexStr);

      // If the URL matches the regex pattern, inject the CSS files
      if (regex.test(url)) {
        mapping.cssFiles.forEach((cssFilePath) => {
          // Fetch the CSS content from the URL (e.g., from GitHub)
          fetch(chrome.runtime.getURL(cssFilePath))
            .then((response) => response.text())
            .then((cssContent) => {
              // Inject the fetched CSS into the current tab by creating a <style> tag
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: addCSSInStyleTag, // This function is defined below
                args: [cssFilePath, cssContent], // Pass the fetched CSS content
              });

              // Track the injected CSS files for this tab
              injectedFiles.push(cssFilePath);
              injectedCSSFiles[tabId] = injectedFiles;
            })
            .catch((error) =>
              console.error("Error fetching CSS from URL:", error)
            );
        });
      }
    });
  });
}

// Function to be injected into the tab to add the <style> tag
function addCSSInStyleTag(filename, cssContent) {
  if (document.querySelector(`style[data-filename="${filename}"]`)) {
    return;
  }
  const style = document.createElement("style");
  style.setAttribute("data-filename", filename);
  style.textContent = cssContent;
  document.head.appendChild(style);
}

// Function to clear injected CSS when navigating away
function clearCSS(tabId) {
  if (injectedCSSFiles[tabId]) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: removeInjectedCSS, // This function will remove the <style> tags
      args: [injectedCSSFiles[tabId]], // Pass the injected filenames to remove
    });
    delete injectedCSSFiles[tabId]; // Clear the record for this tab
  }
}

// Function to remove the <style> tags from the page
function removeInjectedCSS(filenames) {
  filenames.forEach((filename) => {
    const tag = document.querySelector(`style[data-filename="${filename}"]`);
    if (tag) {
      tag.remove();
    }
  });
}

// Listen for tab updates and apply or remove CSS based on the URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    injectCSS(tabId, tab.url);
  }
});
